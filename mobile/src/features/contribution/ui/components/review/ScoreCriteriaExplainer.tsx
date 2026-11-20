import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ScoreCriteriaExplainerProps {
  overallScore: number;
  hasNoFeatures: boolean;
  cvScore: number;
  spatialDistanceMeters: number | null;
  mediaType?: 'photo' | 'video';
  hasNotes?: boolean;
}

export function ScoreCriteriaExplainer({
  overallScore,
  hasNoFeatures,
  cvScore,
  spatialDistanceMeters,
  mediaType = 'photo',
  hasNotes = false,
}: ScoreCriteriaExplainerProps) {
  const [expanded, setExpanded] = useState(false);
  const mediaLabel = mediaType === 'video' ? 'video' : 'ảnh chụp';

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Xem chi tiết cách tính điểm và quy trình xét duyệt"
      >
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={18} color="#006874" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Cách tính điểm độ tin cậy ({overallScore}%)</Text>
          <Text style={styles.headerSub}>
            {expanded ? 'Chạm để thu gọn chi tiết' : 'Xem tỷ trọng chấm điểm & quy trình duyệt hồ sơ'}
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
                ? 'Bạn chưa chọn đặc điểm tiếp cận nào ở Bước 2. Cần ít nhất 1 đặc điểm để kiểm duyệt viên thẩm định.'
                : cvScore === 0
                ? `${mediaType === 'video' ? 'Video' : 'Ảnh'} chưa nhận diện rõ tiện ích đã chọn. Bạn vẫn có thể gửi để kiểm duyệt viên xác minh thủ công.`
                : overallScore >= 80
                ? 'Minh chứng rõ ràng và khớp vị trí thực địa, sẵn sàng gửi để kiểm duyệt viên xét duyệt.'
                : 'Hồ sơ hợp lệ nhưng còn mục tự khai báo hoặc độ nét trung bình, cần kiểm duyệt viên đối chiếu.'}
            </Text>
          </View>

          {/* 3 Pillars Breakdown matching verificationEngine.ts weights */}
          <Text style={styles.sectionHeading}>CƠ CẤU TỶ TRỌNG ĐIỂM</Text>

          <View style={styles.pillarItem}>
            <View style={styles.pillarBullet}>
              <Text style={styles.pillarBulletText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarTitle}>
                  AI nhận diện minh chứng (Tỷ trọng {hasNotes ? '50%' : '65%'})
                </Text>
                <Text style={styles.pillarScore}>{cvScore}%</Text>
              </View>
              <Text style={styles.pillarDesc}>
                Mô hình AI đối chiếu trực tiếp {mediaLabel} với các đặc điểm bạn xác nhận (cửa, ram dốc, bậc thang, thang máy, WC).
              </Text>
            </View>
          </View>

          <View style={styles.pillarItem}>
            <View style={styles.pillarBullet}>
              <Text style={styles.pillarBulletText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarTitle}>
                  Vị trí GPS thực địa (Tỷ trọng {hasNotes ? '30%' : '35%'})
                </Text>
                <Text style={styles.pillarScore}>
                  {spatialDistanceMeters != null ? `Cách ${spatialDistanceMeters}m` : 'Hợp lệ'}
                </Text>
              </View>
              <Text style={styles.pillarDesc}>
                Tọa độ lúc ghi nhận phải nằm trong bán kính 50m (có bù sai số GPS và công trình lớn) để đảm bảo khảo sát tại chỗ.
              </Text>
            </View>
          </View>

          <View style={styles.pillarItem}>
            <View style={styles.pillarBullet}>
              <Text style={styles.pillarBulletText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pillarTitleRow}>
                <Text style={styles.pillarTitle}>Ghi chú hiện trường</Text>
                <Text style={styles.pillarScore}>
                  {hasNotes ? 'Tỷ trọng 20%' : 'Tùy chọn · Không trừ điểm'}
                </Text>
              </View>
              <Text style={styles.pillarDesc}>
                {hasNotes
                  ? 'Mô tả thực địa giúp AI và kiểm duyệt viên hiểu rõ hơn bối cảnh lối vào và tiện ích.'
                  : 'Ghi chú thêm là không bắt buộc — bỏ trống không bị trừ điểm; AI và GPS sẽ chiếm 100% tỷ trọng.'}
              </Text>
            </View>
          </View>

          {/* Accurate WF-01 Moderation Tiers */}
          <Text style={[styles.sectionHeading, { marginTop: 14 }]}>QUY TRÌNH XÉT DUYỆT & +50 EXP</Text>
          <View style={styles.tiersCard}>
            <View style={styles.tierRow}>
              <View style={styles.tierHeaderRow}>
                <View style={[styles.tierDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.tierName}>≥ 80% (Tốt)</Text>
              </View>
              <Text style={styles.tierDesc}>
                Minh chứng và GPS rõ ràng, đủ điều kiện gửi duyệt. Nhận +50 EXP sau khi được công bố.
              </Text>
            </View>
            <View style={styles.tierRow}>
              <View style={styles.tierHeaderRow}>
                <View style={[styles.tierDot, { backgroundColor: '#d97706' }]} />
                <Text style={styles.tierName}>60% – 79% (Khá)</Text>
              </View>
              <Text style={styles.tierDesc}>
                Có mục tự khai hoặc khoảng cách GPS rộng; kiểm duyệt viên sẽ kiểm tra thêm trước khi duyệt.
              </Text>
            </View>
            <View style={styles.tierRow}>
              <View style={styles.tierHeaderRow}>
                <View style={[styles.tierDot, { backgroundColor: '#e11d48' }]} />
                <Text style={styles.tierName}>&lt; 60% (Cần bổ sung)</Text>
              </View>
              <Text style={styles.tierDesc}>
                Chưa đủ rõ minh chứng hoặc thiếu đặc điểm. Nên chụp/quay lại góc rõ hơn trước khi gửi.
              </Text>
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
    gap: 2,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  tierDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    paddingLeft: 16,
  },
});
