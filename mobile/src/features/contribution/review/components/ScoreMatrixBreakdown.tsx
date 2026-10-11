import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VerificationMatrixResult } from '../../services/verificationEngine';

interface ScoreMatrixBreakdownProps {
  matrixResult?: VerificationMatrixResult;
  pillars: VerificationMatrixResult['pillars'];
  spatialValid: boolean;
  spatialDistanceMeters: number | null;
  selectedTagKeys?: string[];
}

export function ScoreMatrixBreakdown({
  matrixResult,
  pillars,
  spatialValid,
  spatialDistanceMeters,
  selectedTagKeys,
}: ScoreMatrixBreakdownProps) {
  const { computerVision, nlpContext, spatialProximity } = pillars;
  const personaScores = matrixResult?.personaScores;
  const personaFit = matrixResult?.personaFit;
  const dataConfidence = matrixResult?.dataConfidence;
  const penalties = matrixResult?.penalties;

  return (
    <View style={styles.container}>
      {/* ── 1. Persona Fit Evaluation Cards (QCVN 10:2014) ──────────────── */}
      {personaScores && personaFit ? (
        <View style={styles.personaSection}>
          <Text style={styles.sectionTitle}>Độ tương thích theo đối tượng sử dụng</Text>

          {/* Wheelchair Persona Card */}
          <View style={styles.personaCard}>
            <View style={styles.personaHeader}>
              <View style={styles.personaTitleRow}>
                <View style={[styles.personaIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <MaterialCommunityIcons name="wheelchair-accessibility" size={20} color="#38bdf8" />
                </View>
                <View>
                  <Text style={styles.personaName}>Người dùng xe lăn & vận động</Text>
                  <Text style={styles.personaSub}>Ram dốc, cửa lọt lòng, không gian vệ sinh</Text>
                </View>
              </View>
              <View style={styles.scorePill}>
                <Text style={[styles.scorePillText, { color: '#38bdf8' }]}>
                  {personaScores.wheelchairScore}%
                </Text>
              </View>
            </View>

            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.fitBadge,
                  personaFit.manualWheelchairSelf === 'FullyAccessible'
                    ? styles.badgeSuccess
                    : personaFit.manualWheelchairSelf === 'NeedsAssistance'
                    ? styles.badgeWarning
                    : styles.badgeDanger,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    personaFit.manualWheelchairSelf === 'FullyAccessible'
                      ? 'check-circle'
                      : personaFit.manualWheelchairSelf === 'NeedsAssistance'
                      ? 'help-circle-outline'
                      : 'close-circle-outline'
                  }
                  size={12}
                  color={
                    personaFit.manualWheelchairSelf === 'FullyAccessible'
                      ? '#10b981'
                      : personaFit.manualWheelchairSelf === 'NeedsAssistance'
                      ? '#f59e0b'
                      : '#f43f5e'
                  }
                />
                <Text
                  style={[
                    styles.fitBadgeText,
                    {
                      color:
                        personaFit.manualWheelchairSelf === 'FullyAccessible'
                          ? '#10b981'
                          : personaFit.manualWheelchairSelf === 'NeedsAssistance'
                          ? '#f59e0b'
                          : '#f43f5e',
                    },
                  ]}
                >
                  Xe lăn tay:{' '}
                  {personaFit.manualWheelchairSelf === 'FullyAccessible'
                    ? 'Tự di chuyển độc lập'
                    : personaFit.manualWheelchairSelf === 'NeedsAssistance'
                    ? 'Cần người hỗ trợ đẩy'
                    : 'Không thể tiếp cận'}
                </Text>
              </View>

              <View
                style={[
                  styles.fitBadge,
                  personaFit.electricWheelchair === 'FullyAccessible'
                    ? styles.badgeSuccess
                    : personaFit.electricWheelchair === 'Accessible'
                    ? styles.badgeInfo
                    : styles.badgeDanger,
                ]}
              >
                <Text
                  style={[
                    styles.fitBadgeText,
                    {
                      color:
                        personaFit.electricWheelchair === 'FullyAccessible'
                          ? '#10b981'
                          : personaFit.electricWheelchair === 'Accessible'
                          ? '#38bdf8'
                          : '#f43f5e',
                    },
                  ]}
                >
                  Xe lăn điện:{' '}
                  {personaFit.electricWheelchair === 'FullyAccessible'
                    ? 'Tiếp cận tốt'
                    : personaFit.electricWheelchair === 'Accessible'
                    ? 'Tiếp cận được'
                    : 'Không tiếp cận'}
                </Text>
              </View>
            </View>
          </View>

          {/* Visually Impaired Persona Card */}
          <View style={styles.personaCard}>
            <View style={styles.personaHeader}>
              <View style={styles.personaTitleRow}>
                <View style={[styles.personaIconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                  <MaterialCommunityIcons name="eye-outline" size={20} color="#eab308" />
                </View>
                <View>
                  <Text style={styles.personaName}>Người khiếm thị & thị lực kém</Text>
                  <Text style={styles.personaSub}>Gạch xúc giác, lối đi và âm thanh</Text>
                </View>
              </View>
              <View style={styles.scorePill}>
                <Text style={[styles.scorePillText, { color: '#eab308' }]}>
                  {personaScores.blindScore}%
                </Text>
              </View>
            </View>

            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.fitBadge,
                  personaFit.visualImpaired === 'Safe'
                    ? styles.badgeSuccess
                    : personaFit.visualImpaired === 'NeedsCaution'
                    ? styles.badgeWarning
                    : styles.badgeDanger,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    personaFit.visualImpaired === 'Safe'
                      ? 'shield-check'
                      : personaFit.visualImpaired === 'NeedsCaution'
                      ? 'alert-outline'
                      : 'alert-octagon'
                  }
                  size={12}
                  color={
                    personaFit.visualImpaired === 'Safe'
                      ? '#10b981'
                      : personaFit.visualImpaired === 'NeedsCaution'
                      ? '#f59e0b'
                      : '#f43f5e'
                  }
                />
                <Text
                  style={[
                    styles.fitBadgeText,
                    {
                      color:
                        personaFit.visualImpaired === 'Safe'
                          ? '#10b981'
                          : personaFit.visualImpaired === 'NeedsCaution'
                          ? '#f59e0b'
                          : '#f43f5e',
                    },
                  ]}
                >
                  Độ an toàn lối đi:{' '}
                  {personaFit.visualImpaired === 'Safe'
                    ? 'Lối đi thông thoáng'
                    : personaFit.visualImpaired === 'NeedsCaution'
                    ? 'Cần chú ý cẩn thận'
                    : 'Cảnh báo nguy hiểm'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── 2. Penalty Alerts (If Detected) ─────────────────────────────── */}
      {penalties?.stepsWithoutRamp ? (
        <View style={styles.penaltyAlert}>
          <MaterialCommunityIcons name="alert-decagram" size={18} color="#f43f5e" />
          <Text style={styles.penaltyAlertText}>
            Lưu ý: Có bậc tam cấp cản trở, xe lăn chưa thể tự di chuyển qua.
          </Text>
        </View>
      ) : null}

      {penalties?.tactileBlocked ? (
        <View style={styles.penaltyAlert}>
          <MaterialCommunityIcons name="alert-octagon" size={18} color="#f43f5e" />
          <Text style={styles.penaltyAlertText}>
            Cảnh báo: Lối đi xúc giác có vật cản, người khiếm thị cần chú ý.
          </Text>
        </View>
      ) : null}

      {/* ── 3. Cơ sở xác thực thông tin (Lý do đạt điểm này) ─────────────── */}
      <Text style={styles.sectionTitle}>Cơ sở xác thực thông tin</Text>
      <View style={styles.evidenceCard}>
        {/* Hình ảnh */}
        <View style={styles.evidenceRow}>
          <View
            style={[
              styles.evidenceIconWrap,
              {
                backgroundColor:
                  computerVision.score >= 80 ? '#ecfdf5' : computerVision.score > 0 ? '#f0fdfa' : '#f8fafc',
              },
            ]}
          >
            <MaterialCommunityIcons
              name={computerVision.score > 0 ? 'image-check-outline' : 'image-filter-center-focus'}
              size={18}
              color={computerVision.score > 0 ? '#059669' : '#64748b'}
            />
          </View>
          <View style={styles.evidenceTextCol}>
            <Text style={styles.evidenceTitle}>Hình ảnh chụp tại chỗ</Text>
            <Text style={styles.evidenceSub}>
              {computerVision.score >= 80
                ? 'Ảnh rõ nét, nhận diện tốt ram dốc và lối vào'
                : computerVision.score > 0
                ? `Ảnh cơ bản, nhận diện đặc trưng tiếp cận (${computerVision.score}%)`
                : 'Chưa phát hiện tiện ích tiếp cận trong ảnh'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={computerVision.score > 0 ? 'check-circle' : 'information'}
            size={16}
            color={computerVision.score > 0 ? '#059669' : '#94a3b8'}
          />
        </View>

        <View style={styles.evidenceDivider} />

        {/* Vị trí GPS */}
        <View style={styles.evidenceRow}>
          <View
            style={[
              styles.evidenceIconWrap,
              { backgroundColor: spatialValid ? '#ecfdf5' : '#fff1f2' },
            ]}
          >
            <MaterialCommunityIcons
              name={spatialValid ? 'map-marker-check-outline' : 'map-marker-alert-outline'}
              size={18}
              color={spatialValid ? '#059669' : '#dc2626'}
            />
          </View>
          <View style={styles.evidenceTextCol}>
            <Text style={styles.evidenceTitle}>Vị trí địa điểm</Text>
            <Text style={styles.evidenceSub}>
              {spatialDistanceMeters != null
                ? spatialValid
                  ? spatialDistanceMeters === 0
                    ? 'Khớp tọa độ tại chỗ (0m)'
                    : `Khớp với vị trí thực tế (cách ${spatialDistanceMeters}m)`
                  : `Cách địa điểm ${spatialDistanceMeters}m (Vượt quá bán kính 50m)`
                : 'Đã xác thực tọa độ'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={spatialValid ? 'check-circle' : 'alert-circle'}
            size={16}
            color={spatialValid ? '#059669' : '#dc2626'}
          />
        </View>

        <View style={styles.evidenceDivider} />

        {/* Đặc điểm tiếp cận */}
        {(() => {
          const count = selectedTagKeys ? selectedTagKeys.length : (matrixResult?.overallScore && matrixResult.overallScore > 25 ? 1 : 0);
          const hasTags = count > 0;
          const verifiedCount = matrixResult?.verifiedTagCount ?? (computerVision.score > 0 ? 1 : 0);
          const unverifiedCount = matrixResult?.unverifiedTagCount ?? Math.max(0, count - verifiedCount);

          const isFullyVerified = hasTags && verifiedCount > 0 && unverifiedCount === 0;
          const isPartiallyVerified = hasTags && verifiedCount > 0 && unverifiedCount > 0;

          const rowBg = isFullyVerified
            ? '#ecfdf5'
            : isPartiallyVerified
            ? '#eff6ff'
            : '#fffbeb';

          const rowColor = isFullyVerified
            ? '#059669'
            : isPartiallyVerified
            ? '#0284c7'
            : '#d97706';

          const mainIcon = isFullyVerified
            ? 'checkbox-marked-circle-outline'
            : isPartiallyVerified
            ? 'information-outline'
            : 'alert-circle-outline';

          const statusIcon = isFullyVerified
            ? 'check-circle'
            : isPartiallyVerified
            ? 'clock-outline'
            : 'alert-circle';

          const title = !hasTags
            ? 'Chưa chọn đặc tính nào'
            : isFullyVerified
            ? 'Đặc điểm bạn đã chọn'
            : isPartiallyVerified
            ? `Đặc điểm đã chọn (${verifiedCount} khớp ảnh, ${unverifiedCount} tự khai)`
            : 'Đặc điểm tự khai (Chưa khớp ảnh)';

          const subtitle = !hasTags
            ? '0 đặc tính được xác nhận. Cần bổ sung để đủ điều kiện xét duyệt.'
            : isFullyVerified
            ? nlpContext.matchedKeywords.length > 0
              ? `Đã chọn ${count} đặc điểm (khớp ${nlpContext.matchedKeywords.length} từ khóa ghi chú)`
              : `Đã xác thực toàn bộ ${count} đặc điểm tiếp cận qua ảnh`
            : isPartiallyVerified
            ? `Đã xác thực ${verifiedCount}/${count} đặc điểm qua ảnh. ${unverifiedCount} đặc điểm còn lại cần kiểm duyệt viên xác minh.`
            : `Đã chọn ${count} đặc điểm nhưng ảnh chưa thể hiện. Cần kiểm duyệt viên xác minh.`;

          return (
            <View style={styles.evidenceRow}>
              <View style={[styles.evidenceIconWrap, { backgroundColor: rowBg }]}>
                <MaterialCommunityIcons name={mainIcon} size={18} color={rowColor} />
              </View>
              <View style={styles.evidenceTextCol}>
                <Text style={styles.evidenceTitle}>{title}</Text>
                <Text style={styles.evidenceSub}>{subtitle}</Text>
              </View>
              <MaterialCommunityIcons name={statusIcon} size={16} color={rowColor} />
            </View>
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 4,
  },
  personaSection: {
    marginBottom: 10,
  },
  personaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  personaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  personaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  personaSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  scorePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  badgeWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  badgeDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  badgeInfo: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  fitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  penaltyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  penaltyAlertText: {
    fontSize: 11.5,
    color: '#9f1239',
    fontWeight: '600',
    flex: 1,
  },
  evidenceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  evidenceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceTextCol: {
    flex: 1,
  },
  evidenceTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  evidenceSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  evidenceDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
  },
});
