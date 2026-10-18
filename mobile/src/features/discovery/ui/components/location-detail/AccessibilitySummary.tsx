import React from 'react';
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
  if (label.includes('Gạch') || label.includes('xúc giác')) return 'Gạch xúc giác';
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

  const isStale = lastVerifiedAt
    ? (Date.now() - new Date(lastVerifiedAt).getTime()) > 90 * 24 * 60 * 60 * 1000
    : true;
  const verified = isFullyVerified ?? (!isStale && trustPercent >= 75);

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.mainCard, verified ? styles.cardVerified : styles.cardWarning]}>
        {/* Header Row: Status Badge + Verification Date + Trust Score */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, verified ? styles.statusBadgeVerified : styles.statusBadgeWarning]}>
              <MaterialCommunityIcons
                name={verified ? 'check-decagram' : 'clock-alert-outline'}
                size={14}
                color={verified ? '#007D78' : '#B45309'}
              />
              <Text style={[styles.statusBadgeText, verified ? styles.statusBadgeTextVerified : styles.statusBadgeTextWarning]}>
                {verified ? 'Đạt chuẩn tiếp cận' : 'Cần xác nhận lại'}
              </Text>
            </View>

            <Text style={styles.verifiedDate}>
              {lastVerifiedLabel ? `Cập nhật: ${lastVerifiedLabel}` : 'Mới cập nhật'}
            </Text>
          </View>

          {trustPercent > 0 && (
            <View style={[styles.scorePill, verified ? styles.scorePillVerified : styles.scorePillWarning]}>
              <Text style={[styles.scoreNumber, verified ? styles.scoreNumberVerified : styles.scoreNumberWarning]}>
                {trustPercent}%
              </Text>
              <Text style={[styles.scoreLabel, verified ? styles.scoreLabelVerified : styles.scoreLabelWarning]}>
                tin cậy
              </Text>
            </View>
          )}
        </View>

        {/* 5-Item Quick Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature) => {
            const isAvailable = feature.publishedStatus === 'Available';
            const isLimited = feature.publishedStatus === 'Limited';
            const isUnavailable = feature.publishedStatus === 'NotAvailable';

            const tileIcon = (feature.icon || 'check-circle-outline') as keyof typeof MaterialCommunityIcons.glyphMap;
            const shortLabel = getShortLabel(feature.label);

            return (
              <View
                key={feature.id}
                style={[
                  styles.featureTile,
                  isAvailable && styles.tileAvailable,
                  isLimited && styles.tileLimited,
                  isUnavailable && styles.tileUnavailable,
                ]}
              >
                <View
                  style={[
                    styles.tileIconBox,
                    isAvailable && styles.tileIconBoxAvailable,
                    isLimited && styles.tileIconBoxLimited,
                    isUnavailable && styles.tileIconBoxUnavailable,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={tileIcon}
                    size={17}
                    color={isAvailable ? '#007D78' : isLimited ? '#B45309' : '#94A3B8'}
                  />
                </View>

                <Text numberOfLines={2} style={styles.tileLabel}>
                  {shortLabel}
                </Text>

                <View style={styles.tileStatusRow}>
                  <MaterialCommunityIcons
                    name={isAvailable ? 'check' : isLimited ? 'alert-circle-outline' : 'close'}
                    size={11}
                    color={isAvailable ? '#007D78' : isLimited ? '#B45309' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.tileStatusText,
                      isAvailable && styles.statusTextAvailable,
                      isLimited && styles.statusTextLimited,
                      isUnavailable && styles.statusTextUnavailable,
                    ]}
                  >
                    {isAvailable ? 'Có sẵn' : isLimited ? 'Hạn chế' : 'Chưa có'}
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
              <Text style={styles.recheckActionText}>Giúp cộng đồng xác thực lại tiện ích</Text>
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTile: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 82,
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
  tileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileIconBoxAvailable: {
    backgroundColor: '#E6F8F5',
  },
  tileIconBoxLimited: {
    backgroundColor: '#FEF3C7',
  },
  tileIconBoxUnavailable: {
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
  statusTextAvailable: {
    color: '#007D78',
  },
  statusTextLimited: {
    color: '#B45309',
  },
  statusTextUnavailable: {
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
