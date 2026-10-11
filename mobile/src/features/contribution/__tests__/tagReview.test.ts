import assert from 'node:assert';
import {
  getTagsByCategory,
  isViolationOrObstacleTag,
  QCVN_FEATURE_TAGS,
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
}

if (process.argv[1]?.endsWith('tagReview.test.ts')) {
  runTagReviewTests();
}

