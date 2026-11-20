import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CRITERION_CANONICAL_FEATURE_TYPE,
  CRITERION_LABELS,
  DEFAULT_ACCESSIBILITY_FILTERS,
  PRESET_CONFIGS,
  countActiveAccessibilityFilters,
  filterAndSortPlacesByAccessibility,
  getSelectedCriteriaList,
  normalizeAccessibilityFilters,
  syncLegacyFlags,
  type AccessibilityFilterState,
  type AccessibilityPresetId,
  type CompanionMode,
  type CriterionKey,
  type CriterionLevel,
} from '@/features/discovery/model/accessibilityFilter';

export {
  CRITERION_CANONICAL_FEATURE_TYPE,
  DEFAULT_ACCESSIBILITY_FILTERS,
  PRESET_CONFIGS,
  countActiveAccessibilityFilters,
  filterAndSortPlacesByAccessibility,
  getSelectedCriteriaList,
  normalizeAccessibilityFilters,
  syncLegacyFlags,
  type AccessibilityFilterState,
  type AccessibilityPresetId,
  type CompanionMode,
  type CriterionLevel,
};

interface AccessibilityFilterModalProps {
  visible: boolean;
  currentFilters: AccessibilityFilterState;
  onApply: (filters: AccessibilityFilterState) => void;
  onSaveDefault?: (filters: AccessibilityFilterState) => void;
  isSavingDefault?: boolean;
  onClose: () => void;
}

interface CriterionItemDef {
  key: CriterionKey;
  title: string;
  description: string;
  icon: string;
  iconFamily?: 'ion' | 'mci';
}

const GROUP_1_ITEMS: CriterionItemDef[] = [
  {
    key: 'stepFree',
    title: 'Lối đi không bậc',
    description: 'Hạn chế phải vượt bậc trên lối đi hoặc phạm vi được ghi nhận.',
    icon: 'walk',
    iconFamily: 'mci',
  },
  {
    key: 'wideEntrance',
    title: 'Lối vào rộng',
    description: 'Có thông tin đã xác minh về độ rộng cửa/lối vào (>80 cm).',
    icon: 'door-open',
    iconFamily: 'mci',
  },
  {
    key: 'ramp',
    title: 'Ram dốc',
    description: 'Có ram dốc được ghi nhận tại lối vào hoặc khu vực liên quan.',
    icon: 'trending-up',
    iconFamily: 'ion',
  },
  {
    key: 'elevatorMode',
    title: 'Thang máy',
    description: 'Có thông tin về thang máy và phạm vi tầng được tiếp cận, nếu đã xác minh.',
    icon: 'elevator-passenger-outline',
    iconFamily: 'mci',
  },
];

const GROUP_2_ITEMS: CriterionItemDef[] = [
  {
    key: 'restroomMode',
    title: 'Nhà vệ sinh tiếp cận',
    description: 'Có nhà vệ sinh tiếp cận được ghi nhận tại phạm vi địa điểm liên quan.',
    icon: 'human-male-female',
    iconFamily: 'mci',
  },
  {
    key: 'parking',
    title: 'Chỗ đỗ xe tiếp cận',
    description: 'Có chỗ đỗ xe tiếp cận rộng rãi được ghi nhận gần lối vào.',
    icon: 'parking',
    iconFamily: 'mci',
  },
];

const GROUP_3_ITEMS: CriterionItemDef[] = [
  {
    key: 'tactile',
    title: 'Chỉ dẫn xúc giác',
    description: 'Có hạng mục chỉ dẫn xúc giác hoặc gạch dẫn hướng cho người khiếm thị.',
    icon: 'gesture-tap-button',
    iconFamily: 'mci',
  },
];

