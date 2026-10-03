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
}

export interface ContributionLocation {
  id: string;
  name: string;
}
