import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PreScanFeatureTag } from '../../services/aiPreScanService';
import {
  CATEGORY_CONFIG,
  type FeatureCategory,
  getTagsByCategory,
  isViolationOrObstacleTag,
  QCVN_FEATURE_TAGS,
} from '../model/tagReviewModel';

interface FeatureTagSelectorProps {
  availableTags?: PreScanFeatureTag[];
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
}

const CATEGORIES: FeatureCategory[] = ['entrance', 'sanitation', 'visual', 'amenity'];

export function FeatureTagSelector({
  availableTags = [],
  selectedKeys,
  onToggleKey,
}: FeatureTagSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('entrance');
  const selectedSet = new Set(selectedKeys);

  // Quick lookup for AI confidence from pre-scan
  const aiTagMap = new Map<string, PreScanFeatureTag>();
  for (const tag of availableTags) {
    aiTagMap.set(tag.key, tag);
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
          <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={16} color="#5eead4" />
          <Text style={styles.title}>Duyệt nhãn tiếp cận (QCVN 10:2014)</Text>
        </View>
        <Text style={styles.hint}>Đã chọn {selectedKeys.length}/18</Text>
      </View>

      {/* 4 Category Tabs */}
      <View style={styles.tabBar}>
        {CATEGORIES.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const isActive = activeCategory === cat;
          const count = categorySelectedCounts[cat] || 0;

          return (
            <Pressable
              key={cat}
              style={({ pressed }) => [
                styles.tabItem,
                isActive ? styles.tabItemActive : styles.tabItemInactive,
                pressed && styles.pressed,
              ]}
              onPress={() => setActiveCategory(cat)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${cfg.label}, ${count} nhãn đã chọn`}
            >
              <MaterialCommunityIcons
                name={cfg.icon as any}
                size={14}
                color={isActive ? '#0f172a' : '#94a3b8'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
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
      </View>

      {/* Active Category Description Banner */}
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
          const hasConfidence = aiTag != null && aiTag.confidence > 0;
          const percent = hasConfidence ? Math.round(aiTag.confidence * 100) : null;

          let chipStyle = styles.chipUnselected;
          let textColor = '#cbd5e1';
          let iconColor = '#94a3b8';

          if (isSelected) {
            if (isViolation) {
              chipStyle = styles.chipViolation;
              textColor = '#fff';
              iconColor = '#fff';
            } else {
              chipStyle = styles.chipSelected;
              textColor = '#0f172a';
              iconColor = '#0f172a';
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
              accessibilityLabel={`${tag.label}${percent != null ? `, AI tin cậy ${percent}%` : ''}`}
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

              {percent != null ? (
                <View
                  style={[
                    styles.confidenceBadge,
                    isSelected && (isViolation ? styles.confidenceBadgeViolation : styles.confidenceBadgeSelected),
                  ]}
                >
                  <Text
                    style={[
                      styles.confidenceText,
                      isSelected && (isViolation ? styles.confidenceTextViolation : styles.confidenceTextSelected),
                    ]}
                  >
                    {percent}%
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
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 9,
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: '#5eead4',
  },
  tabItemInactive: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  countText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  countTextActive: {
    color: '#0f172a',
  },
  categoryInfoBar: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  categoryInfoText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#38bdf8',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipUnselected: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  chipSelected: {
    backgroundColor: '#5eead4',
    borderColor: '#2dd4bf',
  },
  chipViolation: {
    backgroundColor: '#f43f5e',
    borderColor: '#e11d48',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  confidenceBadgeSelected: {
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  confidenceBadgeViolation: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  confidenceTextSelected: {
    color: '#0f172a',
  },
  confidenceTextViolation: {
    color: '#ffffff',
  },
});
