let isAndroid = false;
try {
  const { Platform } = require('react-native');
  isAndroid = Platform?.OS === 'android';
} catch {
  isAndroid = false;
}

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

const FEATURE_LABEL_MAP: Record<string, string> = {
  exterior_ramp_present: 'Ram dốc ngoài trời',
  ramp_slope_compliant: 'Độ dốc đạt chuẩn (≤ 1/12)',
  steps_present: 'Bậc thang',
  elevator_present: 'Thang máy tiếp cận',
  door_detected: 'Có cửa ra vào',
  door_width_compliant: 'Cửa thông thủy ≥90cm',
  door_width_ok: 'Cửa rộng ≥80cm (Legacy)',
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    console.warn('[runAiPreScan] FAILED:', error);
    // Graceful fallback allows instant testing on device even if ai-service is not currently launched locally
    return generateFallbackResult();
  }
}
