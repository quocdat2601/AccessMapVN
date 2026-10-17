import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { AccessibilityDetailFeature } from './types';
import { AccessibilityFeatureList } from './AccessibilityFeatureList';

interface AccessibilitySummaryProps {
  isUnrated?: boolean;
  trustPercent: number;
  features: AccessibilityDetailFeature[];
  note?: string | null;
  hasRamp?: boolean;
  doorWidthOk?: boolean;
  hasTactile?: boolean;
  lastVerifiedAt?: string | null;
}

export function AccessibilitySummary({
  isUnrated,
  trustPercent,
  features,
  note,
  hasRamp,
  doorWidthOk,
  hasTactile,
  lastVerifiedAt,
}: AccessibilitySummaryProps) {
  if (isUnrated) {
    return (
      <View style={styles.unratedContainer}>
        <View style={styles.unratedIconBox}>
          <MaterialCommunityIcons name="wheelchair-accessibility" size={24} color="#64748b" />
        </View>
        <View style={styles.unratedTextBox}>
          <Text style={styles.unratedTitle}>Chưa có dữ liệu tiếp cận</Text>
          <Text style={styles.unratedDesc}>
            Địa điểm này chưa được khảo sát lối vào, ram dốc hoặc tiện ích cho người khuyết tật.
          </Text>
        </View>
      </View>
    );
  }

  const isHighTrust = trustPercent >= 75;
  const isMediumTrust = trustPercent >= 50;
  const trustColor = isHighTrust ? Colors.statusGreen : isMediumTrust ? '#f59e0b' : '#ef4444';
  const trustBg = isHighTrust ? '#dcfce7' : isMediumTrust ? '#fef3c7' : '#fee2e2';
  const verifiedDate = lastVerifiedAt ? new Date(lastVerifiedAt) : null;
  const verifiedLabel = verifiedDate && !Number.isNaN(verifiedDate.getTime())
    ? verifiedDate.toLocaleDateString('vi-VN')
    : null;
  const trustLabel = isHighTrust ? 'Đáng tin cậy' : isMediumTrust ? 'Khả quan' : 'Cần cải thiện';

  let wheelchairType = 'Chưa khảo sát';
  let wheelchairBg = '#f1f5f9';
  let wheelchairColor = '#475569';
  if (hasRamp && doorWidthOk) {
    wheelchairType = 'Tiếp cận đầy đủ';
    wheelchairBg = '#ecfdf5';
    wheelchairColor = '#065f46';
  } else if (hasRamp || doorWidthOk) {
    wheelchairType = 'Tiếp cận một phần';
    wheelchairBg = '#eff6ff';
    wheelchairColor = '#1e40af';
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}>
          <MaterialCommunityIcons name="wheelchair-accessibility" size={18} color="#007D78" />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.headingTitle}>Tình trạng tiếp cận</Text>
          <Text style={styles.headingHint}>
            {verifiedLabel == null ? 'Đang chờ cộng đồng xác nhận' : `Lần xác nhận gần nhất: ${verifiedLabel}`}
          </Text>
        </View>
      </View>
      {/* Top Meta Row: Trust Score + QCVN Standard */}
      <View style={styles.trustRow}>
        <View style={[styles.trustPill, { backgroundColor: trustBg }]}>
          <View style={[styles.trustDot, { backgroundColor: trustColor }]} />
          <Text style={[styles.trustPillText, { color: trustColor }]}>
            {trustLabel} ({trustPercent}%)
          </Text>
        </View>
        <View style={styles.standardPill}>
          <MaterialCommunityIcons name="shield-check" size={13} color="#004e58" />
          <Text style={styles.standardPillText}>QCVN 10:2014</Text>
        </View>
      </View>

      {/* Accessibility Classification Badges */}
      <View style={styles.typeRow}>
        <View style={[styles.typeBadge, { backgroundColor: wheelchairBg }]}>
          <MaterialCommunityIcons name="wheelchair" size={15} color={wheelchairColor} />
          <Text style={[styles.typeBadgeText, { color: wheelchairColor }]}>
            Xe lăn: {wheelchairType}
          </Text>
        </View>
        {hasTactile ? (
          <View style={[styles.typeBadge, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="eye-outline" size={14} color="#92400e" />
            <Text style={[styles.typeBadgeText, { color: '#92400e' }]}>Khiếm thị: Có gạch dẫn hướng</Text>
          </View>
        ) : null}
      </View>

      {/* Verified Survey Note if present */}
      {note ? (
        <View style={styles.noteBox}>
          <MaterialCommunityIcons name="information-outline" size={15} color="#004e58" style={styles.noteIcon} />
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}

      {/* Feature Breakdown Rows */}
      <AccessibilityFeatureList features={features} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginBottom: 20,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFCF6',
    borderWidth: 1,
    borderColor: '#F1DEB8',
  },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 12 },
  headingIcon: { alignItems: 'center', backgroundColor: '#E8FAF6', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  headingCopy: { flex: 1 },
  headingTitle: { color: '#18312F', fontSize: 15, fontWeight: '800' },
  headingHint: { color: '#7C6546', fontSize: 11.5, marginTop: 2 },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trustPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  standardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    gap: 4,
  },
  standardPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004e58',
    letterSpacing: 0.3,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  typeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    gap: 6,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    flex: 1,
  },
  unratedContainer: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  unratedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unratedTextBox: {
    flex: 1,
  },
  unratedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  unratedDesc: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
});
