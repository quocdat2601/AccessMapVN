/**
 * QCVN 10:2014/BXD Standard Feature Tag Taxonomy & Review State Model
 */

export type FeatureCategory = 'entrance' | 'sanitation' | 'visual' | 'amenity';
export type FeatureGroup = 'door' | 'ramp' | 'steps' | 'restroom' | 'elevator' | 'visual' | 'amenity';
export type ObservationState = 'present' | 'absent' | 'unknown' | 'not_applicable';
export type ObservationMap = Record<string, ObservationState>;

export interface QcvnTagDefinition {
  key: string;
  label: string;
  category: FeatureCategory;
  group: FeatureGroup;
  parentKey?: string;
  targetProfile: 'wheelchair' | 'blind' | 'both';
  icon: string;
}

export interface EntityGroupDefinition {
  id: FeatureGroup;
  title: string;
  icon: string;
  category: FeatureCategory;
  primaryKey?: string;
  parentKey?: string;
  description?: string;
}

export const CATEGORY_CONFIG: Record<
  FeatureCategory,
  { label: string; icon: string; shortLabel: string }
> = {
  entrance: {
    label: 'Lối vào & Dốc',
    shortLabel: 'Lối vào',
    icon: 'slope-uphill',
  },
  sanitation: {
    label: 'WC & Thang máy',
    shortLabel: 'WC & Thang',
    icon: 'wheelchair-accessibility',
  },
  visual: {
    label: 'Hỗ trợ Khiếm thị',
    shortLabel: 'Khiếm thị',
    icon: 'eye-outline',
  },
  amenity: {
    label: 'Tiện ích Bổ trợ',
    shortLabel: 'Tiện ích',
    icon: 'dots-horizontal-circle-outline',
  },
};

export const ENTITY_GROUPS: EntityGroupDefinition[] = [
  {
    id: 'door',
    title: 'Cửa ra vào',
    icon: 'door-open',
    category: 'entrance',
    primaryKey: 'door_width_ok',
    description: 'Quan sát cửa và lối qua lại',
  },
  {
    id: 'ramp',
    title: 'Ram dốc',
    icon: 'slope-uphill',
    category: 'entrance',
    primaryKey: 'exterior_ramp_present',
    description: 'Đường dốc cho người đi xe lăn',
  },
  {
    id: 'steps',
    title: 'Bậc tam cấp / Cầu thang',
    icon: 'stairs',
    category: 'entrance',
    primaryKey: 'steps_present',
    description: 'Bậc tam cấp hoặc cầu thang lối vào',
  },
  {
    id: 'restroom',
    title: 'Nhà vệ sinh',
    icon: 'toilet',
    category: 'sanitation',
    primaryKey: 'restroom_accessible_stall',
    description: 'Khu vệ sinh và tiện ích hỗ trợ',
  },
  {
    id: 'elevator',
    title: 'Thang máy',
    icon: 'elevator-passenger-outline',
    category: 'sanitation',
    primaryKey: 'elevator_accessible',
    description: 'Thang máy di chuyển giữa các tầng',
  },
  {
    id: 'amenity',
    title: 'Tiện ích hỗ trợ',
    icon: 'dots-horizontal-circle-outline',
    category: 'amenity',
    description: 'Đỗ xe ưu tiên và quầy giao dịch',
  },
  {
    id: 'visual',
    title: 'Hỗ trợ thị giác & xúc giác',
    icon: 'eye-outline',
    category: 'visual',
    description: 'Gạch dẫn hướng và chỉ dẫn nổi',
  },
];

