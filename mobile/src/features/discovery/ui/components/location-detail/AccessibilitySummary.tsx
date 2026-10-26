import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [currentTimestamp] = useState(() => Date.now());

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

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.mainCard, verified ? styles.cardVerified : styles.cardWarning]}>
        {/* Header Row: Status Badge on Left, Trust Score Pill on Right */}
        <View style={styles.headerRow}>
          <View style={[styles.statusBadge, verified ? styles.statusBadgeVerified : styles.statusBadgeWarning]}>
            <MaterialCommunityIcons
              name={verified ? 'check-decagram' : 'clock-alert-outline'}
              size={14}
              color={verified ? '#007D78' : '#B45309'}
            />
            <Text style={[styles.statusBadgeText, verified ? styles.statusBadgeTextVerified : styles.statusBadgeTextWarning]}>
              {verified ? 'Đạt chuẩn tiếp cận QCVN 10' : 'Khảo sát sơ bộ'}
            </Text>
          </View>

          {trustPercent > 0 && (
            <View style={[styles.scorePill, verified ? styles.scorePillVerified : styles.scorePillWarning]}>
              <Text style={[styles.scoreNumber, verified ? styles.scoreNumberVerified : styles.scoreNumberWarning]}>
                {trustPercent}%
              </Text>
              <Text style={[styles.scoreLabel, verified ? styles.scoreLabelVerified : styles.scoreLabelWarning]}>
                {verified ? 'tin cậy' : 'sơ bộ'}
              </Text>
            </View>
          )}
        </View>

        {/* Verification Date Row (subtle, standalone below header row) */}
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={13} color="#64748B" />
          <Text style={styles.verifiedDate}>
            {lastVerifiedLabel ? `Cập nhật ngày ${lastVerifiedLabel}` : 'Mới cập nhật gần đây'}
          </Text>
        </View>

        {/* Safety & Suitability Assessment Banner */}
        <View style={[styles.suitabilityCard, verified ? styles.suitabilityVerified : styles.suitabilityWarning]}>
          <MaterialCommunityIcons
            name={verified ? 'shield-check' : 'shield-alert-outline'}
            size={18}
            color={verified ? '#007D78' : '#B45309'}
            style={styles.suitabilityIcon}
          />
          <View style={styles.suitabilityTextBox}>
            <Text style={[styles.suitabilityTitle, verified ? styles.suitabilityTitleVerified : styles.suitabilityTitleWarning]}>
              {verified ? 'Phù hợp & an toàn tự hành cho xe lăn' : 'Chưa thẩm định đặc tính kỹ thuật'}
            </Text>
            <Text style={styles.suitabilityDesc}>
              {verified
                ? 'Đã thẩm định thông số thực tế (độ dốc ram ≤ 1:12, cửa ≥ 90cm) đạt chuẩn QCVN 10:2014.'
                : 'Mới ghi nhận hiện diện sơ bộ từ ảnh. Người dùng xe lăn nên có người trợ giúp khi đến.'}
            </Text>
          </View>
        </View>

        {/* 5-Item Quick Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature) => {
            const isCompliant = feature.verificationLevel === 'verified_compliant';
            const isUnmeasured = feature.verificationLevel === 'unverified_presence';
            const isAvailable = feature.publishedStatus === 'Available' || isCompliant || isUnmeasured;
            const isLimited = feature.publishedStatus === 'Limited';
            const isUnavailable = feature.publishedStatus === 'NotAvailable';
            const isUnknown = !isAvailable && !isLimited && !isUnavailable;

            const tileIcon = (feature.icon || 'check-circle-outline') as keyof typeof MaterialCommunityIcons.glyphMap;
            const shortLabel = getShortLabel(feature.label);
            const statusIcon = isCompliant
              ? 'check-decagram'
              : isUnmeasured
                ? 'check'
                : isLimited
                  ? 'alert-circle-outline'
                  : isUnavailable
                    ? 'close'
                    : 'minus';
            const statusText = isCompliant
              ? 'Đạt chuẩn'
              : isUnmeasured
                ? (feature.status || 'Có tiện ích')
                : isLimited
                  ? 'Hạn chế'
                  : isUnavailable
                    ? 'Chưa có'
                    : 'Chưa rõ';
            const statusColor = isCompliant || isUnmeasured
              ? '#007D78'
              : isLimited
                ? '#B45309'
                : isUnavailable
                  ? '#EF4444'
                  : '#94A3B8';

            return (
              <View
                key={feature.id}
                style={[
                  styles.featureTile,
                  isCompliant && styles.tileCompliant,
                  isUnmeasured && styles.tileCompliant,
                  isLimited && styles.tileLimited,
                  isUnavailable && styles.tileUnavailable,
                  isUnknown && styles.tileUnknown,
                ]}
              >
                <View
                  style={[
                    styles.tileIconBox,
                    isCompliant && styles.tileIconBoxCompliant,
                    isUnmeasured && styles.tileIconBoxCompliant,
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
                  <Text
                    style={[
                      styles.tileStatusText,
                      isCompliant && styles.statusTextCompliant,
                      isUnmeasured && styles.statusTextUnmeasured,
                      isLimited && styles.statusTextLimited,
                      isUnavailable && styles.statusTextUnavailable,
                      isUnknown && styles.statusTextUnknown,
                    ]}
                  >
                    {statusText}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Clean Note Box (only if note exists) */}
        {note ? (
          <View style={styles.noteBox}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#007D78" style={styles.noteIcon} />
            <Text numberOfLines={2} style={styles.noteText}>
              {note}
            </Text>
          </View>
        ) : null}

        {/* Minimal Action link for places needing recheck */}
        {!verified && onHelpConfirmPress && (
          <TouchableOpacity
            style={styles.recheckActionRow}
            onPress={onHelpConfirmPress}
            activeOpacity={0.75}
          >
            <View style={styles.recheckActionLeft}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={15} color="#B45309" />
              <Text style={styles.recheckActionText}>Giúp cộng đồng đo đạc & thẩm định tiện ích</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#B45309" />
          </TouchableOpacity>
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
    backgroundColor: '#F8FCFA',
    borderColor: '#C6ECE5',
  },
  cardWarning: {
    backgroundColor: '#FFFDF6',
    borderColor: '#FDE68A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  statusBadgeWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  statusBadgeTextVerified: {
    color: '#007D78',
  },
  statusBadgeTextWarning: {
    color: '#B45309',
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
  scorePillWarning: {
    backgroundColor: '#FEF3C7',
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
    color: '#94A3B8',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4EFEA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
  },
  recheckActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recheckActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
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
