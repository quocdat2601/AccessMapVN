import type { CapturedContributionMedia, GpsSnapshot } from '@/entities/contribution';
import { getPoiAnchorCoords } from '../mocks/mockPoiAnchor.ts';

export interface PickerImageInput {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  fileSize?: number;
  base64?: string;
}

/**
 * Adapter pattern: Transforms an image selected from the local phone gallery into
 * a standardized `CapturedContributionMedia` object.
 *
 * It automatically injects the ground-truth GPS coordinates of the target POI
 * (`mockPoiAnchor`) so that when the tester picks a photo from home, the spatial
 * distance is 0m and the 50m geofence validation rule passes smoothly.
 */
export function adaptPickerImageToMediaResult(
  input: PickerImageInput,
  targetPoiId: string = 'saigon-centre',
  targetPoiName: string = 'Saigon Centre (Takashimaya)'
): CapturedContributionMedia {
  const anchor = getPoiAnchorCoords(targetPoiId, targetPoiName);
  const now = Date.now();

  const mockGps: GpsSnapshot = {
    latitude: anchor.latitude,
    longitude: anchor.longitude,
    accuracy: 5,
    timestamp: now,
  };

  return {
    id: `test-gallery-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'photo',
    uri: input.uri,
    width: input.width ?? 1280,
    height: input.height ?? 720,
    base64: input.base64,
    capturedAt: now,
    locationId: targetPoiId,
    locationName: targetPoiName,
    gps: mockGps,
  };
}
