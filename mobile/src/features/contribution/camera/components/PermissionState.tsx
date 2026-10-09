import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraHeader } from './CameraHeader';
import { styles } from './PermissionState.styles';

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
