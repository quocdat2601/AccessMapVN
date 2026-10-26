import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/shared/api/client';
import type { CapturedContributionMedia, ContributionSubmissionRecord } from './types';

const STORAGE_KEY = '@accessmap_pending_submissions';

let pendingMedia: CapturedContributionMedia | null = null;
let submissionHistory: ContributionSubmissionRecord[] = [];
let hasLoadedFromStorage = false;

export function setPendingContributionMedia(media: CapturedContributionMedia | null) {
  pendingMedia = media;
}

export function getPendingContributionMedia(): CapturedContributionMedia | null {
  return pendingMedia;
}

export function clearPendingContributionMedia() {
  pendingMedia = null;
}

export async function loadContributionRecords(forceSync = false): Promise<ContributionSubmissionRecord[]> {
  if (hasLoadedFromStorage && !forceSync) return [...submissionHistory];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: ContributionSubmissionRecord[] = JSON.parse(raw);
      // Prune records older than 24 hours to prevent stale local cache from haunting venues
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      submissionHistory = Array.isArray(parsed)
        ? parsed.filter((r) => typeof r.createdAt === 'number' && r.createdAt > cutoff)
        : [];
      if (submissionHistory.length !== parsed.length) {
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(submissionHistory)).catch(() => {});
      }
    }
  } catch {
    // Fallback gracefully to in-memory store
  }
  hasLoadedFromStorage = true;
  return [...submissionHistory];
}

export async function syncPendingSubmissionsWithBackend(): Promise<ContributionSubmissionRecord[]> {
  await loadContributionRecords();
  const pending = submissionHistory.filter(
    (r) => r.status === 'Pending Moderation' || r.status === 'Submitted'
  );
  if (pending.length === 0) return [...submissionHistory];

  const ids = pending.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return [...submissionHistory];

  try {
    const statuses = await apiClient.get<
      Array<{
        submission_id: string;
        id: string;
        client_submission_id?: string;
        status: string;
        points_awarded: number;
      }>
    >(`/api/v1/submissions/status?ids=${encodeURIComponent(ids.join(','))}`);

    if (Array.isArray(statuses) && statuses.length > 0) {
      let changed = false;
      for (const item of statuses) {
        const record = submissionHistory.find(
          (r) => r.id === item.submission_id || r.id === item.id || r.id === item.client_submission_id
        );
        if (record) {
          const rawStatus = (item.status || '').toLowerCase();
          let newStatus: ContributionSubmissionRecord['status'] = record.status;
          if (rawStatus === 'rejected') {
            newStatus = 'Rejected';
          } else if (rawStatus === 'published' || rawStatus === 'autoverified') {
            newStatus = 'Auto-Verified';
          }

          if (newStatus !== record.status) {
            record.status = newStatus;
            if (typeof item.points_awarded === 'number') {
              record.pointsAwarded = item.points_awarded;
            }
            changed = true;
          }
        }
      }

      if (changed) {
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(submissionHistory)).catch(() => {});
      }
    }
  } catch {
    // Fail safe to in-memory/cache on network drop
  }

  return [...submissionHistory];
}

export async function clearContributionRecords(): Promise<void> {
  submissionHistory = [];
  hasLoadedFromStorage = true;
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function addContributionRecord(record: ContributionSubmissionRecord) {
  submissionHistory.unshift(record);
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(submissionHistory)).catch(() => {});
}

export function getContributionRecords(): ContributionSubmissionRecord[] {
  return [...submissionHistory];
}

export function getTotalPoints(): number {
  return submissionHistory.reduce((acc, curr) => acc + curr.pointsAwarded, 0);
}
