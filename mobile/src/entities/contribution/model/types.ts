export type CaptureMode = 'photo' | 'video';

export interface GpsSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface CapturedContributionMedia {
  id: string;
  type: CaptureMode;
  uri: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  capturedAt: number;
  locationId: string;
  locationName: string;
  gps: GpsSnapshot | null;
  base64?: string;
}

export interface ContributionLocation {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface ContributionSubmissionRecord {
  id: string;
  locationId: string;
  locationName: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  featureTags: string[];
  textDescription?: string;
  gps?: { latitude: number; longitude: number } | null;
  status: 'Auto-Verified' | 'Pending Moderation' | 'Submitted' | 'Rejected' | 'Published';
  confidenceScore: number;
  pointsAwarded: number;
  createdAt: number;
}
