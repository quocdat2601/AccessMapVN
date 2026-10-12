import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addContributionRecord, type CapturedContributionMedia } from '@/entities/contribution';
import { apiClient } from '@/shared/api/client';
import type { VerificationMatrixResult } from '../../lib/verificationEngine';
import { ScoreMatrixBreakdown } from '../components/review/ScoreMatrixBreakdown';
import { ScoreMeterRing } from '../components/review/ScoreMeterRing';

interface FinalScorecardScreenProps {
  media: CapturedContributionMedia;
  matrixResult: VerificationMatrixResult;
  selectedTagKeys: string[];
  notes: string;
  onRetakeOrReset: () => void;
  onEditTags: () => void;
  onFinish?: () => void;
}

export function FinalScorecardScreen({
  media,
  matrixResult,
  selectedTagKeys,
  notes,
  onRetakeOrReset,
  onEditTags,
  onFinish,
}: FinalScorecardScreenProps) {
  const insets = useSafeAreaInsets();
  const { overallScore, status, statusLabel, statusDescription, pillars, spatialValid, spatialDistanceMeters } =
    matrixResult;

  const badgeScale = useRef(new Animated.Value(0.7)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(12)).current;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const clientSubmissionIdRef = useRef<string>(
    `mob-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
  );
  const [submittedResult, setSubmittedResult] = useState<{
    submissionId: string;
    message: string;
    pointsAwarded: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        client_submission_id: clientSubmissionIdRef.current,
        location_id: media.locationId || 'custom-location',
        media_urls: [media.uri],
        client_observations: selectedTagKeys,
        feature_tags: selectedTagKeys,
        measurements: {
          door_clear_width: {
            status: 'not_measured',
          },
          ramp_slope: {
            status: 'not_measured',
          },
        },
        gps_lat: media.gps ? media.gps.latitude : 10.8454,
        gps_lng: media.gps ? media.gps.longitude : 106.8373,
        accuracy_meters: media.gps?.accuracy ?? 5.0,
        text_description: notes || '',
        confidence_score: overallScore / 100,
      };

      const res = await apiClient.post<any>('/api/v1/submissions', payload);

      if (res && res.submission_id) {
        addContributionRecord({
          id: res.submission_id,
          locationId: media.locationId,
          locationName: media.locationName,
          mediaUri: media.uri,
          mediaType: media.type,
          featureTags: selectedTagKeys,
          textDescription: notes,
          gps: media.gps ? { latitude: media.gps.latitude, longitude: media.gps.longitude } : null,
          status: 'PendingModeration',
          confidenceScore: overallScore / 100,
          pointsAwarded: res.points_awarded ?? 0,
          createdAt: Date.now(),
        });

        setSubmittedResult({
          submissionId: res.submission_id,
          message: res.message || 'Hồ sơ đã được tiếp nhận. EXP sẽ được tính sau khi khảo sát được duyệt.',
          pointsAwarded: res.points_awarded ?? 0,
        });
      }
    } catch (err: any) {
      const serverErr =
        err?.data?.errors?.GpsLat?.[0] ||
        err?.data?.errors?.LocationId?.[0] ||
        err?.data?.title ||
        err?.message ||
        'Không thể gửi đóng góp lên máy chủ. Vui lòng thử lại.';
      setSubmitError(serverErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScoreAnimationComplete = () => {
    Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 350,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

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
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={onEditTags}
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa nhãn"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerStep}>BƯỚC 3 / 3</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Kết quả đánh giá tiếp cận
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={onRetakeOrReset}
          accessibilityRole="button"
          accessibilityLabel="Quét lại từ đầu"
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#64748b" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero: Score Meter & Status Badge */}
        <View style={styles.heroCard}>
          <ScoreMeterRing
            score={overallScore}
            size={130}
            strokeWidth={11}
            animated={true}
            onAnimationComplete={handleScoreAnimationComplete}
          />

          <Animated.View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusBg,
                borderColor: statusBorder,
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <MaterialCommunityIcons name={statusIcon} size={18} color={statusColor} />
            <Text style={[styles.statusTitle, { color: statusColor }]}>{statusLabel}</Text>
          </Animated.View>

          <Animated.View
            style={{
              width: '100%',
              alignItems: 'center',
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }}
          >
            <Text style={styles.statusDescription}>{statusDescription}</Text>

            {/* Submission Status or Info Banner */}
            {submittedResult ? (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons name="check-decagram" size={22} color="#059669" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.successTitle}>
                    Đã gửi hồ sơ thành công (+{submittedResult.pointsAwarded} EXP)
                  </Text>
                  <Text style={styles.successCode}>Mã: {submittedResult.submissionId}</Text>
                  <Text style={styles.successSub}>{submittedResult.message}</Text>
                </View>
              </View>
            ) : submitError ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#e11d48" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Lỗi gửi hồ sơ</Text>
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.testStopBanner}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={15} color="#004e58" />
                <Text style={styles.testStopText}>
                  Sẵn sàng gửi lên máy chủ. EXP sẽ được cộng sau khi khảo sát được duyệt.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Breakdown Matrix & Details */}
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
          <ScoreMatrixBreakdown
            matrixResult={matrixResult}
            pillars={pillars}
            spatialValid={spatialValid}
            spatialDistanceMeters={spatialDistanceMeters}
            selectedTagKeys={selectedTagKeys}
          />

        {/* POI & Submission Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Thông tin ghi nhận</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Địa điểm:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {media.locationName}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Đặc tính đã chọn:</Text>
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
            <Text style={styles.detailLabel}>Ghi nhận EXP:</Text>
            <View style={styles.expPill}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#b45309" />
              <Text style={styles.expPillText}>Tính sau khi duyệt</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        {submittedResult ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={onRetakeOrReset}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="camera-retake" size={16} color="#334155" />
              <Text style={styles.secondaryBtnText}>Đóng góp khác</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={onFinish || onRetakeOrReset}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Hoàn tất</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={onEditTags}
              accessibilityRole="button"
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons name="tag-outline" size={16} color="#334155" />
              <Text style={styles.secondaryBtnText}>Sửa đặc tính</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
                isSubmitting && { opacity: 0.8 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Đang gửi...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={16} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Gửi đóng góp</Text>
                </>
              )}
            </Pressable>
          </>
        )}
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
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
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
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  testStopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 7,
    marginTop: 4,
  },
  testStopText: {
    fontSize: 11,
    color: '#004e58',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  successTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065f46',
  },
  successCode: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
  },
  successSub: {
    fontSize: 11,
    color: '#065f46',
    lineHeight: 15,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9f1239',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#be123c',
    lineHeight: 15,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: '65%',
  },
  expPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  expPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
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
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#004e58',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#004e58',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
