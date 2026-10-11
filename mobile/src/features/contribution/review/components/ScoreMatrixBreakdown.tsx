import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VerificationMatrixResult } from '../../services/verificationEngine';

interface ScoreMatrixBreakdownProps {
  matrixResult?: VerificationMatrixResult;
  pillars: VerificationMatrixResult['pillars'];
  spatialValid: boolean;
  spatialDistanceMeters: number | null;
}

export function ScoreMatrixBreakdown({
  matrixResult,
  pillars,
  spatialValid,
  spatialDistanceMeters,
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
                    ? 'Tự hành độc lập (≤1/20)'
                    : personaFit.manualWheelchairSelf === 'NeedsAssistance'
                    ? 'Cần trợ giúp (1/12 - 1/16)'
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
                    ? 'Đạt chuẩn'
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
                  <Text style={styles.personaSub}>Gạch xúc giác, tĩnh không an toàn, âm thanh</Text>
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
                    ? 'An toàn'
                    : personaFit.visualImpaired === 'NeedsCaution'
                    ? 'Cần thận trọng'
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
            Phạt vi phạm (-40% điểm xe lăn): Có bậc tam cấp nhưng không có ram dốc tiếp cận.
          </Text>
        </View>
      ) : null}

      {penalties?.tactileBlocked ? (
        <View style={styles.penaltyAlert}>
          <MaterialCommunityIcons name="alert-octagon" size={18} color="#f43f5e" />
          <Text style={styles.penaltyAlertText}>
            Cảnh báo an toàn: Gạch xúc giác bị vật cản/xe máy đè lên, hạ điểm khiếm thị về mức Cần bổ sung.
          </Text>
        </View>
      ) : null}

      {/* ── 3. Data Confidence Card (2D vs 3D/IMU) ───────────────────────── */}
      {dataConfidence ? (
        <View style={styles.dataConfidenceCard}>
          <View style={styles.dataConfidenceHeader}>
            <MaterialCommunityIcons name="cube-scan" size={16} color="#38bdf8" />
            <Text style={styles.dataConfidenceTitle}>Độ tin cậy dữ liệu hình học: Cơ bản ({dataConfidence.confidenceLevel}%)</Text>
          </View>
          <Text style={styles.dataConfidencePrompt}>
            {dataConfidence.recommendationPrompt}
          </Text>
        </View>
      ) : null}

      {/* ── 4. Technical 3 Pillars Breakdown (CV, NLP, Spatial) ──────────── */}
      <Text style={styles.sectionTitle}>Phân rã ma trận 3 trụ cột kỹ thuật</Text>

      {/* Computer Vision */}
      <View style={styles.pillarCard}>
        <View style={styles.pillarHeader}>
          <View style={styles.pillarTitleRow}>
            <MaterialCommunityIcons name="image-filter-center-focus" size={18} color="#38bdf8" />
            <Text style={styles.pillarName}>1. Thị giác máy tính (CV)</Text>
          </View>
          <Text style={[styles.pillarScoreText, { color: '#38bdf8' }]}>
            {computerVision.score}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${computerVision.score}%`, backgroundColor: '#38bdf8' },
            ]}
          />
        </View>
        <Text style={styles.pillarDetail}>{computerVision.label} (Trọng số 50%)</Text>
      </View>

      {/* NLP Context */}
      <View style={styles.pillarCard}>
        <View style={styles.pillarHeader}>
          <View style={styles.pillarTitleRow}>
            <MaterialCommunityIcons name="text-box-search-outline" size={18} color="#a855f7" />
            <Text style={styles.pillarName}>2. Bối cảnh ngữ nghĩa (NLP)</Text>
          </View>
          <Text style={[styles.pillarScoreText, { color: '#a855f7' }]}>
            {nlpContext.score}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${nlpContext.score}%`, backgroundColor: '#a855f7' },
            ]}
          />
        </View>
        <Text style={styles.pillarDetail}>{nlpContext.label} (Trọng số 20%)</Text>
        {nlpContext.matchedKeywords.length > 0 ? (
          <View style={styles.keywordsRow}>
            {nlpContext.matchedKeywords.map((kw, i) => (
              <View key={i} style={styles.keywordBadge}>
                <Text style={styles.keywordText}>#{kw}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Spatial Proximity */}
      <View style={styles.pillarCard}>
        <View style={styles.pillarHeader}>
          <View style={styles.pillarTitleRow}>
            <MaterialCommunityIcons
              name={spatialValid ? 'map-marker-check' : 'map-marker-alert'}
              size={18}
              color={spatialValid ? '#10b981' : '#f43f5e'}
            />
            <Text style={styles.pillarName}>3. Sai số không gian GPS</Text>
          </View>
          <View style={styles.spatialBadgeWrap}>
            <Text
              style={[
                styles.pillarScoreText,
                { color: spatialValid ? '#10b981' : '#f43f5e' },
              ]}
            >
              {spatialProximity.score}%
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${spatialProximity.score}%`,
                backgroundColor: spatialValid ? '#10b981' : '#f43f5e',
              },
            ]}
          />
        </View>
        <Text style={styles.pillarDetail}>
          {spatialDistanceMeters != null
            ? `Cách POI ${spatialDistanceMeters}m ${
                spatialValid ? '(Đạt chuẩn địa đỗ ≤50m)' : '(Vượt phạm vi cho phép >50m)'
              }`
            : 'Định vị GPS chưa khả dụng'}{' '}
          (Trọng số 30%)
        </Text>
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
    color: '#e2e8f0',
    marginBottom: 8,
    marginTop: 4,
  },
  personaSection: {
    marginBottom: 10,
  },
  personaCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
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
    color: '#f8fafc',
  },
  personaSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  scorePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  badgeInfo: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  fitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  penaltyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  penaltyAlertText: {
    fontSize: 11.5,
    color: '#fda4af',
    fontWeight: '600',
    flex: 1,
  },
  dataConfidenceCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  dataConfidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dataConfidenceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  dataConfidencePrompt: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  pillarCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillarName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  pillarScoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarDetail: {
    fontSize: 11,
    color: '#94a3b8',
  },
  spatialBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  keywordBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 10,
    color: '#c084fc',
    fontWeight: '600',
  },
});
