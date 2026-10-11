/**
 * QCVN 10:2014/BXD Standard Feature Tag Taxonomy & Review State Model
 */

export type FeatureCategory = 'entrance' | 'sanitation' | 'visual' | 'amenity';

export interface QcvnTagDefinition {
  key: string;
  label: string;
  category: FeatureCategory;
  targetProfile: 'wheelchair' | 'blind' | 'both';
  icon: string;
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
    shortLabel: 'Vệ sinh / Thang',
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

export const QCVN_FEATURE_TAGS: QcvnTagDefinition[] = [
  // 1. Nhóm Lối vào & Mặt phẳng di chuyển (Entrances & Paths)
  {
    key: 'exterior_ramp_present',
    label: 'Có ram dốc ngoài trời',
    category: 'entrance',
    targetProfile: 'wheelchair',
    icon: 'slope-uphill',
  },
  {
    key: 'ramp_slope_comfortable',
    label: 'Dốc thoải (≤ 1/16 - 1/20)',
    category: 'entrance',
    targetProfile: 'wheelchair',
    icon: 'check-circle-outline',
  },
  {
    key: 'door_width_ok',
    label: 'Cửa thông thủy ≥ 90cm',
    category: 'entrance',
    targetProfile: 'wheelchair',
    icon: 'door-open',
  },
  {
    key: 'door_threshold_flat',
    label: 'Sàn phẳng (gờ cửa ≤ 2cm)',
    category: 'entrance',
    targetProfile: 'wheelchair',
    icon: 'ray-start-end',
  },
  {
    key: 'door_lever_handle',
    label: 'Tay nắm gạt / Cửa tự động',
    category: 'entrance',
    targetProfile: 'wheelchair',
    icon: 'hand-back-right-outline',
  },
  {
    key: 'steps_present',
    label: 'Có bậc tam cấp / Bậc cản',
    category: 'entrance',
    targetProfile: 'wheelchair',
    icon: 'stairs',
  },

  // 2. Nhóm Vận động đứng & Vệ sinh (Sanitation & Vertical)
  {
    key: 'elevator_accessible',
    label: 'Thang máy có nút thấp & tay vịn',
    category: 'sanitation',
    targetProfile: 'both',
    icon: 'elevator-passenger-outline',
  },
  {
    key: 'restroom_accessible_stall',
    label: 'WC có vòng xoay xe lăn ≥ 150cm',
    category: 'sanitation',
    targetProfile: 'wheelchair',
    icon: 'wheelchair-accessibility',
  },
  {
    key: 'restroom_grab_bars',
    label: 'Có thanh vịn chịu lực bồn cầu',
    category: 'sanitation',
    targetProfile: 'wheelchair',
    icon: 'gesture-tap-button',
  },
  {
    key: 'restroom_sink_clearance',
    label: 'Gầm bồn rửa trống chân (sâu ≥ 30cm)',
    category: 'sanitation',
    targetProfile: 'wheelchair',
    icon: 'water-pump',
  },

  // 3. Nhóm Hỗ trợ Khiếm thị & Định hướng (Visual Impairment & Tactile)
  {
    key: 'tactile_paving_guiding',
    label: 'Gạch sọc dẫn hướng đi thẳng',
    category: 'visual',
    targetProfile: 'blind',
    icon: 'reorder-horizontal',
  },
  {
    key: 'tactile_paving_warning',
    label: 'Gạch chấm bi cảnh báo dừng/bậc',
    category: 'visual',
    targetProfile: 'blind',
    icon: 'dots-grid',
  },
  {
    key: 'tactile_paving_blocked',
    label: 'Gạch xúc giác bị vật cản đè lên',
    category: 'visual',
    targetProfile: 'blind',
    icon: 'alert-octagon-outline',
  },
  {
    key: 'overhead_clearance_ok',
    label: 'Tĩnh không an toàn (≥ 2.0m)',
    category: 'visual',
    targetProfile: 'blind',
    icon: 'arrow-split-horizontal',
  },
  {
    key: 'braille_signage_present',
    label: 'Có chữ nổi Braille chỉ dẫn/nút bấm',
    category: 'visual',
    targetProfile: 'blind',
    icon: 'braille',
  },
  {
    key: 'audible_signal_present',
    label: 'Âm thanh thông báo đèn/thang máy',
    category: 'visual',
    targetProfile: 'blind',
    icon: 'volume-high',
  },

  // 4. Nhóm Tiện ích Bổ trợ (Auxiliary Amenities)
  {
    key: 'parking_accessible_space',
    label: 'Ô đỗ xe ưu tiên rộng ≥ 3.5m',
    category: 'amenity',
    targetProfile: 'wheelchair',
    icon: 'car-parking-lights',
  },
  {
    key: 'counter_lowered_section',
    label: 'Bàn giao dịch hạ thấp (70-80cm)',
    category: 'amenity',
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
