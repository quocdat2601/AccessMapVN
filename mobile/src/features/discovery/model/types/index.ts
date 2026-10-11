import type {
  PoiCategory,
  PlaceDto,
  BoundingBox,
  MapRegion,
  GeocodeResult,
} from '@/entities/place';

export type {
  PoiCategory,
  PlaceDto,
  BoundingBox,
  MapRegion,
  GeocodeResult,
};

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

export interface SearchLocation {
  id: string;
  poiId?: string;
  name: string;
  address: string;
  xPercent: number;
  yPercent: number;
}
