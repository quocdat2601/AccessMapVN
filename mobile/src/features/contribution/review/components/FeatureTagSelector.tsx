import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PreScanFeatureTag } from '../../services/aiPreScanService';

interface FeatureTagSelectorProps {
  availableTags: PreScanFeatureTag[];
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
}

export function FeatureTagSelector({
  availableTags,
  selectedKeys,
  onToggleKey,
}: FeatureTagSelectorProps) {
  const selectedSet = new Set(selectedKeys);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="tag-multiple-outline" size={16} color="#5eead4" />
          <Text style={styles.title}>Duyệt nhãn tiếp cận (QCVN 10:2014)</Text>
        </View>
        <Text style={styles.hint}>Chạm để bật/tắt</Text>
      </View>

      <View style={styles.chipsWrap}>
        {availableTags.map((tag) => {
          const isSelected = selectedSet.has(tag.key);
          const percent = Math.round(tag.confidence * 100);

          return (
            <Pressable
              key={tag.key}
              style={({ pressed }) => [
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
                pressed && styles.pressed,
              ]}
              onPress={() => onToggleKey(tag.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${tag.label}, độ tin cậy ${percent}%`}
            >
              <MaterialCommunityIcons
                name={isSelected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                size={16}
                color={isSelected ? '#0f172a' : '#94a3b8'}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {tag.label}
              </Text>
              <View style={[styles.confidenceBadge, isSelected && styles.confidenceBadgeSelected]}>
                <Text style={[styles.confidenceText, isSelected && styles.confidenceTextSelected]}>
                  {percent}%
                </Text>
              </View>
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
  pressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  chipTextSelected: {
    color: '#0f172a',
    fontWeight: '700',
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
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  confidenceTextSelected: {
    color: '#0f172a',
  },
});
