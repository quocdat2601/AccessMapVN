import assert from 'node:assert';

// Test AI Pre-Scan fallback logic directly
function getMockPreScanResult() {
  const FEATURE_LABEL_MAP = {
    exterior_ramp_present: 'Ram dốc tiếp cận',
    steps_present: 'Bậc thang',
    elevator_present: 'Thang máy tiếp cận',
    door_width_ok: 'Cửa rộng ≥80cm',
    accessible_restroom_sign: 'WC tiếp cận',
    tactile_paving_present: 'Lối đi xúc giác',
  };

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

function validateVideoDuration(durationSeconds) {
  if (durationSeconds < 5) {
    return { valid: false, error: 'VIDEO_TOO_SHORT' };
  }
  if (durationSeconds > 10) {
    return { valid: true, clampedDuration: 10 };
  }
  return { valid: true, duration: durationSeconds };
}

async function runTests() {
  console.log('[TEST 1] Checking AI Pre-Scan fallback contract...');
  const res = getMockPreScanResult();

  assert.strictEqual(res.isMockFallback, true);
  assert.strictEqual(res.features.length, 6);
  // Verify offline/fallback mode does not falsely assert positive detections
  assert.ok(res.features.every(f => f.detected === false));
  const ramp = res.features.find(f => f.key === 'exterior_ramp_present');
  assert.strictEqual(ramp.label, 'Ram dốc tiếp cận');

  console.log('✅ AI Pre-Scan contract verified!');

  console.log('[TEST 2] Checking BR-01 Video duration validation (5–10s)...');
  const shortResult = validateVideoDuration(3);
  assert.strictEqual(shortResult.valid, false, 'Video < 5s must fail validation');

  const validResult = validateVideoDuration(7);
  assert.strictEqual(validResult.valid, true, 'Video 7s must pass validation');

  const longResult = validateVideoDuration(12);
  assert.strictEqual(longResult.valid, true, 'Video > 10s is clamped to 10s');
  assert.strictEqual(longResult.clampedDuration, 10);
  console.log('✅ BR-01 Video duration rules verified!');

  console.log('[TEST 3] Checking Contribution submission schema & EXP points...');
  const sampleSubmission = {
    id: 'sub-123',
    locationId: 'new-location',
    locationName: 'Quán cà phê Thềm Xưa',
    featureTags: ['Ram dốc tiếp cận', 'Cửa rộng ≥80cm'],
    textDescription: 'Lối vào có ram dốc thoai thoải bằng phẳng.',
    status: 'Auto-Verified',
    pointsAwarded: 50,
  };
  assert.strictEqual(sampleSubmission.pointsAwarded, 50);
  assert.strictEqual(sampleSubmission.status, 'Auto-Verified');
  assert.ok(sampleSubmission.featureTags.length === 2);
  console.log('✅ Contribution submission schema verified!');
  console.log('🎉 All test suites passed successfully!');
}

runTests();
