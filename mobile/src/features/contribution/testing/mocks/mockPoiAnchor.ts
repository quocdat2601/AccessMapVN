export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export const KNOWN_POI_ANCHORS: Record<string, GeoCoordinate> = {
  'saigon-centre': { latitude: 10.7736, longitude: 106.7011 },
  'bitexco': { latitude: 10.7716, longitude: 106.7044 },
  'vinhomes-grand-park': { latitude: 10.8492, longitude: 106.8407 },
  's9.01': { latitude: 10.8454, longitude: 106.8373 },
  'vincom-dong-khoi': { latitude: 10.7779, longitude: 106.7018 },
  'ben-thanh-market': { latitude: 10.7725, longitude: 106.6980 },
};

/**
 * Returns ground-truth GPS coordinates for a given POI ID or name.
 * Falls back to contributor's actual coordinates or matching known anchor.
 */
export function getPoiAnchorCoords(
  locationId?: string,
  locationName?: string,
  contributorCoords?: GeoCoordinate | null
): GeoCoordinate {
  const normalizedId = (locationId || '').toLowerCase().trim();
  const normalizedName = (locationName || '').toLowerCase().trim();

  if (normalizedId && KNOWN_POI_ANCHORS[normalizedId]) {
    return KNOWN_POI_ANCHORS[normalizedId];
  }
  if (normalizedName && KNOWN_POI_ANCHORS[normalizedName]) {
    return KNOWN_POI_ANCHORS[normalizedName];
  }
  if (normalizedName.includes('s9.01') || normalizedId.includes('s9.01')) {
    return KNOWN_POI_ANCHORS['s9.01'];
  }
  if (normalizedName.includes('vinhomes') || normalizedId.includes('vinhomes')) {
    return KNOWN_POI_ANCHORS['vinhomes-grand-park'];
  }
  // If contributor has real GPS, anchor to contributor location (0m deviation)
  if (contributorCoords) {
    return contributorCoords;
  }
  // Default anchor (Saigon Centre)
  return { latitude: 10.7736, longitude: 106.7011 };
}

