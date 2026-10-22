import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './CameraHeader.styles';

interface CameraHeaderProps {
  locationName: string;
  onBack: () => void;
  disabled?: boolean;
  gpsAccuracy?: number | null;
  gpsState?: 'loading' | 'available' | 'denied' | 'unavailable';
  onGpsPress?: () => void;
  onLocationPress?: () => void;
  flashMode?: 'off' | 'on';
  onToggleFlash?: () => void;
}

export function CameraHeader({
  locationName,
  onBack,
  disabled = false,
  gpsAccuracy,
  gpsState,
  onGpsPress,
  onLocationPress,
  flashMode = 'off',
  onToggleFlash,
}: CameraHeaderProps) {
  const gpsLabel = gpsState === 'available'
    ? `±${Math.round(gpsAccuracy ?? 0)}m`
    : gpsState === 'loading'
      ? 'Đang tìm…'
      : gpsState === 'denied'
        ? 'GPS tắt'
        : 'Mất GPS';

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        onPress={onBack}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        hitSlop={8}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#ffffff" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.locationPill, pressed && styles.pressed]}
        onPress={onLocationPress}
        accessibilityRole="button"
        accessibilityLabel={`Địa điểm đang chọn: ${locationName}. Chạm để thay đổi.`}
      >
        <MaterialCommunityIcons name="map-marker" size={14} color="#5eead4" />
        <Text style={styles.locationText} numberOfLines={1}>
          {locationName}
        </Text>
        <MaterialCommunityIcons name="pencil-outline" size={12} color="#99f6e4" />
      </Pressable>

      <View style={styles.rightGroup}>
        {onToggleFlash ? (
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              flashMode === 'on' && styles.flashActive,
              pressed && styles.pressed,
            ]}
            onPress={onToggleFlash}
            accessibilityRole="button"
            accessibilityLabel={flashMode === 'on' ? 'Tắt flash' : 'Bật flash'}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={flashMode === 'on' ? 'flash' : 'flash-off'}
              size={20}
              color={flashMode === 'on' ? '#facc15' : '#ffffff'}
            />
          </Pressable>
        ) : null}

        {gpsState && onGpsPress ? (
          <Pressable
            style={({ pressed }) => [styles.gpsBadge, pressed && styles.pressed]}
            onPress={onGpsPress}
            accessibilityRole="button"
            accessibilityLabel={`GPS: ${gpsLabel}. Chạm để thử lại.`}
            hitSlop={8}
          >
            <View style={[styles.dot, gpsState !== 'available' && styles.dotWarning]} />
            <Text style={styles.gpsText}>{gpsLabel}</Text>
          </Pressable>
        ) : !onToggleFlash ? (
          <View style={styles.spacer} />
        ) : null}
      </View>
    </View>
  );
}
