import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAccessibility,
  type ColorBlindMode,
  type MobilityPreset,
  type TextSizeOption,
} from '../model/AccessibilityContext';

export interface AccessibilitySettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AccessibilitySettingsModal({ visible, onClose }: AccessibilitySettingsModalProps) {
  const insets = useSafeAreaInsets();
  const {
    settings,
    updateSettings,
    resetSettings,
    triggerHaptic,
    textScale,
  } = useAccessibility();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleTextSizeChange = (size: TextSizeOption) => {
    updateSettings({ textSize: size });
    showToast(`Đã đổi cỡ chữ: ${size === 'standard' ? 'Tiêu chuẩn (100%)' : size === 'large' ? 'Lớn (120%)' : 'Rất lớn (140%)'}`);
  };

  const handleMobilityPresetChange = (preset: MobilityPreset) => {
    updateSettings({ defaultMobilityProfile: preset });
    showToast('Đã cập nhật hồ sơ di chuyển mặc định');
  };

  const handleColorBlindChange = (mode: ColorBlindMode) => {
    updateSettings({ colorBlindMode: mode });
  };

  const handleReset = () => {
    Alert.alert(
      'Đặt lại trợ năng',
      'Bạn có chắc muốn khôi phục toàn bộ cài đặt trợ năng về mặc định ban đầu?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            showToast('Đã khôi phục cài đặt mặc định');
          },
        },
      ]
    );
  };

  const handleSaveAndClose = () => {
    triggerHaptic(50);
    showToast('Đã lưu và áp dụng cài đặt trợ năng!');
    setTimeout(onClose, 400);
  };

  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    14
  );

  const isHighContrast = settings.highContrast;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View
        style={[
          styles.container,
          isHighContrast && styles.containerHighContrast,
          { paddingTop: safeTop },
        ]}
      >
        <StatusBar
          barStyle={isHighContrast ? 'dark-content' : 'dark-content'}
          backgroundColor={isHighContrast ? '#FFFFFF' : '#FFFFFF'}
        />

        {/* 1. Header Bar */}
        <View style={[styles.header, isHighContrast && styles.headerHighContrast]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            accessibilityLabel="Đóng cài đặt trợ năng"
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={isHighContrast ? '#000000' : '#0F172A'}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerBadgeRow}>
              <View
                style={[
                  styles.headerIconCircle,
                  isHighContrast && { backgroundColor: '#000000' },
                ]}
              >
                <MaterialCommunityIcons
                  name="human-wheelchair"
                  size={18}
                  color={isHighContrast ? '#FFFFFF' : '#004F58'}
                />
              </View>
              <Text
                style={[
                  styles.headerTitle,
                  isHighContrast && styles.textHighContrastBold,
                ]}
              >
                Cài Đặt Trợ Năng
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Hỗ trợ người khuyết tật & tiếp cận không rào cản
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.resetButtonText,
                isHighContrast && { color: '#000000', fontWeight: '800' },
              ]}
            >
              Đặt lại
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Scrollable Body */}
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Toast feedback */}
          {toastMessage && (
            <View style={styles.toastCard}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}

          {/* Standard compliance badge banner */}
          <View
            style={[
              styles.standardBanner,
              isHighContrast && styles.standardBannerHighContrast,
            ]}
          >
            <MaterialCommunityIcons
              name="certificate-outline"
              size={20}
              color={isHighContrast ? '#000000' : '#004F58'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.standardBannerTitle,
                  isHighContrast && styles.textHighContrastBold,
                ]}
              >
                Tiêu chuẩn QCVN 10:2014 & WCAG 2.1 AAA
              </Text>
              <Text style={styles.standardBannerSub}>
                Cấu hình giúp tối ưu hóa giao diện cho người khiếm thị, người đi xe lăn, người cao tuổi và đa dạng thể trạng.
              </Text>
            </View>
          </View>

          {/* LIVE PREVIEW BOX */}
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="eye-outline" size={18} color="#004F58" />
            <Text style={styles.sectionTitle}>XEM TRƯỚC TRỰC TIẾP (LIVE PREVIEW)</Text>
          </View>

          <View
            style={[
              styles.previewBox,
              isHighContrast && styles.previewBoxHighContrast,
            ]}
          >
            <View style={styles.previewTopRow}>
              <View
                style={[
                  styles.previewPoiCircle,
                  isHighContrast && { backgroundColor: '#000000' },
                ]}
              >
                <MaterialCommunityIcons
                  name="storefront"
                  size={18}
                  color={isHighContrast ? '#FFFFFF' : '#004F58'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.previewPlaceName,
                    { fontSize: Math.round(16 * textScale) },
                    isHighContrast && styles.textHighContrastBold,
                  ]}
                  numberOfLines={1}
                >
                  Highland Coffee — Sảnh S9.01
                </Text>
                <Text
                  style={[
                    styles.previewPlaceAddr,
                    { fontSize: Math.round(12 * textScale) },
                    isHighContrast && { color: '#000000' },
                  ]}
                >
                  Vinhomes Grand Park, Phường Long Thạnh Mỹ
                </Text>
              </View>
            </View>

            {/* Preview Badges */}
            <View style={styles.previewBadgesRow}>
              <View
                style={[
                  styles.previewBadge,
                  isHighContrast && styles.previewBadgeHighContrast,
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={isHighContrast ? '#000000' : '#059669'}
                />
                <Text
                  style={[
                    styles.previewBadgeText,
                    { fontSize: Math.round(11 * textScale) },
                    isHighContrast && { color: '#000000', fontWeight: '800' },
                  ]}
                >
                  Ram dốc đạt chuẩn
                </Text>
              </View>

              <View
                style={[
                  styles.previewBadge,
                  isHighContrast && styles.previewBadgeHighContrast,
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={isHighContrast ? '#000000' : '#059669'}
                />
                <Text
                  style={[
                    styles.previewBadgeText,
                    { fontSize: Math.round(11 * textScale) },
                    isHighContrast && { color: '#000000', fontWeight: '800' },
                  ]}
                >
                  Thang máy
                </Text>
              </View>

              <View
                style={[
                  styles.previewBadge,
                  isHighContrast && styles.previewBadgeHighContrast,
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={isHighContrast ? '#000000' : '#059669'}
                />
                <Text
                  style={[
                    styles.previewBadgeText,
                    { fontSize: Math.round(11 * textScale) },
                    isHighContrast && { color: '#000000', fontWeight: '800' },
                  ]}
                >
                  Cửa rộng &gt;90cm
                </Text>
              </View>
            </View>

            <View style={styles.previewFooterRow}>
              <View style={styles.previewScorePill}>
                <Text style={styles.previewScoreText}>⭐ Điểm tiếp cận: 95/100 (Xuất sắc)</Text>
              </View>
              <Text
                style={[
                  styles.previewScaleHint,
                  isHighContrast && { color: '#000000' },
                ]}
              >
                Cỡ chữ: {Math.round(textScale * 100)}%
              </Text>
            </View>
          </View>

          {/* SECTION 1: THỊ GIÁC & HIỂN THỊ */}
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="format-size" size={19} color="#004F58" />
            <Text style={styles.sectionTitle}>1. THỊ GIÁC & HIỂN THỊ (VISUAL)</Text>
          </View>

          <View style={[styles.settingCard, isHighContrast && styles.settingCardHighContrast]}>
            {/* Text size selector */}
            <View style={styles.settingRowStacked}>
              <View>
                <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                  Cỡ chữ hiển thị
                </Text>
                <Text style={styles.settingDesc}>
                  Phóng to văn bản trên toàn bộ bản đồ và trang chi tiết địa điểm
                </Text>
              </View>

              <View style={styles.textSizeTabsRow}>
                {(
                  [
                    { key: 'standard', label: 'Tiêu chuẩn', scale: '100%' },
                    { key: 'large', label: 'Lớn', scale: '120%' },
                    { key: 'extraLarge', label: 'Rất lớn', scale: '140%' },
                  ] as const
                ).map((tab) => {
                  const active = settings.textSize === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.textSizeTab,
                        active && styles.textSizeTabActive,
                        active && isHighContrast && styles.textSizeTabActiveHighContrast,
                      ]}
                      onPress={() => handleTextSizeChange(tab.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.textSizeTabLabel,
                          active && styles.textSizeTabLabelActive,
                          active && isHighContrast && { color: '#FFFFFF' },
                        ]}
                      >
                        {tab.label}
                      </Text>
                      <Text
                        style={[
                          styles.textSizeTabScale,
                          active && styles.textSizeTabScaleActive,
                          active && isHighContrast && { color: '#FFFFFF' },
                        ]}
                      >
                        {tab.scale}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* High Contrast Toggle */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                  Chế độ tương phản cao (High Contrast)
                </Text>
                <Text style={styles.settingDesc}>
                  Tăng độ đậm viền và tương phản chữ đen trên nền trắng tuyết (Chuẩn WCAG AAA)
                </Text>
              </View>
              <Switch
                value={settings.highContrast}
                onValueChange={(val) => {
                  updateSettings({ highContrast: val });
                  showToast(val ? 'Đã bật Tương phản cao' : 'Đã tắt Tương phản cao');
                }}
                thumbColor={settings.highContrast ? '#004F58' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              />
            </View>

            {/* Reduce Motion */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                  Giảm hiệu ứng chuyển động (Reduce Motion)
                </Text>
                <Text style={styles.settingDesc}>
                  Hạn chế bay lượn camera bản đồ và hoạt ảnh nhanh cho người dễ chóng mặt
                </Text>
              </View>
              <Switch
                value={settings.reduceMotion}
                onValueChange={(val) => {
                  updateSettings({ reduceMotion: val });
                  showToast(val ? 'Đã bật Giảm chuyển động' : 'Đã tắt Giảm chuyển động');
                }}
                thumbColor={settings.reduceMotion ? '#004F58' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              />
            </View>

            {/* Color Blind Mode */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRowStacked}>
              <View>
                <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                  Bộ lọc hỗ trợ thị giác màu (Color Blind Filter)
                </Text>
                <Text style={styles.settingDesc}>
                  Tối ưu sắc độ pin bản đồ cho người có khiếm khuyết phân biệt màu sắc
                </Text>
              </View>

              <View style={styles.colorBlindGrid}>
                {(
                  [
                    { key: 'none', label: 'Bình thường' },
                    { key: 'protanopia', label: 'Mù màu Đỏ (Protan)' },
                    { key: 'deuteranopia', label: 'Mù màu Xanh lá (Deutan)' },
                    { key: 'tritanopia', label: 'Mù màu Xanh lam (Tritan)' },
                  ] as const
                ).map((c) => {
                  const active = settings.colorBlindMode === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.colorBlindChip,
                        active && styles.colorBlindChipActive,
                        active && isHighContrast && styles.colorBlindChipActiveHighContrast,
                      ]}
                      onPress={() => handleColorBlindChange(c.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.colorBlindChipText,
                          active && styles.colorBlindChipTextActive,
                          active && isHighContrast && { color: '#FFFFFF' },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* SECTION 2: ÂM THANH & XÚC GIÁC */}
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="volume-high" size={19} color="#004F58" />
            <Text style={styles.sectionTitle}>2. ÂM THANH & XÚC GIÁC (AUDIO & HAPTICS)</Text>
          </View>

          <View style={[styles.settingCard, isHighContrast && styles.settingCardHighContrast]}>
            {/* Haptic Feedback */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.labelWithIconRow}>
                  <MaterialCommunityIcons name="vibrate" size={18} color="#004F58" />
                  <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                    Rung phản hồi xúc giác (Haptic Feedback)
                  </Text>
                </View>
                <Text style={styles.settingDesc}>
                  Rung nhẹ thiết bị khi chọn địa điểm, chạm nút bấm hoặc lọc tiêu chí
                </Text>
              </View>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={(val) => {
                  updateSettings({ hapticFeedback: val });
                  if (val) triggerHaptic(60);
                  showToast(val ? 'Đã bật Rung phản hồi' : 'Đã tắt Rung phản hồi');
                }}
                thumbColor={settings.hapticFeedback ? '#004F58' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              />
            </View>

            {/* Audio Guidance */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.labelWithIconRow}>
                  <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#004F58" />
                  <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                    Đọc to tóm tắt tiếp cận (Audio Guidance)
                  </Text>
                </View>
                <Text style={styles.settingDesc}>
                  Tự động phát giọng đọc mô tả ram dốc và lối vào khi bấm mở chi tiết địa điểm
                </Text>
              </View>
              <Switch
                value={settings.audioGuidance}
                onValueChange={(val) => {
                  updateSettings({ audioGuidance: val });
                  showToast(val ? 'Đã bật Đọc to tiếp cận' : 'Đã tắt Đọc to tiếp cận');
                }}
                thumbColor={settings.audioGuidance ? '#004F58' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              />
            </View>

            {/* Screen Reader Optimization */}
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.labelWithIconRow}>
                  <MaterialCommunityIcons name="account-voice" size={18} color="#004F58" />
                  <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                    Tối ưu đọc màn hình (TalkBack / VoiceOver)
                  </Text>
                </View>
                <Text style={styles.settingDesc}>
                  Bổ sung nhãn trợ thính chi tiết và hướng dẫn cử chỉ tương thích cho người khiếm thị
                </Text>
              </View>
              <Switch
                value={settings.screenReaderOptimized}
                onValueChange={(val) => {
                  updateSettings({ screenReaderOptimized: val });
                  showToast(val ? 'Đã tối ưu TalkBack' : 'Đã tắt tối ưu TalkBack');
                }}
                thumbColor={settings.screenReaderOptimized ? '#004F58' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              />
            </View>
          </View>

          {/* SECTION 3: HỒ SƠ DI CHUYỂN MẶC ĐỊNH */}
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="wheelchair-accessibility" size={19} color="#004F58" />
            <Text style={styles.sectionTitle}>3. HỒ SƠ TIẾP CẬN MẶC ĐỊNH (PRESET)</Text>
          </View>

          <View style={[styles.settingCard, isHighContrast && styles.settingCardHighContrast]}>
            <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
              Thể trạng / Phương thức di chuyển chính
            </Text>
            <Text style={[styles.settingDesc, { marginBottom: 12 }]}>
              Hệ thống sẽ tự động cấu hình bộ lọc bản đồ và đường đi theo thể trạng này:
            </Text>

            <View style={styles.mobilityGrid}>
              {(
                [
                  {
                    key: 'wheelchair',
                    title: 'Xe lăn',
                    sub: 'Cần ram dốc, thang máy, cửa ≥90cm',
                    icon: 'wheelchair-accessibility',
                  },
                  {
                    key: 'motor_impaired',
                    title: 'Hạn chế vận động',
                    sub: 'Ưu tiên ít bậc thang, có tay vịn',
                    icon: 'walk',
                  },
                  {
                    key: 'visually_impaired',
                    title: 'Khiếm thị / Mắt kém',
                    sub: 'Cần gạch xúc giác, chỉ dẫn âm thanh',
                    icon: 'eye-off-outline',
                  },
                  {
                    key: 'elderly',
                    title: 'Người cao tuổi',
                    sub: 'Lối đi phẳng, có ghế nghỉ chân',
                    icon: 'human-cane',
                  },
                ] as const
              ).map((m) => {
                const active = settings.defaultMobilityProfile === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.mobilityCard,
                      active && styles.mobilityCardActive,
                      active && isHighContrast && styles.mobilityCardActiveHighContrast,
                    ]}
                    onPress={() => handleMobilityPresetChange(m.key)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.mobilityCardHeader}>
                      <MaterialCommunityIcons
                        name={m.icon as any}
                        size={20}
                        color={
                          active
                            ? isHighContrast
                              ? '#FFFFFF'
                              : '#004F58'
                            : '#64748B'
                        }
                      />
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={isHighContrast ? '#FFFFFF' : '#004F58'}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.mobilityCardTitle,
                        active && styles.mobilityCardTitleActive,
                        active && isHighContrast && { color: '#FFFFFF' },
                      ]}
                    >
                      {m.title}
                    </Text>
                    <Text
                      style={[
                        styles.mobilityCardSub,
                        active && styles.mobilityCardSubActive,
                        active && isHighContrast && { color: '#F1F5F9' },
                      ]}
                    >
                      {m.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.settingLabel, isHighContrast && styles.textHighContrastBold]}>
                  Tự động áp dụng khi mở bản đồ
                </Text>
                <Text style={styles.settingDesc}>
                  Khi mở ứng dụng, bản đồ sẽ ngay lập tức kích hoạt bộ lọc tương ứng
                </Text>
              </View>
              <Switch
                value={settings.autoEnforceRampAndElevator}
                onValueChange={(val) => {
                  updateSettings({ autoEnforceRampAndElevator: val });
                  showToast(val ? 'Đã bật Tự động lọc' : 'Đã tắt Tự động lọc');
                }}
                thumbColor={settings.autoEnforceRampAndElevator ? '#004F58' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              />
            </View>
          </View>
        </ScrollView>

        {/* 3. Sticky Bottom Save Bar */}
        <View
          style={[
            styles.bottomBar,
            isHighContrast && styles.bottomBarHighContrast,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.saveButton,
              isHighContrast && styles.saveButtonHighContrast,
            ]}
            onPress={handleSaveAndClose}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Lưu &amp; Áp dụng cài đặt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerHighContrast: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerHighContrast: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  standardBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 12,
  },
  standardBannerHighContrast: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  standardBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#004F58',
  },
  standardBannerSub: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#004F58',
    letterSpacing: 0.6,
  },
  previewBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  previewBoxHighContrast: {
    borderWidth: 2,
    borderColor: '#000000',
    shadowOpacity: 0,
    elevation: 0,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewPoiCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceName: {
    fontWeight: '800',
    color: '#0F172A',
  },
  previewPlaceAddr: {
    color: '#64748B',
    marginTop: 2,
  },
  previewBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  previewBadgeHighContrast: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  previewBadgeText: {
    fontWeight: '700',
    color: '#15803D',
  },
  previewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewScorePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  previewScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  previewScaleHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingCardHighContrast: {
    borderWidth: 2,
    borderColor: '#000000',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingRowStacked: {
    gap: 10,
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
  },
  labelWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  textSizeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  textSizeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textSizeTabActive: {
    backgroundColor: '#E6F8F5',
    borderColor: '#004F58',
    borderWidth: 1.5,
  },
  textSizeTabActiveHighContrast: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  textSizeTabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  textSizeTabLabelActive: {
    color: '#004F58',
  },
  textSizeTabScale: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  textSizeTabScaleActive: {
    color: '#004F58',
    fontWeight: '700',
  },
  colorBlindGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  colorBlindChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorBlindChipActive: {
    backgroundColor: '#E6F8F5',
    borderColor: '#004F58',
    borderWidth: 1.5,
  },
  colorBlindChipActiveHighContrast: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  colorBlindChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  colorBlindChipTextActive: {
    color: '#004F58',
    fontWeight: '700',
  },
  mobilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobilityCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
  },
  mobilityCardActive: {
    backgroundColor: '#E6F8F5',
    borderColor: '#004F58',
    borderWidth: 1.5,
  },
  mobilityCardActiveHighContrast: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  mobilityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mobilityCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mobilityCardTitleActive: {
    color: '#004F58',
  },
  mobilityCardSub: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    marginTop: 2,
  },
  mobilityCardSubActive: {
    color: '#004F58',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomBarHighContrast: {
    borderTopWidth: 2,
    borderTopColor: '#000000',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#004F58',
    borderRadius: 14,
    height: 48,
    shadowColor: '#004F58',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonHighContrast: {
    backgroundColor: '#000000',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  textHighContrastBold: {
    color: '#000000',
    fontWeight: '900',
  },
});
