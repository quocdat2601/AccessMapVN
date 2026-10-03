import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface CameraStatusOverlayProps {
  gpsAccuracy: number | null;
  gpsState: 'loading' | 'available' | 'denied' | 'unavailable';
  onGpsPress: () => void;
}

export function CameraStatusOverlay({ gpsAccuracy, gpsState, onGpsPress }: CameraStatusOverlayProps) {
  const gpsLabel = gpsState === 'available'
    ? `GPS ±${Math.round(gpsAccuracy ?? 0)}m`
    : gpsState === 'loading'
      ? 'Đang lấy GPS…'
      : gpsState === 'denied'
        ? 'GPS bị từ chối'
        : 'GPS chưa có';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.instructionChip}>
        <MaterialCommunityIcons name="map-marker" size={20} color="#48e2b2" />
        <Text style={styles.instruction} numberOfLines={2}>
          Giữ rõ lối vào, ram dốc và cửa chính trong khung hình.
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Pressable
          style={({ pressed }) => [styles.statusChip, pressed && styles.pressed]}
          onPress={onGpsPress}
          accessibilityRole="button"
          accessibilityLabel={`${gpsLabel}. Chạm để thử lại.`}
        >
          <View style={[styles.dot, gpsState !== 'available' && styles.dotMuted]} />
          <Text style={styles.statusText}>{gpsLabel}</Text>
        </Pressable>
        <View style={styles.statusChip}>
          <MaterialCommunityIcons name="door-open" size={19} color="#f5ce4a" />
          <Text style={styles.statusText}>Lối vào chính</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, paddingHorizontal: 22, alignItems: 'center', gap: 12 },
  instructionChip: {
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(18,20,20,0.78)',
  },
  instruction: { flexShrink: 1, color: '#fff', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  statusRow: { flexDirection: 'row', justifyContent: 'center', gap: 9 },
  statusChip: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(18,20,20,0.72)',
  },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#43d8ae' },
  dotMuted: { backgroundColor: '#f5ce4a' },
  pressed: { opacity: 0.65 },
});