export const QCVN_FEATURE_TAGS: QcvnTagDefinition[] = [
  // 1. Nhóm Lối vào & Mặt phẳng di chuyển (Entrances & Paths)
  {
    key: 'door_width_ok',
    label: 'Cửa ra vào',
    category: 'entrance',
    group: 'door',
    targetProfile: 'wheelchair',
    icon: 'door-open',
  },
  {
    key: 'door_threshold_flat',
    label: 'Ngạch cửa phẳng',
    category: 'entrance',
    group: 'door',
    parentKey: 'door_width_ok',
    targetProfile: 'wheelchair',
    icon: 'ray-start-end',
  },
  {
    key: 'door_lever_handle',
    label: 'Cửa tự động / tay gạt',
    category: 'entrance',
    group: 'door',
    parentKey: 'door_width_ok',
    targetProfile: 'wheelchair',
    icon: 'hand-back-right-outline',
  },
  {
    key: 'exterior_ramp_present',
    label: 'Ram dốc',
    category: 'entrance',
    group: 'ramp',
    targetProfile: 'wheelchair',
    icon: 'slope-uphill',
  },
  {
    key: 'ramp_slope_comfortable',
    label: 'Độ dốc thoải',
    category: 'entrance',
    group: 'ramp',
    parentKey: 'exterior_ramp_present',
    targetProfile: 'wheelchair',
    icon: 'check-circle-outline',
  },
  {
    key: 'steps_present',
    label: 'Bậc tam cấp / Cầu thang',
    category: 'entrance',
    group: 'steps',
    targetProfile: 'wheelchair',
    icon: 'stairs',
  },

  // 2. Nhóm Vận động đứng & Vệ sinh (Sanitation & Vertical)
  {
    key: 'elevator_accessible',
    label: 'Thang máy',
    category: 'sanitation',
    group: 'elevator',
    targetProfile: 'both',
    icon: 'elevator-passenger-outline',
  },
  {
    key: 'restroom_accessible_stall',
    label: 'Nhà vệ sinh',
    category: 'sanitation',
    group: 'restroom',
    targetProfile: 'wheelchair',
    icon: 'wheelchair-accessibility',
  },
  {
    key: 'restroom_grab_bars',
    label: 'Tay vịn bồn cầu',
    category: 'sanitation',
    group: 'restroom',
    parentKey: 'restroom_accessible_stall',
    targetProfile: 'wheelchair',
    icon: 'gesture-tap-button',
  },
  {
    key: 'restroom_sink_clearance',
    label: 'Khoảng trống gầm bồn rửa',
    category: 'sanitation',
    group: 'restroom',
    parentKey: 'restroom_accessible_stall',
    targetProfile: 'wheelchair',
    icon: 'water-pump',
  },

  // 3. Nhóm Hỗ trợ Khiếm thị & Định hướng (Visual Impairment & Tactile)
  {
    key: 'tactile_paving_guiding',
    label: 'Gạch dẫn hướng (sọc)',
    category: 'visual',
    group: 'visual',
    targetProfile: 'blind',
    icon: 'reorder-horizontal',
  },
  {
    key: 'tactile_paving_warning',
    label: 'Gạch cảnh báo (chấm)',
    category: 'visual',
    group: 'visual',
    targetProfile: 'blind',
    icon: 'dots-grid',
  },
  {
    key: 'tactile_paving_blocked',
    label: 'Lối xúc giác bị chặn',
    category: 'visual',
    group: 'visual',
    targetProfile: 'blind',
    icon: 'alert-octagon-outline',
  },
  {
    key: 'overhead_clearance_ok',
    label: 'Lối đi thông thoáng trên đầu',
    category: 'visual',
    group: 'visual',
    targetProfile: 'blind',
    icon: 'arrow-split-horizontal',
  },
  {
    key: 'braille_signage_present',
    label: 'Chữ nổi Braille',
    category: 'visual',
    group: 'visual',
    targetProfile: 'blind',
    icon: 'braille',
  },
  {
    key: 'audible_signal_present',
    label: 'Âm thanh thông báo',
    category: 'visual',
    group: 'visual',
    targetProfile: 'blind',
    icon: 'volume-high',
  },

  // 4. Nhóm Tiện ích Bổ trợ (Auxiliary Amenities)
  {
    key: 'parking_accessible_space',
    label: 'Chỗ đỗ xe ưu tiên NKT',
    category: 'amenity',
    group: 'amenity',
    targetProfile: 'wheelchair',
    icon: 'car-parking-lights',
  },
  {
    key: 'counter_lowered_section',
    label: 'Quầy phục vụ hạ thấp',
    category: 'amenity',
    group: 'amenity',
    targetProfile: 'wheelchair',
    icon: 'table-furniture',
  },
];

/**
 * Returns tags filtered by category.
 */
export function getTagsByCategory(category: FeatureCategory): QcvnTagDefinition[] {
  return QCVN_FEATURE_TAGS.filter((tag) => tag.category === category);
}

/**
 * Returns entity groups belonging to a category.
 */
export function getGroupsByCategory(category: FeatureCategory): EntityGroupDefinition[] {
  return ENTITY_GROUPS.filter((g) => g.category === category);
}

/**
 * Returns tags belonging to a specific entity group.
 */
export function getTagsByGroup(group: FeatureGroup): QcvnTagDefinition[] {
  return QCVN_FEATURE_TAGS.filter((tag) => tag.group === group);
}

/**
 * Resolves effective state of an observation tag taking parent dependency into account.
 * If parent item is explicitly 'absent', child is 'not_applicable'.
 */
export function resolveEffectiveState(
  key: string,
  observations: ObservationMap
): ObservationState {
  const def = QCVN_FEATURE_TAGS.find((t) => t.key === key);
  if (def?.parentKey) {
    const parentState = observations[def.parentKey] ?? 'unknown';
    if (parentState === 'absent') {
      return 'not_applicable';
    }
  }
  return observations[key] ?? 'unknown';
}

/**
 * Updates an observation key and cascade updates child states if parent becomes absent.
 */
