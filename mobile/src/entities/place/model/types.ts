export type PoiCategory =
  | 'mall'
  | 'supermarket'
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'transit'
  | 'market'
  | 'park'
  | 'other'
  | (string & {});

export interface PlaceDto {
  id: string;
  name: string;
  category: PoiCategory;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  brand?: string | null;
  operator?: string | null;
  lng: number;
  lat: number;
  has_ramp?: boolean | null;
  has_elevator?: boolean | null;
  has_tactile_paving?: boolean | null;
  has_accessible_restroom?: boolean | null;
  door_width_ok?: boolean | null;
  accessibility_score: number;
  accessibility_note: string | null;
  floor_level?: number | null;
  building_id?: string | null;
  has_accessible_elevator?: boolean | null;
  has_accessible_parking?: boolean | null;
  has_step_free?: boolean | null;
  last_verified_at?: string | null;
  isAddressLoading?: boolean;
  legacy_feature_values?: {
    ramp: boolean | null;
    entranceDoor: boolean | null;
    elevator: boolean | null;
    accessibleRestroom: boolean | null;
    tactilePaving: boolean | null;
  };
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Canonical AccessibilityFeatureType matching backend domain enum (B.2):
 * Ramp = 1, Elevator = 2, AccessibleRestroom = 3, EntranceDoor = 5.
 * Values 4, 6, 7 are unused per NEW Technical _ Design Specification.docx
 */
export enum AccessibilityFeatureType {
  Ramp = 1,
  Elevator = 2,
  AccessibleRestroom = 3,
  EntranceDoor = 5,
}

export const AccessibilityFeatureTypeMap: Record<AccessibilityFeatureType, string> = {
  [AccessibilityFeatureType.Ramp]: 'Ramp',
  [AccessibilityFeatureType.Elevator]: 'Elevator',
  [AccessibilityFeatureType.AccessibleRestroom]: 'AccessibleRestroom',
  [AccessibilityFeatureType.EntranceDoor]: 'EntranceDoor',
};

export const CanonicalFeatureNameToType: Record<string, AccessibilityFeatureType> = {
  Ramp: AccessibilityFeatureType.Ramp,
  Elevator: AccessibilityFeatureType.Elevator,
  AccessibleRestroom: AccessibilityFeatureType.AccessibleRestroom,
  EntranceDoor: AccessibilityFeatureType.EntranceDoor,
  ramp: AccessibilityFeatureType.Ramp,
  elevator: AccessibilityFeatureType.Elevator,
  accessibleRestroom: AccessibilityFeatureType.AccessibleRestroom,
  entranceDoor: AccessibilityFeatureType.EntranceDoor,
  door: AccessibilityFeatureType.EntranceDoor,
};

export interface MapRegion {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  source?: 'accessmap' | 'osm';
  placeDto?: PlaceDto;
}
