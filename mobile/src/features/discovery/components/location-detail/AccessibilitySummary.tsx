import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { AccessibilityDetailFeature } from './types';
import { AccessibilityFeatureList } from './AccessibilityFeatureList';

interface AccessibilitySummaryProps {
  isUnrated?: boolean;
  trustPercent: number;
  features: AccessibilityDetailFeature[];
}

export function AccessibilitySummary({ isUnrated, trustPercent, features }: AccessibilitySummaryProps) {
  if (isUnrated) {
    return (
      <View style={styles.unratedContainer}>
        <View style={styles.unratedIconBox}>
          <MaterialCommunityIcons name="wheelchair-accessibility" size={24} color="#64748b" />
        </View>
        <View style={styles.unratedTextBox}>
          <Text style={styles.unratedTitle}>Chưa có dữ liệu tiếp cận</Text>
          <Text style={styles.unratedDesc}>
            Địa điểm này chưa được khảo sát lối vào, ram dốc hoặc tiện ích cho người khuyết tật.
          </Text>
        </View>
      </View>
    );
  }

  const isHighTrust = trustPercent >= 75;
  const isMediumTrust = trustPercent >= 50;
  const trustColor = isHighTrust ? Colors.statusGreen : isMediumTrust ? '#f59e0b' : '#ef4444';
  const trustBg = isHighTrust ? '#dcfce7' : isMediumTrust ? '#fef3c7' : '#fee2e2';
  const trustLabel = isHighTrust ? 'Đáng tin cậy' : isMediumTrust ? 'Trung bình' : 'Khó tiếp cận';

  return (
    <View style={styles.container}>
      <View style={styles.trustRow}>
        <View style={[styles.trustPill, { backgroundColor: trustBg }]}>
          <View style={[styles.trustDot, { backgroundColor: trustColor }]} />
          <Text style={[styles.trustPillText, { color: trustColor }]}>
            {trustLabel} ({trustPercent}%)
          </Text>
        </View>
      </View>
      <AccessibilityFeatureList features={features} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginBottom: 20,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#f8fdfb',
    borderWidth: 1,
    borderColor: 'rgba(0, 104, 116, 0.12)',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trustPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unratedContainer: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  unratedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unratedTextBox: {
    flex: 1,
  },
  unratedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  unratedDesc: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
});
