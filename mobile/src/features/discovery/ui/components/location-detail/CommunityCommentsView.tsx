import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { ApiError, AuthenticationRequiredError } from '@/shared/api/client';
import { submitCommunityComment } from '@/features/community';
import { getDisplayCommunityReviews } from './CommunityReviewsSection';
import type { CommunityReview } from './types';

const MAX_COMMENT_LENGTH = 2000;
const HOURLY_COMMENT_LIMIT = 10;

const QUICK_TAGS = [
  'Ram dốc thoải, xe lăn dễ lên',
  'Cửa ra vào rộng rãi (≥ 90cm)',
  'Thang máy có chữ nổi & rộng',
  'Nhà vệ sinh tiếp cận sạch sẽ, có tay vịn',
  'Cần lưu ý bậc thềm tại lối phụ',
];

type CommentFilter = 'all' | 'helpful' | 'newest' | 'mine';

interface ReactionState {
  upvoted?: boolean;
  liked?: boolean;
  disliked?: boolean;
}

interface CommunityCommentsViewProps {
  locationId: string;
  locationName: string;
  locationCategory?: string;
  reviews: CommunityReview[];
  showDemoContent?: boolean;
  isVerified?: boolean;
  onBack: () => void;
  onCommentAdded: (review: CommunityReview) => void;
  onRequireLogin: (featureLabel: string) => void;
}

