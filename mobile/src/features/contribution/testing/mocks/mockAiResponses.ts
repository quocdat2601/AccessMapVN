export interface MockPreScanData {
  features: Array<{
    key: string;
    label: string;
    detected: boolean;
    confidence: number;
  }>;
  summary: string;
}

export const MOCK_PRE_SCAN_SAMPLES: Record<string, MockPreScanData> = {
  highQualityRamp: {
    summary: 'AI nhận diện sơ bộ: Phát hiện ram dốc tiếp cận đạt chuẩn QCVN 10:2014 và cửa ra vào rộng rãi.',
    features: [
      { key: 'exterior_ramp_present', label: 'Ram dốc tiếp cận', detected: true, confidence: 0.94 },
      { key: 'door_width_ok', label: 'Cửa rộng ≥80cm', detected: true, confidence: 0.88 },
      { key: 'steps_present', label: 'Bậc thang', detected: false, confidence: 0.15 },
      { key: 'elevator_present', label: 'Thang máy tiếp cận', detected: false, confidence: 0.5 },
    ],
  },
  hasStepsObstacle: {
    summary: 'AI nhận diện sơ bộ: Phát hiện bậc tam cấp ở lối vào chính, chưa thấy ram dốc hỗ trợ xe lăn.',
    features: [
      { key: 'steps_present', label: 'Bậc thang', detected: true, confidence: 0.91 },
      { key: 'exterior_ramp_present', label: 'Ram dốc tiếp cận', detected: false, confidence: 0.22 },
      { key: 'door_width_ok', label: 'Cửa rộng ≥80cm', detected: true, confidence: 0.82 },
    ],
  },
};

export const MOCK_AI_VERIFY_SAMPLE = {
  overall_score: 88,
  status: 'Auto-Verified',
  cv_score: 92,
  nlp_score: 85,
  spatial_score: 95,
  points_awarded: 50,
  details: 'Dữ liệu ảnh, vị trí GPS và ghi chú trùng khớp cao. Đạt điều kiện tự động xuất bản lên bản đồ tiếp cận.',
};
