import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PreScanFeatureTag } from '../../../api/aiPreScanService';
import {
  CATEGORY_CONFIG,
  type FeatureCategory,
  getTagsByCategory,
  isViolationOrObstacleTag,
  QCVN_FEATURE_TAGS,
} from '../../../model/tagReviewModel';

interface FeatureTagSelectorProps {
  availableTags?: PreScanFeatureTag[];
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
}

const CATEGORIES: FeatureCategory[] = ['entrance', 'sanitation', 'amenity'];

export function FeatureTagSelector({
  availableTags = [],
  selectedKeys,
  onToggleKey,
}: FeatureTagSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('entrance');
  const selectedSet = new Set(selectedKeys);

  // Quick lookup for AI confidence from pre-scan
  const aiTagMap = new Map<string, PreScanFeatureTag>();
  const AI_KEY_MAPPING: Record<string, string[]> = {
    exterior_ramp_present: ['exterior_ramp_present'],
    steps_present: ['steps_present'],
    elevator_present: ['elevator_accessible'],
    door_detected: ['door_width_ok'],
    door_width_ok: ['door_width_ok'],
    door_width_compliant: ['door_width_ok'],
    accessible_restroom_sign: ['restroom_accessible_stall'],
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
    const count = tagsInCat.filter((t) => selectedSet.has(t.key)).length;
    acc[cat] = count;
    return acc;
  }, {} as Record<FeatureCategory, number>);

  const currentCategoryTags = getTagsByCategory(activeCategory);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={18} color="#004e58" />
          <Text style={styles.title}>Đặc điểm tiếp cận</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{selectedKeys.length} đã chọn</Text>
        </View>
      </View>

      {/* 4 Category Tabs */}
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
          {CATEGORY_CONFIG[activeCategory].label} ({currentCategoryTags.length} tiêu chí)
        </Text>
      </View>

      {/* Chips for Active Category */}
      <View style={styles.chipsWrap}>
        {currentCategoryTags.map((tag) => {
          const isSelected = selectedSet.has(tag.key);
          const isViolation = isViolationOrObstacleTag(tag.key);
          const aiTag = aiTagMap.get(tag.key);
          const isAiDetected = aiTag != null && aiTag.detected;

          let chipStyle = styles.chipUnselected;
          let textColor = '#334155';
          let iconColor = '#64748b';

          if (isSelected) {
            if (isViolation) {
              chipStyle = styles.chipViolation;
              textColor = '#b91c1c';
              iconColor = '#dc2626';
            } else {
              chipStyle = styles.chipSelected;
              textColor = '#065f46';
              iconColor = '#059669';
            }
          }

          return (
            <Pressable
              key={tag.key}
              style={({ pressed }) => [
                styles.chip,
                chipStyle,
                pressed && styles.pressed,
              ]}
              onPress={() => onToggleKey(tag.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${tag.label}${isAiDetected ? ', AI phát hiện' : ''}`}
            >
              <MaterialCommunityIcons
                name={
                  isSelected
                    ? isViolation
                      ? 'alert-circle'
                      : 'check-circle'
                    : (tag.icon as any)
                }
                size={16}
                color={iconColor}
              />
              <Text style={[styles.chipText, { color: textColor }]}>
                {tag.label}
              </Text>

              {isAiDetected ? (
                <View
                  style={[
                    styles.aiBadge,
                    isSelected ? styles.aiBadgeSelected : styles.aiBadgeUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.aiBadgeText,
                      isSelected ? styles.aiBadgeTextSelected : styles.aiBadgeTextUnselected,
                    ]}
                  >
                    ✨ AI
                  </Text>
                </View>
              ) : null}
            </Pressable>
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
    marginBottom: 12,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 6,
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
    fontSize: 12,
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
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  categoryInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004e58',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
  },
  chipUnselected: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  chipSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  chipViolation: {
    backgroundColor: '#fff1f2',
    borderColor: '#f43f5e',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  aiBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  aiBadgeUnselected: {
    backgroundColor: '#f1f5f9',
  },
  aiBadgeSelected: {
    backgroundColor: '#d1fae5',
  },
  aiBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  aiBadgeTextUnselected: {
    color: '#004e58',
  },
  aiBadgeTextSelected: {
    color: '#065f46',
  },
});
