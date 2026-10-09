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

export interface PreScanResult {
  features: PreScanFeatureTag[];
  summary: string;
  isMockFallback?: boolean;
}

const DEFAULT_AI_URL = isAndroid ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL || DEFAULT_AI_URL;

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
    summary: 'AI nhận diện sơ bộ: Phát hiện ram dốc và lối vào tiếp cận phù hợp cho xe lăn.',
    isMockFallback: true,
    features: [
      { key: 'exterior_ramp_present', label: 'Ram dốc tiếp cận', detected: true, confidence: 0.92 },
      { key: 'door_width_ok', label: 'Cửa rộng ≥80cm', detected: true, confidence: 0.86 },
      { key: 'elevator_present', label: 'Thang máy tiếp cận', detected: false, confidence: 0.74 },
      { key: 'accessible_restroom_sign', label: 'WC tiếp cận', detected: false, confidence: 0.65 },
    ],
  };
}

export async function runAiPreScan(imageUri: string, textDescription?: string): Promise<PreScanResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

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

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/pre-scan`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    const data = await response.json();
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
    // Graceful fallback allows instant testing on device even if ai-service is not currently launched locally
    return generateFallbackResult();
  }
}
