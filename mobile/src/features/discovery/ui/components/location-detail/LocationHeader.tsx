import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface LocationHeaderProps {
  name: string;
  category?: string;
  brand?: string | null;
  distanceStr?: string | null;
  address?: string | null;
  isAddressLoading?: boolean;
  standardLabel?: string;
  openingHours?: string | null;
  phone?: string | null;
  website?: string | null;
}

export function LocationHeader({
  name,
  category,
  brand,
  distanceStr,
  address,
  isAddressLoading,
  standardLabel,
  openingHours,
  phone,
  website,
}: LocationHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>

      {/* Meta Pills Row */}
      <View style={styles.metaRow}>
        {category ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ) : null}
        {brand && brand.toLowerCase() !== name.toLowerCase() ? (
          <View style={styles.brandPill}>
            <Text style={styles.brandText}>{brand}</Text>
          </View>
        ) : null}
        {distanceStr ? (
          <View style={styles.distancePill}>
            <MaterialCommunityIcons name="navigation-variant-outline" size={12} color="#0284c7" />
            <Text style={styles.distanceText}>{distanceStr}</Text>
          </View>
        ) : null}
        {standardLabel ? (
          <View style={styles.standardBadge}>
            <MaterialCommunityIcons name="check-decagram" size={13} color={Colors.primary} />
            <Text style={styles.standardText}>{standardLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Address Row */}
      {address ? (
        <View style={styles.addressRow}>
          <MaterialCommunityIcons name="map-marker" size={17} color={Colors.primaryContainer} style={styles.addressIcon} />
          <Text style={styles.address} numberOfLines={2}>{address}</Text>
        </View>
      ) : isAddressLoading ? (
        <View style={styles.addressRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={Colors.textMuted} style={styles.addressIcon} />
          <View style={styles.skeletonBox}>
            <View style={styles.skeletonDot} />
            <Text style={styles.skeletonText}>Đang xác định địa chỉ chính xác...</Text>
          </View>
        </View>
      ) : null}

      {/* Contact & Hours Row (if present) */}
      {(openingHours || phone || website) && (
        <View style={styles.contactRow}>
          {openingHours ? (
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.contactText} numberOfLines={1}>{openingHours}</Text>
            </View>
          ) : null}
          {phone ? (
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="phone-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.contactText}>{phone}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  brandPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  brandText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#92400e',
  },
  distancePill: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  distanceText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  standardBadge: {
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  standardText: {
    color: Colors.primary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  addressRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressIcon: {
    marginTop: 1,
  },
  address: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
  },
  skeletonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skeletonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  skeletonText: {
    fontSize: 12.5,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  contactRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
