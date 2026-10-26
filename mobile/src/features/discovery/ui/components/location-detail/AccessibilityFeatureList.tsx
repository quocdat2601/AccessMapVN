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
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name={feature.icon} size={18} color={Colors.primary} />
          </View>
          <View style={styles.labelContainer}>
            <Text style={styles.featureLabel} numberOfLines={1}>
              {feature.label}
            </Text>
            {feature.specLabel ? (
              <Text style={styles.specText} numberOfLines={1}>
                {feature.specLabel}
              </Text>
            ) : feature.description ? (
              <Text style={styles.descriptionText} numberOfLines={1}>
                {feature.description}
              </Text>
            ) : null}
          </View>
          <View
            style={[
              styles.verifiedBadge,
              feature.verificationLevel === 'unverified_presence' && styles.unmeasuredBadge,
              feature.publishedStatus === 'NotAvailable' && styles.unavailableBadge,
              feature.publishedStatus === 'Limited' && styles.limitedBadge,
              feature.publishedStatus === 'Unknown' && styles.unknownBadge,
            ]}
          >
            <MaterialCommunityIcons
              name={
                feature.verificationLevel === 'verified_compliant'
                  ? 'check-decagram'
                  : feature.verificationLevel === 'unverified_presence'
                    ? 'ruler'
                    : feature.publishedStatus === 'Limited'
                      ? 'alert-circle-outline'
                      : feature.publishedStatus === 'NotAvailable'
                        ? 'close-circle-outline'
                        : 'information-outline'
              }
              size={13}
              color={
                feature.verificationLevel === 'verified_compliant'
                  ? '#059669'
                  : feature.verificationLevel === 'unverified_presence'
                    ? '#D97706'
                    : feature.publishedStatus === 'Limited'
                      ? '#B45309'
                      : feature.publishedStatus === 'NotAvailable'
                        ? '#B91C1C'
                        : '#64748B'
              }
            />
            <Text
              style={[
                styles.verifiedText,
                feature.verificationLevel === 'unverified_presence' && styles.unmeasuredText,
                feature.publishedStatus === 'NotAvailable' && styles.unavailableText,
                feature.publishedStatus === 'Limited' && styles.limitedText,
                feature.publishedStatus === 'Unknown' && styles.unknownText,
              ]}
            >
              {feature.status || 'Chưa rõ'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 10,
    gap: 7,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 78, 88, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  descriptionText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  specText: {
    fontSize: 11,
    color: '#007D78',
    fontWeight: '600',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  unmeasuredBadge: {
    backgroundColor: '#FEF3C7',
  },
  unmeasuredText: {
    color: '#D97706',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  unavailableBadge: {
    backgroundColor: '#FEF2F2',
  },
  unavailableText: {
    color: '#B91C1C',
  },
  limitedBadge: {
    backgroundColor: '#FFFBEB',
  },
  limitedText: {
    color: '#B45309',
  },
  unknownBadge: {
    backgroundColor: '#F1F5F9',
  },
  unknownText: {
    color: '#64748B',
  },
});