export function AccessibilityFilterModal({
  visible,
  currentFilters,
  onApply,
  onSaveDefault,
  isSavingDefault = false,
  onClose,
}: AccessibilityFilterModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<AccessibilityFilterState>(() =>
    normalizeAccessibilityFilters(currentFilters)
  );
  // Starts collapsed (compact bottom sheet like LocationDetailSheet), expands on demand
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(normalizeAccessibilityFilters(currentFilters));
      setIsExpanded(false);
    }
  }, [visible, currentFilters]);

  const selectPreset = (presetId: Exclude<AccessibilityPresetId, 'custom'>) => {
    const config = PRESET_CONFIGS[presetId];
    setDraft((prev) =>
      syncLegacyFlags({
        ...prev,
        preset: presetId,
        ...config.criteria,
      })
    );
  };

  const setCriterionLevel = (key: CriterionKey, level: CriterionLevel) => {
    setDraft((prev) =>
      syncLegacyFlags({
        ...prev,
        preset: 'custom',
        [key]: level,
      })
    );
  };

  const handleReset = () => {
    setDraft(DEFAULT_ACCESSIBILITY_FILTERS);
  };

  const handleApply = () => {
    onApply(syncLegacyFlags(draft));
    onClose();
  };

  const selectedCriteria = useMemo(() => getSelectedCriteriaList(draft), [draft]);
  const activeCount = useMemo(() => countActiveAccessibilityFilters(draft), [draft]);

  const presetBadgeLabel = useMemo(() => {
    const p = draft.preset ?? 'none';
    if (p === 'custom') return 'Tùy chỉnh';
    return PRESET_CONFIGS[p]?.label ?? 'Không dùng hồ sơ';
  }, [draft.preset]);

  const sheetMaxHeight = isExpanded
    ? Math.min(Math.round(windowHeight * 0.92), 850)
    : Math.min(Math.round(windowHeight * 0.65), 560);

  const renderCriterionCard = (item: CriterionItemDef) => {
    const currentLevel: CriterionLevel = draft[item.key] ?? 'none';
    return (
      <View key={item.key} style={styles.criterionCard}>
        <View style={styles.criterionHeader}>
          <View style={styles.criterionIconCircle}>
            {item.iconFamily === 'ion' ? (
              <Ionicons name={item.icon as any} size={18} color="#004F58" />
            ) : (
              <MaterialCommunityIcons name={item.icon as any} size={19} color="#004F58" />
            )}
          </View>
          <View style={styles.criterionTextCol}>
            <Text style={styles.criterionTitle}>{item.title}</Text>
            <Text style={styles.criterionDesc}>{item.description}</Text>
          </View>
        </View>

        <View style={styles.segmentedRow}>
          {(
            [
              { id: 'none', label: 'Không chọn' },
              { id: 'preferred', label: 'Ưu tiên' },
              { id: 'required', label: 'Bắt buộc' },
            ] as const
          ).map((seg) => {
            const isSelected = currentLevel === seg.id;
            return (
              <TouchableOpacity
                key={seg.id}
                style={[
                  styles.segmentBtn,
                  isSelected && seg.id === 'none' && styles.segmentBtnActiveNeutral,
                  isSelected && seg.id === 'preferred' && styles.segmentBtnActivePreferred,
                  isSelected && seg.id === 'required' && styles.segmentBtnActiveRequired,
                ]}
                onPress={() => setCriterionLevel(item.key, seg.id)}
                delayPressIn={50}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    isSelected && seg.id === 'none' && styles.segmentBtnTextActiveNeutral,
                    isSelected && seg.id === 'preferred' && styles.segmentBtnTextActivePreferred,
                    isSelected && seg.id === 'required' && styles.segmentBtnTextActiveRequired,
                  ]}
                >
                  {seg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              height: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12),
            },
          ]}
        >
          {/* Top Drag Handle (tap to toggle collapsed / expanded) */}
          <TouchableOpacity
            style={styles.dragHandleButton}
            onPress={() => setIsExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc'}
            activeOpacity={0.75}
          >
            <View style={styles.dragHandle} />
          </TouchableOpacity>

          {/* Figma Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backIconBtn}
                accessibilityLabel="Đóng bộ lọc"
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Bộ Lọc Tiếp Cận</Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleReset} hitSlop={8}>
                <Text style={styles.resetHeaderText}>Đặt lại</Text>
              </TouchableOpacity>
              {onSaveDefault && (
                <TouchableOpacity
                  style={styles.saveProfileCircleBtn}
                  onPress={() => onSaveDefault(syncLegacyFlags(draft))}
                  disabled={isSavingDefault}
                  accessibilityLabel="Lưu làm hồ sơ mặc định"
                >
                  <Ionicons
                    name={isSavingDefault ? 'hourglass-outline' : 'person-add-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            bounces={true}
            overScrollMode="never"
          >
            {/* Expanded Intro Callout */}
            {isExpanded && (
              <View style={styles.introSection}>
                <View style={styles.introTitleRow}>
                  <View style={styles.introIconBadge}>
                    <MaterialCommunityIcons name="human" size={16} color="#004F58" />
                  </View>
                  <Text style={styles.introTitle}>Tìm địa điểm phù hợp với bạn</Text>
                </View>
                <Text style={styles.introSubtitle}>
                  Chọn những điều kiện tiếp cận quan trọng cho lần tìm kiếm này. Bạn có thể thay đổi từng tiêu chí bất cứ lúc nào.
                </Text>

                <View style={styles.infoCalloutBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#006874"
                    style={{ marginTop: 1 }}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.infoCalloutText}>
                      <Text style={styles.infoBoldTeal}>Bắt buộc: </Text>
                      Địa điểm cần có bằng chứng phù hợp với tiêu chí này.
                    </Text>
                    <Text style={styles.infoCalloutText}>
                      <Text style={styles.infoBoldTeal}>Ưu tiên: </Text>
                      Giúp xếp các địa điểm phù hợp hơn lên trước.
                    </Text>
                    <Text style={styles.infoCalloutText}>
                      <Text style={styles.infoBoldDark}>Lưu ý: </Text>
                      Chưa đủ dữ liệu không có nghĩa là địa điểm không tiếp cận được.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Hồ sơ gợi ý (Always visible in both collapsed & expanded states) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Hồ sơ gợi ý</Text>
                  <Text style={styles.sectionSub}>
                    Chọn nhanh một bộ tiêu chí ban đầu. Bạn vẫn có thể chỉnh sửa từng tiêu chí bên dưới.
                  </Text>
                </View>
                <View style={styles.presetStatusPill}>
                  <Text style={styles.presetStatusText}>{presetBadgeLabel}</Text>
                </View>
              </View>

              <View style={styles.presetGrid}>
                {(
                  [
                    { id: 'wheelchair', label: 'Xe lăn', icon: 'wheelchair-accessibility' },
                    { id: 'limited_mobility', label: 'Hạn chế vận động', icon: 'human-cane' },
                    { id: 'elderly', label: 'Người cao tuổi', icon: 'walk' },
                    { id: 'stroller', label: 'Xe đẩy em bé', icon: 'baby-carriage' },
                  ] as const
                ).map((item) => {
                  const isSelected = draft.preset === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.presetCard, isSelected && styles.presetCardActive]}
                      onPress={() => selectPreset(item.id)}
                      activeOpacity={0.82}
                    >
                      <View
                        style={[
                          styles.presetIconCircle,
                          isSelected && styles.presetIconCircleActive,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon as any}
                          size={19}
                          color={isSelected ? '#FFFFFF' : '#004F58'}
                        />
                      </View>
                      <Text
                        style={[styles.presetCardLabel, isSelected && styles.presetCardLabelActive]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Full-width "Không dùng hồ sơ" bar matching Figma */}
              <TouchableOpacity
                style={[
                  styles.noPresetBanner,
                  (draft.preset === 'none' || !draft.preset) && styles.noPresetBannerActive,
                ]}
                onPress={() => selectPreset('none')}
                activeOpacity={0.85}
              >
                <View style={styles.noPresetIconCircle}>
                  <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noPresetTitle}>Không dùng hồ sơ</Text>
                  <Text style={styles.noPresetSub}>Tự do tùy chỉnh từng tiêu chí</Text>
                </View>
                <Ionicons
                  name={
                    draft.preset === 'none' || !draft.preset
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={20}
                  color="#004F58"
                />
              </TouchableOpacity>
            </View>

            {/* Điều kiện tiếp cận: Collapsed Summary vs Expanded Full List */}
            {!isExpanded ? (
              <View style={styles.collapsedConditionsBox}>
                <View style={styles.collapsedHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Điều kiện tiếp cận</Text>
                    <Text style={styles.sectionSub}>
                      {selectedCriteria.length > 0
                        ? `Đang chọn ${selectedCriteria.length} điều kiện (${
                            selectedCriteria.filter((c) => c.level === 'required').length
                          } bắt buộc, ${
                            selectedCriteria.filter((c) => c.level === 'preferred').length
                          } ưu tiên)`
                        : 'Đang thu gọn • Chạm mở rộng để chỉnh từng hạng mục'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.expandToggleBtn}
                    onPress={() => setIsExpanded(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.expandToggleBtnText}>Mở rộng</Text>
                    <Ionicons name="chevron-down" size={15} color="#004F58" />
                  </TouchableOpacity>
                </View>

                {selectedCriteria.length > 0 && (
                  <View style={styles.collapsedChipsRow}>
                    {selectedCriteria.map((c) => (
                      <View
                        key={c.key}
                        style={[
                          styles.collapsedChip,
                          c.level === 'required'
                            ? styles.collapsedChipRequired
                            : styles.collapsedChipPreferred,
                        ]}
                      >
                        <Ionicons
                          name={c.level === 'required' ? 'shield-checkmark' : 'star'}
                          size={12}
                          color={c.level === 'required' ? '#004F58' : '#0F766E'}
                        />
                        <Text style={styles.collapsedChipText}>
                          {c.label}: {c.level === 'required' ? 'Bắt buộc' : 'Ưu tiên'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>Điều kiện tiếp cận</Text>
                      <Text style={styles.sectionSub}>Chọn mức độ quan trọng cho từng hạng mục.</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.expandToggleBtn}
                      onPress={() => setIsExpanded(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.expandToggleBtnText}>Thu gọn</Text>
                      <Ionicons name="chevron-up" size={15} color="#004F58" />
                    </TouchableOpacity>
                  </View>

                  {/* NHÓM 1 */}
                  <View style={styles.groupHeaderRow}>
                    <MaterialCommunityIcons name="door-sliding" size={14} color="#006874" />
                    <Text style={styles.groupHeaderText}>NHÓM 1 — LỐI ĐI VÀ LỐI VÀO</Text>
                  </View>
                  <View style={styles.groupList}>{GROUP_1_ITEMS.map(renderCriterionCard)}</View>

                  {/* NHÓM 2 */}
                  <View style={[styles.groupHeaderRow, { marginTop: 14 }]}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={15} color="#006874" />
                    <Text style={styles.groupHeaderText}>NHÓM 2 — TIỆN ÍCH TIẾP CẬN</Text>
                  </View>
                  <View style={styles.groupList}>{GROUP_2_ITEMS.map(renderCriterionCard)}</View>

                  {/* NHÓM 3 */}
                  <View style={[styles.groupHeaderRow, { marginTop: 14 }]}>
                    <MaterialCommunityIcons name="braille" size={15} color="#006874" />
                    <Text style={styles.groupHeaderText}>NHÓM 3 — CHỈ DẪN</Text>
                  </View>
                  <View style={styles.groupList}>{GROUP_3_ITEMS.map(renderCriterionCard)}</View>
                </View>

                {/* Bối cảnh di chuyển */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Bối cảnh di chuyển</Text>
                  <Text style={styles.sectionSub}>
                    Thông tin này chỉ áp dụng cho lần tìm kiếm hiện tại.
                  </Text>
                  <View style={styles.companionRow}>
                    <TouchableOpacity
                      style={[
                        styles.companionBtn,
                        (draft.companion ?? 'alone') === 'alone' && styles.companionBtnActive,
                      ]}
                      onPress={() => setDraft((prev) => ({ ...prev, companion: 'alone' }))}
                      activeOpacity={0.82}
                    >
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color={(draft.companion ?? 'alone') === 'alone' ? '#004F58' : '#475569'}
                      />
                      <Text
                        style={[
                          styles.companionBtnText,
                          (draft.companion ?? 'alone') === 'alone' && styles.companionBtnTextActive,
                        ]}
                      >
                        Đi một mình
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.companionBtn,
                        draft.companion === 'assisted' && styles.companionBtnActive,
                      ]}
                      onPress={() => setDraft((prev) => ({ ...prev, companion: 'assisted' }))}
                      activeOpacity={0.82}
                    >
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color={draft.companion === 'assisted' ? '#004F58' : '#475569'}
                      />
                      <Text
                        style={[
                          styles.companionBtnText,
                          draft.companion === 'assisted' && styles.companionBtnTextActive,
                        ]}
                      >
                        Có người hỗ trợ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tầng cần đến */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Tầng cần đến</Text>
                  <Text style={styles.sectionSub}>
                    Lọc địa điểm có lối tiếp cận tương thích với tầng mục tiêu.
                  </Text>
                  <Text style={styles.inputLabel}>Tầng cần đến (không bắt buộc)</Text>
                  <View style={styles.floorInputBox}>
                    <MaterialCommunityIcons name="stairs" size={18} color="#006874" />
                    <TextInput
                      style={styles.floorInput}
                      value={draft.targetFloor ?? ''}
                      onChangeText={(txt) =>
                        setDraft((prev) => ({ ...prev, targetFloor: txt.replace(/[^0-9]/g, '') }))
                      }
                      placeholder="Nhập tầng, ví dụ 2"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Summary & Save Default Banner */}
            <View style={styles.summaryBanner}>
              <Ionicons name="refresh-circle-outline" size={18} color="#006874" />
              <Text style={styles.summaryBannerText}>Bộ lọc áp dụng cho lần tìm kiếm này.</Text>
              <Text style={styles.summaryBannerCount}>{activeCount} tiêu chí đã chọn</Text>
            </View>

            {onSaveDefault && (
              <TouchableOpacity
                style={styles.saveDefaultLinkBtn}
                onPress={() => onSaveDefault(syncLegacyFlags(draft))}
                disabled={isSavingDefault}
                activeOpacity={0.78}
              >
                <Ionicons name="bookmark-outline" size={15} color="#006874" />
                <Text style={styles.saveDefaultLinkText}>
                  {isSavingDefault
                    ? 'Đang lưu làm hồ sơ mặc định...'
                    : 'Lưu bộ tiêu chí này vào Hồ sơ tiếp cận cá nhân'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Sticky Bottom CTA matching Figma */}
          <View style={styles.footerBar}>
            <TouchableOpacity
              style={styles.applyCtaBtn}
              onPress={handleApply}
              activeOpacity={0.88}
            >
              <Ionicons name="map-outline" size={18} color="#FFFFFF" />
              <Text style={styles.applyCtaText}>
                {activeCount > 0 ? `Áp dụng bộ lọc (${activeCount})` : 'Áp dụng bộ lọc'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheet: {
    backgroundColor: '#F8FAF9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  dragHandleButton: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetHeaderText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#006874',
  },
  saveProfileCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004F58',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  introSection: {
    gap: 6,
  },
  introTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  introIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  introSubtitle: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  infoCalloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6F6',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  infoCalloutText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  infoBoldTeal: {
    fontWeight: '800',
    color: '#006874',
  },
  infoBoldDark: {
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  presetStatusPill: {
    backgroundColor: '#99F6E4',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presetStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#004F58',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  presetCard: {
    width: '48.5%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  presetCardActive: {
    backgroundColor: '#E6F8F5',
    borderColor: '#006874',
    borderWidth: 1.5,
  },
  presetIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconCircleActive: {
    backgroundColor: '#004F58',
  },
  presetCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  presetCardLabelActive: {
    color: '#004F58',
    fontWeight: '800',
  },
  noPresetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noPresetBannerActive: {
    backgroundColor: '#99F6E4',
    borderColor: '#5EEAD4',
  },
  noPresetIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#004F58',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPresetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#004F58',
  },
  noPresetSub: {
    fontSize: 11.5,
    color: '#134E4A',
  },
  collapsedConditionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  collapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  expandToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#004F58',
  },
  collapsedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  collapsedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  collapsedChipRequired: {
    backgroundColor: '#99F6E4',
  },
  collapsedChipPreferred: {
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  collapsedChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#004F58',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  groupHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006874',
    letterSpacing: 0.4,
  },
  groupList: {
    gap: 10,
  },
  criterionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  criterionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  criterionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criterionTextCol: {
    flex: 1,
  },
  criterionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  criterionDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActiveNeutral: {
    backgroundColor: '#FFFFFF',
  },
  segmentBtnActivePreferred: {
    backgroundColor: '#99F6E4',
  },
  segmentBtnActiveRequired: {
    backgroundColor: '#004F58',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  segmentBtnTextActiveNeutral: {
    color: '#0F172A',
    fontWeight: '800',
  },
  segmentBtnTextActivePreferred: {
    color: '#004F58',
    fontWeight: '800',
  },
  segmentBtnTextActiveRequired: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  companionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  companionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 11,
  },
  companionBtnActive: {
    backgroundColor: '#E6F8F5',
    borderColor: '#006874',
    borderWidth: 1.5,
  },
  companionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  companionBtnTextActive: {
    color: '#004F58',
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  floorInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  floorInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DDF7F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#134E4A',
    fontWeight: '500',
  },
  summaryBannerCount: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#006874',
  },
  saveDefaultLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  saveDefaultLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
  },
  footerBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  applyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#004F58',
    paddingVertical: 14,
    borderRadius: 12,
  },
  applyCtaText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
