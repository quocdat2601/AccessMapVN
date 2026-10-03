import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/shared/theme';

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
      >
        <MaterialCommunityIcons name="arrow-left" size={27} color={Colors.textPrimary} />
      </Pressable>
      <View style={styles.brandIcon}>
        <MaterialCommunityIcons name="wheelchair-accessibility" size={25} color={Colors.surface} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>Đóng góp dữ liệu tiếp cận</Text>
        <Text style={styles.location} numberOfLines={1}>{locationName}</Text>
      </View>
      <MaterialCommunityIcons name="help-circle-outline" size={26} color={Colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 78,
    marginHorizontal: 16,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.55 },
  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  location: { color: Colors.textMuted, fontSize: 14, marginTop: 2 },
});
