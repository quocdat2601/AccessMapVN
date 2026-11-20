import { AccessibilityFeatureType, type PlaceDto } from '@/entities/place/model/types';

export type CriterionLevel = 'none' | 'preferred' | 'required';
export type AccessibilityPresetId =
  | 'none'
  | 'wheelchair'
  | 'limited_mobility'
  | 'elderly'
  | 'stroller'
  | 'custom';
export type CompanionMode = 'alone' | 'assisted';

export interface AccessibilityFilterState {
  // Legacy boolean fields kept for backwards compatibility
  wheelchair: boolean;
  elevator: boolean;
  restroom: boolean;
  tactilePaving: boolean;
  highVerified: boolean;
  // Advanced Figma filter model
  preset?: AccessibilityPresetId;
  stepFree?: CriterionLevel;
  wideEntrance?: CriterionLevel;
  ramp?: CriterionLevel;
  elevatorMode?: CriterionLevel;
  restroomMode?: CriterionLevel;
  parking?: CriterionLevel;
  tactile?: CriterionLevel;
  companion?: CompanionMode;
  targetFloor?: string;
}

export const DEFAULT_ACCESSIBILITY_FILTERS: AccessibilityFilterState = {
  wheelchair: false,
  elevator: false,
  restroom: false,
  tactilePaving: false,
  highVerified: false,
  preset: 'none',
  stepFree: 'none',
  wideEntrance: 'none',
  ramp: 'none',
  elevatorMode: 'none',
  restroomMode: 'none',
  parking: 'none',
  tactile: 'none',
  companion: 'alone',
  targetFloor: '',
};

export type CriterionKey =
  | 'stepFree'
  | 'wideEntrance'
  | 'ramp'
  | 'elevatorMode'
  | 'restroomMode'
  | 'parking'
  | 'tactile';

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  stepFree: 'Lối đi không bậc',
  wideEntrance: 'Lối vào rộng >90cm',
  ramp: 'Ram dốc',
  elevatorMode: 'Thang máy',
  restroomMode: 'Nhà vệ sinh tiếp cận',
  parking: 'Chỗ đỗ xe tiếp cận',
  tactile: 'Chỉ dẫn xúc giác',
};

/**
 * Mapping from filter criterion to canonical backend AccessibilityFeatureType:
 * Ramp = 1, Elevator = 2, AccessibleRestroom = 3, EntranceDoor = 5.
 */
export const CRITERION_CANONICAL_FEATURE_TYPE: Partial<Record<CriterionKey, AccessibilityFeatureType>> = {
  ramp: AccessibilityFeatureType.Ramp,
  elevatorMode: AccessibilityFeatureType.Elevator,
  restroomMode: AccessibilityFeatureType.AccessibleRestroom,
  wideEntrance: AccessibilityFeatureType.EntranceDoor,
};

export const PRESET_CONFIGS: Record<
  Exclude<AccessibilityPresetId, 'custom'>,
  {
    label: string;
    criteria: Record<CriterionKey, CriterionLevel>;
  }
> = {
  none: {
    label: 'Không dùng hồ sơ',
    criteria: {
      stepFree: 'none',
      wideEntrance: 'none',
      ramp: 'none',
      elevatorMode: 'none',
      restroomMode: 'none',
      parking: 'none',
      tactile: 'none',
    },
  },
  wheelchair: {
    label: 'Xe lăn',
    criteria: {
      stepFree: 'required',
      wideEntrance: 'required',
      ramp: 'required',
      elevatorMode: 'required',
      restroomMode: 'preferred',
      parking: 'preferred',
      tactile: 'none',
    },
  },
  limited_mobility: {
    label: 'Hạn chế vận động',
    criteria: {
      stepFree: 'required',
      wideEntrance: 'preferred',
      ramp: 'required',
      elevatorMode: 'preferred',
      restroomMode: 'preferred',
      parking: 'preferred',
      tactile: 'none',
    },
  },
  elderly: {
    label: 'Người cao tuổi',
    criteria: {
      stepFree: 'preferred',
      wideEntrance: 'none',
      ramp: 'preferred',
      elevatorMode: 'required',
      restroomMode: 'required',
      parking: 'preferred',
      tactile: 'none',
    },
  },
  stroller: {
    label: 'Xe đẩy em bé',
    criteria: {
      stepFree: 'required',
      wideEntrance: 'required',
      ramp: 'required',
      elevatorMode: 'preferred',
      restroomMode: 'preferred',
      parking: 'none',
      tactile: 'none',
    },
  },
};

export function syncLegacyFlags(state: AccessibilityFilterState): AccessibilityFilterState {
  const stepFree = state.stepFree ?? 'none';
  const wideEntrance = state.wideEntrance ?? 'none';
  const ramp = state.ramp ?? 'none';
  const elevatorMode = state.elevatorMode ?? 'none';
  const restroomMode = state.restroomMode ?? 'none';
  const tactile = state.tactile ?? 'none';

  return {
    ...state,
    wheelchair: ramp === 'required' || stepFree === 'required' || wideEntrance === 'required',
    elevator: elevatorMode === 'required',
    restroom: restroomMode === 'required',
    tactilePaving: tactile === 'required',
  };
}