export function setObservationState(
  current: ObservationMap,
  key: string,
  nextState: ObservationState
): ObservationMap {
  const updated: ObservationMap = { ...current, [key]: nextState };
  if (nextState === 'absent') {
    // Cascade disable direct children
    for (const tag of QCVN_FEATURE_TAGS) {
      if (tag.parentKey === key) {
        updated[tag.key] = 'not_applicable';
      }
    }
  } else if (nextState === 'present' || nextState === 'unknown') {
    // Reset child states if they were 'not_applicable'
    for (const tag of QCVN_FEATURE_TAGS) {
      if (tag.parentKey === key && updated[tag.key] === 'not_applicable') {
        updated[tag.key] = 'unknown';
      }
    }
  }
  return updated;
}

/**
 * Converts an observation map to the list of confirmed present keys.
 */
export function observationMapToConfirmedKeys(observations: ObservationMap): string[] {
  return Object.entries(observations)
    .filter(([_, state]) => state === 'present')
    .map(([key]) => key);
}

/**
 * Extracts explicit user observations (both 'present' and 'absent').
 * Keys that are 'unknown' or unobserved are omitted to preserve baseline.
 */
export function observationMapToConfirmedObservations(
  observations: ObservationMap
): Record<string, 'present' | 'absent'> {
  const result: Record<string, 'present' | 'absent'> = {};
  for (const [key, state] of Object.entries(observations)) {
    if (state === 'present' || state === 'absent') {
      result[key] = state;
    }
  }
  return result;
}

/**
 * Initializes observation map from an existing list of confirmed present keys.
 */
export function initializeObservationsFromKeys(presentKeys: string[]): ObservationMap {
  const map: ObservationMap = {};
  for (const tag of QCVN_FEATURE_TAGS) {
    map[tag.key] = presentKeys.includes(tag.key) ? 'present' : 'unknown';
  }
  return map;
}

/**
 * Identifies if a tag represents an architectural barrier or safety violation.
 */
export function isViolationOrObstacleTag(key: string): boolean {
  return key === 'steps_present' || key === 'tactile_paving_blocked';
}

/**
 * Toggles a feature tag key in the active list of selected keys.
 */
export function toggleFeatureTagKey(currentKeys: string[], targetKey: string): string[] {
  const set = new Set(currentKeys);
  if (set.has(targetKey)) {
    set.delete(targetKey);
  } else {
    set.add(targetKey);
  }
  return Array.from(set);
}

/**
 * Sanitizes and updates contributor field notes.
 */
export function updateFieldNotes(currentNotes: string, newNotes: string): string {
  return newNotes.trim();
}

/**
 * Adapter mapping QCVN sub-features to candidate pre-scan AI detection keys.
 */
export const CV_TO_QCVN_PARENT_MAP: Record<string, string[]> = {
  door_detected: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_width_ok: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_width_wide: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_threshold_flat: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_threshold_flat_observed: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_handle_lever: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_lever_handle: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  door_auto_present: ['door_detected', 'door_width_compliant', 'door_width_ok'],
  ramp_slope_comfortable: ['exterior_ramp_present', 'ramp_slope_compliant'],
  ramp_handrails_present: ['exterior_ramp_present'],
  exterior_ramp_present: ['exterior_ramp_present'],
  steps_present: ['steps_present'],
  elevator_present: ['elevator_present', 'elevator_accessible'],
  elevator_accessible: ['elevator_present', 'elevator_accessible'],
  restroom_present: ['accessible_restroom_sign'],
  restroom_accessible_stall: ['accessible_restroom_sign'],
  restroom_sign_present: ['accessible_restroom_sign'],
  restroom_grab_bars: ['accessible_restroom_sign'],
  restroom_sink_clearance: ['accessible_restroom_sign'],
  restroom_sink_clearance_observed: ['accessible_restroom_sign'],
  tactile_paving_guiding: ['tactile_paving_present'],
  tactile_paving_warning: ['tactile_paving_present'],
  tactile_paving_blocked: ['tactile_paving_present'],
  parking_accessible_space: ['parking_disability_sign_present'],
  parking_disability_sign_present: ['parking_disability_sign_present'],
  counter_lowered_section: [],
};

/**
 * Matches user-selected QCVN tags with actual AI pre-scan detections.
 */
export function matchSelectedTagsWithCvDetections(
  selectedKeys: string[],
  detectedMap: Map<string, number>
): { matchedCount: number; cvConfidence: number } {
  if (selectedKeys.length === 0 || detectedMap.size === 0) {
    return { matchedCount: 0, cvConfidence: 0.0 };
  }

  let matchedCount = 0;
  let totalConfidence = 0;

  for (const key of selectedKeys) {
    const directConf = detectedMap.get(key);
    if (directConf !== undefined) {
      matchedCount++;
      totalConfidence += directConf;
    } else {
      const candidates = CV_TO_QCVN_PARENT_MAP[key] ?? [];
      const matchedKey = candidates.find((cand) => detectedMap.has(cand));
      if (matchedKey) {
        matchedCount++;
        totalConfidence += detectedMap.get(matchedKey)!;
      }
    }
  }

  const cvConfidence = matchedCount > 0 ? totalConfidence / selectedKeys.length : 0.0;
  return { matchedCount, cvConfidence };
}
