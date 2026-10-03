import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraHeader } from './CameraHeader';

interface PermissionStateProps {
  locationName: string;
  title: string;
  message: string;
  canAskAgain: boolean;
  onBack: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export function PermissionState({
  locationName,
  title,
  message,
  canAskAgain,
  onBack,
  onRetry,
  onOpenSettings,
}: PermissionStateProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <CameraHeader locationName={locationName} onBack={onBack} />
      </View>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="camera-off-outline" size={48} color="#8ee9dc" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={canAskAgain ? onRetry : onOpenSettings}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name={canAskAgain ? 'refresh' : 'cog-outline'} size={21} color="#00373f" />
          <Text style={styles.buttonText}>{canAskAgain ? 'Thử lại' : 'Mở cài đặt'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c1314' },
  content: { flex: 1, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center', paddingBottom: 90 },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(142,233,220,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  message: { color: '#b8c5c5', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  button: {
    minHeight: 52,
    marginTop: 24,
    borderRadius: 16,
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8ee9dc',
  },
  buttonText: { color: '#00373f', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