export function normalizeAccessibilityFilters(
  raw?: Partial<AccessibilityFilterState> | null
): AccessibilityFilterState {
  if (!raw) return DEFAULT_ACCESSIBILITY_FILTERS;
  const merged: AccessibilityFilterState = {
    ...DEFAULT_ACCESSIBILITY_FILTERS,
    ...raw,
  };

  // Migrate legacy boolean-only saved filters if advanced fields were not set
  if (
    merged.stepFree === 'none' &&
    merged.ramp === 'none' &&
    merged.elevatorMode === 'none' &&
    merged.restroomMode === 'none' &&
    merged.tactile === 'none'
  ) {
    if (raw.wheelchair) {
      merged.ramp = 'required';
      merged.stepFree = 'required';
      merged.wideEntrance = 'preferred';
    }
    if (raw.elevator) merged.elevatorMode = 'required';
    if (raw.restroom) merged.restroomMode = 'required';
    if (raw.tactilePaving) merged.tactile = 'required';
  }

  return syncLegacyFlags(merged);
}

export function getSelectedCriteriaList(
  filters: AccessibilityFilterState
): { key: CriterionKey; label: string; level: CriterionLevel }[] {
  const normalized = normalizeAccessibilityFilters(filters);
  const keys: CriterionKey[] = [
    'stepFree',
    'wideEntrance',
    'ramp',
    'elevatorMode',
    'restroomMode',
    'parking',
    'tactile',
  ];
  const result: { key: CriterionKey; label: string; level: CriterionLevel }[] = [];
  for (const key of keys) {
    const level = normalized[key] ?? 'none';
    if (level !== 'none') {
      result.push({ key, label: CRITERION_LABELS[key], level });
    }
  }
  return result;
}

export function countActiveAccessibilityFilters(filters: AccessibilityFilterState): number {
  const criteriaCount = getSelectedCriteriaList(filters).length;
  const hasFloor = Boolean(filters.targetFloor && filters.targetFloor.trim().length > 0);
  return criteriaCount + (hasFloor ? 1 : 0);
}

function checkPlaceCriterion(place: PlaceDto, key: CriterionKey): boolean {
  switch (key) {
    case 'stepFree':
      return Boolean(place.has_step_free ?? (place.has_ramp || place.door_width_ok));
    case 'wideEntrance':
      return Boolean(place.door_width_ok);
    case 'ramp':
      return Boolean(place.has_ramp);
    case 'elevatorMode':
      return Boolean(place.has_elevator || place.has_accessible_elevator);
    case 'restroomMode':
      return Boolean(place.has_accessible_restroom);
    case 'parking':
      return Boolean(
        place.has_accessible_parking ??
          (place.accessibility_score >= 0.85 ||
            place.category === 'mall' ||
            place.category === 'supermarket' ||
            place.category === 'hospital' ||
            place.category === 'clinic')
      );
    case 'tactile':
      return Boolean(place.has_tactile_paving);
  }
}

export function filterAndSortPlacesByAccessibility(
  places: PlaceDto[],
  filters: AccessibilityFilterState
): PlaceDto[] {
  const normalized = normalizeAccessibilityFilters(filters);
  const selected = getSelectedCriteriaList(normalized);
  const requiredCriteria = selected.filter((c) => c.level === 'required');
  const preferredCriteria = selected.filter((c) => c.level === 'preferred');
  const floorNum = normalized.targetFloor ? parseInt(normalized.targetFloor.trim(), 10) : NaN;

  const filtered = places.filter((place) => {
    for (const req of requiredCriteria) {
      if (!checkPlaceCriterion(place, req.key)) {
        return false;
      }
    }

    if (!isNaN(floorNum) && floorNum >= 2) {
      const hasElevator = Boolean(place.has_elevator || place.has_accessible_elevator);
      if (!hasElevator) return false;
      if (place.floor_level != null && place.floor_level > 1 && place.floor_level < floorNum) {
        return false;
      }
    }

    if (normalized.highVerified && place.accessibility_score < 0.8) {
      return false;
    }

    return true;
  });

  if (preferredCriteria.length === 0) {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    const scoreA = preferredCriteria.reduce(
      (acc, pref) => acc + (checkPlaceCriterion(a, pref.key) ? 1 : 0),
      0
    );
    const scoreB = preferredCriteria.reduce(
      (acc, pref) => acc + (checkPlaceCriterion(b, pref.key) ? 1 : 0),
      0
    );
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.accessibility_score ?? 0) - (a.accessibility_score ?? 0);
  });
}
