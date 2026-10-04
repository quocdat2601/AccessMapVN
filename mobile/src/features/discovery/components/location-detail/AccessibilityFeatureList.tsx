import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { AccessibilityDetailFeature } from './types';

interface AccessibilityFeatureListProps {
  features: AccessibilityDetailFeature[];
}

export function AccessibilityFeatureList({ features }: AccessibilityFeatureListProps) {
  return (
    <View style={styles.grid}>
      {features.map((feature) => (
        <View key={feature.id} style={styles.featureChip}>
          <MaterialCommunityIcons name={feature.icon} size={18} color={Colors.primary} />
          <Text style={styles.featureLabel} numberOfLines={1}>
            {feature.label}
          </Text>
          {feature.confirmations != null && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{feature.confirmations}</Text>
              <MaterialCommunityIcons name="check" size={12} color={Colors.primary} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    minWidth: '47%',
    flexGrow: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 104, 116, 0.14)',
    backgroundColor: Colors.surface,
    paddingLeft: 10,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    height: 27,
    minWidth: 33,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  countText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
});
