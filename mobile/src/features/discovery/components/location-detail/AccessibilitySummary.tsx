import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { AccessibilityDetailFeature } from './types';
import { AccessibilityFeatureList } from './AccessibilityFeatureList';

interface AccessibilitySummaryProps {
  trustPercent: number;
  confirmationCount: number;
  lastVerified: string;
  verificationState: string;
  features: AccessibilityDetailFeature[];
}

export function AccessibilitySummary({
  trustPercent,
  confirmationCount,
  lastVerified,
  verificationState,
  features,
}: AccessibilitySummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.trustRow}>
        <View style={styles.trustIcon}>
          <MaterialCommunityIcons name="shield-check" size={19} color={Colors.primary} />
        </View>
        <View style={styles.trustCopy}>
          <Text style={styles.trustTitle}>{trustPercent}% tin cậy</Text>
          <Text style={styles.trustMeta}>
            {confirmationCount} xác nhận • {lastVerified}
          </Text>
        </View>
        <View style={styles.stateBadge}>
          <View style={styles.stateDot} />
          <Text style={styles.stateText}>{verificationState}</Text>
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
    backgroundColor: '#eff9f7',
    borderWidth: 1,
    borderColor: 'rgba(0, 104, 116, 0.13)',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  trustCopy: {
    flex: 1,
  },
  trustTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  trustMeta: {
    marginTop: 1,
    color: Colors.textMuted,
    fontSize: 11.5,
  },
  stateBadge: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.statusGreen,
  },
  stateText: {
    color: Colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
});
