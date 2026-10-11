import assert from 'node:assert';
import { toggleFeatureTagKey, updateFieldNotes } from '../review/model/tagReviewModel.ts';

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
}

if (process.argv[1]?.endsWith('tagReview.test.ts')) {
  runTagReviewTests();
}
