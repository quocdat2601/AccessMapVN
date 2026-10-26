import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ScoreCriteriaExplainerProps {
  overallScore: number;
  status: string;
  hasNoFeatures: boolean;
  cvScore: number;
  spatialDistanceMeters: number | null;
}

export function ScoreCriteriaExplainer({
  overallScore,
  status,
  hasNoFeatures,
  cvScore,
  spatialDistanceMeters,
}: ScoreCriteriaExplainerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Xem chi tiết cách tính điểm và điều kiện xét duyệt"
      >
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={18} color="#006874" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Vì sao có điểm số này? ({overallScore}%)</Text>
          <Text style={styles.headerSub}>
            {expanded ? 'Chạm để thu gọn tiêu chuẩn chấm điểm' : 'Xem chi tiết cách tính điểm & điều kiện xét duyệt'}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#64748b"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.content}>
          {/* Quick takeaway reason */}
          <View style={styles.takeawayBox}>
            <MaterialCommunityIcons
              name={hasNoFeatures ? 'alert-circle' : overallScore >= 80 ? 'check-decagram' : 'information'}
              size={18}
              color={hasNoFeatures ? '#d97706' : overallScore >= 80 ? '#059669' : '#0284c7'}
            />
            <Text style={styles.takeawayText}>
              {hasNoFeatures
                ? 'Điểm đạt 25% vì bạn chưa tick chọn đặc tính tiếp cận nào ở Bước 2. Hệ thống yêu cầu ít nhất 1 đặc tính (như Ram dốc, Cửa rộng, WC...) để thẩm định.'
                : cvScore === 0
                ? 'Ảnh chụp chưa nhận diện được tiện ích rõ ràng hoặc chưa khớp với đặc tính đã chọn.'
                : overallScore >= 80
                ? 'Hồ sơ đạt độ tin cậy xuất sắc (trên 80%). Đạt chuẩn xác minh AI, được ưu tiên duyệt và xuất bản lên bản đồ.'
                : 'Đóng góp đã có thông tin cơ bản và sẽ được kiểm duyệt viên xem xét trên Admin Portal.'}
            </Text>
          </View>

          {/* 3 Pillars Breakdown */}
          <Text style={styles.sectionHeading}>CƠ CẤU 3 TRỤ CỘT ĐIỂM SỐ</Text>

          <View style={styles.pillarItem}>
            <View style={styles.pillarBullet}>
              <Text style={styles.pillarBulletText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarTitle}>Thị giác máy tính AI (Tỷ trọng 50%)</Text>
                <Text style={styles.pillarScore}>{cvScore}%</Text>
              </View>
              <Text style={styles.pillarDesc}>
                Mô hình AI tự động quét hình ảnh để nhận diện ram dốc, bậc tam cấp, thang máy, độ rộng cửa... Ảnh chụp rõ nét và trực diện tiện ích sẽ đạt điểm tối đa.
              </Text>
            </View>
          </View>

          <View style={styles.pillarItem}>
            <View style={styles.pillarBullet}>
              <Text style={styles.pillarBulletText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarTitle}>Vị trí GPS thực địa (Tỷ trọng 30%)</Text>
                <Text style={styles.pillarScore}>
                  {spatialDistanceMeters != null ? `Cách ${spatialDistanceMeters}m` : 'Hợp lệ'}
                </Text>
              </View>
              <Text style={styles.pillarDesc}>
                Khoảng cách giữa tọa độ lúc bạn chụp ảnh và địa điểm trên bản đồ phải trong vòng bán kính 50m để chống báo cáo ảo/từ xa.
              </Text>
            </View>
          </View>

          <View style={styles.pillarItem}>
            <View style={styles.pillarBullet}>
              <Text style={styles.pillarBulletText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarTitle}>Xác nhận đặc tính & Mô tả (Tỷ trọng 20%)</Text>
                <Text style={styles.pillarScore}>{hasNoFeatures ? '0 đặc tính' : 'Đã chọn'}</Text>
              </View>
              <Text style={styles.pillarDesc}>
                Các tiêu chuẩn QCVN 10:2014 bạn tick chọn ở Bước 2 cùng ghi chú hiện trường. Nếu để trống không chọn đặc tính nào, hệ thống giới hạn tối đa 25%.
              </Text>
            </View>
          </View>

          {/* 3 Moderation Tiers */}
          <Text style={[styles.sectionHeading, { marginTop: 14 }]}>ĐIỀU KIỆN XÉT DUYỆT & CỘNG EXP</Text>
          <View style={styles.tiersCard}>
            <View style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.tierName}>≥ 80% (Độ tin cậy cao):</Text>
              <Text style={styles.tierDesc}>Đạt chuẩn xác minh AI, ưu tiên duyệt nhanh và nhận +50 EXP sau khi duyệt.</Text>
            </View>
            <View style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.tierName}>60% – 79% (Chờ kiểm duyệt):</Text>
              <Text style={styles.tierDesc}>Chuyển về hàng đợi Admin Portal để người kiểm duyệt duyệt.</Text>
            </View>
            <View style={styles.tierRow}>
              <View style={[styles.tierDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.tierName}>&lt; 60% (Cần thêm thông tin):</Text>
              <Text style={styles.tierDesc}>Ảnh chưa đủ chi tiết hoặc thiếu tiêu chí. Cần chụp lại hoặc tick chọn thêm.</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f7f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  takeawayBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  takeawayText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006874',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  pillarItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  pillarBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#006874',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pillarBulletText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  pillarTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pillarTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  pillarScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
    flexShrink: 0,
  },
  pillarDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b',
    marginTop: 2,
  },
  tiersCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  tierName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    width: 140,
  },
  tierDesc: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
});
