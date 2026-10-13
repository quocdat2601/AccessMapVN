import assert from 'node:assert';
import {
  saveSurveyDraft,
  loadSurveyDraft,
  deleteSurveyDraft,
  deleteSurveyDraftOnSuccess,
  refreshDraftSubmissionId,
  clearAllSurveyDrafts,
  setStorageBackendForTesting,
  resetStorageBackend,
  DRAFT_EXPIRATION_MS,
  type StorageBackend,
} from '../model/surveyDraftStore.ts';

// In-memory test storage backend simulating AsyncStorage
class MockStorageBackend implements StorageBackend {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return Array.from(this.map.keys());
  }

  async multiRemove(keys: readonly string[]): Promise<void> {
    for (const k of keys) {
      this.map.delete(k);
    }
  }

  clear() {
    this.map.clear();
  }
}

export async function runSurveyDraftStoreTests() {
  console.log('🧪 [TEST SUITE 5] surveyDraftStore.test.ts');
  const mockStorage = new MockStorageBackend();
  setStorageBackendForTesting(mockStorage);

  try {
    // Test Case 1: Lưu và tải bản nháp đúng schema version 1
    {
      mockStorage.clear();
      const saved = await saveSurveyDraft({
        locationId: 'loc-123',
        locationName: 'Cafe Hòa Bình',
        clientSubmissionId: 'mob-test-12345',
        media: [
          { localUri: 'file:///data/img1.jpg', uploadStatus: 'pending' },
          { remoteUrl: 'https://cdn.accessmap.vn/img2.jpg', uploadStatus: 'uploaded' },
        ],
        featureTags: ['exterior_ramp_present', 'door_width_ok'],
        textDescription: 'Lối vào có ram dốc thoải, cửa rộng',
      });

      assert.strictEqual(saved.schemaVersion, 1);
      assert.strictEqual(saved.clientSubmissionId, 'mob-test-12345');
      assert.strictEqual(saved.media.length, 2);
      assert.strictEqual(saved.media[0].uploadStatus, 'pending');
      assert.strictEqual(saved.media[1].uploadStatus, 'uploaded');

      const loaded = await loadSurveyDraft('loc-123');
      assert.ok(loaded);
      assert.strictEqual(loaded.locationId, 'loc-123');
      assert.strictEqual(loaded.clientSubmissionId, 'mob-test-12345');
      assert.strictEqual(loaded.featureTags.length, 2);
      console.log('  ✅ Test Case 1: Save and load draft with schemaVersion = 1 (PASSED)');
    }

    // Test Case 2: Bảo vệ dung lượng AsyncStorage - loại bỏ base64, chỉ giữ local URI
    {
      mockStorage.clear();
      const longBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(3000);
      const saved = await saveSurveyDraft({
        locationId: 'loc-large',
        clientSubmissionId: 'mob-sanitized',
        media: [
          { localUri: longBase64, uploadStatus: 'pending' },
          { localUri: 'file:///safe/path.jpg', uploadStatus: 'pending' },
        ],
        featureTags: ['door_width_ok'],
        textDescription: '',
      });

      assert.strictEqual(saved.media[0].localUri, undefined); // Base64 stripped
      assert.strictEqual(saved.media[1].localUri, 'file:///safe/path.jpg');
      console.log('  ✅ Test Case 2: Strips large base64, keeps lightweight file URIs (PASSED)');
    }

    // Test Case 3: Bản nháp hết hạn 7 ngày tự động bị hủy
    {
      mockStorage.clear();
      const expiredTimestamp = Date.now() - (DRAFT_EXPIRATION_MS + 1000);
      await saveSurveyDraft({
        locationId: 'loc-expired',
        clientSubmissionId: 'mob-old',
        media: [],
        featureTags: [],
        textDescription: 'Old draft',
        lastSavedAt: expiredTimestamp,
      });

      const loaded = await loadSurveyDraft('loc-expired');
      assert.strictEqual(loaded, null);
      console.log('  ✅ Test Case 3: Expired drafts (>7 days) automatically purged (PASSED)');
    }

    // Test Case 4: Xóa bản nháp CHỈ KHI khớp clientSubmissionId được xác nhận
    {
      mockStorage.clear();
      await saveSurveyDraft({
        locationId: 'loc-match',
        clientSubmissionId: 'mob-match-id-1',
        media: [],
        featureTags: [],
        textDescription: '',
      });

      // Thử xóa với client ID không khớp -> Trả về false, không xóa
      const deletedWrong = await deleteSurveyDraftOnSuccess('loc-match', 'AMV-2026-99999', 'mob-wrong-id');
      assert.strictEqual(deletedWrong, false);
      const stillThere = await loadSurveyDraft('loc-match');
      assert.ok(stillThere);

      // Xóa với client ID khớp -> Trả về true, bản nháp bị xóa
      const deletedRight = await deleteSurveyDraftOnSuccess('loc-match', 'AMV-2026-99999', 'mob-match-id-1');
      assert.strictEqual(deletedRight, true);
      const gone = await loadSurveyDraft('loc-match');
      assert.strictEqual(gone, null);
      console.log('  ✅ Test Case 4: deleteSurveyDraftOnSuccess strictly matches clientSubmissionId (PASSED)');
    }

    // Test Case 5: Xử lý conflict 409 - refreshDraftSubmissionId sinh ID mới
    {
      mockStorage.clear();
      const draft = await saveSurveyDraft({
        locationId: 'loc-conflict',
        clientSubmissionId: 'mob-conflict-old',
        media: [],
        featureTags: ['door_width_ok'],
        textDescription: '',
      });

      const refreshed = refreshDraftSubmissionId(draft);
      assert.notStrictEqual(refreshed.clientSubmissionId, 'mob-conflict-old');
      assert.ok(refreshed.clientSubmissionId.startsWith('mob-'));
      assert.strictEqual(refreshed.locationId, 'loc-conflict');
      console.log('  ✅ Test Case 5: 409 conflict refreshDraftSubmissionId produces fresh ID (PASSED)');
    }

    // Test Case 6: Dọn dẹp toàn bộ bản nháp khi người dùng đăng xuất
    {
      mockStorage.clear();
      await saveSurveyDraft({ locationId: 'loc-a', clientSubmissionId: 'a', media: [], featureTags: [], textDescription: '' });
      await saveSurveyDraft({ locationId: 'loc-b', clientSubmissionId: 'b', media: [], featureTags: [], textDescription: '' });

      const dA = await loadSurveyDraft('loc-a');
      const dB = await loadSurveyDraft('loc-b');
      assert.ok(dA && dB);

      await clearAllSurveyDrafts();
      const afterA = await loadSurveyDraft('loc-a');
      const afterB = await loadSurveyDraft('loc-b');
      assert.strictEqual(afterA, null);
      assert.strictEqual(afterB, null);
      console.log('  ✅ Test Case 6: clearAllSurveyDrafts purges all draft keys on logout (PASSED)');
    }

    // Test Case 7: Phát hiện ảnh cục bộ bị xóa khỏi cache/bộ nhớ thiết bị khi khôi phục draft
    {
      mockStorage.clear();
      await saveSurveyDraft({
        locationId: 'loc-missing-media',
        clientSubmissionId: 'mob-missing-test',
        media: [
          { localUri: 'file:///cache/existing.jpg', uploadStatus: 'pending' },
          { localUri: 'file:///cache/purged_by_os.jpg', uploadStatus: 'pending' },
          { remoteUrl: 'https://cdn.accessmap.vn/safe.jpg', uploadStatus: 'uploaded' },
        ],
        featureTags: ['door_width_ok'],
        textDescription: '',
      });

      // Mock file checker: 'existing.jpg' tồn tại, 'purged_by_os.jpg' đã bị OS dọn dẹp
      const mockFileChecker = async (uri: string) => uri.includes('existing.jpg');

      const restored = await loadSurveyDraft('loc-missing-media', {
        customChecker: mockFileChecker,
      });

      assert.ok(restored);
      assert.strictEqual(restored.media[0].uploadStatus, 'pending');
      assert.strictEqual(restored.media[1].uploadStatus, 'failed'); // Flagged as failed
      assert.strictEqual(restored.media[2].uploadStatus, 'uploaded');
      console.log('  ✅ Test Case 7: Detects missing/purged media and flags uploadStatus as failed (PASSED)');
    }
  } finally {
    resetStorageBackend();
  }
}
