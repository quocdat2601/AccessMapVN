export type VerificationStatus = 'AutoVerified' | 'PendingModeration' | 'AwaitingMoreInfo';

export interface VerificationMatrixInput {
  cvConfidence: number; // 0.0 to 1.0 (average / key feature CV confidence)
  textDescription?: string;
  contributorCoords: { latitude: number; longitude: number } | null;
  poiCoords: { latitude: number; longitude: number } | null;
  selectedTags: string[];
}

export interface VerificationMatrixResult {
  overallScore: number; // 0 to 100 (%)
  status: VerificationStatus;
  statusLabel: string;
  statusDescription: string;
  spatialDistanceMeters: number | null;
  spatialValid: boolean;
  pillars: {
    computerVision: {
      score: number;
      weight: number;
      label: string;
    };
    nlpContext: {
      score: number;
      weight: number;
      label: string;
      matchedKeywords: string[];
    };
    spatialProximity: {
      score: number;
      weight: number;
      distanceMeters: number | null;
      isWithin50m: boolean;
    };
  };
  recommendedExp: number;
}

const ACCESSIBILITY_KEYWORDS = [
  'ram dốc',
  'dốc',
  'thoải',
  'bậc thang',
  'bậc',
  'thang máy',
  'cửa rộng',
  'cửa tự động',
  'tiếp cận',
  'xe lăn',
  'lối đi',
  'nhà vệ sinh',
  'wc',
  'xúc giác',
  'bằng phẳng',
  'gờ',
];

/**
 * Calculates surface distance between two WGS84 GPS coordinates using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates the full multi-modal verification matrix combining Computer Vision,
 * NLP context notes, and Spatial Proximity Geofence (<= 50m).
 */
export function evaluateVerificationMatrix(
  input: VerificationMatrixInput
): VerificationMatrixResult {
  // 1. Computer Vision Pillar (Weight 50%)
  const cvRawScore = Math.min(100, Math.max(0, Math.round(input.cvConfidence * 100)));

  // 2. NLP Context Pillar (Weight 20%)
  const notes = (input.textDescription || '').trim().toLowerCase();
  const matchedKeywords: string[] = [];

  for (const kw of ACCESSIBILITY_KEYWORDS) {
    if (notes.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  let nlpScore = 70; // baseline if notes empty
  if (notes.length > 0) {
    if (matchedKeywords.length >= 2) {
      nlpScore = 95;
    } else if (matchedKeywords.length === 1) {
      nlpScore = 85;
    } else {
      nlpScore = 65; // User provided notes but irrelevant to accessibility
    }
  }

  // 3. Spatial Proximity Geofence Pillar (Weight 30%)
  let distanceMeters: number | null = null;
  let spatialValid = true;
  let spatialScore = 80; // neutral default if GPS missing

  if (input.contributorCoords && input.poiCoords) {
    distanceMeters = calculateHaversineDistanceMeters(input.contributorCoords, input.poiCoords);
    spatialValid = distanceMeters <= 50;

    if (spatialValid) {
      // 0m = 100%, 50m = 80%
      spatialScore = Math.max(80, Math.round(100 - (distanceMeters / 50) * 20));
    } else {
      // Penalty when exceeding 50m geofence
      spatialScore = Math.max(10, Math.round(60 - Math.min(50, distanceMeters - 50)));
    }
  }

  // Combined weighted score
  // CV: 50%, NLP: 20%, Spatial: 30%
  let overallScore = Math.round(cvRawScore * 0.5 + nlpScore * 0.2 + spatialScore * 0.3);

  // BR-13 Penalty: If spatial distance exceeds 50m, enforce maximum threshold of 75%
  // (Cannot be AutoVerified without valid spatial anchor)
  if (!spatialValid) {
    overallScore = Math.min(overallScore, 75);
  }

  // Categorize status according to BR-09 & BR-10
  let status: VerificationStatus = 'PendingModeration';
  let statusLabel = 'Chờ duyệt viên';
  let statusDescription = 'Độ tin cậy ở mức khá (60–79%). Bản ghi sẽ được chuyển đến hàng đợi kiểm duyệt viên.';

  if (overallScore >= 80 && spatialValid) {
    status = 'AutoVerified';
    statusLabel = 'Tự động duyệt';
    statusDescription = 'Độ tin cậy cao (≥80%), thông tin ảnh và vị trí chuẩn xác. Đủ điều kiện xuất bản ngay.';
  } else if (overallScore < 60) {
    status = 'AwaitingMoreInfo';
    statusLabel = 'Cần thêm thông tin';
    statusDescription = 'Ảnh mờ hoặc thông tin chưa rõ ràng (<60%). Cần chụp lại góc rộng hoặc bổ sung hình ảnh.';
  }

  return {
    overallScore,
    status,
    statusLabel,
    statusDescription,
    spatialDistanceMeters: distanceMeters,
    spatialValid,
    pillars: {
      computerVision: {
        score: cvRawScore,
        weight: 0.5,
        label: `${cvRawScore}% độ khớp thị giác máy tính`,
      },
      nlpContext: {
        score: nlpScore,
        weight: 0.2,
        label: `${nlpScore}% ngữ cảnh mô tả (${matchedKeywords.length} từ khóa khớp)`,
        matchedKeywords,
      },
      spatialProximity: {
        score: spatialScore,
        weight: 0.3,
        distanceMeters,
        isWithin50m: spatialValid,
      },
    },
    recommendedExp: 50,
  };
}

let isAndroid = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require('react-native');
  isAndroid = Platform?.OS === 'android';
} catch {
  isAndroid = false;
}

const DEFAULT_AI_URL = isAndroid ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL || DEFAULT_AI_URL;

/**
 * Hybrid Verification Adapter: Attempts to invoke the FastAPI POST /api/v1/ai/verify endpoint.
 * If the service is unreachable or offline, seamlessly falls back to the deterministic local engine.
 */
export async function verifyWithAiOrFallback(
  imageUri: string,
  input: VerificationMatrixInput
): Promise<VerificationMatrixResult> {
  const localResult = evaluateVerificationMatrix(input);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      name: 'verify.jpg',
      type: 'image/jpeg',
    } as any);

    if (input.textDescription) {
      formData.append('text_description', input.textDescription);
    }
    if (input.selectedTags.length > 0) {
      formData.append('confirmed_tags', JSON.stringify(input.selectedTags));
    }
    if (input.contributorCoords) {
      formData.append('latitude', input.contributorCoords.latitude.toString());
      formData.append('longitude', input.contributorCoords.longitude.toString());
    }

    const res = await fetch(`${AI_SERVICE_URL}/api/v1/ai/verify`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (typeof data.overall_score === 'number') {
        const score = Math.round(data.overall_score);
        let status: VerificationStatus = 'PendingModeration';
        if (score >= 80 && localResult.spatialValid) status = 'AutoVerified';
        else if (score < 60) status = 'AwaitingMoreInfo';

        return {
          ...localResult,
          overallScore: score,
          status,
          pillars: {
            ...localResult.pillars,
            computerVision: {
              ...localResult.pillars.computerVision,
              score: Math.round(data.cv_score ?? localResult.pillars.computerVision.score),
            },
          },
        };
      }
    }
    return localResult;
  } catch {
    clearTimeout(timeoutId);
    return localResult;
  }
}
