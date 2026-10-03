import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/theme';
import { CapturedContributionMedia } from '../types';
import { CameraHeader } from './CameraHeader';

interface MediaPreviewProps {
  media: CapturedContributionMedia;
  savedLocally: boolean;
  onBack: () => void;
  onRetake: () => void;
  onUse: () => void;
}

export function MediaPreview({ media, savedLocally, onBack, onRetake, onUse }: MediaPreviewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {media.type === 'photo' ? (
        <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.videoPreview}>
          <MaterialCommunityIcons name="video-check-outline" size={74} color="#8ee9dc" />
          <Text style={styles.videoTitle}>Video đã được ghi</Text>
          <Text style={styles.videoMeta}>{media.durationSeconds ?? 0} giây · Lưu trong bộ nhớ tạm của ứng dụng</Text>
        </View>
      )}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <CameraHeader locationName={media.locationName} onBack={onBack} />
      </View>
      <View style={[styles.confirmation, { paddingBottom: Math.max(insets.bottom, 18) + 12 }]}>
        <Text style={styles.confirmationTitle}>{savedLocally ? 'Đã giữ bằng chứng trên thiết bị' : 'Dùng bằng chứng này?'}</Text>
        <Text style={styles.confirmationCopy}>
          {media.gps?.accuracy != null
            ? `GPS ±${Math.round(media.gps.accuracy)}m được lưu cùng thông tin chụp.`
            : 'Chưa có GPS. Bạn vẫn có thể giữ nội dung và bổ sung sau.'}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={onRetake}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="camera-retake-outline" size={21} color={Colors.surface} />
            <Text style={styles.secondaryText}>{media.type === 'photo' ? 'Chụp lại' : 'Quay lại'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, savedLocally && styles.savedButton]}
            onPress={onUse}
            disabled={savedLocally}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name={savedLocally ? 'check-circle' : 'check'} size={21} color={Colors.primaryDark} />
            <Text style={styles.primaryText}>{savedLocally ? 'Đã sử dụng' : 'Sử dụng'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080b0c' },
  videoPreview: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 32 },
  videoTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 15 },
  videoMeta: { color: '#bdc8c8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  confirmation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 22,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(8,12,12,0.9)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  confirmationTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  confirmationCopy: { color: '#d7dddd', fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#8ee9dc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  savedButton: { opacity: 0.75 },
  secondaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  primaryText: { color: Colors.primaryDark, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
