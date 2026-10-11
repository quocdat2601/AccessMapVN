import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { CapturedContributionMedia } from '@/entities/contribution';
import { adaptPickerImageToMediaResult } from '../adapters/testImageAdapter';

interface TestGalleryPickerButtonProps {
  locationId: string;
  locationName: string;
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
  onMediaPicked,
}: TestGalleryPickerButtonProps) {
  // Production safeguard: do not render anything in release builds
  if (!__DEV__) {
    return null;
  }

  const [picking, setPicking] = useState(false);

  const handlePickImage = async () => {
    if (picking) return;
    setPicking(true);
    try {
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
        quality: 0.9,
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
          },
          locationId,
          locationName
        );
        onMediaPicked(adaptedMedia);
      }
    } catch (error) {
      Alert.alert('Lỗi chọn ảnh', 'Không thể chọn ảnh từ thư viện thiết bị.');
    } finally {
      setPicking(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={handlePickImage}
      disabled={picking}
      accessibilityRole="button"
      accessibilityLabel="[TEST] Chọn ảnh từ máy"
    >
      {picking ? (
        <ActivityIndicator size="small" color="#facc15" />
      ) : (
        <MaterialCommunityIcons name="image-plus" size={18} color="#facc15" />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.badgeText}>[TEST] PICK ẢNH</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: '#facc15',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  textContainer: {
    justifyContent: 'center',
  },
  badgeText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
