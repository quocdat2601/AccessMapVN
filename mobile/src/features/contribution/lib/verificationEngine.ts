export type VerificationStatus = 'AutoVerified' | 'PendingModeration' | 'AwaitingMoreInfo';

export interface PersonaFitEvaluation {
  electricWheelchair: 'FullyAccessible' | 'Accessible' | 'Inaccessible';
  manualWheelchairSelf: 'FullyAccessible' | 'NeedsAssistance' | 'Inaccessible';
  visualImpaired: 'Safe' | 'NeedsCaution' | 'Unsafe';
}

export interface DataConfidenceAssessment {
  rampGeometryMeasured: boolean;
  confidenceLevel: number; // 0-100%
  recommendationPrompt?: string;
}

export interface PersonaScores {
  wheelchairScore: number; // 0-100%
  blindScore: number; // 0-100%
}

export interface VerificationPenalties {
  stepsWithoutRamp: boolean;
  tactileBlocked: boolean;
}

export interface VerificationMatrixInput {
  cvConfidence: number; // 0.0 to 1.0 (average / key feature CV confidence)
  textDescription?: string;
  contributorCoords: { latitude: number; longitude: number; accuracy?: number | null } | null;
  poiCoords: { latitude: number; longitude: number } | null;
  selectedTags: string[];
  verifiedTagCount?: number;
  unverifiedTagCount?: number;
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
  // QCVN 10:2014 Persona & Confidence Extensions
  personaScores: PersonaScores;
  personaFit: PersonaFitEvaluation;
  dataConfidence: DataConfidenceAssessment;
  penalties: VerificationPenalties;
  recommendedExp: number;
  hasDiscrepancy: boolean;
  verifiedTagCount: number;
  unverifiedTagCount: number;
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
  'braille',
  'chữ nổi',
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
 * NLP context notes, Spatial Proximity Geofence (<= 50m), and QCVN 10:2014 Persona fits.
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

  let nlpScore = 50; // baseline neutral if notes empty
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
    // In geodesy, effective distance accounts for device GPS accuracy uncertainty
    const accuracyMargin = input.contributorCoords.accuracy
      ? Math.min(30, Math.max(0, Math.round(input.contributorCoords.accuracy)))
      : 0;
    const effectiveDistance = Math.max(0, distanceMeters - accuracyMargin);
    spatialValid = effectiveDistance <= 50;

