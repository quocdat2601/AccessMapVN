import AsyncStorage from '@react-native-async-storage/async-storage';
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

export async function loadContributionRecords(): Promise<ContributionSubmissionRecord[]> {
  if (hasLoadedFromStorage) return [...submissionHistory];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      submissionHistory = JSON.parse(raw);
    }
  } catch {
    // Fallback gracefully to in-memory store
  }
  hasLoadedFromStorage = true;
  return [...submissionHistory];
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
