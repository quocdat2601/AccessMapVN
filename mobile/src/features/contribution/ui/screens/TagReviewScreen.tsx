import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CapturedContributionMedia } from '@/entities/contribution';
import type { PreScanFeatureTag } from '../../api/aiPreScanService';
import { FeatureTagSelector } from '../components/review/FeatureTagSelector';
import { toggleFeatureTagKey, updateFieldNotes } from '../../model/tagReviewModel';

interface TagReviewScreenProps {
  media: CapturedContributionMedia;
  availableTags: PreScanFeatureTag[];
  aiSummary: string | null;
  isPreScanning: boolean;
  onProceedToVerification: (confirmedTagKeys: string[], notes: string) => void;
  onRetake: () => void;
  onBack: () => void;
}

const AI_TO_QCVN_MAP: Record<string, string[]> = {
  exterior_ramp_present: ['exterior_ramp_present'],
  steps_present: ['steps_present'],
  elevator_present: ['elevator_accessible'],
  door_width_ok: ['door_width_ok'],
  accessible_restroom_sign: ['restroom_accessible_stall'],
  tactile_paving_present: ['tactile_paving_guiding'],
};

function mapDetectedToQcvn(tags: PreScanFeatureTag[]): string[] {
  const result: string[] = [];
  for (const t of tags) {
    if (t.detected) {
      const mapped = AI_TO_QCVN_MAP[t.key] || [t.key];
      result.push(...mapped);
    }
  }
  return result;
}

export function TagReviewScreen({
  media,
  availableTags,
  aiSummary,
  isPreScanning,
  onProceedToVerification,
  onRetake,
  onBack,
}: TagReviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    mapDetectedToQcvn(availableTags)
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill tags detected by AI pre-scan once scanning completes
  React.useEffect(() => {
    if (!isPreScanning && availableTags.length > 0) {
      const detectedKeys = mapDetectedToQcvn(availableTags);
      if (detectedKeys.length > 0) {
        setSelectedKeys((prev) => {
          const merged = new Set([...prev, ...detectedKeys]);
          return Array.from(merged);
        });
      }
    }
  }, [availableTags, isPreScanning]);

  const handleToggle = (key: string) => {
    setSelectedKeys((prev) => toggleFeatureTagKey(prev, key));
  };

  const handleProceed = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onProceedToVerification(selectedKeys, updateFieldNotes('', notes));
    }, 600);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerStep}>BƯỚC 2 / 3</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Xác nhận đặc điểm tiếp cận
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={onRetake}
          accessibilityRole="button"
          accessibilityLabel="Chụp lại"
        >
          <MaterialCommunityIcons name="camera-retake-outline" size={20} color="#64748b" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Media Preview Card */}
          <View style={styles.mediaCard}>
            <Image source={{ uri: media.uri }} style={styles.mediaImage} contentFit="cover" />
            <View style={styles.mediaOverlay}>
              <View style={styles.locationPill}>
                <MaterialCommunityIcons name="map-marker-radius" size={13} color="#004e58" />
                <Text style={styles.locationPillText} numberOfLines={1}>
                  {media.locationName}
                </Text>
              </View>
              {media.gps ? (
                <View style={styles.gpsPill}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={12} color="#b45309" />
                  <Text style={styles.gpsPillText}>
                    GPS ±{Math.round(media.gps.accuracy ?? 5)}m
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* AI Suggestions Summary */}
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerHeader}>
              <View style={styles.aiIconBadge}>
                <MaterialCommunityIcons name="creation" size={15} color="#004e58" />
              </View>
              <Text style={styles.aiBannerTitle}>Gợi ý tự động từ ảnh</Text>
              {isPreScanning ? (
                <ActivityIndicator size="small" color="#004e58" style={{ marginLeft: 'auto' }} />
              ) : null}
            </View>
            <Text style={styles.aiBannerBody}>
              {isPreScanning
                ? 'Đang phân tích nhanh hình ảnh...'
                : aiSummary || 'AI đã nhận diện đặc tính tiếp cận. Bạn có thể chọn hoặc chỉnh sửa thêm bên dưới.'}
            </Text>
          </View>

          {/* Tag Selector */}
          <View style={styles.card}>
            <FeatureTagSelector
              availableTags={availableTags}
              selectedKeys={selectedKeys}
              onToggleKey={handleToggle}
            />
          </View>

          {/* Optional Field Notes */}
          <View style={styles.card}>
            <View style={styles.inputHeader}>
              <MaterialCommunityIcons name="note-edit-outline" size={16} color="#004e58" />
              <Text style={styles.inputTitle}>Ghi chú thêm (không bắt buộc)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ví dụ: Dốc ở cửa bên phải, bề mặt chống trượt, cửa tự động..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              accessibilityLabel="Ghi chú thêm"
            />
          </View>

          {/* EXP Reward Info */}
          <View style={styles.expInfoRow}>
            <MaterialCommunityIcons name="star-circle" size={16} color="#d97706" />
            <Text style={styles.expInfoText}>
              +50 EXP sau khi thông tin được duyệt
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.proceedBtn,
            isSubmitting && styles.proceedBtnDisabled,
            pressed && !isSubmitting && styles.pressed,
          ]}
          onPress={handleProceed}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Xem kết quả đánh giá"
        >
          {isSubmitting ? (
            <View style={styles.proceedBtnInner}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.proceedBtnText}>Đang tổng hợp điểm số...</Text>
            </View>
          ) : (
            <View style={styles.proceedBtnInner}>
              <Text style={styles.proceedBtnText}>Xem kết quả đánh giá</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#ffffff" />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faf9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerStep: {
    fontSize: 10,
    fontWeight: '700',
    color: '#004e58',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  mediaCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: '65%',
  },
  locationPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gpsPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#b45309',
  },
  aiBanner: {
    backgroundColor: '#f0fdfa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 12,
    gap: 5,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  aiIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#004e58',
  },
  aiBannerBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inputTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  textInput: {
    backgroundColor: '#f8faf9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#0f172a',
    fontSize: 13,
    padding: 10,
    minHeight: 60,
  },
  expInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  expInfoText: {
    fontSize: 11.5,
    color: '#d97706',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#004e58',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#004e58',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  proceedBtnDisabled: {
    backgroundColor: '#0d9488',
    opacity: 0.85,
  },
  proceedBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