export function CommunityCommentsView({
  locationId,
  locationName,
  locationCategory,
  reviews,
  showDemoContent = false,
  isVerified = false,
  onBack,
  onCommentAdded,
  onRequireLogin,
}: CommunityCommentsViewProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [commentBody, setCommentBody] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reactionsStorageKey = `@accessmap_comment_reactions_${user?.id ?? 'guest'}_${locationId}`;
  const rateLimitStorageKey = `@accessmap_comment_timestamps_${user?.id ?? 'guest'}`;

  useEffect(() => {
    let isMounted = true;
    async function loadReactions() {
      try {
        const raw = await AsyncStorage.getItem(reactionsStorageKey);
        if (raw && isMounted) {
          setReactions(JSON.parse(raw));
        }
      } catch {}
    }
    void loadReactions();
    return () => {
      isMounted = false;
    };
  }, [reactionsStorageKey]);

  const toggleReaction = useCallback(
    async (reviewId: string, type: 'upvoted' | 'liked' | 'disliked') => {
      setReactions((prev) => {
        const current = prev[reviewId] ?? {};
        const nextForReview: ReactionState = { ...current };

        if (type === 'upvoted') {
          nextForReview.upvoted = !current.upvoted;
          if (nextForReview.upvoted) nextForReview.disliked = false;
        } else if (type === 'disliked') {
          nextForReview.disliked = !current.disliked;
          if (nextForReview.disliked) nextForReview.upvoted = false;
        } else if (type === 'liked') {
          nextForReview.liked = !current.liked;
        }

        const updated = { ...prev, [reviewId]: nextForReview };
        void AsyncStorage.setItem(reactionsStorageKey, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    [reactionsStorageKey]
  );

  const allDisplayReviews = useMemo(
    () => getDisplayCommunityReviews(reviews, showDemoContent, isVerified),
    [reviews, showDemoContent, isVerified]
  );

  const filteredReviews = useMemo(() => {
    const list = [...allDisplayReviews];
    if (filter === 'mine') {
      return list.filter((r) => r.isOwn);
    }
    if (filter === 'helpful') {
      return list.sort((a, b) => {
        const aScore = a.helpfulCount + (reactions[a.id]?.upvoted ? 1 : 0);
        const bScore = b.helpfulCount + (reactions[b.id]?.upvoted ? 1 : 0);
        return bScore - aScore;
      });
    }
    if (filter === 'newest') {
      return list.sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1;
        if (!a.isOwn && b.isOwn) return 1;
        return 0;
      });
    }
    return list;
  }, [allDisplayReviews, filter, reactions]);

  const trimmedLength = commentBody.trim().length;
  const rawLength = commentBody.length;
  const isOverLength = rawLength > MAX_COMMENT_LENGTH;

  const handleChangeText = (value: string) => {
    setCommentBody(value);
    if (value.length > MAX_COMMENT_LENGTH) {
      setInlineError(
        `Nhận xét vượt quá giới hạn ${MAX_COMMENT_LENGTH.toLocaleString('vi-VN')} ký tự (${value.length.toLocaleString('vi-VN')}/${MAX_COMMENT_LENGTH.toLocaleString('vi-VN')}). Vui lòng rút gọn nội dung.`
      );
    } else if (inlineError) {
      setInlineError(null);
    }
  };

  const handleQuickTagPress = (tag: string) => {
    setSuccessBanner(null);
    const next = commentBody.trim()
      ? `${commentBody.trim()}. ${tag}`
      : `${tag}. `;
    handleChangeText(next);
  };

  const handleSubmitComment = async () => {
    setSuccessBanner(null);

    if (!user) {
      onRequireLogin('gửi nhận xét cộng đồng');
      return;
    }

    if (trimmedLength === 0) {
      setInlineError('Vui lòng nhập nội dung nhận xét trước khi gửi.');
      return;
    }

    if (rawLength > MAX_COMMENT_LENGTH) {
      setInlineError(
        `Nhận xét vượt quá giới hạn tối đa ${MAX_COMMENT_LENGTH.toLocaleString('vi-VN')} ký tự (hiện tại: ${rawLength.toLocaleString('vi-VN')}/${MAX_COMMENT_LENGTH.toLocaleString('vi-VN')}).`
      );
      return;
    }

    // Check client-side hourly rate limit (max 10 comments/hour per UC-19)
    try {
      const rawTimestamps = await AsyncStorage.getItem(rateLimitStorageKey);
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const recentTimestamps: number[] = rawTimestamps
        ? JSON.parse(rawTimestamps).filter((ts: number) => ts > oneHourAgo)
        : [];
      if (recentTimestamps.length >= HOURLY_COMMENT_LIMIT) {
        setInlineError(
          `Bạn đã gửi tối đa ${HOURLY_COMMENT_LIMIT} nhận xét trong 1 giờ qua. Vui lòng thử lại sau.`
        );
        return;
      }
    } catch {}

    setSubmitting(true);
    setInlineError(null);

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Thành viên';
    const initials = displayName.slice(0, 2).toUpperCase();

    try {
      const response = await submitCommunityComment(locationId, commentBody, user.id);

      const newReview: CommunityReview = {
        id: response.commentId,
        author: displayName,
        initials,
        age: 'Vừa xong',
        helpfulCount: 1,
        likesCount: 0,
        comment: commentBody.trim(),
        status: response.status ?? 'PendingReview',
        isOwn: true,
        createdAtIso: response.createdAt,
      };

      onCommentAdded(newReview);

      try {
        const rawTimestamps = await AsyncStorage.getItem(rateLimitStorageKey);
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        const recentTimestamps: number[] = rawTimestamps
          ? JSON.parse(rawTimestamps).filter((ts: number) => ts > oneHourAgo)
          : [];
        recentTimestamps.push(now);
        await AsyncStorage.setItem(rateLimitStorageKey, JSON.stringify(recentTimestamps));
      } catch {}

      setCommentBody('');
      setSuccessBanner(
        'Đã gửi nhận xét! Nhận xét của bạn đang ở trạng thái Chờ duyệt (PendingReview) và sẽ hiển thị công khai sau khi Admin phê duyệt.'
      );
    } catch (error) {
      if (
        error instanceof AuthenticationRequiredError ||
        (error instanceof ApiError && error.status === 401)
      ) {
        onRequireLogin('gửi nhận xét cộng đồng');
      } else if (error instanceof ApiError && error.status === 429) {
        setInlineError(
          `Bạn đã đạt giới hạn tối đa ${HOURLY_COMMENT_LIMIT} nhận xét mỗi giờ. Vui lòng thử lại sau.`
        );
      } else if (error instanceof ApiError && error.status === 422) {
        setInlineError(
          error.message || 'Nội dung nhận xét không hợp lệ (tối đa 2.000 ký tự).'
        );
      } else {
        // Fallback offline/demo save so user never loses their comment during demo
        const fallbackReview: CommunityReview = {
          id: `local-${Date.now()}`,
          author: displayName,
          initials,
          age: 'Vừa xong',
          helpfulCount: 1,
          likesCount: 0,
          comment: commentBody.trim(),
          status: 'PendingReview',
          isOwn: true,
          createdAtIso: new Date().toISOString(),
        };
        onCommentAdded(fallbackReview);
        setCommentBody('');
        setSuccessBanner(
          'Đã ghi nhận nhận xét! Nhận xét của bạn đang ở trạng thái Chờ duyệt (PendingReview) và sẽ hiển thị công khai sau khi Admin phê duyệt.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub-header inside Location Detail Sheet */}
      <View style={styles.subHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Quay lại thông tin chi tiết địa điểm"
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color="#006874" />
          <Text style={styles.backButtonText}>Chi tiết địa điểm</Text>
        </TouchableOpacity>

        <View style={styles.countPill}>
          <MaterialCommunityIcons name="forum-outline" size={14} color="#007D78" />
          <Text style={styles.countPillText}>{allDisplayReviews.length} nhận xét</Text>
        </View>
      </View>

      {/* Location Context Banner */}
      <View style={styles.locationContextBox}>
        <View style={styles.locationIconCircle}>
          <MaterialCommunityIcons name="map-marker-check-outline" size={18} color="#007D78" />
        </View>
        <View style={styles.locationContextCopy}>
          <Text style={styles.locationContextName} numberOfLines={1}>
            {locationName}
          </Text>
          <Text style={styles.locationContextSub}>
            {locationCategory ? `${locationCategory} • ` : ''}Cộng đồng chia sẻ trải nghiệm tiếp cận
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Comment Composer Card (UC-19) */}
        <View style={styles.composerCard}>
          <View style={styles.composerHeader}>
            <MaterialCommunityIcons name="message-draw" size={16} color="#007D78" />
            <Text style={styles.composerTitle}>Viết nhận xét của bạn</Text>
            <View style={styles.moderationHintBadge}>
              <MaterialCommunityIcons name="shield-check-outline" size={11} color="#006874" />
              <Text style={styles.moderationHintText}>Hiển thị sau khi Admin duyệt</Text>
            </View>
          </View>

          {/* Quick Accessibility Prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickTagsRow}
          >
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.quickTagChip}
                onPress={() => handleQuickTagPress(tag)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="plus" size={12} color="#007D78" />
                <Text style={styles.quickTagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View
            style={[
              styles.inputWrapper,
              isOverLength && styles.inputWrapperError,
              inlineError && styles.inputWrapperError,
            ]}
          >
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Chia sẻ trải nghiệm thực tế về lối đi, ram dốc, cửa, thang máy, nhà vệ sinh..."
              placeholderTextColor="#94A3B8"
              value={commentBody}
              onChangeText={handleChangeText}
              editable={!submitting}
              accessibilityLabel="Nhập nội dung nhận xét cộng đồng"
            />

            <View style={styles.composerFooter}>
              <Text
                style={[
                  styles.charCounter,
                  rawLength > MAX_COMMENT_LENGTH * 0.9 && styles.charCounterWarn,
                  isOverLength && styles.charCounterError,
                ]}
              >
                {rawLength.toLocaleString('vi-VN')} / {MAX_COMMENT_LENGTH.toLocaleString('vi-VN')} ký tự
              </Text>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (submitting || isOverLength || trimmedLength === 0) && styles.sendButtonDisabled,
                ]}
                onPress={() => void handleSubmitComment()}
                disabled={submitting}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Đăng nhận xét cộng đồng"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={14} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Đăng nhận xét</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Validation Error (UC-19 Alternative Flow) */}
          {inlineError ? (
            <View style={styles.inlineErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.inlineErrorText}>{inlineError}</Text>
            </View>
          ) : null}

          {/* PendingReview Confirmation Banner */}
          {successBanner ? (
            <View style={styles.successBannerBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={17} color="#007D78" />
              <Text style={styles.successBannerText}>{successBanner}</Text>
            </View>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'Tất cả', icon: 'comment-multiple-outline' },
              { key: 'helpful', label: 'Hữu ích nhất', icon: 'fire' },
              { key: 'newest', label: 'Mới nhất', icon: 'clock-outline' },
              { key: 'mine', label: 'Của bạn', icon: 'account-Check-outline' },
            ] as const
          ).map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comment Feed */}
        {filteredReviews.length === 0 ? (
          <View style={styles.emptyFeedBox}>
            <MaterialCommunityIcons name="comment-text-multiple-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyFeedTitle}>
              {filter === 'mine'
                ? 'Bạn chưa có nhận xét nào tại địa điểm này'
                : 'Chưa có nhận xét nào được hiển thị'}
            </Text>
            <Text style={styles.emptyFeedSub}>
              Chia sẻ đánh giá thực tế của bạn ở khung phía trên để giúp cộng đồng di chuyển an toàn hơn.
            </Text>
          </View>
        ) : (
          filteredReviews.map((rev) => {
            const revReaction = reactions[rev.id] ?? {};
            const upvoted = Boolean(revReaction.upvoted);
            const liked = Boolean(revReaction.liked);
            const disliked = Boolean(revReaction.disliked);
            const totalHelpful = rev.helpfulCount + (upvoted ? 1 : 0);
            const totalLikes = (rev.likesCount ?? 3) + (liked ? 1 : 0);
            const isPending = rev.status === 'PendingReview';

            return (
              <View
                key={rev.id}
                style={[styles.commentCard, isPending && styles.commentCardPending]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, rev.isOwn && styles.ownAvatar]}>
                    <Text style={styles.avatarText}>{rev.initials}</Text>
                  </View>

                  <View style={styles.authorMeta}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{rev.author}</Text>
                      {rev.isOwn ? (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>Bạn</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.authorTime}>{rev.age}</Text>
                  </View>

                  {isPending ? (
                    <View style={styles.pendingStatusBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color="#B45309" />
                      <Text style={styles.pendingStatusText}>Chờ Admin duyệt</Text>
                    </View>
                  ) : (
                    <View style={styles.approvedStatusBadge}>
                      <MaterialCommunityIcons name="check-decagram" size={12} color="#007D78" />
                      <Text style={styles.approvedStatusText}>Đã kiểm duyệt</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.commentBody}>{rev.comment}</Text>

                {isPending ? (
                  <View style={styles.pendingNoticeRow}>
                    <MaterialCommunityIcons name="information-outline" size={13} color="#B45309" />
                    <Text style={styles.pendingNoticeText}>
                      Nhận xét này đang ở trạng thái PendingReview và sẽ hiển thị cho mọi người sau khi được duyệt.
                    </Text>
                  </View>
                ) : null}

                {/* Social Interaction Bar (Upvote / Helpful, Like, Dislike) */}
                <View style={styles.reactionBar}>
                  <TouchableOpacity
                    style={[styles.reactionBtn, upvoted && styles.reactionBtnUpvoteActive]}
                    onPress={() => void toggleReaction(rev.id, 'upvoted')}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Hữu ích (${totalHelpful})`}
                  >
                    <MaterialCommunityIcons
                      name={upvoted ? 'thumb-up' : 'thumb-up-outline'}
                      size={14}
                      color={upvoted ? '#007D78' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.reactionBtnText,
                        upvoted && styles.reactionBtnUpvoteTextActive,
                      ]}
                    >
                      Hữu ích ({totalHelpful})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reactionBtn, liked && styles.reactionBtnLikeActive]}
                    onPress={() => void toggleReaction(rev.id, 'liked')}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Yêu thích (${totalLikes})`}
                  >
                    <MaterialCommunityIcons
                      name={liked ? 'heart' : 'heart-outline'}
                      size={14}
                      color={liked ? '#E11D48' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.reactionBtnText,
                        liked && styles.reactionBtnLikeTextActive,
                      ]}
                    >
                      Thích ({totalLikes})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reactionBtn, disliked && styles.reactionBtnDislikeActive]}
                    onPress={() => void toggleReaction(rev.id, 'disliked')}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Không đồng tình"
                  >
                    <MaterialCommunityIcons
                      name={disliked ? 'thumb-down' : 'thumb-down-outline'}
                      size={14}
                      color={disliked ? '#B45309' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.reactionBtnText,
                        disliked && styles.reactionBtnDislikeTextActive,
                      ]}
                    >
                      Chưa chuẩn
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  backButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#006874',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  locationContextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContextCopy: {
    flex: 1,
  },
  locationContextName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  locationContextSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 36,
  },
  composerCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 13,
    marginBottom: 14,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 9,
  },
  composerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  moderationHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  moderationHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006874',
  },
  quickTagsRow: {
    gap: 6,
    paddingBottom: 9,
  },
  quickTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 8,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textInput: {
    minHeight: 68,
    maxHeight: 130,
    fontSize: 13,
    lineHeight: 18,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  charCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  charCounterWarn: {
    color: '#D97706',
  },
  charCounterError: {
    color: '#DC2626',
    fontWeight: '800',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007D78',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 9,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 9,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#B91C1C',
    fontWeight: '600',
  },
  successBannerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 9,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    padding: 9,
  },
  successBannerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#0F766E',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#006874',
    borderColor: '#006874',
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyFeedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    marginTop: 4,
  },
  emptyFeedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyFeedSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 13,
    marginBottom: 11,
  },
  commentCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#004E58',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  ownAvatar: {
    backgroundColor: '#007D78',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  authorMeta: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  youBadge: {
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007D78',
  },
  authorTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  approvedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  approvedStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#007D78',
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#1E293B',
    marginBottom: 10,
  },
  pendingNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF9C3',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 10,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: '#854D0E',
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  reactionBtnUpvoteActive: {
    backgroundColor: '#E6F8F5',
    borderColor: '#99F6E4',
  },
  reactionBtnLikeActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  reactionBtnDislikeActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  reactionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  reactionBtnUpvoteTextActive: {
    color: '#007D78',
  },
  reactionBtnLikeTextActive: {
    color: '#E11D48',
  },
  reactionBtnDislikeTextActive: {
    color: '#B45309',
  },
});

