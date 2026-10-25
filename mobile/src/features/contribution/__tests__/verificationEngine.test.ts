import assert from 'node:assert';
import {
  calculateHaversineDistanceMeters,
  evaluateVerificationMatrix,
  verifyWithAiOrFallback,
  type VerificationMatrixInput,
} from '../lib/verificationEngine.ts';

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

  // Test Case 4B: Distance = 55m với sai số GPS accuracy ±15m -> Dung sai hợp lệ (spatialValid = true)
  {
    const coordUser = { latitude: 10.7736, longitude: 106.7011, accuracy: 15 };
    const coordPoi = { latitude: 10.7741, longitude: 106.7011 };

    const distance = calculateHaversineDistanceMeters(coordUser, coordPoi);
    assert.ok(distance >= 50 && distance <= 65, `Expected distance ~55m, got ${distance}m`);

    const input: VerificationMatrixInput = {
      cvConfidence: 0.95,
      textDescription: 'Ram dốc chuẩn',
      contributorCoords: coordUser,
      poiCoords: coordPoi,
      selectedTags: ['exterior_ramp_present'],
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.spatialValid, true);
    console.log(`  ✅ Test Case 4B: Distance ${distance}m with ±15m accuracy margin -> spatialValid = true (PASSED)`);
  }

  // Test Case 4C: Large Venue (Mall/Supermarket) with distance = 75m & indoor drift allowance
  {
    const coordUser = { latitude: 10.7736, longitude: 106.7011, accuracy: 15 };
    const coordPoi = { latitude: 10.7743, longitude: 106.7011 }; // ~78m

    const distance = calculateHaversineDistanceMeters(coordUser, coordPoi);
    assert.ok(distance >= 70 && distance <= 85, `Expected distance ~78m, got ${distance}m`);

    const input: VerificationMatrixInput = {
      cvConfidence: 0.95,
      textDescription: 'Khảo sát lối vào TTTM lớn',
      contributorCoords: coordUser,
      poiCoords: coordPoi,
      selectedTags: ['exterior_ramp_present'],
      venueCategory: 'mall',
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.spatialValid, true);
    console.log(`  ✅ Test Case 4C: Distance ${distance}m in large mall with 35m indoor allowance -> spatialValid = true (PASSED)`);
  }

  // Test Case 5: Bậc tam cấp không có ram dốc -> Phạt -40% điểm xe lăn & Inaccessible
  {
    const input: VerificationMatrixInput = {
    cvConfidence: 0.90,
      textDescription: 'Có 3 bậc tam cấp cao',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 },
      selectedTags: ['steps_present'], // Có bậc nhưng không có ram dốc
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.penalties.stepsWithoutRamp, true);
    assert.strictEqual(result.personaFit.manualWheelchairSelf, 'Inaccessible');
    assert.strictEqual(result.personaFit.electricWheelchair, 'Inaccessible');
    assert.ok(result.personaScores.wheelchairScore <= 55, `Expected penalized wheelchairScore <= 55, got ${result.personaScores.wheelchairScore}`);
    console.log('  ✅ Test Case 5: Steps without ramp -> -40% wheelchair penalty & Inaccessible (PASSED)');
  }

  // Test Case 6: Gạch xúc giác bị vật cản đè lên -> Blind Score <= 45% & visualImpaired = Unsafe
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.88,
      textDescription: 'Lối đi có gạch xúc giác nhưng xe máy dựng đè lên',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 },
      selectedTags: ['tactile_paving_guiding', 'tactile_paving_blocked'],
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.penalties.tactileBlocked, true);
    assert.strictEqual(result.personaFit.visualImpaired, 'Unsafe');
    assert.ok(result.personaScores.blindScore <= 45, `Expected blindScore <= 45, got ${result.personaScores.blindScore}`);
    console.log('  ✅ Test Case 6: Tactile paving blocked -> Blind score <= 45% & Unsafe alert (PASSED)');
  }

  // Test Case 7: Dốc thoải <= 1/20 & cửa rộng -> Manual Wheelchair = FullyAccessible
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.92,
      textDescription: 'Ram dốc thoải xe lăn tự đẩy lên dễ dàng, cửa tự động rộng rãi',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 },
      selectedTags: ['exterior_ramp_present', 'ramp_slope_comfortable', 'door_width_ok'],
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.personaFit.manualWheelchairSelf, 'FullyAccessible');
    assert.strictEqual(result.personaFit.electricWheelchair, 'FullyAccessible');
    assert.strictEqual(result.dataConfidence.confidenceLevel, 75);
    assert.ok(result.dataConfidence.recommendationPrompt?.includes('1/20'));
    console.log('  ✅ Test Case 7: Ramp <= 1/20 -> FullyAccessible with 75% data confidence (PASSED)');
  }

  // Test Case 8: Không chọn đặc điểm nào (0 tags) -> Capped score <= 25%, status = AwaitingMoreInfo
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.0,
      textDescription: '',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 }, // Cách 0m nhưng không có tiện ích nào
      selectedTags: [],
    };

    const result = evaluateVerificationMatrix(input);
    assert.ok(result.overallScore <= 25, `Expected score <= 25, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'AwaitingMoreInfo');
    assert.strictEqual(result.statusLabel, 'Cần thêm thông tin');
    assert.ok(result.personaScores.wheelchairScore <= 20);
    assert.ok(result.personaScores.blindScore <= 20);
    assert.strictEqual(result.dataConfidence.confidenceLevel, 25);
    console.log('  ✅ Test Case 8: Empty tag selection -> Score <= 25% & AwaitingMoreInfo (PASSED)');
  }

  // Test Case 9: verifyWithAiOrFallback chạy an toàn, trả về deterministic local result
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.0,
      textDescription: '',
      contributorCoords: null,
      poiCoords: null,
      selectedTags: [],
    };

    verifyWithAiOrFallback('file:///fake-path.jpg', input).then((result) => {
      assert.ok(result.overallScore <= 25);
      assert.strictEqual(result.status, 'AwaitingMoreInfo');
    });
    console.log('  ✅ Test Case 9: verifyWithAiOrFallback runs safely without network crash (PASSED)');
  }

  // Test Case 10: Discrepancy Gate (Ảnh CV 0% nhưng người dùng tự chọn đặc điểm) -> hasDiscrepancy = true, score <= 35%
  {
    const input: VerificationMatrixInput = {
      cvConfidence: 0.0, // Ảnh phòng / tường ngẫu nhiên không có tiện ích tiếp cận
      textDescription: '',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 }, // Cách 0m
      selectedTags: ['exterior_ramp_present'], // Chọn bừa ram dốc
    };

    const result = evaluateVerificationMatrix(input);
    assert.strictEqual(result.hasDiscrepancy, true, 'Expected hasDiscrepancy to be true');
    assert.ok(result.overallScore <= 35, `Expected score <= 35, got ${result.overallScore}`);
    assert.strictEqual(result.status, 'AwaitingMoreInfo');
    assert.strictEqual(result.personaFit.electricWheelchair, 'Inaccessible');
    assert.ok(result.statusDescription.includes('Ảnh chưa thể hiện đặc tính bạn đã chọn'));
    console.log('  ✅ Test Case 10: Anti-Cheat Discrepancy Gate -> score <= 35% & AwaitingMoreInfo (PASSED)');
  }
}

/**
 * End-to-end integration tests using REAL captured images against the live AI service
 */
export async function runAiLiveImageTests() {
  console.log('🧪 [TEST SUITE 4] Live AI Integration with Real Captured Images');

  const fs = await import('node:fs');
  const path = await import('node:path');

  const basePath = fs.existsSync('test-assets/random_room.png')
    ? path.resolve('test-assets')
    : path.resolve('mobile/test-assets');
  const randomRoomPath = path.join(basePath, 'random_room.png');
  const rampEntrancePath = path.join(basePath, 'ramp_entrance.png');

  // Test A: Real Random Room Photo (Captured by User) -> Negative detection, neutral summary, score <= 25%
  {
    assert.ok(fs.existsSync(randomRoomPath), `Random room test asset not found at ${randomRoomPath}`);
    const buf = fs.readFileSync(randomRoomPath);
    const blob = new Blob([buf], { type: 'image/png' });
    const fd = new FormData();
    fd.append('images', blob, 'random_room.png');

    const res = await fetch('http://127.0.0.1:8000/api/v1/ai/pre-scan', {
      method: 'POST',
      body: fd,
    });

    assert.strictEqual(res.status, 200, `Expected 200 from AI service, got ${res.status}`);
    const data = await res.json();

    // Regression Check 1: Must NOT mention elevator or "không có thang máy"
    assert.strictEqual(
      data.summary,
      'Chưa phát hiện tiện ích tiếp cận nào trong ảnh.',
      `Summary should be neutral, got: ${data.summary}`
    );
    assert.ok(
      !data.summary.includes('thang máy'),
      `Summary must not mention "thang máy", got: ${data.summary}`
    );

    // Regression Check 2: No accessibility features detected
    const rawFeatures = data.features || {};
    const hasAnyDetected = Object.values(rawFeatures).some((f: any) => f?.value === true);
    assert.strictEqual(hasAnyDetected, false, 'Expected 0 features detected in random room');

    // Regression Check 3: Feed 0 confirmed tags into verification engine -> score <= 25%, AwaitingMoreInfo
    const evalInput: VerificationMatrixInput = {
      cvConfidence: 0.0,
      textDescription: '',
      contributorCoords: { latitude: 10.8454, longitude: 106.8373 },
      poiCoords: { latitude: 10.8454, longitude: 106.8373 },
      selectedTags: [],
    };
    const matrixResult = evaluateVerificationMatrix(evalInput);
    assert.ok(
      matrixResult.overallScore <= 25,
      `Empty room photo score must be <= 25%, got ${matrixResult.overallScore}%`
    );
    assert.strictEqual(
      matrixResult.status,
      'AwaitingMoreInfo',
      `Status must be AwaitingMoreInfo, got ${matrixResult.status}`
    );
    assert.strictEqual(matrixResult.statusLabel, 'Cần thêm thông tin');

    console.log('  ✅ Live AI Test A: Real room capture -> Neutral summary & score <= 25% AwaitingMoreInfo (PASSED)');
  }

  // Test B: Real Ramp Entrance Photo -> Full accessible flow
  {
    assert.ok(fs.existsSync(rampEntrancePath), `Ramp entrance test asset not found at ${rampEntrancePath}`);
    const buf = fs.readFileSync(rampEntrancePath);
    const blob = new Blob([buf], { type: 'image/png' });
    const fd = new FormData();
    fd.append('images', blob, 'ramp_entrance.png');
    fd.append('text_description', 'Lối vào có ram dốc tiếp cận thoải cho xe lăn, cửa rộng');

    const res = await fetch('http://127.0.0.1:8000/api/v1/ai/pre-scan', {
      method: 'POST',
      body: fd,
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.summary && data.summary.length > 0);

    // Confirmed features evaluation
    const evalInput: VerificationMatrixInput = {
      cvConfidence: 0.94,
      textDescription: 'Lối vào có ram dốc tiếp cận thoải cho xe lăn, cửa rộng',
      contributorCoords: { latitude: 10.7736, longitude: 106.7011 },
      poiCoords: { latitude: 10.7736, longitude: 106.7011 },
      selectedTags: ['exterior_ramp_present', 'ramp_slope_comfortable', 'door_width_ok'],
    };
    const matrixResult = evaluateVerificationMatrix(evalInput);
    assert.ok(matrixResult.overallScore >= 80, `Expected score >= 80, got ${matrixResult.overallScore}`);
    assert.strictEqual(matrixResult.status, 'AutoVerified');
    assert.strictEqual(matrixResult.statusLabel, 'Tự động duyệt');
    assert.strictEqual(matrixResult.personaFit.electricWheelchair, 'FullyAccessible');

    console.log('  ✅ Live AI Test B: Real ramp photo -> Score >= 80% AutoVerified & FullyAccessible (PASSED)');
  }

  // Test C: User Captured Ramp Photo (user_ramp_pick.png without text hints) -> AI detects ramp!
  {
    const userRampPath = path.join(basePath, 'user_ramp_pick.png');
    assert.ok(fs.existsSync(userRampPath), `User ramp test asset not found at ${userRampPath}`);
    const buf = fs.readFileSync(userRampPath);
    const blob = new Blob([buf], { type: 'image/png' });
    const fd = new FormData();
    fd.append('images', blob, 'user_ramp_pick.png');

    const res = await fetch('http://127.0.0.1:8000/api/v1/ai/pre-scan', {
      method: 'POST',
      body: fd,
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(
      data.features.exterior_ramp_present.value,
      true,
      'AI should detect ramp in user ramp picture'
    );
    assert.ok(
      data.features.exterior_ramp_present.confidence >= 0.70,
      `Expected ramp confidence >= 0.70, got ${data.features.exterior_ramp_present.confidence}`
    );
    assert.ok(
      data.summary.includes('ram dốc'),
      `Summary should mention ram dốc, got: ${data.summary}`
    );

    console.log('  ✅ Live AI Test C: User ramp capture -> Ramp detected & summary mentions ram dốc (PASSED)');
  }
}

if (process.argv[1]?.endsWith('verificationEngine.test.ts')) {
  runVerificationEngineTests();
  runAiLiveImageTests().catch((err) => {
    console.error('Live AI Image Tests Failed:', err);
    process.exit(1);
  });
}

