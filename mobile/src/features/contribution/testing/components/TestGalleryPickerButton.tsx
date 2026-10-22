import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CapturedContributionMedia } from '@/entities/contribution';
import { adaptPickerImageToMediaResult } from '../adapters/testImageAdapter';

function getNativeImagePicker(): typeof import('expo-image-picker') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker = require('expo-image-picker');
    if (picker?.launchImageLibraryAsync) {
      return picker;
    }
    return null;
  } catch {
    return null;
  }
}

interface TestGalleryPickerButtonProps {
  locationId: string;
  locationName: string;
  targetCoordinates?: { latitude: number; longitude: number } | null;
  disabled?: boolean;
  onMediaPicked: (media: CapturedContributionMedia) => void;
}

/**
 * Isolated TEST-ONLY component.
 * Allows picking an existing photo from the mobile device to test AI Pre-scan and Verification.
 * Wrapped in __DEV__ guard so it is completely tree-shaken in production.
 */
export function TestGalleryPickerButton({
  locationId,
  locationName,
  targetCoordinates,
  disabled = false,
  onMediaPicked,
}: TestGalleryPickerButtonProps) {
  const [picking, setPicking] = useState(false);

  // Production safeguard: do not render anything in release builds
  if (!__DEV__) {
    return null;
  }

  const handlePickImage = async () => {
    if (picking || disabled) return;
    setPicking(true);
    try {
      const ImagePicker = getNativeImagePicker();
      if (!ImagePicker) {
        Alert.alert(
          'Thư viện ảnh chưa có trong APK',
          'Bản Development Build APK hiện tại chưa chứa native module expo-image-picker.\n\nBạn có thể chụp ảnh trực tiếp bằng Camera của app để test quy trình AI ngay, hoặc chạy "npx expo run:android" để build lại APK hỗ trợ chọn ảnh từ thư viện.'
        );
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Cần quyền truy cập ảnh',
          'Vui lòng cấp quyền truy cập thư viện để test chọn ảnh trực tiếp từ thiết bị.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const adaptedMedia = adaptPickerImageToMediaResult(
          {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName ?? 'gallery-test.jpg',
            fileSize: asset.fileSize,
            base64: asset.base64 ?? undefined,
          },
          locationId,
          locationName,
          targetCoordinates
        );
        onMediaPicked(adaptedMedia);
      }
    } catch {
      Alert.alert('Lỗi chọn ảnh', 'Không thể chọn ảnh từ thư viện thiết bị.');
    } finally {
      setPicking(false);
    }
  };

  const isButtonDisabled = disabled || picking;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        isButtonDisabled && styles.disabled,
      ]}
      onPress={handlePickImage}
      disabled={isButtonDisabled}
      accessibilityRole="button"
      accessibilityLabel="Chọn ảnh từ thư viện (Test)"
      hitSlop={12}
    >
      {picking ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#ffffff" />
      )}
      <View style={styles.testBadge} pointerEvents="none">
        <Text style={styles.testBadgeText}>TEST</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.4,
  },
  testBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#facc15',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  testBadgeText: {
    color: '#0f172a',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
