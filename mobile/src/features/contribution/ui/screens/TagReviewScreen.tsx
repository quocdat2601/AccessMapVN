import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import {
  initializeObservationsFromKeys,
  observationMapToConfirmedKeys,
  observationMapToConfirmedObservations,
  type ObservationMap,
  type ObservationState,
  setObservationState,
  updateFieldNotes,
} from '../../model/tagReviewModel';

export interface UserMeasurementsInput {
  doorClearWidthCm?: number;
  rampHeightCm?: number;
  rampLengthCm?: number;
}

interface TagReviewScreenProps {
  media: CapturedContributionMedia;
  previewFrameUri?: string | null;
  availableTags: PreScanFeatureTag[];
  aiSummary: string | null;
  isPreScanning: boolean;
  locationName?: string;
  locationAddress?: string | null;
  initialObservations?: ObservationMap;
  onChangeLocation?: () => void;
  onProceedToVerification: (
    confirmedTagKeys: string[],
    notes: string,
    measurements?: UserMeasurementsInput,
    confirmedObservations?: Record<string, 'present' | 'absent'>
  ) => void;
  onRetake: () => void;
  onBack: () => void;
}

const AI_TO_QCVN_MAP: Record<string, string[]> = {
  exterior_ramp_present: ['exterior_ramp_present'],
  steps_present: ['steps_present'],
  elevator_present: ['elevator_accessible'],
  accessible_restroom_sign: ['restroom_accessible_stall'],
  tactile_paving_present: ['tactile_paving_guiding'],
  door_detected: ['door_width_ok'],
  door_width_compliant: ['door_width_ok'],
};

function mapDetectedToQcvn(tags: PreScanFeatureTag[]): string[] {
  const result: string[] = [];
  for (const t of tags) {
    if (t.detected) {
      const mapped = AI_TO_QCVN_MAP[t.key];
      if (mapped) {
        result.push(...mapped);
      }
    }
  }
  return result;
}

