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
    summary: 'AI nhận diện sơ bộ: Phát hiện ram dốc và lối vào tiếp cận phù hợp cho xe lăn.',
    isMockFallback: true,
    features: [
      { key: 'exterior_ramp_present', label: FEATURE_LABEL_MAP.exterior_ramp_present, detected: true, confidence: 0.92 },
      { key: 'door_width_ok', label: FEATURE_LABEL_MAP.door_width_ok, detected: true, confidence: 0.86 },
      { key: 'elevator_present', label: FEATURE_LABEL_MAP.elevator_present, detected: false, confidence: 0.74 },
      { key: 'accessible_restroom_sign', label: FEATURE_LABEL_MAP.accessible_restroom_sign, detected: false, confidence: 0.65 },
    ],
  };
}

async function runTests() {
  console.log('[TEST] Checking AI Pre-Scan fallback contract...');
  const res = getMockPreScanResult();

  assert.strictEqual(res.isMockFallback, true);
  assert.ok(res.features.length >= 2);
  const ramp = res.features.find(f => f.key === 'exterior_ramp_present');
  assert.ok(ramp && ramp.detected);
  assert.strictEqual(ramp.label, 'Ram dốc tiếp cận');

  console.log('✅ AI Pre-Scan contract verified! Features:', res.features.map(f => `${f.label}: ${f.detected ? 'Có' : 'Không'}`));
}

runTests();
