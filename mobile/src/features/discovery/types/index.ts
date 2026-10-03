export type PoiCategory = 'mall' | 'hotel' | 'hospital' | 'transit' | 'market' | 'other';

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
  has_ramp: boolean;
  has_elevator: boolean;
  has_tactile_paving: boolean;
  has_accessible_restroom: boolean;
  door_width_ok: boolean;
  accessibility_score: number;
  accessibility_note: string | null;
  floor_level?: number;
  building_id?: string | null;
  has_accessible_elevator?: boolean;
  last_verified_at?: string;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  zoom: number;
}

// ponytail: legacy type kept for backward compat during transition; remove after Phase 3
export interface AccessibilityFeature {
  hasRamp?: boolean;
  rampConfidence?: number;
  hasElevator?: boolean;
  hasTactilePaving?: boolean;
  hasAccessibleRestroom?: boolean;
  doorWidthOk?: boolean;
  note?: string;
}

// ponytail: legacy type; remove after MapCanvas.tsx is fully replaced
export interface LocationPoi {
  id: string;
  name: string;
  category: PoiCategory;
  xPercent: number;
  yPercent: number;
  accessibility: AccessibilityFeature;
  isSelected?: boolean;
  accentColor?: string;
  badgeLabel?: string;
}

export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}
