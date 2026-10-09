import AsyncStorage from '@react-native-async-storage/async-storage';
import { CapturedContributionMedia } from './types';

const STORAGE_KEY = '@accessmap_pending_submissions';

export interface ContributionSubmissionRecord {
  id: string;
  locationId: string;
  locationName: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  featureTags: string[];
  textDescription?: string;
  gps?: { latitude: number; longitude: number } | null;
  status: 'Auto-Verified' | 'Pending Moderation' | 'Submitted';
  confidenceScore: number;
  pointsAwarded: number;
  createdAt: number;
}

let pendingMedia: CapturedContributionMedia | null = null;
let submissionHistory: ContributionSubmissionRecord[] = [];
let hasLoadedFromStorage = false;

export function setPendingContributionMedia(media: CapturedContributionMedia) {
  pendingMedia = media;
}

export function getPendingContributionMedia() {
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
    // Graceful fallback to in-memory store
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

