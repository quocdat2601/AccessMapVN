import assert from 'node:assert';
import {
  calculateHaversineDistanceMeters,
  evaluateVerificationMatrix,
  type VerificationMatrixInput,
} from '../services/verificationEngine.ts';

export function runVerificationEngineTests() {
  console.log('🧪 [TEST SUITE 1] verificationEngine.test.ts');

  // Test Case 1: Điểm tổng hợp >= 80% -> Trả về trạng thái AutoVerified
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.92, // 92% CV
      textDescription: 'Lối vào có ram dốc thoải, cửa kính tự động rộng rãi thuận tiện cho xe lăn',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 }, // Cách 0m
      selectedTags: ['exterior_ramp_present', 'door_width_ok'],
    };

    const result = evaluateVerificationMatrix(input);
    assert.ok(result.overallScore >= 80, `Expected score >= 80, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'AutoVerified');
    assert.strictEqual(result.spatialValid, true);
    assert.strictEqual(result.spatialDistanceMeters, 0);
    assert.strictEqual(result.recommendedExp, 50);
    console.log('  ✅ Test Case 1: Overall Score >= 80% -> AutoVerified (PASSED)');
  }

  // Test Case 2: Điểm tổng hợp trong khoảng 60% - 79% -> Trả về PendingModeration
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.68, // 68% CV vừa phải
      textDescription: '', // Không có ghi chú
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7737, longitude: 106.7012 }, // Cách ~15m
      selectedTags: ['exterior_ramp_present'],
    };

    const result = evaluateVerificationMatrix(input);
    assert.ok(
      result.overallScore >= 60 && result.overallScore < 80,
      `Expected 60 <= score < 80, got ${result.overallScore}`
    );
    assert.strictEqual(result.status, 'PendingModeration');
    assert.strictEqual(result.spatialValid, true);
    console.log('  ✅ Test Case 2: 60% <= Overall Score < 80% -> PendingModeration (PASSED)');
  }

  // Test Case 3: Điểm tổng hợp < 60% -> Trả về AwaitingMoreInfo
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.35, // CV thấp / mờ
      textDescription: 'ảnh chụp tối',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7738, longitude: 106.7013 }, // Cách ~30m
      selectedTags: [],
    };

    const result = evaluateVerificationMatrix(input);
    assert.ok(result.overallScore < 60, `Expected score < 60, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'AwaitingMoreInfo');
    console.log('  ✅ Test Case 3: Overall Score < 60% -> AwaitingMoreInfo (PASSED)');
  }

  // Test Case 4: Khoảng cách GPS > 50m -> Gắn cờ vi phạm ranh giới thực địa (spatialValid = false)
  {
    // Khoảng cách giữa 2 điểm lệch xa ~250m
    const coordUser = { latitude: 10.7736, longitude: 106.7011 };
    const coordPoi = { latitude: 10.7758, longitude: 106.7025 };

    const distance = calculateHaversineDistanceMeters(coordUser, coordPoi);
    assert.ok(distance > 50, `Expected distance > 50m, got ${distance}m`);

    const input: VerificationMatrixInput = {
      cvConfidence: 0.95,
      textDescription: 'Ram dốc chuẩn',
      contributorCoords: coordUser,
      poiCoords: coordPoi,
      selectedTags: ['exterior_ramp_present'],
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.spatialValid, false);
    assert.ok(result.spatialDistanceMeters! > 50);
    // Khi vi phạm ranh giới GPS > 50m, theo BR-13 không được AutoVerified
    assert.notStrictEqual(result.status, 'AutoVerified');
    console.log(`  ✅ Test Case 4: Distance ${distance}m > 50m -> spatialValid = false (PASSED)`);
  }
}

if (process.argv[1]?.endsWith('verificationEngine.test.ts')) {
  runVerificationEngineTests();
}
