import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AccessibilityDetailFeature } from './types';

interface AccessibilitySummaryProps {
  isUnrated?: boolean;
  trustPercent: number;
  features: AccessibilityDetailFeature[];
  note?: string | null;
  hasRamp?: boolean;
  doorWidthOk?: boolean;
  hasTactile?: boolean;
  lastVerifiedAt?: string | null;
  onHelpConfirmPress?: () => void;
  isFullyVerified?: boolean;
}

function getShortLabel(label: string): string {
  if (label.includes('Ram dốc')) return 'Ram dốc';
  if (label.includes('Cửa')) return 'Cửa vào';
  if (label.includes('Thang máy')) return 'Thang máy';
  if (label.includes('vệ sinh') || label.includes('WC')) return 'WC tiếp cận';
  return label;
}

export function AccessibilitySummary({
  isUnrated,
  trustPercent,
  features,
  note,
  lastVerifiedAt,
  onHelpConfirmPress,
  isFullyVerified,
}: AccessibilitySummaryProps) {
  if (isUnrated) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.unratedCard}>
          <View style={styles.unratedIconBox}>
            <MaterialCommunityIcons name="wheelchair-accessibility" size={22} color="#64748B" />
          </View>
          <View style={styles.unratedTextBox}>
            <Text style={styles.unratedTitle}>Chưa có dữ liệu tiếp cận</Text>
            <Text style={styles.unratedDesc}>
              Địa điểm này chưa được khảo sát ram dốc, lối vào hoặc WC cho người khuyết tật.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const lastVerifiedLabel = lastVerifiedAt
    ? new Date(lastVerifiedAt).toLocaleDateString('vi-VN')
    : null;

  const verified = Boolean(isFullyVerified);
  const activeAdvisory = features.find((f) => f.advisory)?.advisory ?? null;
  const hasConflict = features.some(
    (f) => f.communityLabel === 'ConflictReported' || f.communityLabel === 'CommunityUnderReview'
  );
  const hasReinforced = features.some(
    (f) => f.communityLabel === 'Reinforced' || f.communityLabel === 'Fresh'
  );
  const totalConfirmations = features.reduce((sum, f) => sum + (f.eligibleVoterCount ?? 0), 0);
  const surveyedCount = features.filter((f) => f.publishedStatus !== 'Unknown').length;
  const limitedCount = features.filter(
    (f) => f.publishedStatus === 'Limited' || f.verificationLevel === 'limited'
  ).length;

  let headerBadgeLabel = 'Khảo sát cộng đồng';
  let headerBadgeTone: 'verified' | 'conflict' | 'community' = 'community';
  if (verified) {
    headerBadgeLabel = 'Đạt chuẩn QCVN 10';
    headerBadgeTone = 'verified';
  } else if (hasConflict) {
    headerBadgeLabel = 'Có phản ánh thay đổi';
    headerBadgeTone = 'conflict';
  } else if (hasReinforced) {
    headerBadgeLabel = 'Cộng đồng đã xác nhận';
    headerBadgeTone = 'verified';
  }

  let badgeBgStyle = styles.statusBadgeCommunity;
  let badgeTextStyle = styles.statusBadgeTextCommunity;
  let badgeIconColor = '#004E58';
  let badgeIconName: keyof typeof MaterialCommunityIcons.glyphMap = 'clipboard-text-outline';
  if (headerBadgeTone === 'verified') {
    badgeBgStyle = styles.statusBadgeVerified;
    badgeTextStyle = styles.statusBadgeTextVerified;
    badgeIconColor = '#007D78';
    badgeIconName = 'check-decagram';
  } else if (headerBadgeTone === 'conflict') {
    badgeBgStyle = styles.statusBadgeConflict;
    badgeTextStyle = styles.statusBadgeTextConflict;
    badgeIconColor = '#BE123C';
    badgeIconName = 'alert-circle-outline';
  }

  const coveragePillText = limitedCount > 0
    ? `${surveyedCount}/${features.length} · có hạn chế`
    : `${surveyedCount}/${features.length} hạng mục`;
  const compactInfoNote = verified
    ? 'Thông số đạt chuẩn QCVN 10:2014 (ram ≤ 1:12, cửa ≥ 90cm).'
    : note && !note.startsWith('Khảo sát sơ bộ:')
    ? note
    : 'Khảo sát từ cộng đồng · Chưa đo đạc thông số kỹ thuật QCVN 10.';

  return (
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.mainCard,
          verified || headerBadgeTone === 'verified' ? styles.cardVerified : styles.cardNeutral,
        ]}
      >
        {/* Header Row: Status Badge on Left, Verified Score or Survey Coverage Pill on Right */}
        <View style={styles.headerRow}>
          <View style={[styles.statusBadge, badgeBgStyle]}>
            <MaterialCommunityIcons name={badgeIconName} size={14} color={badgeIconColor} />
            <Text style={[styles.statusBadgeText, badgeTextStyle]}>
              {headerBadgeLabel}
            </Text>
          </View>

          {verified && trustPercent > 0 ? (
            <View style={[styles.scorePill, styles.scorePillVerified]}>
              <Text style={[styles.scoreNumber, styles.scoreNumberVerified]}>
                {trustPercent}%
              </Text>
              <Text style={[styles.scoreLabel, styles.scoreLabelVerified]}>tin cậy</Text>
            </View>
          ) : features.length > 0 ? (
            <View
              style={[
                styles.scorePill,
                limitedCount > 0 ? styles.scorePillWarning : styles.scorePillNeutral,
              ]}
            >
              <Text
                style={[
                  styles.coveragePillText,
                  limitedCount > 0 ? styles.coveragePillTextWarning : styles.coveragePillTextNeutral,
                ]}
              >
                {coveragePillText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Verification Date & Community Consensus Summary */}
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={13} color="#64748B" />
          <Text style={styles.verifiedDate}>
            {lastVerifiedLabel ? `Cập nhật ${lastVerifiedLabel}` : 'Mới cập nhật gần đây'}
            {totalConfirmations > 0 ? ` · ${totalConfirmations} xác nhận thực tế` : ''}
          </Text>
        </View>

        {/* Active Temporary Advisory / Community Conflict Banner */}
        {activeAdvisory ? (
          <View style={styles.advisoryBanner}>
            <MaterialCommunityIcons name="alert-decagram-outline" size={18} color="#C2410C" style={styles.suitabilityIcon} />
            <View style={styles.suitabilityTextBox}>
              <Text style={styles.advisoryTitle}>Cảnh báo tiếp cận tạm thời</Text>
              <Text style={styles.advisoryDesc}>{activeAdvisory.reason}</Text>
            </View>
          </View>
        ) : hasConflict ? (
          <View style={styles.advisoryBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#BE123C" style={styles.suitabilityIcon} />
            <View style={styles.suitabilityTextBox}>
              <Text style={[styles.advisoryTitle, { color: '#9F1239' }]}>Có phản ánh thay đổi thực tế</Text>
              <Text style={styles.advisoryDesc}>
                Người dùng vừa báo hiện trạng tiện ích có thay đổi, đang chờ kiểm duyệt xác minh.
              </Text>
            </View>
          </View>
        ) : null}

        {/* 4-Item Quick Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature) => {
            const isCompliant = feature.verificationLevel === 'verified_compliant';
            const isUnmeasured = feature.verificationLevel === 'unverified_presence';
            const isLimited = feature.publishedStatus === 'Limited' || feature.verificationLevel === 'limited';
            const isUnavailable = feature.publishedStatus === 'NotAvailable';
            const isAvailable = !isLimited && !isUnavailable && (feature.publishedStatus === 'Available' || isCompliant || isUnmeasured);
            const isUnknown = !isAvailable && !isLimited && !isUnavailable;

            const tileIcon = (feature.icon || 'check-circle-outline') as keyof typeof MaterialCommunityIcons.glyphMap;
            const shortLabel = getShortLabel(feature.label);

            let statusIcon: keyof typeof MaterialCommunityIcons.glyphMap = 'minus';
            let statusText = 'Chưa rõ';
            let statusColor = '#64748B';
            let statusTextStyle = styles.statusTextUnknown;

            if (isCompliant) {
              statusIcon = 'check-decagram';
              statusText = 'Đạt chuẩn';
              statusColor = '#007D78';
              statusTextStyle = styles.statusTextCompliant;
            } else if (isLimited) {
              statusIcon = 'alert-circle-outline';
              statusText = 'Hạn chế';
              statusColor = '#B45309';
              statusTextStyle = styles.statusTextLimited;
            } else if (isUnmeasured) {
              statusIcon = 'check';
              statusText = feature.status || 'Có tiện ích';
              statusColor = '#007D78';
              statusTextStyle = styles.statusTextUnmeasured;
            } else if (isUnavailable) {
              statusIcon = 'close';
              statusText = 'Không có';
              statusColor = '#EF4444';
              statusTextStyle = styles.statusTextUnavailable;
            }

            const hasFeatureConflict =
              Boolean(feature.advisory) ||
              feature.communityLabel === 'ConflictReported' ||
              feature.communityLabel === 'CommunityUnderReview';

            let consensusHint: string | null = null;
            if (hasFeatureConflict) {
              consensusHint = 'Có phản ánh mới';
            } else if ((feature.eligibleVoterCount ?? 0) > 0) {
              consensusHint = `${feature.eligibleVoterCount} xác nhận`;
            } else if (feature.freshnessPercent != null && feature.freshnessPercent < 100) {
              consensusHint = `Độ mới ${feature.freshnessPercent}%`;
            }

            return (
              <View
                key={feature.id}
                style={[
                  styles.featureTile,
                  isCompliant && styles.tileCompliant,
                  isUnmeasured && !isLimited && styles.tileCompliant,
                  isLimited && styles.tileLimited,
                  isUnavailable && styles.tileUnavailable,
                  isUnknown && styles.tileUnknown,
                ]}
              >
                <View
                  style={[
                    styles.tileIconBox,
                    isCompliant && styles.tileIconBoxCompliant,
                    isUnmeasured && !isLimited && styles.tileIconBoxCompliant,
                    isLimited && styles.tileIconBoxLimited,
                    isUnavailable && styles.tileIconBoxUnavailable,
                    isUnknown && styles.tileIconBoxUnknown,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={tileIcon}
                    size={17}
                    color={statusColor}
                  />
                </View>

                <Text numberOfLines={2} style={styles.tileLabel}>
                  {shortLabel}
                </Text>

                <View style={styles.tileStatusRow}>
                  <MaterialCommunityIcons
                    name={statusIcon}
                    size={11}
                    color={statusColor}
                  />
                  <Text style={[styles.tileStatusText, statusTextStyle]}>
                    {statusText}
                  </Text>
                </View>

                {consensusHint ? (
                  <View style={[styles.consensusChip, hasFeatureConflict && styles.consensusChipConflict]}>
                    <Text style={[styles.consensusChipText, hasFeatureConflict && styles.consensusChipTextConflict]}>
                      {consensusHint}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Compact Info Note */}
        <View style={[styles.noteBox, verified && styles.noteBoxVerified]}>
          <MaterialCommunityIcons
            name={verified ? 'shield-check' : 'information-outline'}
            size={15}
            color={verified ? '#007D78' : '#004E58'}
            style={styles.noteIcon}
          />
          <Text numberOfLines={2} style={styles.noteText}>
            {compactInfoNote}
          </Text>
        </View>

        {/* Single Clear Action Link for Community Verification / Reporting */}
        {onHelpConfirmPress && features.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.recheckActionRow, pressed && styles.pressedRow]}
            onPress={onHelpConfirmPress}
            accessibilityRole="button"
            accessibilityLabel="Xác nhận hoặc báo thay đổi tiện ích"
          >
            <View style={styles.recheckActionLeft}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={16} color="#0F766E" />
              <View style={{ flex: 1 }}>
                <Text style={styles.recheckActionText}>Xác nhận hoặc báo thay đổi tiện ích</Text>
                <Text style={styles.recheckActionHint}>
                  Xác nhận "Vẫn chính xác" hoặc "Báo thay đổi" để cập nhật thông tin địa điểm
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#0F766E" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  mainCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  cardVerified: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C6ECE5',
  },
  cardNeutral: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeVerified: {
    backgroundColor: '#E6F8F5',
    borderColor: '#A8E7DC',
  },
  statusBadgeCommunity: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
  },
  statusBadgeConflict: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  statusBadgeTextVerified: {
    color: '#007D78',
  },
  statusBadgeTextCommunity: {
    color: '#004E58',
  },
  statusBadgeTextConflict: {
    color: '#BE123C',
  },
  advisoryBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    marginBottom: 10,
  },
  advisoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
    marginBottom: 2,
  },
  advisoryDesc: {
    fontSize: 11,
    color: '#7C2D12',
    lineHeight: 15,
  },
  verifiedDate: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scorePillVerified: {
    backgroundColor: '#E6F8F5',
  },
  scorePillNeutral: {
    backgroundColor: '#F1F5F9',
  },
  scorePillWarning: {
    backgroundColor: '#FEF3C7',
  },
  coveragePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  coveragePillTextNeutral: {
    color: '#334155',
  },
  coveragePillTextWarning: {
    color: '#B45309',
  },
  scoreNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  scoreNumberVerified: {
    color: '#007D78',
  },
  scoreNumberWarning: {
    color: '#B45309',
  },
  scoreLabel: {
    fontSize: 10.5,
  },
  scoreLabelVerified: {
    color: '#007D78',
  },
  scoreLabelWarning: {
    color: '#B45309',
  },
  suitabilityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  suitabilityVerified: {
    backgroundColor: '#F0FDF9',
    borderColor: '#C6ECE5',
  },
  suitabilityWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  suitabilityIcon: {
    marginTop: 1,
  },
  suitabilityTextBox: {
    flex: 1,
  },
  suitabilityTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  suitabilityTitleVerified: {
    color: '#007D78',
  },
  suitabilityTitleWarning: {
    color: '#B45309',
  },
  suitabilityDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  featureTile: {
    width: '48.5%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 88,
  },
  tileCompliant: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C6ECE5',
  },
  tileUnmeasured: {
    backgroundColor: '#FFFDF6',
    borderColor: '#FDE68A',
  },
  tileAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4EFEA',
  },
  tileLimited: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDE68A',
  },
  tileUnavailable: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  tileUnknown: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  tileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileIconBoxCompliant: {
    backgroundColor: '#E6F8F5',
  },
  tileIconBoxUnmeasured: {
    backgroundColor: '#FEF3C7',
  },
  tileIconBoxAvailable: {
    backgroundColor: '#E6F8F5',
  },
  tileIconBoxLimited: {
    backgroundColor: '#FEF3C7',
  },
  tileIconBoxUnavailable: {
    backgroundColor: '#FEF2F2',
  },
  tileIconBoxUnknown: {
    backgroundColor: '#F1F5F9',
  },
  tileLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
    textAlign: 'center',
    lineHeight: 14,
  },
  tileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tileStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextCompliant: {
    color: '#007D78',
  },
  statusTextUnmeasured: {
    color: '#007D78',
  },
  statusTextAvailable: {
    color: '#007D78',
  },
  statusTextLimited: {
    color: '#B45309',
  },
  statusTextUnavailable: {
    color: '#EF4444',
  },
  statusTextUnknown: {
    color: '#475569',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  noteBoxVerified: {
    backgroundColor: '#F0FDF9',
    borderColor: '#C6ECE5',
  },
  noteIcon: {
    marginTop: 1.5,
  },
  noteText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    flex: 1,
  },
  recheckActionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  pressedRow: {
    opacity: 0.78,
  },
  recheckActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  recheckActionText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  recheckActionHint: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 1,
    lineHeight: 14,
  },
  consensusChip: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
  },
  consensusChipConflict: {
    backgroundColor: '#FFF1F2',
  },
  consensusChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  consensusChipTextConflict: {
    color: '#BE123C',
  },
  unratedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  unratedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unratedTextBox: {
    flex: 1,
  },
  unratedTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  unratedDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
});
