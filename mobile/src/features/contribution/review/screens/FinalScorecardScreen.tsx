import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CapturedContributionMedia } from '@/entities/contribution';
import type { VerificationMatrixResult } from '../../services/verificationEngine';
import { ScoreMatrixBreakdown } from '../components/ScoreMatrixBreakdown';
import { ScoreMeterRing } from '../components/ScoreMeterRing';

interface FinalScorecardScreenProps {
  media: CapturedContributionMedia;
  matrixResult: VerificationMatrixResult;
  selectedTagKeys: string[];
  notes: string;
  onRetakeOrReset: () => void;
  onEditTags: () => void;
}

export function FinalScorecardScreen({
  media,
  matrixResult,
  selectedTagKeys,
  notes,
  onRetakeOrReset,
  onEditTags,
}: FinalScorecardScreenProps) {
  const insets = useSafeAreaInsets();
  const { overallScore, status, statusLabel, statusDescription, pillars, spatialValid, spatialDistanceMeters } =
    matrixResult;

  let statusBg = 'rgba(16, 185, 129, 0.15)';
  let statusBorder = '#10b981';
  let statusIcon: any = 'check-decagram';
  let statusColor = '#10b981';

  if (status === 'PendingModeration') {
    statusBg = 'rgba(245, 158, 11, 0.15)';
    statusBorder = '#f59e0b';
    statusIcon = 'clock-alert-outline';
    statusColor = '#f59e0b';
  } else if (status === 'AwaitingMoreInfo') {
    statusBg = 'rgba(244, 63, 94, 0.15)';
    statusBorder = '#f43f5e';
    statusIcon = 'alert-circle-outline';
    statusColor = '#f43f5e';
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={onEditTags}
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa nhãn"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#f8fafc" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerStep}>BƯỚC 4 / 4 · ĐIỂM DỪNG THỬ NGHIỆM</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Bảng điểm tin cậy (Final Scorecard)
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={onRetakeOrReset}
          accessibilityRole="button"
          accessibilityLabel="Quét lại từ đầu"
        >
          <MaterialCommunityIcons name="refresh" size={22} color="#94a3b8" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero: Score Meter & Status Badge */}
        <View style={styles.heroCard}>
          <ScoreMeterRing score={overallScore} size={135} strokeWidth={11} />

          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <MaterialCommunityIcons name={statusIcon} size={18} color={statusColor} />
            <Text style={[styles.statusTitle, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <Text style={styles.statusDescription}>{statusDescription}</Text>

          {/* Test Stop Safeguard Notice */}
          <View style={styles.testStopBanner}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color="#38bdf8" />
            <Text style={styles.testStopText}>
              Chế độ kiểm thử: Dừng tại bước này, không gửi bản ghi xuống cơ sở dữ liệu backend.
            </Text>
          </View>
        </View>

        {/* Breakdown Matrix */}
        <ScoreMatrixBreakdown
          pillars={pillars}
          spatialValid={spatialValid}
          spatialDistanceMeters={spatialDistanceMeters}
        />

        {/* POI & Submission Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Thông tin khảo sát đã đối chiếu</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Địa điểm:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {media.locationName}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số nhãn đã duyệt:</Text>
            <Text style={styles.detailValue}>{selectedTagKeys.length} đặc tính</Text>
          </View>
          {notes ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ghi chú:</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                "{notes}"
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Điểm thưởng dự phóng:</Text>
            <View style={styles.expPill}>
              <MaterialCommunityIcons name="star-circle" size={14} color="#facc15" />
              <Text style={styles.expPillText}>+50 EXP</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={onEditTags}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="tag-outline" size={18} color="#94a3b8" />
          <Text style={styles.secondaryBtnText}>Chỉnh sửa nhãn</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={onRetakeOrReset}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="camera-retake" size={18} color="#0f172a" />
          <Text style={styles.primaryBtnText}>Quét lại ảnh khác</Text>
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
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerStep: {
    fontSize: 9.5,
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
    gap: 12,
  },
  heroCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  statusDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  testStopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 7,
    marginTop: 4,
  },
  testStopText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  detailsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    padding: 14,
    gap: 8,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f1f5f9',
    maxWidth: '65%',
  },
  expPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  expPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#facc15',
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
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  primaryBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5eead4',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#5eead4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
});
