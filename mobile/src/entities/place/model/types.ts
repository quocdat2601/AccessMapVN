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
  floor_level?: number | null;
  building_id?: string | null;
  has_accessible_elevator?: boolean | null;
  last_verified_at?: string | null;
  isAddressLoading?: boolean;
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

export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}
