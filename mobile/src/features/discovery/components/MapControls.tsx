import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface MapControlsProps {
  onResetNorth?: () => void;
  onToggleLayer?: () => void;
  isLayerActive?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onMyLocation?: () => void;
}

export function MapControls({
  onResetNorth,
  onToggleLayer,
  isLayerActive = true,
  onZoomIn,
  onZoomOut,
  onMyLocation,
}: MapControlsProps) {
  return (
    <View style={styles.container}>
      {/* 1. Compass Button */}
      <TouchableOpacity
        style={styles.circleButton}
        onPress={onResetNorth}
        accessibilityRole="button"
        accessibilityLabel="Khôi phục hướng Bắc"
        activeOpacity={0.8}
      >
        <Ionicons name="compass-outline" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* 2. Layer Toggle Button */}
      <TouchableOpacity
        style={[styles.circleButton, isLayerActive && styles.activeLayerButton]}
        onPress={onToggleLayer}
        accessibilityRole="button"
        accessibilityLabel="Chuyển đổi lớp bản đồ dốc và chướng ngại"
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="layers-outline"
          size={22}
          color={isLayerActive ? Colors.primary : Colors.textSecondary}
        />
      </TouchableOpacity>

      {/* 3. Zoom In / Out Pair */}
      <View style={styles.zoomPairContainer}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={onZoomIn}
          accessibilityRole="button"
          accessibilityLabel="Phóng to bản đồ"
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.zoomButton}
          onPress={onZoomOut}
          accessibilityRole="button"
          accessibilityLabel="Thu nhỏ bản đồ"
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 4. My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={onMyLocation}
        accessibilityRole="button"
        accessibilityLabel="Định vị vị trí hiện tại của bạn"
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
    top: 72,
    alignItems: 'center',
    gap: 10,
    zIndex: 8,
  },
  circleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  activeLayerButton: {
    borderColor: Colors.primaryLight,
    borderWidth: 1.5,
  },
  zoomPairContainer: {
    width: 46,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 46,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 30,
    height: 1,
    backgroundColor: Colors.surfaceVariant,
  },
  myLocationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001f24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 5,
  },
});
