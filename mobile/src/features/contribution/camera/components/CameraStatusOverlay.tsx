import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { styles } from './CameraStatusOverlay.styles';

interface CameraStatusOverlayProps {
  gpsAccuracy: number | null;
  gpsState: 'loading' | 'available' | 'denied' | 'unavailable';
  onGpsPress: () => void;
}

export function CameraStatusOverlay({ gpsAccuracy, gpsState, onGpsPress }: CameraStatusOverlayProps) {
  const gpsLabel = gpsState === 'available'
    ? `GPS ±${Math.round(gpsAccuracy ?? 0)}m`
    : gpsState === 'loading'
      ? 'Đang tìm GPS…'
      : gpsState === 'denied'
        ? 'GPS tắt'
        : 'Chưa có GPS';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Sleek top status badges just below header */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.gpsBadge, pressed && styles.pressed]}
          onPress={onGpsPress}
          accessibilityRole="button"
          accessibilityLabel={`${gpsLabel}. Chạm để thử lại.`}
          hitSlop={6}
        >
          <View style={[styles.dot, gpsState !== 'available' && styles.dotWarning]} />
          <Text style={styles.gpsText}>{gpsLabel}</Text>
        </Pressable>

        <View style={styles.tipBadge}>
          <Text style={styles.tipText}>Chụp rõ ram dốc & lối vào</Text>
        </View>
      </View>

      {/* Strictly Centered AI Viewfinder Corner Reticle */}
      <View style={styles.reticleCenterWrap} pointerEvents="none">
        <View style={styles.reticleBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>
    </View>
  );
}
