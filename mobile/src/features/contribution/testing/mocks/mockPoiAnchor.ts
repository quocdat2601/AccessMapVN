export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export const KNOWN_POI_ANCHORS: Record<string, GeoCoordinate> = {
  'saigon-centre': { latitude: 10.7736, longitude: 106.7011 },
  'bitexco': { latitude: 10.7716, longitude: 106.7044 },
  'vinhomes-grand-park': { latitude: 10.8492, longitude: 106.8407 },
  'vincom-dong-khoi': { latitude: 10.7779, longitude: 106.7018 },
  'ben-thanh-market': { latitude: 10.7725, longitude: 106.6980 },
};

/**
 * Returns mock ground-truth GPS coordinates for a given POI ID.
 * When testing at home with gallery images, this ensures the spatial distance is 0m.
 */
export function getPoiAnchorCoords(locationId?: string): GeoCoordinate {
  if (locationId && KNOWN_POI_ANCHORS[locationId]) {
    return KNOWN_POI_ANCHORS[locationId];
  }
  // Default anchor (Saigon Centre)
  return { latitude: 10.7736, longitude: 106.7011 };
}
