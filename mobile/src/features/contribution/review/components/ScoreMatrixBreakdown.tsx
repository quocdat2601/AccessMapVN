import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VerificationMatrixResult } from '../../services/verificationEngine';

interface ScoreMatrixBreakdownProps {
  pillars: VerificationMatrixResult['pillars'];
  spatialValid: boolean;
  spatialDistanceMeters: number | null;
}

export function ScoreMatrixBreakdown({
  pillars,
  spatialValid,
  spatialDistanceMeters,
}: ScoreMatrixBreakdownProps) {
  const { computerVision, nlpContext, spatialProximity } = pillars;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Phân rã ma trận thẩm định 3 thành phần</Text>

      {/* 1. Computer Vision Pillar */}
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

      {/* 2. NLP Context Pillar */}
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

      {/* 3. Spatial Proximity Pillar */}
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
        <View style={styles.spatialInfoRow}>
          <Text style={styles.pillarDetail}>
            {spatialDistanceMeters != null
              ? `Khoảng cách tới POI: ${spatialDistanceMeters}m (Ranh giới ≤50m BR-13)`
              : 'Định vị GPS tự động neo theo POI'}
          </Text>
          <View
            style={[
              styles.geofenceStatusBadge,
              { backgroundColor: spatialValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' },
            ]}
          >
            <Text
              style={[
                styles.geofenceStatusText,
                { color: spatialValid ? '#10b981' : '#f43f5e' },
              ]}
            >
              {spatialValid ? 'HỢP LỆ' : 'VƯỢT 50M'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  pillarCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    padding: 12,
    gap: 6,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  pillarScoreText: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarDetail: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  keywordBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  keywordText: {
    color: '#c084fc',
    fontSize: 10.5,
    fontWeight: '600',
  },
  spatialBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spatialInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  geofenceStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  geofenceStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
