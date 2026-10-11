import assert from 'node:assert';
import { adaptPickerImageToMediaResult, type PickerImageInput } from '../testing/adapters/testImageAdapter.ts';
import { getPoiAnchorCoords } from '../testing/mocks/mockPoiAnchor.ts';
import { calculateHaversineDistanceMeters } from '../services/verificationEngine.ts';

export function runTestImageAdapterTests() {
  console.log('🧪 [TEST SUITE 2] testImageAdapter.test.ts');

  // Test Case 1: Chuyển đổi định dạng ảnh picker sang MediaCaptureResult
  {
    const pickerInput: PickerImageInput = {
      uri: 'file:///data/user/0/host.exp.exponent/cache/ExperienceData/test-gallery-image.jpg',
      width: 1920,
      height: 1080,
      fileName: 'test-gallery-image.jpg',
    };

    const media = adaptPickerImageToMediaResult(pickerInput, 'saigon-centre', 'Saigon Centre (Takashimaya)');

    assert.ok(media.id, 'Media must have unique id');
    assert.strictEqual(media.type, 'photo');
    assert.strictEqual(media.uri, pickerInput.uri);
    assert.strictEqual(media.width, 1920);
    assert.strictEqual(media.height, 1080);
    assert.strictEqual(media.locationId, 'saigon-centre');
    assert.strictEqual(media.locationName, 'Saigon Centre (Takashimaya)');
    assert.ok(media.capturedAt > 0);
    console.log('  ✅ Test Case 1: Convert picker asset to MediaCaptureResult (PASSED)');
  }

  // Test Case 2: Neo tự động tọa độ GPS trùng khớp POI mục tiêu (khoảng cách sai số = 0m)
  {
    const pickerInput: PickerImageInput = {
      uri: 'file:///cache/sample-ramp.png',
    };

    const targetPoiId = 'saigon-centre';
    const poiAnchor = getPoiAnchorCoords(targetPoiId);
    const media = adaptPickerImageToMediaResult(pickerInput, targetPoiId, 'Saigon Centre');

    if (!media.gps) throw new Error('Mock GPS anchor must be populated');
    assert.strictEqual(media.gps.latitude, poiAnchor.latitude);
    assert.strictEqual(media.gps.longitude, poiAnchor.longitude);

    const deviation = calculateHaversineDistanceMeters(
      { latitude: media.gps.latitude, longitude: media.gps.longitude },
      poiAnchor
    );
    assert.strictEqual(deviation, 0, 'Deviation from POI anchor must be 0 meters');
    console.log('  ✅ Test Case 2: Auto-anchor GPS to POI with 0m deviation (PASSED)');
  }
}

if (process.argv[1]?.endsWith('testImageAdapter.test.ts')) {
  runTestImageAdapterTests();
}
