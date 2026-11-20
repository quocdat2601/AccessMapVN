export type FeatureStatus = 'present' | 'absent' | 'unknown';

export interface PreScanFeatureTag {
  key: string;
  label: string;
  status: FeatureStatus;
  detected: boolean;
  confidence: number;
  reason?: string;
}

import { postMultipart, resolveServiceUrl } from '@/shared/api/client';

export interface PreScanResult {
  features: PreScanFeatureTag[];
  summary: string;
  isMockFallback?: boolean;
}

interface AiPreScanPayload {
  features?: Record<string, { value?: boolean | string; detected?: boolean; confidence?: number; reason?: string }>;
  summary?: string;
}

interface AiVideoSuggestionPayload {
  value?: string;
  evidence?: Array<{
    frame_id?: string;
    timestamp_seconds?: number;
    detector_confidence?: number;
  }>;
}

interface AiVideoPreScanPayload {
  processing_status?: string;
  frames_sampled?: number;
  frames_analyzed?: number;
  suggestions?: Record<string, AiVideoSuggestionPayload>;
  warnings?: string[];
}

const VIDEO_SUGGESTION_KEY_MAP: Record<string, string> = {
  ramp_present: 'exterior_ramp_present',
  steps_present: 'steps_present',
  elevator_present: 'elevator_present',
  door_detected: 'door_detected',
  accessible_restroom_sign: 'accessible_restroom_sign',
  tactile_paving_present: 'tactile_paving_present',
};

const FEATURE_LABEL_MAP: Record<string, string> = {
  exterior_ramp_present: 'Ram dốc',
  ramp_slope_compliant: 'Dốc thoải',
  steps_present: 'Bậc thang',
  elevator_present: 'Thang máy tiếp cận',
  door_detected: 'Cửa ra vào',
  door_width_compliant: 'Cửa ra vào',
  door_width_ok: 'Cửa ra vào',
  accessible_restroom_sign: 'WC tiếp cận',
  tactile_paving_present: 'Lối đi xúc giác',
};

function generateFallbackResult(): PreScanResult {
  return {
    summary: 'Chưa kết nối được dịch vụ AI. Vui lòng tự chọn các đặc điểm tiếp cận bên dưới.',
    isMockFallback: true,
    features: Object.entries(FEATURE_LABEL_MAP).map(([key, label]) => ({
      key,
      label,
      status: 'unknown',
      detected: false,
      confidence: 0,
    })),
  };
}

export async function runAiPreScan(imageUri: string, textDescription?: string): Promise<PreScanResult> {
  try {
    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);

    if (textDescription) {
      formData.append('text_description', textDescription);
    }

    const aiBaseUrl = resolveServiceUrl(8000, process.env.EXPO_PUBLIC_AI_SERVICE_URL);
    console.log('[runAiPreScan] Calling:', `${aiBaseUrl}/api/v1/ai/pre-scan`, 'with imageUri:', imageUri);
    const data = await postMultipart<AiPreScanPayload>(`${aiBaseUrl}/api/v1/ai/pre-scan`, formData, 15000);

    console.log('[runAiPreScan] SUCCESS data:', JSON.stringify(data));
    const rawFeatures = data.features || {};

    const features: PreScanFeatureTag[] = Object.keys(rawFeatures).map((key) => {
      const item = rawFeatures[key];
      const rawVal = item?.value;
      const status: FeatureStatus =
        rawVal === 'present' || rawVal === true
          ? 'present'
          : rawVal === 'absent' || rawVal === false
          ? 'absent'
          : 'unknown';

      return {
        key,
        label: FEATURE_LABEL_MAP[key] ?? key,
        status,
        detected: status === 'present',
        confidence: typeof item?.confidence === 'number' ? item.confidence : 0.0,
        reason: item?.reason,
      };
    });

    return {
      features,
      summary: data.summary || 'AI đã phân tích ảnh xong.',
      isMockFallback: false,
    };
  } catch (error) {
    console.warn('[runAiPreScan] FAILED:', error);
    // Graceful fallback allows instant testing on device even if ai-service is not currently launched locally
    return generateFallbackResult();
  }
}

export async function runAiVideoPreScan(videoUri: string): Promise<PreScanResult> {
  try {
    const isMov = videoUri.split('?')[0].toLowerCase().endsWith('.mov');
    const formData = new FormData();
    formData.append('video', {
      uri: videoUri,
      name: isMov ? 'clip.mov' : 'clip.mp4',
      type: isMov ? 'video/quicktime' : 'video/mp4',
    } as any);

    const aiBaseUrl = resolveServiceUrl(8000, process.env.EXPO_PUBLIC_AI_SERVICE_URL);
    console.log('[runAiVideoPreScan] Calling:', `${aiBaseUrl}/api/v1/ai/pre-scan/video`, 'with videoUri:', videoUri);
    const data = await postMultipart<AiVideoPreScanPayload>(`${aiBaseUrl}/api/v1/ai/pre-scan/video`, formData, 60000);

    const rawSuggestions = data.suggestions || {};
    const features: PreScanFeatureTag[] = Object.entries(VIDEO_SUGGESTION_KEY_MAP).map(
      ([suggestionKey, featureKey]) => {
        const item = rawSuggestions[suggestionKey];
        const suggestedPresent = item?.value === 'suggested_present';
        const evidenceList = item?.evidence || [];
        const maxConfidence = evidenceList.reduce(
          (best, e) => Math.max(best, typeof e.detector_confidence === 'number' ? e.detector_confidence : 0),
          0
        );
        const status: FeatureStatus = suggestedPresent ? 'present' : 'unknown';

        return {
          key: featureKey,
          label: FEATURE_LABEL_MAP[featureKey] ?? featureKey,
          status,
          detected: suggestedPresent,
          confidence: maxConfidence,
          reason: suggestedPresent
            ? `Phát hiện trên ${evidenceList.length} khung hình video`
            : 'Chưa rõ từ khung hình video, vui lòng xác nhận thực tế',
        };
      }
    );

    const detectedLabels = features.filter((f) => f.detected).map((f) => f.label);
    const summary =
      data.processing_status === 'insufficient_visual_quality'
        ? 'Video chưa đủ chất lượng hình ảnh để phân tích. Vui lòng tự chọn đặc điểm hoặc quay lại video rõ hơn.'
        : detectedLabels.length > 0
        ? `AI gợi ý từ ${data.frames_analyzed ?? 0}/${data.frames_sampled ?? 0} khung hình video: ${detectedLabels.join(', ')}. Người khảo sát cần xác nhận thực tế.`
        : `Đã phân tích ${data.frames_analyzed ?? 0} khung hình video nhưng chưa phát hiện đặc điểm rõ ràng. Vui lòng tự chọn bên dưới nếu có.`;

    return {
      features,
      summary,
      isMockFallback: false,
    };
  } catch (error) {
    console.warn('[runAiVideoPreScan] FAILED:', error);
    return generateFallbackResult();
  }
}
