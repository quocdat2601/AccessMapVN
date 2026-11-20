import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VerificationMatrixResult } from '../../../lib/verificationEngine';

interface ScoreMatrixBreakdownProps {
  matrixResult?: VerificationMatrixResult;
  pillars: VerificationMatrixResult['pillars'];
  spatialValid: boolean;
  spatialDistanceMeters: number | null;
  selectedTagKeys?: string[];
  mediaType?: 'photo' | 'video';
}

export function ScoreMatrixBreakdown({
  matrixResult,
  pillars,
  spatialValid,
  spatialDistanceMeters,
  selectedTagKeys,
  mediaType = 'photo',
}: ScoreMatrixBreakdownProps) {
  const { computerVision, nlpContext } = pillars;
  const penalties = matrixResult?.penalties;
  const isVideo = mediaType === 'video';

  return (
    <View style={styles.container}>
      {/* Penalty Alert if steps without ramp were marked */}
      {penalties?.stepsWithoutRamp ? (
        <View style={styles.penaltyAlert}>
          <MaterialCommunityIcons name="alert-decagram" size={18} color="#f43f5e" />
          <Text style={styles.penaltyAlertText}>
            Lưu ý: Có bậc tam cấp cản trở, lối đi này chưa hỗ trợ xe lăn tự di chuyển qua.
          </Text>
        </View>
      ) : null}

      {/* Cơ sở xác thực thông tin */}
      <Text style={styles.sectionTitle}>Cơ sở xác thực thông tin</Text>
      <View style={styles.evidenceCard}>
        {/* Minh chứng hình ảnh / video */}
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
              name={
                isVideo
                  ? (computerVision.score > 0 ? 'video-check-outline' : 'video-outline')
                  : (computerVision.score > 0 ? 'image-check-outline' : 'image-filter-center-focus')
              }
              size={18}
              color={computerVision.score > 0 ? '#059669' : '#64748b'}
            />
          </View>
          <View style={styles.evidenceTextCol}>
            <Text style={styles.evidenceTitle}>
              {isVideo ? 'Video ghi hình tại chỗ' : 'Hình ảnh chụp tại chỗ'}
            </Text>
            <Text style={styles.evidenceSub}>
              {computerVision.score >= 80
                ? `${isVideo ? 'Video' : 'Ảnh'} rõ nét, nhận diện tốt tiện ích đã chọn (${computerVision.score}%)`
                : computerVision.score > 0
                ? `Nhận diện được đặc trưng tiện ích trong ${isVideo ? 'video' : 'ảnh'} (${computerVision.score}%)`
                : `Chưa phát hiện rõ tiện ích trong ${isVideo ? 'video' : 'ảnh'}`}
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
                    : spatialDistanceMeters <= 50
                    ? `Khớp với vị trí thực tế (cách ${spatialDistanceMeters}m)`
                    : `Khớp thực địa (cách ${spatialDistanceMeters}m, trong sai số GPS)`
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

          let rowBg = '#fffbeb';
          let rowColor = '#d97706';
          let mainIcon: 'checkbox-marked-circle-outline' | 'information-outline' | 'alert-circle-outline' = 'alert-circle-outline';
          let statusIcon: 'check-circle' | 'clock-outline' | 'alert-circle' = 'alert-circle';
          let title = 'Chưa chọn đặc tính nào';
          let subtitle = '0 đặc tính được xác nhận. Cần bổ sung để đủ điều kiện xét duyệt.';

          const mediaWord = isVideo ? 'video' : 'ảnh chụp';
          if (isFullyVerified) {
            rowBg = '#ecfdf5';
            rowColor = '#059669';
            mainIcon = 'checkbox-marked-circle-outline';
            statusIcon = 'check-circle';
            title = 'Đặc điểm bạn đã chọn';
            subtitle = nlpContext.matchedKeywords.length > 0
              ? `Đã chọn ${count} đặc điểm (khớp ${nlpContext.matchedKeywords.length} từ khóa ghi chú)`
              : `Đã xác nhận ${count} đặc điểm phù hợp với ${mediaWord}`;
          } else if (isPartiallyVerified) {
            rowBg = '#eff6ff';
            rowColor = '#0284c7';
            mainIcon = 'information-outline';
            statusIcon = 'clock-outline';
            title = `Đặc điểm đã chọn (${verifiedCount} khớp ${mediaWord}, ${unverifiedCount} tự khai)`;
            subtitle = `${verifiedCount}/${count} đặc điểm khớp với ${mediaWord}; ${unverifiedCount} mục còn lại sẽ được kiểm duyệt viên xem xét.`;
          } else if (hasTags) {
            title = `Đặc điểm tự khai (Chưa khớp ${mediaWord})`;
            subtitle = `Đã chọn ${count} đặc điểm nhưng chưa thấy rõ trong ${mediaWord}. Kiểm duyệt viên sẽ xác minh lại.`;
          }

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
});
