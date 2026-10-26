import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PreScanFeatureTag } from '../../../api/aiPreScanService';
import {
  CATEGORY_CONFIG,
  type FeatureCategory,
  getGroupsByCategory,
  getTagsByCategory,
  getTagsByGroup,
  initializeObservationsFromKeys,
  isViolationOrObstacleTag,
  type ObservationMap,
  type ObservationState,
  resolveEffectiveState,
  setObservationState,
} from '../../../model/tagReviewModel';

interface FeatureTagSelectorProps {
  availableTags?: PreScanFeatureTag[];
  selectedKeys?: string[];
  observations?: ObservationMap;
  onChangeObservation?: (key: string, state: ObservationState) => void;
  onToggleKey?: (key: string) => void;
}

const CATEGORIES: FeatureCategory[] = ['entrance', 'sanitation', 'amenity'];

export function FeatureTagSelector({
  availableTags = [],
  selectedKeys = [],
  observations: controlledObservations,
  onChangeObservation,
  onToggleKey,
}: FeatureTagSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('entrance');

  // Internal state if not controlled externally
  const [internalObservations, setInternalObservations] = useState<ObservationMap>(() =>
    initializeObservationsFromKeys(selectedKeys)
  );

  const activeObservations = controlledObservations ?? internalObservations;

  // AI confidence lookup
  const aiTagMap = new Map<string, PreScanFeatureTag>();
  const AI_KEY_MAPPING: Record<string, string[]> = {
    exterior_ramp_present: ['exterior_ramp_present'],
    steps_present: ['steps_present'],
    elevator_present: ['elevator_accessible'],
    accessible_restroom_sign: ['restroom_accessible_stall'],
    door_detected: ['door_width_ok'],
    tactile_paving_present: ['tactile_paving_guiding'],
  };

  for (const tag of availableTags) {
    aiTagMap.set(tag.key, tag);
    const qcvnKeys = AI_KEY_MAPPING[tag.key] || [];
    for (const qk of qcvnKeys) {
      aiTagMap.set(qk, tag);
    }
  }

  // Count active selections per category
  const categorySelectedCounts = CATEGORIES.reduce((acc, cat) => {
    const tagsInCat = getTagsByCategory(cat);
    const count = tagsInCat.filter((t) => activeObservations[t.key] === 'present').length;
    acc[cat] = count;
    return acc;
  }, {} as Record<FeatureCategory, number>);

  const groupsInActiveCategory = getGroupsByCategory(activeCategory);

  const handleStateChange = (key: string, targetState: ObservationState) => {
    const currentState = activeObservations[key] ?? 'unknown';
    // If tapping the already active state, toggle back to 'unknown'
    const nextState: ObservationState = currentState === targetState ? 'unknown' : targetState;

    if (onChangeObservation) {
      onChangeObservation(key, nextState);
    } else {
      setInternalObservations((prev) => setObservationState(prev, key, nextState));
    }

    if (onToggleKey) {
      const wasPresent = currentState === 'present';
      const isNowPresent = nextState === 'present';
      if (wasPresent !== isNowPresent) {
        onToggleKey(key);
      }
    }
  };

  const totalPresentCount = Object.values(activeObservations).filter((s) => s === 'present').length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={18} color="#004e58" />
          <Text style={styles.title}>Đặc điểm tiếp cận thực tế</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{totalPresentCount} xác nhận có</Text>
        </View>
      </View>

      {/* 3 Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
        style={styles.tabScrollView}
      >
        {CATEGORIES.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const isActive = activeCategory === cat;
          const count = categorySelectedCounts[cat] || 0;

          return (
            <Pressable
              key={cat}
              style={({ pressed }) => [
                styles.tabPill,
                isActive ? styles.tabPillActive : styles.tabPillInactive,
                pressed && styles.pressed,
              ]}
              onPress={() => setActiveCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={`${cfg.label}, ${count} đã chọn`}
            >
              <MaterialCommunityIcons
                name={cfg.icon as any}
                size={14}
                color={isActive ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.tabPillLabel, isActive && styles.tabPillLabelActive]}>
                {cfg.shortLabel}
              </Text>
              {count > 0 ? (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Active Category Description */}
      <View style={styles.categoryInfoBar}>
        <Text style={styles.categoryInfoText}>
          {CATEGORY_CONFIG[activeCategory].label} ({groupsInActiveCategory.length} nhóm đối tượng)
        </Text>
      </View>

      {/* Group Cards */}
      <View style={styles.groupsContainer}>
        {groupsInActiveCategory.map((group) => {
          const groupTags = getTagsByGroup(group.id);
          if (groupTags.length === 0) return null;

          const primaryTag = group.primaryKey
            ? groupTags.find((t) => t.key === group.primaryKey)
            : undefined;
          const childTags = primaryTag
            ? groupTags.filter((t) => t.key !== group.primaryKey)
            : groupTags;

          const primaryState = primaryTag
            ? (activeObservations[primaryTag.key] ?? 'unknown')
            : undefined;
          const isPrimaryAiDetected = primaryTag
            ? aiTagMap.get(primaryTag.key)?.detected ?? false
            : false;
          const isPrimaryViolation = primaryTag ? isViolationOrObstacleTag(primaryTag.key) : false;

          return (
            <View key={group.id} style={styles.groupCard}>
              {/* Group Card Header */}
              <View
                style={[
                  styles.groupHeader,
                  childTags.length === 0 && styles.groupHeaderSingle,
                ]}
              >
                <View style={styles.groupHeaderLeft}>
                  <View style={styles.groupIconWrap}>
                    <MaterialCommunityIcons name={group.icon as any} size={16} color="#004e58" />
                  </View>
                  <View style={styles.groupHeaderTextWrap}>
                    <Text
                      style={[
                        styles.groupTitle,
                        isPrimaryViolation && styles.violationLabel,
                      ]}
                    >
                      {group.title}
                    </Text>
                    {group.description && childTags.length > 0 ? (
                      <Text style={styles.groupDescription}>{group.description}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Primary Tag Tri-State Controls in Header */}
                {primaryTag && (
                  <View style={styles.triStateGroup}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.triStateBtn,
                        styles.triStateBtnLeft,
                        primaryState === 'present' &&
                          (isPrimaryViolation
                            ? styles.triStateBtnPresentViolation
                            : styles.triStateBtnPresent),
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleStateChange(primaryTag.key, 'present')}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.title}: Chọn Có`}
                      accessibilityState={{ selected: primaryState === 'present' }}
                    >
                      <Text
                        style={[
                          styles.triStateBtnText,
                          primaryState === 'present' && styles.triStateBtnTextActive,
                        ]}
                      >
                        Có
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.triStateBtn,
                        styles.triStateBtnMiddle,
                        primaryState === 'absent' && styles.triStateBtnAbsent,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleStateChange(primaryTag.key, 'absent')}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.title}: Chọn Không`}
                      accessibilityState={{ selected: primaryState === 'absent' }}
                    >
                      <Text
                        style={[
                          styles.triStateBtnText,
                          primaryState === 'absent' && styles.triStateBtnTextActive,
                        ]}
                      >
                        Không
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.triStateBtn,
                        styles.triStateBtnRight,
                        primaryState === 'unknown' && styles.triStateBtnUnknown,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleStateChange(primaryTag.key, 'unknown')}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.title}: Chọn Chưa rõ`}
                      accessibilityState={{ selected: primaryState === 'unknown' }}
                    >
                      <Text
                        style={[
                          styles.triStateBtnText,
                          primaryState === 'unknown' && styles.triStateBtnTextActive,
                        ]}
                      >
                        Chưa rõ
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Child Items in Card Body */}
              {childTags.length > 0 && (
                <View style={styles.groupItemsList}>
                  {childTags.map((tag, idx) => {
                    const effectiveState = resolveEffectiveState(tag.key, activeObservations);
                    const isViolation = isViolationOrObstacleTag(tag.key);
                    const aiTag = aiTagMap.get(tag.key);
                    const isAiDetected = aiTag != null && aiTag.detected;
                    const isNotApplicable = effectiveState === 'not_applicable';

                    return (
                      <View
                        key={tag.key}
                        style={[
                          styles.itemRow,
                          idx > 0 && styles.itemBorderTop,
                          isNotApplicable && styles.disabledItemRow,
                        ]}
                      >
                        {/* Left: Icon & Label */}
                        <View style={styles.itemInfo}>
                          <View style={styles.itemTitleRow}>
                            <MaterialCommunityIcons
                              name={tag.icon as any}
                              size={14}
                              color={isViolation ? '#dc2626' : '#64748b'}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.itemLabel,
                                isViolation && styles.violationLabel,
                                isNotApplicable && styles.disabledText,
                              ]}
                              numberOfLines={2}
                            >
                              {tag.label}
                            </Text>
                          </View>
                        </View>

                        {/* Right: Tri-State Segment or N/A */}
                        {isNotApplicable ? (
                          <View style={styles.naBadge}>
                            <Text style={styles.naBadgeText}>Không áp dụng</Text>
                          </View>
                        ) : (
                          <View style={styles.triStateGroup}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.triStateBtn,
                                styles.triStateBtnLeft,
                                effectiveState === 'present' &&
                                  (isViolation
                                    ? styles.triStateBtnPresentViolation
                                    : styles.triStateBtnPresent),
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handleStateChange(tag.key, 'present')}
                              accessibilityRole="button"
                              accessibilityLabel={`${tag.label}: Chọn Có`}
                              accessibilityState={{ selected: effectiveState === 'present' }}
                            >
                              <Text
                                style={[
                                  styles.triStateBtnText,
                                  effectiveState === 'present' && styles.triStateBtnTextActive,
                                ]}
                              >
                                Có
                              </Text>
                            </Pressable>

                            <Pressable
                              style={({ pressed }) => [
                                styles.triStateBtn,
                                styles.triStateBtnMiddle,
                                effectiveState === 'absent' && styles.triStateBtnAbsent,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handleStateChange(tag.key, 'absent')}
                              accessibilityRole="button"
                              accessibilityLabel={`${tag.label}: Chọn Không`}
                              accessibilityState={{ selected: effectiveState === 'absent' }}
                            >
                              <Text
                                style={[
                                  styles.triStateBtnText,
                                  effectiveState === 'absent' && styles.triStateBtnTextActive,
                                ]}
                              >
                                Không
                              </Text>
                            </Pressable>

                            <Pressable
                              style={({ pressed }) => [
                                styles.triStateBtn,
                                styles.triStateBtnRight,
                                effectiveState === 'unknown' && styles.triStateBtnUnknown,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handleStateChange(tag.key, 'unknown')}
                              accessibilityRole="button"
                              accessibilityLabel={`${tag.label}: Chọn Chưa rõ`}
                              accessibilityState={{ selected: effectiveState === 'unknown' }}
                            >
                              <Text
                                style={[
                                  styles.triStateBtnText,
                                  effectiveState === 'unknown' && styles.triStateBtnTextActive,
                                ]}
                              >
                                Chưa rõ
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  countPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  tabScrollView: {
    marginBottom: 10,
  },
  tabScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 5,
  },
  tabPillActive: {
    backgroundColor: '#004e58',
    borderColor: '#004e58',
  },
  tabPillInactive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  pressed: {
    opacity: 0.8,
  },
  tabPillLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
  },
  tabPillLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  countTextActive: {
    color: '#ffffff',
  },
  categoryInfoBar: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  categoryInfoText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#004e58',
  },
  groupsContainer: {
    gap: 12,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  groupHeaderSingle: {
    borderBottomWidth: 0,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  groupIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#e6fffa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeaderTextWrap: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  groupDescription: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  groupItemsList: {
    paddingHorizontal: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 8,
  },
  childItemRow: {
    paddingLeft: 10,
    backgroundColor: '#fcfdfd',
  },
  itemBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  disabledItemRow: {
    opacity: 0.5,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  childConnector: {
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 4,
    fontWeight: '700',
  },
  itemLabel: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '500',
    flexShrink: 1,
  },
  childItemLabel: {
    fontSize: 11.5,
    color: '#334155',
  },
  violationLabel: {
    color: '#b91c1c',
  },
  disabledText: {
    color: '#94a3b8',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  aiBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#007D78',
  },
  naBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  naBadgeText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  triStateGroup: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  triStateBtn: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  triStateBtnLeft: {
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  triStateBtnMiddle: {
    borderRadius: 2,
  },
  triStateBtnRight: {
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  triStateBtnPresent: {
    backgroundColor: '#007D78',
  },
  triStateBtnPresentViolation: {
    backgroundColor: '#e11d48',
  },
  triStateBtnAbsent: {
    backgroundColor: '#475569',
  },
  triStateBtnUnknown: {
    backgroundColor: '#cbd5e1',
  },
  triStateBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  triStateBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
