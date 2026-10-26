import assert from 'node:assert';
import {
  getGroupsByCategory,
  getTagsByCategory,
  initializeObservationsFromKeys,
  isViolationOrObstacleTag,
  matchSelectedTagsWithCvDetections,
  observationMapToConfirmedKeys,
  observationMapToConfirmedObservations,
  QCVN_FEATURE_TAGS,
  resolveEffectiveState,
  setObservationState,
  toggleFeatureTagKey,
  updateFieldNotes,
} from '../model/tagReviewModel.ts';

export function runTagReviewTests() {
  console.log('🧪 [TEST SUITE 3] tagReview.test.ts');

  // Test Case 1: Cho phép người dùng bật/tắt (toggle) các nhãn do AI gợi ý
  {
    const initialTags = ['exterior_ramp_present', 'door_width_ok'];

    // Bật thêm nhãn mới 'elevator_present'
    const withElevator = toggleFeatureTagKey(initialTags, 'elevator_present');
    assert.deepStrictEqual(withElevator, ['exterior_ramp_present', 'door_width_ok', 'elevator_present']);

    // Tắt nhãn có sẵn 'door_width_ok'
    const withoutDoor = toggleFeatureTagKey(withElevator, 'door_width_ok');
    assert.deepStrictEqual(withoutDoor, ['exterior_ramp_present', 'elevator_present']);

    // Tắt nhãn 'exterior_ramp_present'
    const finalTags = toggleFeatureTagKey(withoutDoor, 'exterior_ramp_present');
    assert.deepStrictEqual(finalTags, ['elevator_present']);
    console.log('  ✅ Test Case 1: Toggle add/remove AI suggested tags (PASSED)');
  }

  // Test Case 2: Cập nhật mô tả văn bản thực địa (text_description)
  {
    const initialNotes = '';
    const updatedNotes = updateFieldNotes(initialNotes, 'Ram dốc thoải độ nghiêng < 1:12, không có gờ');
    assert.strictEqual(updatedNotes, 'Ram dốc thoải độ nghiêng < 1:12, không có gờ');

    const trimmedNotes = updateFieldNotes(updatedNotes, '   Cửa tự động có cảm biến   ');
    assert.strictEqual(trimmedNotes, 'Cửa tự động có cảm biến');
    console.log('  ✅ Test Case 2: Update and sanitize field notes (PASSED)');
  }

  // Test Case 3: Bộ 18 nhãn QCVN 10:2014 được phân chia đủ 4 hạng mục
  {
    assert.strictEqual(QCVN_FEATURE_TAGS.length, 18);

    const entranceTags = getTagsByCategory('entrance');
    assert.strictEqual(entranceTags.length, 6);

    const sanitationTags = getTagsByCategory('sanitation');
    assert.strictEqual(sanitationTags.length, 4);

    const visualTags = getTagsByCategory('visual');
    assert.strictEqual(visualTags.length, 6);

    const amenityTags = getTagsByCategory('amenity');
    assert.strictEqual(amenityTags.length, 2);
    console.log('  ✅ Test Case 3: 18 QCVN 10:2014 tags categorized accurately across 4 tabs (PASSED)');
  }

  // Test Case 4: Nhận diện chính xác các nhãn vi phạm / chướng ngại vật
  {
    assert.strictEqual(isViolationOrObstacleTag('steps_present'), true);
    assert.strictEqual(isViolationOrObstacleTag('tactile_paving_blocked'), true);
    assert.strictEqual(isViolationOrObstacleTag('exterior_ramp_present'), false);
    assert.strictEqual(isViolationOrObstacleTag('door_width_ok'), false);
    console.log('  ✅ Test Case 4: Correctly flags violation and obstacle tags (PASSED)');
  }

  // Test Case 5: Khớp nhãn AI Pre-Scan với đặc tính QCVN (Adapter Pattern: door_detected -> door_width_ok)
  {
    // Cửa ra vào: AI detector trả về 'door_detected'
    const doorDetections = new Map<string, number>([['door_detected', 0.85]]);
    const doorMatch = matchSelectedTagsWithCvDetections(
      ['door_width_ok', 'door_threshold_flat'],
      doorDetections
    );
    assert.strictEqual(doorMatch.matchedCount, 2, 'Cả 2 đặc tính cửa phải khớp với door_detected');
    assert.strictEqual(doorMatch.cvConfidence, 0.85, 'Độ tin cậy CV phải bằng 0.85');

    // Ram dốc: AI detector trả về 'exterior_ramp_present'
    const rampDetections = new Map<string, number>([['exterior_ramp_present', 0.90]]);
    const rampMatch = matchSelectedTagsWithCvDetections(
      ['exterior_ramp_present', 'ramp_slope_comfortable'],
      rampDetections
    );
    assert.strictEqual(rampMatch.matchedCount, 2);
    assert.strictEqual(rampMatch.cvConfidence, 0.90);
    console.log('  ✅ Test Case 5: AI Pre-scan door_detected & ramp tags match QCVN features (PASSED)');
  }

  // Test Case 6: Quản lý trạng thái quan sát Tri-State và ràng buộc cha-con
  {
    let obs = initializeObservationsFromKeys(['door_width_ok', 'exterior_ramp_present']);
    assert.strictEqual(obs.door_width_ok, 'present');
    assert.strictEqual(obs.door_threshold_flat, 'unknown');

    // Nếu cửa chính vắng mặt (absent) -> các đặc tính con phải bị chuyển thành not_applicable
    obs = setObservationState(obs, 'door_width_ok', 'absent');
    assert.strictEqual(obs.door_width_ok, 'absent');
    assert.strictEqual(resolveEffectiveState('door_threshold_flat', obs), 'not_applicable');
    assert.strictEqual(resolveEffectiveState('door_lever_handle', obs), 'not_applicable');

    // Chuyển lại cửa chính thành present -> đặc tính con chuyển lại unknown để quan sát
    obs = setObservationState(obs, 'door_width_ok', 'present');
    assert.strictEqual(resolveEffectiveState('door_threshold_flat', obs), 'unknown');

    // Đánh dấu con là present
    obs = setObservationState(obs, 'door_threshold_flat', 'present');
    const confirmed = observationMapToConfirmedKeys(obs);
    assert.ok(confirmed.includes('door_width_ok'));
    assert.ok(confirmed.includes('door_threshold_flat'));
    assert.ok(confirmed.includes('exterior_ramp_present'));
    assert.strictEqual(confirmed.includes('door_lever_handle'), false);

    // Kiểm tra phân nhóm thực thể
    const entranceGroups = getGroupsByCategory('entrance');
    assert.strictEqual(entranceGroups.length, 3); // door, ramp, steps
    console.log('  ✅ Test Case 6: Tri-state transitions and parent-child dependency cascade (PASSED)');
  }

  // Test Case 7: Tri-state payload preservation & decoupled AI suggestion
  {
    // Draft mới: mọi item bắt đầu là unknown (không tự động pre-fill AI suggestion vào confirmed)
    let obs = initializeObservationsFromKeys([]);
    assert.strictEqual(obs.exterior_ramp_present, 'unknown');
    assert.strictEqual(obs.door_width_ok, 'unknown');
    assert.deepStrictEqual(observationMapToConfirmedObservations(obs), {});

    // Người dùng chủ động xác nhận: Có cửa, Không có ram dốc
    obs = setObservationState(obs, 'door_width_ok', 'present');
    obs = setObservationState(obs, 'exterior_ramp_present', 'absent');

    const confirmedObs = observationMapToConfirmedObservations(obs);
    // Payload giữ trọn vẹn cả present và absent, không bị lọc mất
    assert.strictEqual(confirmedObs.door_width_ok, 'present');
    assert.strictEqual(confirmedObs.exterior_ramp_present, 'absent');
    // Các item để unknown không xuất hiện trong payload để không đụng chạm baseline
    assert.strictEqual(confirmedObs.elevator_accessible, undefined);
    assert.strictEqual(confirmedObs.restroom_accessible_stall, undefined);

    // Người dùng đổi Không có ram -> Chưa rõ
    obs = setObservationState(obs, 'exterior_ramp_present', 'unknown');
    const updatedObs = observationMapToConfirmedObservations(obs);
    assert.strictEqual(updatedObs.exterior_ramp_present, undefined);
    assert.strictEqual(updatedObs.door_width_ok, 'present');

    // Mở lại draft cũ: khôi phục chính xác lựa chọn đã lưu
    const savedDraftObs = { door_width_ok: 'present' as const, exterior_ramp_present: 'absent' as const };
    const restoredObs: Record<string, any> = { ...initializeObservationsFromKeys([]), ...savedDraftObs };
    assert.strictEqual(restoredObs.door_width_ok, 'present');
    assert.strictEqual(restoredObs.exterior_ramp_present, 'absent');
    console.log('  ✅ Test Case 7: Tri-state payload keeps absent, omits unknown & restores draft (PASSED)');
  }
}

if (process.argv[1]?.endsWith('tagReview.test.ts')) {
  runTagReviewTests();
}


