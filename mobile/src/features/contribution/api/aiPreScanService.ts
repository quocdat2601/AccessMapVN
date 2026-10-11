let isAndroid = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require('react-native');
  isAndroid = Platform?.OS === 'android';
} catch {
  isAndroid = false;
}

export interface PreScanFeatureTag {
  key: string;
  label: string;
  detected: boolean;
  confidence: number;
}

import { postMultipart, resolveServiceUrl } from '@/shared/api/client';

export interface PreScanResult {
  features: PreScanFeatureTag[];
  summary: string;
  isMockFallback?: boolean;
}

const FEATURE_LABEL_MAP: Record<string, string> = {
  exterior_ramp_present: 'Ram dốc tiếp cận',
  steps_present: 'Bậc thang',
  elevator_present: 'Thang máy tiếp cận',
  door_width_ok: 'Cửa rộng ≥80cm',
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
    const data = await postMultipart(`${aiBaseUrl}/api/v1/ai/pre-scan`, formData, 15000);
    clearTimeout(timeoutId);

    console.log('[runAiPreScan] SUCCESS data:', JSON.stringify(data));
    const rawFeatures = data.features || {};

    const features: PreScanFeatureTag[] = Object.keys(rawFeatures).map((key) => {
      const item = rawFeatures[key];
      const detected = item?.value === true || item?.detected === true;
      return {
        key,
        label: FEATURE_LABEL_MAP[key] ?? key,
        detected,
        confidence: typeof item?.confidence === 'number' ? item.confidence : 0.8,
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
