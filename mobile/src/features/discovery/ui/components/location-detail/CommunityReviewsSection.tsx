import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommunityReview } from './types';

interface CommunityReviewsSectionProps {
  reviews?: CommunityReview[];
  onViewAll?: () => void;
  showDemoContent?: boolean;
  isVerified?: boolean;
}

export const DEFAULT_DEMO_REVIEWS: CommunityReview[] = [
  {
    id: 'rev-1',
    author: 'Minh Anh',
    initials: 'MA',
    age: '4 ngày trước',
    helpfulCount: 15,
    likesCount: 6,
    comment: 'Lối vào phía Pasteur dễ tiếp cận và ram dốc thoải hơn cổng Lê Lợi rất nhiều.',
    status: 'Approved',
  },
  {
    id: 'rev-2',
    author: 'Tuấn Linh',
    initials: 'TL',
    age: '1 tuần trước',
    helpfulCount: 12,
    likesCount: 4,
    comment: 'Nhà vệ sinh tiếp cận ở tầng 2 gần quầy thông tin rộng tự động và có tay vịn.',
    status: 'Approved',
  },
];

export const VERIFIED_DEMO_REVIEWS: CommunityReview[] = [
  {
    id: 'rev-d2-1',
    author: 'Minh Anh',
    initials: 'MA',
    age: '1 ngày trước',
    helpfulCount: 28,
    likesCount: 11,
    comment: 'Địa điểm tiếp cận rất chuẩn. Ram dốc rộng, có tay vịn đôi chắc chắn, xe lăn điện lên xuống dễ dàng.',
    status: 'Approved',
  },
  {
    id: 'rev-d2-2',
    author: 'Tuấn Linh',
    initials: 'TL',
    age: '2 ngày trước',
    helpfulCount: 22,
    likesCount: 9,
    comment: 'Cửa tự động cảm ứng nhạy, lọt lòng rộng rãi. Thang máy có âm thanh báo tầng và nút bấm nổi chữ Braille chuẩn.',
    status: 'Approved',
  },
  {
    id: 'rev-d2-3',
    author: 'Thanh Hằng',
    initials: 'TH',
    age: '3 ngày trước',
    helpfulCount: 35,
    likesCount: 14,
    comment: 'Nhà vệ sinh tiếp cận độc lập ở tầng trệt sạch sẽ, trang bị tay vịn trợ lực đạt quy chuẩn QCVN 10:2014.',
    status: 'Approved',
  },
  {
    id: 'rev-d2-4',
    author: 'Quốc Bảo',
    initials: 'QB',
    age: '4 ngày trước',
    helpfulCount: 19,
    likesCount: 7,
    comment: 'Hệ thống gạch xúc giác dẫn hướng liên tục và không bị vật cản che khuất.',
    status: 'Approved',
  },
];

export function getDisplayCommunityReviews(
  reviews: CommunityReview[] = [],
  showDemoContent = false,
  isVerified = false
): CommunityReview[] {
  const fallback = isVerified ? VERIFIED_DEMO_REVIEWS : DEFAULT_DEMO_REVIEWS;
  if (reviews.length > 0 && showDemoContent) {
    const existingIds = new Set(reviews.map((r) => r.id));
    const mergedFallback = fallback.filter((f) => !existingIds.has(f.id));
    return [...reviews, ...mergedFallback];
  }
  return reviews.length > 0 ? reviews : showDemoContent ? fallback : [];
}

export function CommunityReviewsSection({
  reviews = [],
  onViewAll,
  showDemoContent = false,
  isVerified = false,
}: CommunityReviewsSectionProps) {
  const displayReviews = getDisplayCommunityReviews(reviews, showDemoContent, isVerified);
  const hasReviews = displayReviews.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="comment-text-outline" size={17} color="#006874" />
          <Text style={styles.title}>Nhận xét cộng đồng</Text>
          <Text style={styles.countText}>({displayReviews.length})</Text>
        </View>
        <TouchableOpacity
          onPress={onViewAll}
          hitSlop={8}
          style={styles.viewAllBtn}
          accessibilityRole="button"
          accessibilityLabel="Xem tất cả nhận xét cộng đồng"
          activeOpacity={0.75}
        >
          <Text style={styles.viewAllText}>{hasReviews ? 'Xem tất cả' : 'Viết nhận xét'}</Text>
          <MaterialCommunityIcons name="chevron-right" size={15} color="#006874" />
        </TouchableOpacity>
      </View>

      {!hasReviews ? (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={onViewAll}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ nhận xét đầu tiên tại địa điểm này"
        >
          <MaterialCommunityIcons name="comment-plus-outline" size={22} color="#007D78" />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Chưa có nhận xét cộng đồng</Text>
            <Text style={styles.emptyText}>Hãy là người đầu tiên chia sẻ trải nghiệm tại đây.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#007D78" />
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        >
          {displayReviews.map((rev) => (
            <TouchableOpacity
              key={rev.id}
              style={[styles.card, rev.status === 'PendingReview' && styles.pendingCard]}
              onPress={onViewAll}
              activeOpacity={0.85}
            >
              <View style={styles.authorRow}>
                <View style={[styles.avatar, rev.isOwn && styles.ownAvatar]}>
                  <Text style={styles.avatarText}>{rev.initials}</Text>
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {rev.author}
                  </Text>
                  <Text style={styles.authorTime}>{rev.age}</Text>
                </View>
                {rev.status === 'PendingReview' ? (
                  <View style={styles.pendingBadge}>
                    <MaterialCommunityIcons name="clock-outline" size={11} color="#B45309" />
                    <Text style={styles.pendingText}>Chờ duyệt</Text>
                  </View>
                ) : (
                  <View style={styles.helpfulBadge}>
                    <MaterialCommunityIcons name="arrow-up" size={11} color="#007D78" />
                    <Text style={styles.helpfulText}>{rev.helpfulCount} hữu ích</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentText} numberOfLines={3}>
                “{rev.comment}”
              </Text>
            </TouchableOpacity>
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
  pendingCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
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
  ownAvatar: {
    backgroundColor: '#007D78',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
    marginRight: 4,
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
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
  },
  commentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16.5,
  },
});