    if (spatialValid) {
      // 0m = 100%, 50m = 80%
      spatialScore = Math.max(80, Math.round(100 - (effectiveDistance / 50) * 20));
    } else {
      // Penalty when exceeding 50m geofence
      spatialScore = Math.max(10, Math.round(60 - Math.min(50, effectiveDistance - 50)));
    }
  }

  // Baseline Combined weighted score (CV: 50%, NLP: 20%, Spatial: 30%)
  let overallScore = Math.round(cvRawScore * 0.5 + nlpScore * 0.2 + spatialScore * 0.3);

  // BR-13 Penalty: If spatial distance exceeds 50m, enforce maximum threshold of 75%
  if (!spatialValid) {
    overallScore = Math.min(overallScore, 75);
  }

  // ── QCVN 10:2014 Persona Scoring & Penalty Rules ───────────────────────────
  const selectedSet = new Set(input.selectedTags);
  const hasRamp = selectedSet.has('exterior_ramp_present');
  const hasComfortableRamp = selectedSet.has('ramp_slope_comfortable');
  const hasSteps = selectedSet.has('steps_present');
  const hasDoorWidth = selectedSet.has('door_width_ok');
  const hasFlatThreshold = selectedSet.has('door_threshold_flat');
  const hasElevator = selectedSet.has('elevator_accessible');
  const hasAccessibleRestroom =
    selectedSet.has('restroom_accessible_stall') || selectedSet.has('restroom_grab_bars');

  const hasTactileGuiding = selectedSet.has('tactile_paving_guiding');
  const hasTactileWarning = selectedSet.has('tactile_paving_warning');
  const isTactileBlocked = selectedSet.has('tactile_paving_blocked');
  const hasOverheadClearance = selectedSet.has('overhead_clearance_ok');
  const hasBraille = selectedSet.has('braille_signage_present');
  const hasAudio = selectedSet.has('audible_signal_present');

  // Penalty Flags
  const stepsWithoutRamp = hasSteps && !hasRamp;
  const tactileBlocked = isTactileBlocked;

  // ── Wheelchair Score Formula ──────────────────────────────────────────────
  let cvWheelchair = cvRawScore;
  if (!hasRamp && !hasSteps && !hasDoorWidth) {
    cvWheelchair = Math.round(cvRawScore * 0.5);
  }

  let wheelchairScore = Math.round(cvWheelchair * 0.5 + spatialScore * 0.3 + nlpScore * 0.2);

  // Severe Penalty: Steps present without Ramp -> Deduct 40%
  if (stepsWithoutRamp) {
    wheelchairScore = Math.max(10, wheelchairScore - 40);
  }

  // ── Blind Score Formula ───────────────────────────────────────────────────
  // If no tactile/braille/audio features exist, blind CV score is 0
  let cvBlind = 0;
  if (hasTactileGuiding || hasTactileWarning || hasBraille || hasAudio) {
    cvBlind = cvRawScore;
  }

  let blindScore = Math.round(cvBlind * 0.5 + spatialScore * 0.3 + nlpScore * 0.2);

  // Severe Penalty: Tactile blocked by obstacles -> Clamp to AwaitingMoreInfo
  if (tactileBlocked) {
    blindScore = Math.min(25, blindScore);
  }

  // ── Persona Fit Qualitative Evaluation ────────────────────────────────────
  let electricWheelchair: PersonaFitEvaluation['electricWheelchair'] = 'Accessible';
  let manualWheelchairSelf: PersonaFitEvaluation['manualWheelchairSelf'] = 'NeedsAssistance';
  let visualImpaired: PersonaFitEvaluation['visualImpaired'] = 'NeedsCaution';

  if (stepsWithoutRamp) {
    electricWheelchair = 'Inaccessible';
    manualWheelchairSelf = 'Inaccessible';
  } else if (hasRamp) {
    if (hasComfortableRamp && (hasDoorWidth || hasFlatThreshold)) {
      electricWheelchair = 'FullyAccessible';
      manualWheelchairSelf = 'FullyAccessible';
    } else {
      electricWheelchair = 'FullyAccessible';
      manualWheelchairSelf = 'NeedsAssistance';
    }
  } else if (hasElevator || hasAccessibleRestroom) {
    electricWheelchair = 'Accessible';
    manualWheelchairSelf = 'NeedsAssistance';
  }

  if (tactileBlocked) {
    visualImpaired = 'Unsafe';
  } else if ((hasTactileGuiding || hasTactileWarning) && (hasOverheadClearance || hasAudio || hasBraille)) {
    visualImpaired = 'Safe';
  } else if (hasTactileGuiding || hasTactileWarning) {
    visualImpaired = 'NeedsCaution';
  }

  // ── Anti-Cheat: Empty Feature Selection & Discrepancy Gates ───────────────
  const hasNoFeatures = input.selectedTags.length === 0;
  const hasDiscrepancy = !hasNoFeatures && cvRawScore === 0;

  if (hasNoFeatures) {
    overallScore = Math.min(overallScore, 25);
    wheelchairScore = Math.min(wheelchairScore, 20);
    blindScore = Math.min(blindScore, 20);
    electricWheelchair = 'Inaccessible';
    manualWheelchairSelf = 'Inaccessible';
    visualImpaired = 'NeedsCaution';
  } else if (hasDiscrepancy) {
    overallScore = Math.min(overallScore, 35);
    wheelchairScore = Math.min(wheelchairScore, 30);
    blindScore = Math.min(blindScore, 25);
    electricWheelchair = 'Inaccessible';
    manualWheelchairSelf = 'Inaccessible';
    visualImpaired = 'NeedsCaution';
  }

  // ── Data Confidence Assessment ─────────────────────────────────────────────
  const dataConfidence: DataConfidenceAssessment = {
    rampGeometryMeasured: false,
    confidenceLevel: hasNoFeatures || hasDiscrepancy ? 25 : 75,
    recommendationPrompt: hasNoFeatures
      ? 'Chưa ghi nhận đặc điểm tiếp cận. Hãy chụp trực diện lối vào, ram dốc hoặc cửa chính.'
      : hasDiscrepancy
      ? 'Ảnh chưa thể hiện đặc tính bạn đã chọn. Vui lòng chụp rõ góc lối vào/ram dốc hoặc chờ kiểm duyệt viên xác minh.'
      : 'Để thẩm định độ dốc 1/20 tuyệt đối theo QCVN, hãy chụp thêm ảnh góc nghiêng hoặc quay video bước dọc theo dốc.',
  };

  // ── Granular Verification: Verified vs Unverified Feature Counts ──────────
  const verifiedTagCount = input.verifiedTagCount ?? (cvRawScore > 0 ? input.selectedTags.length : 0);
  const unverifiedTagCount = input.unverifiedTagCount ?? (cvRawScore === 0 ? input.selectedTags.length : 0);

  // Categorize overall status according to BR-09 & BR-10
  let status: VerificationStatus = 'PendingModeration';
  let statusLabel = 'Chờ duyệt viên';
  let statusDescription =
    'Thông tin ở mức tốt. Đóng góp sẽ được kiểm duyệt viên xác nhận sớm.';

  if (hasNoFeatures || hasDiscrepancy || overallScore < 60) {
    status = 'AwaitingMoreInfo';
    statusLabel = 'Cần thêm thông tin';
    statusDescription = hasNoFeatures
      ? 'Chưa phát hiện hoặc xác nhận đặc điểm tiếp cận nào. Bạn có thể chụp lại góc rộng hơn hoặc chọn thêm tiêu chí.'
      : hasDiscrepancy
      ? 'Ảnh chưa thể hiện đặc tính bạn đã chọn. Vui lòng chụp rõ góc lối vào/ram dốc hoặc chờ kiểm duyệt viên xác minh.'
      : 'Hình ảnh hoặc vị trí chưa rõ ràng. Bạn có thể chụp lại góc rộng hơn để bổ sung.';
  } else if (unverifiedTagCount > 0) {
    status = 'PendingModeration';
    statusLabel = 'Chờ duyệt viên';
    statusDescription =
      `Đã xác thực ${verifiedTagCount}/${input.selectedTags.length} đặc điểm qua ảnh. ${unverifiedTagCount} đặc điểm tự khai báo thêm cần kiểm duyệt viên xác minh.`;
  } else if (overallScore >= 80 && spatialValid) {
    status = 'AutoVerified';
    statusLabel = 'Tự động duyệt';
    statusDescription =
      'Độ tin cậy cao, hình ảnh và vị trí chuẩn xác. Đủ điều kiện xuất bản lên bản đồ.';
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
    personaScores: {
      wheelchairScore,
      blindScore,
    },
    personaFit: {
      electricWheelchair,
      manualWheelchairSelf,
      visualImpaired,
    },
    dataConfidence,
    penalties: {
      stepsWithoutRamp,
      tactileBlocked,
    },
    recommendedExp: 50,
    hasDiscrepancy,
    verifiedTagCount,
    unverifiedTagCount,
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

let resolveServiceUrlFn: ((port: number, envOverride?: string) => string) | null = null;
let postMultipartFn: ((url: string, formData: FormData, timeoutMs?: number) => Promise<any>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const clientModule = require('@/shared/api/client');
  resolveServiceUrlFn = clientModule.resolveServiceUrl;
  postMultipartFn = clientModule.postMultipart;
} catch {
  resolveServiceUrlFn = null;
  postMultipartFn = null;
}

/**
 * Verification Adapter: Evaluates the multi-modal verification matrix deterministically on mobile.
 * Backend full verification occurs asynchronously via Hangfire worker after media upload.
 */
export async function verifyWithAiOrFallback(
  _imageUri: string,
  input: VerificationMatrixInput
): Promise<VerificationMatrixResult> {
  return evaluateVerificationMatrix(input);
}

