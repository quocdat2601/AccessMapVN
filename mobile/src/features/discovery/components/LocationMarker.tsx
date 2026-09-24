import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LocationPoi } from '../types';
import { Colors } from '@/shared/theme';

interface LocationMarkerProps {
  poi: LocationPoi;
  onPress: (id: string) => void;
}

export function LocationMarker({ poi, onPress }: LocationMarkerProps) {
  // ── Selected Venue (e.g. Saigon Centre) ──────────────────────────────────
  if (poi.isSelected) {
    return (
      <TouchableOpacity
        style={[styles.markerContainer, { left: `${poi.xPercent}%`, top: `${poi.yPercent}%` }]}
        onPress={() => onPress(poi.id)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${poi.name}, có chuẩn tiếp cận xe lăn. Chạm để xem`}
      >
        <View style={styles.selectedPillWrapper}>
          {/* Elegant Pin Pill */}
          <View style={styles.selectedPill}>
            <FontAwesome5 name="wheelchair" size={13} color="#ffffff" style={styles.wheelchairIcon} />
            <Text style={styles.selectedPillText}>{poi.name}</Text>
          </View>

          {/* Downward Pin Arrow */}
          <View style={styles.arrowContainer}>
            <View style={styles.arrowDiamond} />
          </View>

          {/* Pulse Indicator Beacon */}
          <View style={styles.pulseBeacon} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── Specific Standard POIs ──────────────────────────────────────────────
  const renderCategoryIcon = () => {
    switch (poi.category) {
      case 'hotel':
        return <Ionicons name="bed" size={11} color="#ffffff" />;
      case 'hospital':
        return <FontAwesome5 name="plus" size={10} color="#ffffff" />;
      case 'transit':
        return <MaterialCommunityIcons name="train" size={12} color="#ffffff" />;
      case 'market':
        return <Ionicons name="bag-handle" size={11} color="#ffffff" />;
      case 'mall':
      default:
        return <MaterialCommunityIcons name="store" size={11} color="#ffffff" />;
    }
  };

  const badgeColor = poi.accentColor || Colors.primary;

  return (
    <TouchableOpacity
      style={[styles.markerContainer, { left: `${poi.xPercent}%`, top: `${poi.yPercent}%` }]}
      onPress={() => onPress(poi.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={poi.name}
    >
      <View style={styles.poiRow}>
        <View style={[styles.poiIconCircle, { backgroundColor: badgeColor }]}>
          {renderCategoryIcon()}
        </View>

        <View style={styles.poiTextWrapper}>
          <Text style={[styles.poiLabel, { color: poi.category === 'hospital' ? Colors.poiHospital : Colors.textSecondary }]}>
            {poi.name}
          </Text>

          {poi.badgeLabel && (
            <View style={styles.accessibilitySubBadge}>
              <FontAwesome5 name="wheelchair" size={8} color={Colors.primaryContainer} />
              <Text style={styles.accessibilitySubText}>{poi.badgeLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    position: 'absolute',
    transform: [{ translateX: -40 }, { translateY: -20 }],
    zIndex: 6,
  },
  // Selected Pill Styles
  selectedPillWrapper: {
    alignItems: 'center',
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  wheelchairIcon: {
    marginRight: 6,
  },
  selectedPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  arrowContainer: {
    alignItems: 'center',
    marginTop: -4,
  },
  arrowDiamond: {
    width: 10,
    height: 10,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  pulseBeacon: {
    width: 14,
    height: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 78, 88, 0.4)',
    marginTop: 2,
  },

  // Standard POI Styles
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poiIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  poiTextWrapper: {
    flexDirection: 'column',
  },
  poiLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  accessibilitySubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  accessibilitySubText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.primaryContainer,
  },
});
