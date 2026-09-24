export type PoiCategory = 'mall' | 'hotel' | 'hospital' | 'transit' | 'market' | 'other';

export interface AccessibilityFeature {
  hasRamp?: boolean;
  rampConfidence?: number;
  hasElevator?: boolean;
  hasTactilePaving?: boolean;
  hasAccessibleRestroom?: boolean;
  doorWidthOk?: boolean;
  note?: string;
}

export interface LocationPoi {
  id: string;
  name: string;
  category: PoiCategory;
  xPercent: number; // percentage in map canvas [0, 100]
  yPercent: number; // percentage in map canvas [0, 100]
  accessibility: AccessibilityFeature;
  isSelected?: boolean;
  accentColor?: string;
  badgeLabel?: string;
}