export function TagReviewScreen({
  media,
  previewFrameUri,
  availableTags,
  aiSummary,
  isPreScanning,
  locationName,
  locationAddress,
  initialObservations,
  onChangeLocation,
  onProceedToVerification,
  onRetake,
  onBack,
}: TagReviewScreenProps) {
  const insets = useSafeAreaInsets();
  // Khởi tạo: nếu có draft thì khôi phục draft; nếu không thì tự động chọn Có cho các tag AI phát hiện được
  const [observations, setObservations] = useState<ObservationMap>(() => {
    if (initialObservations && Object.keys(initialObservations).length > 0) {
      return { ...initialObservations };
    }
    const detectedKeys = mapDetectedToQcvn(availableTags);
    return initializeObservationsFromKeys(detectedKeys);
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const previewImageUri = media.type === 'video' ? (previewFrameUri ?? null) : media.uri;

  // Tự động chọn Có cho các tag AI phát hiện được khi scan hoàn tất
  React.useEffect(() => {
    if (!isPreScanning && availableTags.length > 0) {
      const detectedKeys = mapDetectedToQcvn(availableTags);
      if (detectedKeys.length > 0) {
        setObservations((prev) => {
          let updated = { ...prev };
          let changed = false;
          for (const k of detectedKeys) {
            if (updated[k] !== 'absent' && updated[k] !== 'present') {
              updated = setObservationState(updated, k, 'present');
              changed = true;
            }
          }
          return changed ? updated : prev;
        });
      }
    }
  }, [availableTags, isPreScanning]);

  // Derived list of confirmed present keys for scoring, rules, and legacy publication
  const selectedKeys = React.useMemo(
    () => observationMapToConfirmedKeys(observations),
    [observations]
  );

  // Explicit tri-state observations (both present and absent, unknown excluded)
  const confirmedObservations = React.useMemo(
    () => observationMapToConfirmedObservations(observations),
    [observations]
  );

  // Optional technical measurement states (collapsed by default to keep review concise)
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [doorClearWidthStr, setDoorClearWidthStr] = useState('');
  const [rampHeightStr, setRampHeightStr] = useState('');
  const [rampLengthStr, setRampLengthStr] = useState('');

  // AI suggestions are purely informational badges; they do not overwrite user observations.
  const handleObservationChange = (key: string, state: ObservationState) => {
    setObservations((prev) => setObservationState(prev, key, state));
  };

  const hasRampSelected = selectedKeys.some((k) => k.toLowerCase().includes('ramp'));
  const hasDoorSelected = selectedKeys.some(
    (k) =>
      k.toLowerCase().includes('door') ||
      k.toLowerCase().includes('entrance') ||
      k.toLowerCase().includes('step_free')
  );

  const parsedRampH = parseFloat(rampHeightStr.replace(',', '.'));
  const parsedRampL = parseFloat(rampLengthStr.replace(',', '.'));
  const calculatedSlopePercent =
    !isNaN(parsedRampH) && !isNaN(parsedRampL) && parsedRampL > 0 && parsedRampH >= 0
      ? Math.round((parsedRampH / parsedRampL) * 1000) / 10
      : null;

  const parsedDoorW = parseFloat(doorClearWidthStr.replace(',', '.'));
  const validDoorWidthCm = !isNaN(parsedDoorW) && parsedDoorW > 0 ? parsedDoorW : null;

  const handleProceed = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const measurements: UserMeasurementsInput = {};
    if (validDoorWidthCm) {
      measurements.doorClearWidthCm = validDoorWidthCm;
    }
    if (calculatedSlopePercent !== null && parsedRampH >= 0 && parsedRampL > 0) {
      measurements.rampHeightCm = parsedRampH;
      measurements.rampLengthCm = parsedRampL;
    }

    setTimeout(() => {
      onProceedToVerification(
        selectedKeys,
        updateFieldNotes('', notes),
        Object.keys(measurements).length > 0 ? measurements : undefined,
        confirmedObservations
      );
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
          hitSlop={6}
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
          hitSlop={6}
        >
          <MaterialCommunityIcons name="camera-retake-outline" size={20} color="#475569" />
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
          {/* Media Preview Card (unified photo & video keyframe preview) */}
          <View style={styles.mediaCard}>
            {!previewImageUri ? (
              <View style={styles.videoPreviewPlaceholder}>
                <MaterialCommunityIcons name="video-check-outline" size={38} color="#004e58" />
                <Text style={styles.videoPreviewTitle}>
                  Video bằng chứng ({media.durationSeconds ?? 5}s)
                </Text>
                <Text style={styles.videoPreviewSubtitle}>
                  {isPreScanning
                    ? 'Đang trích xuất & phân tích khung hình…'
                    : 'AI đã quét khung hình đại diện'}
                </Text>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.mediaPressable, pressed && styles.mediaPressed]}
                onPress={() => setShowFullPreview(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  media.type === 'video'
                    ? 'Xem toàn màn hình khung hình video'
                    : 'Xem toàn màn hình ảnh chụp'
                }
              >
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.mediaImage}
                  contentFit="cover"
                />
              </Pressable>
            )}
            <View style={styles.mediaTypePill} pointerEvents="none">
              <MaterialCommunityIcons
                name={media.type === 'video' ? 'video-outline' : 'camera-outline'}
                size={12}
                color="#ffffff"
              />
              <Text style={styles.mediaTypePillText}>
                {media.type === 'video' ? `Video · ${media.durationSeconds ?? 5}s` : 'Ảnh chụp'}
              </Text>
            </View>
            {previewImageUri ? (
              <View style={styles.expandHintPill} pointerEvents="none">
                <MaterialCommunityIcons name="fullscreen" size={13} color="#ffffff" />
                <Text style={styles.expandHintPillText}>Phóng to</Text>
              </View>
            ) : null}
            <View style={styles.mediaOverlay} pointerEvents="box-none">
              <Pressable
                style={({ pressed }) => [styles.locationPill, pressed && { opacity: 0.8 }]}
                onPress={onChangeLocation}
                accessibilityRole="button"
                accessibilityLabel="Chạm để đổi địa điểm đóng góp"
              >
                <MaterialCommunityIcons name="map-marker-radius" size={13} color="#004e58" />
                <Text style={styles.locationPillText} numberOfLines={1}>
                  {locationName || media.locationName}
                </Text>
                {onChangeLocation ? (
                  <MaterialCommunityIcons name="pencil-outline" size={12} color="#004e58" />
                ) : null}
              </Pressable>
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
              <Text style={styles.aiBannerTitle}>
                {media.type === 'video' ? 'Nhận diện nhanh từ video' : 'Nhận diện nhanh từ ảnh'}
              </Text>
              {isPreScanning ? (
                <ActivityIndicator size="small" color="#004e58" style={{ marginLeft: 'auto' }} />
              ) : null}
            </View>
            <Text style={styles.aiBannerBody}>
              {isPreScanning
                ? (media.type === 'video' ? 'Đang trích xuất và phân tích khung hình video...' : 'Đang phân tích hình ảnh...')
                : aiSummary || 'Chưa nhận diện rõ tiện ích trong hình. Bạn hãy tự chọn các mục quan sát được bên dưới.'}
            </Text>
          </View>

          {/* Tag Selector */}
          <View style={styles.card}>
            <FeatureTagSelector
              availableTags={availableTags}
              observations={observations}
              selectedKeys={selectedKeys}
              onChangeObservation={handleObservationChange}
            />
          </View>

          {/* Optional Technical Measurements (collapsible, collapsed by default) */}
          {(hasRampSelected || hasDoorSelected) && (
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.78 }]}
                onPress={() => setShowMeasurements((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Mở hoặc thu gọn số đo kỹ thuật tùy chọn"
              >
                <MaterialCommunityIcons name="ruler-square" size={17} color="#004e58" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputTitle}>Kích thước kỹ thuật (Tùy chọn)</Text>
                  <Text style={styles.measurementSubtitle}>
                    {showMeasurements
                      ? 'Nhập số đo thực tế để kiểm tra theo chuẩn QCVN 10'
                      : 'Chạm để nhập chiều rộng cửa / độ dốc nếu có thước đo'}
                  </Text>
                </View>
                {(validDoorWidthCm !== null || calculatedSlopePercent !== null) ? (
                  <View style={styles.measuredPill}>
                    <Text style={styles.measuredPillText}>Đã nhập</Text>
                  </View>
                ) : null}
                <MaterialCommunityIcons
                  name={showMeasurements ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#64748b"
                />
              </Pressable>

              {showMeasurements && hasRampSelected && (
                <View style={styles.measurementSection}>
                  <Text style={styles.measurementFieldLabel}>
                    Độ dốc ram (Chiều cao H & Chiều dài mặt dốc L)
                  </Text>
                  <View style={styles.measurementRow}>
                    <View style={styles.measurementInputWrapper}>
                      <TextInput
                        style={styles.measurementTextInput}
                        value={rampHeightStr}
                        onChangeText={setRampHeightStr}
                        placeholder="Cao H (cm)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        accessibilityLabel="Chiều cao dốc tính bằng cm"
                      />
                    </View>
                    <Text style={styles.measurementDivideText}>/</Text>
                    <View style={styles.measurementInputWrapper}>
                      <TextInput
                        style={styles.measurementTextInput}
                        value={rampLengthStr}
                        onChangeText={setRampLengthStr}
                        placeholder="Dài L (cm)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        accessibilityLabel="Chiều dài mặt dốc tính bằng cm"
                      />
                    </View>
                  </View>
                  {calculatedSlopePercent !== null && (
                    <View
                      style={[
                        styles.measurementBadge,
                        calculatedSlopePercent <= 8.33
                          ? styles.measurementBadgeSuccess
                          : styles.measurementBadgeWarning,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={calculatedSlopePercent <= 8.33 ? 'check-decagram' : 'alert-circle-outline'}
                        size={14}
                        color={calculatedSlopePercent <= 8.33 ? '#007D78' : '#B45309'}
                      />
                      <Text
                        style={[
                          styles.measurementBadgeText,
                          calculatedSlopePercent <= 8.33
                            ? styles.measurementBadgeTextSuccess
                            : styles.measurementBadgeTextWarning,
                        ]}
                      >
                        {calculatedSlopePercent <= 8.33
                          ? `Độ dốc ${calculatedSlopePercent}% (≤ 8.33% · Đạt chuẩn QCVN 10)`
                          : `Độ dốc ${calculatedSlopePercent}% (> 8.33% · Vượt quá độ dốc an toàn xe lăn)`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {showMeasurements && hasDoorSelected && (
                <View style={[styles.measurementSection, hasRampSelected && { marginTop: 12 }]}>
                  <Text style={styles.measurementFieldLabel}>
                    Độ rộng lọt lòng cửa ra vào (Chuẩn QCVN 10: ≥ 90 cm)
                  </Text>
                  <TextInput
                    style={styles.measurementTextInput}
                    value={doorClearWidthStr}
                    onChangeText={setDoorClearWidthStr}
                    placeholder="Ví dụ: 95 (cm)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    accessibilityLabel="Độ rộng lọt lòng cửa tính bằng cm"
                  />
                  {validDoorWidthCm !== null && (
                    <View
                      style={[
                        styles.measurementBadge,
                        validDoorWidthCm >= 90
                          ? styles.measurementBadgeSuccess
                          : styles.measurementBadgeWarning,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={validDoorWidthCm >= 90 ? 'check-decagram' : 'alert-circle-outline'}
                        size={14}
                        color={validDoorWidthCm >= 90 ? '#007D78' : '#B45309'}
                      />
                      <Text
                        style={[
                          styles.measurementBadgeText,
                          validDoorWidthCm >= 90
                            ? styles.measurementBadgeTextSuccess
                            : styles.measurementBadgeTextWarning,
                        ]}
                      >
                        {validDoorWidthCm >= 90
                          ? `Độ rộng ${validDoorWidthCm} cm (≥ 90 cm · Đạt chuẩn QCVN 10)`
                          : `Độ rộng ${validDoorWidthCm} cm (< 90 cm · Hẹp so với xe lăn tiêu chuẩn)`}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

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

      {previewImageUri ? (
        <Modal
          visible={showFullPreview}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowFullPreview(false)}
        >
          <View style={styles.fullPreviewBackdrop}>
            <View
              style={[
                styles.fullPreviewHeader,
                { paddingTop: Math.max(insets.top, 16) + 8 },
              ]}
            >
              <View style={styles.fullPreviewTitleWrap}>
                <Text style={styles.fullPreviewTitle} numberOfLines={1}>
                  {media.type === 'video'
                    ? `Khung hình video · ${media.durationSeconds ?? 5}s`
                    : 'Ảnh chụp bằng chứng'}
                </Text>
                <Text style={styles.fullPreviewSubtitle} numberOfLines={1}>
                  {locationName || media.locationName}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.fullPreviewCloseBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowFullPreview(false)}
                accessibilityRole="button"
                accessibilityLabel="Đóng xem toàn màn hình"
              >
                <MaterialCommunityIcons name="close" size={22} color="#ffffff" />
              </Pressable>
            </View>

            <Pressable
              style={styles.fullPreviewBody}
              onPress={() => setShowFullPreview(false)}
              accessibilityRole="button"
              accessibilityLabel="Chạm để đóng xem toàn màn hình"
            >
              <Image
                source={{ uri: previewImageUri }}
                style={styles.fullPreviewImage}
                contentFit="contain"
              />
            </Pressable>

            <View
              style={[
                styles.fullPreviewFooter,
                { paddingBottom: Math.max(insets.bottom, 16) + 8 },
              ]}
            >
              <Text style={styles.fullPreviewHint}>
                Chạm vào ảnh hoặc nút đóng để quay lại
              </Text>
            </View>
          </View>
        </Modal>
      ) : null}
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  mediaPressable: {
    width: '100%',
    height: '100%',
  },
  mediaPressed: {
    opacity: 0.92,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoPreviewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfeff',
    paddingBottom: 32,
    gap: 4,
  },
  videoPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#004e58',
  },
  videoPreviewSubtitle: {
    fontSize: 12,
    color: '#0f766e',
  },
  mediaTypePill: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mediaTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  expandHintPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  expandHintPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
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
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  measuredPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  measuredPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007D78',
  },
  inputTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  measurementSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  measurementSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  measurementFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  measurementInputWrapper: {
    flex: 1,
  },
  measurementDivideText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
  },
  measurementTextInput: {
    backgroundColor: '#f8faf9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  measurementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  measurementBadgeSuccess: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  measurementBadgeWarning: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  measurementBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  measurementBadgeTextSuccess: {
    color: '#007D78',
  },
  measurementBadgeTextWarning: {
    color: '#b45309',
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
  fullPreviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.96)',
  },
  fullPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  fullPreviewTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  fullPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  fullPreviewSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  fullPreviewCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPreviewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
  fullPreviewFooter: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fullPreviewHint: {
    fontSize: 12,
    color: '#cbd5e1',
  },
});
