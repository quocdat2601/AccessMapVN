import { CapturedContributionMedia } from './types';

export interface ContributionSubmissionRecord {
  id: string;
  locationId: string;
  locationName: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  featureTags: string[];
  gps?: { latitude: number; longitude: number } | null;
  status: 'Auto-Verified' | 'Pending Moderation' | 'Submitted';
  confidenceScore: number;
  pointsAwarded: number;
  createdAt: number;
}

let pendingMedia: CapturedContributionMedia | null = null;
const submissionHistory: ContributionSubmissionRecord[] = [];

export function setPendingContributionMedia(media: CapturedContributionMedia) {
  pendingMedia = media;
}

export function getPendingContributionMedia() {
  return pendingMedia;
}

export function clearPendingContributionMedia() {
  pendingMedia = null;
}

export function addContributionRecord(record: ContributionSubmissionRecord) {
  submissionHistory.unshift(record);
}

export function getContributionRecords(): ContributionSubmissionRecord[] {
  return [...submissionHistory];
}

