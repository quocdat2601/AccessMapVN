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
import type { PreScanFeatureTag } from '../../services/aiPreScanService';
import { FeatureTagSelector } from '../components/FeatureTagSelector';
import { toggleFeatureTagKey, updateFieldNotes } from '../model/tagReviewModel';

interface TagReviewScreenProps {
  media: CapturedContributionMedia;
  availableTags: PreScanFeatureTag[];
  aiSummary: string | null;
  isPreScanning: boolean;
  onProceedToVerification: (confirmedTagKeys: string[], notes: string) => void;
  onRetake: () => void;
  onBack: () => void;
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
    availableTags.filter((t) => t.detected).map((t) => t.key)
  );
  const [notes, setNotes] = useState('');

  const handleToggle = (key: string) => {
    setSelectedKeys((prev) => toggleFeatureTagKey(prev, key));
  };

  const handleProceed = () => {
    onProceedToVerification(selectedKeys, updateFieldNotes('', notes));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#f8fafc" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerStep}>BƯỚC 2.5 / 5</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Duyệt nhãn & Mô tả thực địa
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.retakeBtn, pressed && styles.pressed]}
          onPress={onRetake}
          accessibilityRole="button"
          accessibilityLabel="Chụp lại"
        >
          <MaterialCommunityIcons name="camera-retake-outline" size={20} color="#94a3b8" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Media Preview Card */}
          <View style={styles.mediaCard}>
            <Image source={{ uri: media.uri }} style={styles.mediaImage} contentFit="cover" />
            <View style={styles.mediaOverlay}>
              <View style={styles.locationPill}>
                <MaterialCommunityIcons name="map-marker-radius" size={13} color="#5eead4" />
                <Text style={styles.locationPillText} numberOfLines={1}>
                  {media.locationName}
                </Text>
              </View>
              {media.gps ? (
                <View style={styles.gpsPill}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={12} color="#facc15" />
                  <Text style={styles.gpsPillText}>
                    GPS ±{Math.round(media.gps.accuracy ?? 5)}m
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* AI Pre-Scan Summary Banner */}
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerHeader}>
              <View style={styles.aiIconBadge}>
                <MaterialCommunityIcons name="robot-confused-outline" size={16} color="#38bdf8" />
              </View>
              <Text style={styles.aiBannerTitle}>Kết quả AI Pre-Scan (SLA &lt;2s)</Text>
              {isPreScanning ? (
                <ActivityIndicator size="small" color="#38bdf8" style={{ marginLeft: 'auto' }} />
              ) : null}
            </View>
            <Text style={styles.aiBannerBody}>
              {isPreScanning
                ? 'Đang gửi ảnh tới AI FastAPI để phân tích nhanh đặc tính...'
                : aiSummary || 'AI đã phân tích ảnh xong. Vui lòng kiểm tra và xác nhận nhãn bên dưới.'}
            </Text>
          </View>

          {/* Tag Selector (Human in the loop) */}
          <View style={styles.card}>
            <FeatureTagSelector
              availableTags={availableTags}
              selectedKeys={selectedKeys}
              onToggleKey={handleToggle}
            />
          </View>

          {/* Field Notes Input */}
          <View style={styles.card}>
            <View style={styles.inputHeader}>
              <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="#a855f7" />
              <Text style={styles.inputTitle}>Ghi chú thực địa (Cung cấp cho NLP)</Text>
            </View>
            <Text style={styles.inputSubtitle}>
              Mô tả chi tiết ram dốc, độ dốc, cửa ra vào để tầng phân tích ngôn ngữ tự nhiên đối chiếu.
            </Text>
            <TextInput
              style={styles.textInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Vd: Ram dốc ở cửa hông bên phải, bề mặt nhám chống trượt, cửa tự động rộng..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Ghi chú thực địa"
            />
          </View>

          {/* EXP Reward Info */}
          <View style={styles.expInfoRow}>
            <MaterialCommunityIcons name="star-circle" size={18} color="#facc15" />
            <Text style={styles.expInfoText}>
              Dự phóng +50 EXP khi vượt qua ngưỡng thẩm định ≥80%.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.proceedBtn, pressed && styles.pressed]}
          onPress={handleProceed}
          accessibilityRole="button"
          accessibilityLabel="Tiến hành thẩm định chi tiết"
        >
          <Text style={styles.proceedBtnText}>Tiến hành thẩm định chi tiết (Full Scan)</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#0f172a" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  retakeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerStep: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
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
    gap: 14,
  },
  mediaCard: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: '65%',
  },
  locationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#facc15',
  },
  aiBanner: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
    padding: 12,
    gap: 6,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#38bdf8',
  },
  aiBannerBody: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    padding: 14,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inputTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  inputSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    color: '#f8fafc',
    fontSize: 13,
    padding: 10,
    minHeight: 70,
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
    color: '#facc15',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 29, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5eead4',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#5eead4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
});
