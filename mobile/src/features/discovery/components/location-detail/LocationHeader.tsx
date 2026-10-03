import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface LocationHeaderProps {
  name: string;
  address: string;
  standardLabel: string;
}

export function LocationHeader({ name, address, standardLabel }: LocationHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.standardBadge}>
        <MaterialCommunityIcons name="check-decagram" size={15} color={Colors.primary} />
        <Text style={styles.standardText}>{standardLabel}</Text>
      </View>
      <View style={styles.addressRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={20} color={Colors.primaryContainer} />
        <Text style={styles.address}>{address}</Text>
      </View>
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  standardBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 10,
    height: 27,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  standardText: {
    color: Colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  addressRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  address: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
