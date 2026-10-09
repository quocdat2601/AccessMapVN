import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './CameraHeader.styles';

interface CameraHeaderProps {
  locationName: string;
  onBack: () => void;
  disabled?: boolean;
}

export function CameraHeader({ locationName, onBack, disabled = false }: CameraHeaderProps) {
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

      <View style={styles.locationPill}>
        <MaterialCommunityIcons name="map-marker" size={14} color="#5eead4" />
        <Text style={styles.locationText} numberOfLines={1}>
          {locationName}
        </Text>
      </View>

      <View style={styles.iconButton}>
        <MaterialCommunityIcons name="help-circle-outline" size={22} color="rgba(255,255,255,0.75)" />
      </View>
    </View>
  );
}
