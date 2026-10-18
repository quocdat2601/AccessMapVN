import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommunityReview } from './types';

interface CommunityReviewsSectionProps {
  reviews?: CommunityReview[];
  onViewAll?: () => void;
  showDemoContent?: boolean;
  isVerified?: boolean;
}

const DEFAULT_REVIEWS: CommunityReview[] = [
  {
    id: 'rev-1',
    author: 'Minh Anh',
    initials: 'MA',
    age: '4 ngày trước',
    helpfulCount: 15,
    comment: 'Lối vào phía Pasteur dễ tiếp cận và ram dốc thoải hơn cổng Lê Lợi rất nhiều.',
  },
  {
    id: 'rev-2',
    author: 'Tuấn Linh',
    initials: 'TL',
    age: '1 tuần trước',
    helpfulCount: 12,
    comment: 'Nhà vệ sinh tiếp cận ở tầng 2 gần quầy thông tin rộng tự động và có tay vịn.',
  },
];

const DEMO_2_REVIEWS: CommunityReview[] = [
  {
    id: 'rev-d2-1',
    author: 'Minh Anh',
    initials: 'MA',
    age: '1 ngày trước',
    helpfulCount: 28,
    comment: 'Địa điểm tiếp cận rất chuẩn. Ram dốc rộng, có tay vịn đôi chắc chắn, xe lăn điện lên xuống dễ dàng.',
  },
  {
    id: 'rev-d2-2',
    author: 'Tuấn Linh',
    initials: 'TL',
    age: '2 ngày trước',
    helpfulCount: 22,
    comment: 'Cửa tự động cảm ứng nhạy, lọt lòng rộng rãi. Thang máy có âm thanh báo tầng và nút bấm nổi chữ Braille chuẩn.',
  },
  {
    id: 'rev-d2-3',
    author: 'Thanh Hằng',
    initials: 'TH',
    age: '3 ngày trước',
    helpfulCount: 35,
    comment: 'Nhà vệ sinh tiếp cận độc lập ở tầng trệt sạch sẽ, trang bị tay vịn trợ lực đạt quy chuẩn QCVN 10:2014.',
  },
  {
    id: 'rev-d2-4',
    author: 'Quốc Bảo',
    initials: 'QB',
    age: '4 ngày trước',
    helpfulCount: 19,
    comment: 'Hệ thống gạch xúc giác dẫn hướng liên tục và không bị vật cản che khuất.',
  },
];

export function CommunityReviewsSection({
  reviews = [],
  onViewAll,
  showDemoContent = false,
  isVerified = false,
}: CommunityReviewsSectionProps) {
  const fallback = isVerified ? DEMO_2_REVIEWS : DEFAULT_REVIEWS;
  const displayReviews = reviews.length > 0 ? reviews : showDemoContent ? fallback : [];
  const hasReviews = displayReviews.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="comment-text-outline" size={17} color="#006874" />
          <Text style={styles.title}>Nhận xét cộng đồng</Text>
          <Text style={styles.countText}>({displayReviews.length})</Text>
        </View>
        {hasReviews ? (
          <TouchableOpacity
            onPress={onViewAll ?? (() => Alert.alert('Nhận xét cộng đồng', 'Đang tải toàn bộ nhận xét...'))}
            hitSlop={8}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <MaterialCommunityIcons name="chevron-right" size={15} color="#006874" />
          </TouchableOpacity>
        ) : null}
      </View>

      {!hasReviews ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="comment-plus-outline" size={22} color="#007D78" />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Chưa có nhận xét cộng đồng</Text>
            <Text style={styles.emptyText}>Hãy là người đầu tiên chia sẻ trải nghiệm tại đây.</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        >
          {displayReviews.map((rev) => (
            <View key={rev.id} style={styles.card}>
              <View style={styles.authorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{rev.initials}</Text>
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{rev.author}</Text>
                  <Text style={styles.authorTime}>{rev.age}</Text>
                </View>
                <View style={styles.helpfulBadge}>
                  <MaterialCommunityIcons name="arrow-up" size={11} color="#007D78" />
                  <Text style={styles.helpfulText}>{rev.helpfulCount} hữu ích</Text>
                </View>
              </View>
              <Text style={styles.commentText} numberOfLines={3}>
                “{rev.comment}”
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
  },
  cardsContainer: {
    gap: 10,
    paddingRight: 6,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  emptyCopy: {
    flex: 1,
  },
  emptyTitle: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    width: 230,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#004E58',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  authorTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  helpfulBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E8FAF6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  helpfulText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007D78',
  },
  commentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16.5,
  },
});
