import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/theme';
import { PreScanFeatureTag, runAiPreScan } from '../../services/aiPreScanService';
import { CapturedContributionMedia } from '../types';
import { CameraHeader } from './CameraHeader';
import { styles } from './MediaPreview.styles';

interface MediaPreviewProps {
  media: CapturedContributionMedia;
  savedLocally: boolean;
  onBack: () => void;
  onRetake: () => void;
  onUse: (confirmedTags: string[]) => void;
}

export function MediaPreview({ media, savedLocally, onBack, onRetake, onUse }: MediaPreviewProps) {
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(media.type === 'photo');
  const [tags, setTags] = useState<PreScanFeatureTag[]>([]);
  const [selectedTagKeys, setSelectedTagKeys] = useState<Set<string>>(new Set());
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (media.type === 'photo') {
      setIsScanning(true);
      void runAiPreScan(media.uri).then((result) => {
        if (!active) return;
        setTags(result.features);
        setAiSummary(result.summary);
        const autoSelected = new Set(
          result.features.filter((f) => f.detected).map((f) => f.key)
        );
        setSelectedTagKeys(autoSelected);
        setIsScanning(false);
      });
    }
    return () => {
      active = false;
    };
  }, [media.type, media.uri]);

  const toggleTag = (key: string) => {
    setSelectedTagKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
        <Text style={styles.confirmationTitle}>{savedLocally ? 'Đã lưu bằng chứng tiếp cận' : 'Dùng bằng chứng này?'}</Text>
        <Text style={styles.confirmationCopy}>
          {media.gps?.accuracy != null
            ? `GPS ±${Math.round(media.gps.accuracy)}m được đính kèm cùng ảnh.`
            : 'Chưa có GPS. Bạn vẫn có thể giữ nội dung và bổ sung sau.'}
        </Text>

        {/* AI Pre-scan Section */}
        {media.type === 'photo' ? (
          <View style={styles.aiSection}>
            <View style={styles.aiHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <MaterialCommunityIcons name="auto-fix" size={15} color="#5eead4" />
                <Text style={styles.aiHeaderTitle}>AI Gợi ý nhãn tiếp cận</Text>
              </View>
              {isScanning ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <ActivityIndicator size="small" color="#5eead4" />
                  <Text style={styles.aiStatusText}>Đang quét...</Text>
                </View>
              ) : (
                <Text style={styles.aiStatusText}>Chạm để bật/tắt</Text>
              )}
            </View>

            {!isScanning && tags.length > 0 ? (
              <View style={styles.tagChipsRow}>
                {tags.map((tag) => {
                  const isSelected = selectedTagKeys.has(tag.key);
                  return (
                    <Pressable
                      key={tag.key}
                      style={[styles.tagChip, isSelected && styles.tagChipActive]}
                      onPress={() => toggleTag(tag.key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Text style={[styles.tagChipText, isSelected && styles.tagChipTextActive]}>
                        {isSelected ? '✓ ' : ''}{tag.label} {Math.round(tag.confidence * 100)}%
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {aiSummary && !isScanning ? (
              <Text style={[styles.aiStatusText, { fontStyle: 'italic', marginTop: 2 }]} numberOfLines={2}>
                {aiSummary}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* +50 EXP Badge */}
        <View style={styles.expBadge}>
          <MaterialCommunityIcons name="star-circle" size={14} color="#facc15" />
          <Text style={styles.expText}>+50 EXP sau khi gửi thẩm định</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={onRetake}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="camera-retake-outline" size={20} color={Colors.surface} />
            <Text style={styles.secondaryText}>{media.type === 'photo' ? 'Chụp lại' : 'Quay lại'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, savedLocally && styles.savedButton]}
            onPress={() => onUse(Array.from(selectedTagKeys))}
            disabled={savedLocally}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name={savedLocally ? 'check-circle' : 'check'} size={20} color={Colors.primaryDark} />
            <Text style={styles.primaryText}>{savedLocally ? 'Đã lưu (+50 EXP)' : 'Sử dụng'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
