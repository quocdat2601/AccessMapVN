import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EvidenceItem } from './types';

interface EvidenceGallerySectionProps {
  evidence: EvidenceItem[];
  onAddEvidence?: () => void;
  onViewAll?: () => void;
  showDemoContent?: boolean;
  isVerified?: boolean;
}

function getFallbackSpec(item: EvidenceItem | undefined, isVerified: boolean): { tag: string; icon: string } | null {
  if (!item) {
    return {
      icon: 'slope-uphill',
      tag: isVerified ? 'Độ dốc 1:12 đạt chuẩn QCVN 10' : 'Độ dốc 1:12 đạt chuẩn',
    };
  }
  if (item.specTag) {
    return { tag: item.specTag, icon: item.specIcon || 'check-circle-outline' };
  }
  if (item.title === 'Cửa vào') {
    return { tag: 'Cửa ra vào rộng rãi', icon: 'door-open' };
  }
  if (item.title === 'Ram dốc') {
    return {
      icon: 'slope-uphill',
      tag: isVerified ? 'Độ dốc 1:12 đạt chuẩn QCVN 10' : 'Độ dốc 1:12 đạt chuẩn',
    };
  }
  return null;
}

function EvidenceIllustration() {
  return (
    <View style={styles.illustration}>
      <Svg width="100%" height="100%" viewBox="0 0 320 150">
        <Rect width="320" height="150" fill="#dce9e7" />
        <Rect x="30" y="24" width="260" height="90" rx="4" fill="#98aaa8" />
        <Rect x="46" y="39" width="96" height="75" fill="#5b716f" />
        <Rect x="160" y="39" width="112" height="75" fill="#718886" />
        <Rect x="77" y="48" width="36" height="66" fill="#d9e5e3" />
        <Path d="M 12 128 L 206 105 L 308 105 L 308 139 L 12 139 Z" fill="#f6f7f6" />
        <Path d="M 24 126 L 207 105" stroke="#006874" strokeWidth="4" />
        <Path d="M 24 136 L 209 114" stroke="#006874" strokeWidth="4" />
        <Path d="M 24 126 L 24 141 M 64 121 L 64 136 M 104 116 L 104 132 M 144 112 L 144 127 M 184 107 L 184 122" stroke="#006874" strokeWidth="2" />
      </Svg>
    </View>
  );
}

export function EvidenceGallerySection({
  evidence = [],
  onAddEvidence,
  onViewAll,
  showDemoContent = false,
  isVerified = false,
}: EvidenceGallerySectionProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<FlatList<EvidenceItem>>(null);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  const hasItems = evidence.length > 0 || showDemoContent;
  const activeIndex = previewIndex ?? 0;
  const currentPreviewItem = previewIndex !== null ? (evidence[activeIndex] ?? evidence[0] ?? null) : null;

  const isMulti = evidence.length > 1;
  const cardWidth = isMulti
    ? Math.min(248, Math.round(windowWidth * 0.66))
    : Math.max(240, windowWidth - 40);

  useEffect(() => {
    setFailedThumbs({});
  }, [evidence]);

  const markThumbFailed = (id: string) => {
    setFailedThumbs((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  const handleOpenPreview = (index = 0) => {
    if (evidence.length > 0) {
      const safeIndex = Math.max(0, Math.min(index, evidence.length - 1));
      setPreviewIndex(safeIndex);
    } else if (onViewAll) {
      onViewAll();
    } else if (onAddEvidence) {
      onAddEvidence();
    }
  };

  const scrollToSlide = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= evidence.length) return;
    setPreviewIndex(nextIdx);
    pagerRef.current?.scrollToIndex({ index: nextIdx, animated: true });
  };

  const handlePlayVideo = (item: EvidenceItem) => {
    const targetUrl = item.videoUrl || item.imageUrl;
    if (!targetUrl) return;
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      void WebBrowser.openBrowserAsync(targetUrl);
    } else {
      Alert.alert(
        'Video đang chờ đồng bộ',
        'Video cục bộ sẽ phát trực tuyến sau khi hồ sơ hoàn tất tải lên.'
      );
    }
  };

  const renderDemoCard = () => {
    const spec = getFallbackSpec(undefined, isVerified);
    return (
      <Pressable
        style={({ pressed }) => [styles.featuredCard, { width: Math.max(240, windowWidth - 40) }, pressed && styles.cardPressed]}
        onPress={() => handleOpenPreview(0)}
        accessibilityRole="button"
        accessibilityLabel="Xem minh chứng địa điểm"
      >
        <View style={styles.imageWrapper}>
          <EvidenceIllustration />
          {spec ? (
            <View style={styles.specTag}>
              <MaterialCommunityIcons name={spec.icon as any} size={11} color="#FFFFFF" />
              <Text style={styles.specTagText}>{spec.tag}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoTextContainer}>
            <Text style={styles.photoTitle} numberOfLines={1}>
              {isVerified ? 'Ram dốc & Lối vào tiếp cận chuẩn' : 'Ram dốc lối Pasteur'}
            </Text>
            <Text style={styles.photoSub} numberOfLines={1}>
              {isVerified
                ? 'Bằng chứng gần nhất · Đã xác thực bởi chuyên viên'
                : 'Bằng chứng gần nhất · 96 ngày trước · Mai Anh'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEvidenceCard = (item: EvidenceItem, index: number) => {
    const isVideo = item.mediaType === 'video';
    const thumbUri = isVideo ? item.thumbnailUrl : item.imageUrl;
    const showThumbImage = Boolean(thumbUri) && !failedThumbs[item.id];
    const spec = getFallbackSpec(item, isVerified);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.featuredCard,
          { width: cardWidth },
          pressed && styles.cardPressed,
        ]}
        onPress={() => handleOpenPreview(index)}
        accessibilityRole="button"
        accessibilityLabel={`${isVideo ? 'Xem video' : 'Xem ảnh'} ${item.title}`}
      >
        <View style={[styles.imageWrapper, isVideo && styles.videoWrapperBg]}>
          {showThumbImage ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.bannerImage}
              contentFit="cover"
              transition={150}
              onError={() => markThumbFailed(item.id)}
            />
          ) : isVideo ? (
            <View style={styles.videoFallbackBg} />
          ) : (
            <EvidenceIllustration />
          )}

          {isVideo ? (
            <>
              <View style={styles.videoPill}>
                <MaterialCommunityIcons name="video-outline" size={12} color="#FFFFFF" />
                <Text style={styles.videoPillText}>Video</Text>
              </View>
              <View style={styles.centerPlayBadge}>
                <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
              </View>
            </>
          ) : null}

          {item.isFaceBlurred ? (
            <View style={styles.blurTag}>
              <MaterialCommunityIcons name="eye-off-outline" size={11} color="#FFFFFF" />
              <Text style={styles.blurTagText}>Mặt đã làm mờ</Text>
            </View>
          ) : null}

          {spec ? (
            <View style={styles.specTag}>
              <MaterialCommunityIcons name={spec.icon as any} size={11} color="#FFFFFF" />
              <Text style={styles.specTagText} numberOfLines={1}>{spec.tag}</Text>
            </View>
          ) : null}

          {isMulti ? (
            <View style={styles.indexPill}>
              <Text style={styles.indexPillText}>{index + 1}/{evidence.length}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoTextContainer}>
            <Text style={styles.photoTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.photoSub} numberOfLines={1}>
              {item.subtitle || 'Đã công bố'}
            </Text>
          </View>
          <View style={[styles.ageBadge, (isVerified || item.badge === 'Đã công bố') && styles.ageBadgeVerified]}>
            <Text
              style={[
                styles.ageBadgeText,
                (isVerified || item.badge === 'Đã công bố') && styles.ageBadgeTextVerified,
              ]}
            >
              {isVideo ? 'Phát' : 'Xem'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingLeft}>
          <MaterialCommunityIcons name="camera-outline" size={17} color="#006874" />
          <Text style={styles.headingTitle} numberOfLines={1}>Ảnh & bằng chứng</Text>
          {showDemoContent ? (
            <Text style={[styles.newBadgeText, isVerified && styles.newBadgeVerified]}>
              {isVerified ? '3 ảnh thẩm định' : '3 ảnh mới'}
            </Text>
          ) : (
            <Text style={styles.newBadgeText}>{evidence.length}</Text>
          )}
        </View>

        {hasItems ? (
          <Pressable
            onPress={() => handleOpenPreview(0)}
            hitSlop={10}
            style={({ pressed }) => [styles.viewAllBtn, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Xem tất cả ảnh và video"
          >
            <Text style={styles.viewAllText}>
              {showDemoContent ? 'Xem tất cả (28)' : `Xem tất cả (${evidence.length})`}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color="#006874" />
          </Pressable>
        ) : (
          <Pressable
            onPress={onAddEvidence}
            hitSlop={10}
            style={({ pressed }) => [styles.viewAllBtn, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel="Đóng góp ảnh"
          >
            <Text style={styles.viewAllText}>Đóng góp ảnh</Text>
            <MaterialCommunityIcons name="plus" size={14} color="#006874" />
          </Pressable>
        )}
      </View>

      {!hasItems ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="camera-plus-outline" size={22} color="#007D78" />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Chưa có ảnh hoặc bằng chứng</Text>
            <Text style={styles.emptyText}>Hãy đóng góp ảnh hoặc bằng chứng tiếp cận cho địa điểm này.</Text>
          </View>
        </View>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          style={styles.carouselScroll}
          contentContainerStyle={styles.carouselContent}
        >
          {evidence.length > 0
            ? evidence.map((item, idx) => renderEvidenceCard(item, idx))
            : renderDemoCard()}
        </ScrollView>
      )}

      {/* Fullscreen Swipeable Photo & Video Lightbox Modal */}
      {previewIndex !== null && currentPreviewItem && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewIndex(null)}
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 12) }]}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleBox}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {currentPreviewItem.title || 'Bằng chứng tiếp cận'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {evidence.length > 1
                      ? `${activeIndex + 1}/${evidence.length} · ${currentPreviewItem.subtitle || 'Đã xác thực'}`
                      : currentPreviewItem.subtitle || 'Đã xác thực'}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.cardPressed]}
                  onPress={() => setPreviewIndex(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng xem bằng chứng"
                >
                  <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            <View style={styles.modalBody}>
              <FlatList
                ref={pagerRef}
                data={evidence}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                initialScrollIndex={Math.max(0, Math.min(previewIndex, evidence.length - 1))}
                getItemLayout={(_, index) => ({
                  length: windowWidth,
                  offset: windowWidth * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, windowWidth));
                  if (next >= 0 && next < evidence.length) {
                    setPreviewIndex(next);
                  }
                }}
                renderItem={({ item }) => {
                  const isVideo = item.mediaType === 'video';
                  const slideUri = isVideo ? item.thumbnailUrl : item.imageUrl;
                  const hasSlideImage = Boolean(slideUri) && !failedThumbs[item.id];

                  return (
                    <View style={[styles.lightboxSlide, { width: windowWidth }]}>
                      {hasSlideImage ? (
                        <Image
                          source={{ uri: slideUri }}
                          style={styles.modalImage}
                          contentFit="contain"
                          onError={() => markThumbFailed(item.id)}
                        />
                      ) : isVideo ? (
                        <View style={styles.modalVideoEmpty}>
                          <MaterialCommunityIcons name="video-outline" size={56} color="#94A3B8" />
                        </View>
                      ) : (
                        <EvidenceIllustration />
                      )}

                      {isVideo ? (
                        <Pressable
                          style={({ pressed }) => [styles.playVideoCta, pressed && styles.cardPressed]}
                          onPress={() => handlePlayVideo(item)}
                          accessibilityRole="button"
                          accessibilityLabel="Xem video thực địa"
                        >
                          <MaterialCommunityIcons name="play-circle" size={22} color="#FFFFFF" />
                          <Text style={styles.playVideoCtaText}>Xem video</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                }}
              />

              {evidence.length > 1 && activeIndex > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.navArrow, styles.navArrowLeft, pressed && styles.cardPressed]}
                  onPress={() => scrollToSlide(activeIndex - 1)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Bằng chứng trước"
                >
                  <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
                </Pressable>
              )}

              {evidence.length > 1 && activeIndex < evidence.length - 1 && (
                <Pressable
                  style={({ pressed }) => [styles.navArrow, styles.navArrowRight, pressed && styles.cardPressed]}
                  onPress={() => scrollToSlide(activeIndex + 1)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Bằng chứng tiếp theo"
                >
                  <MaterialCommunityIcons name="chevron-right" size={28} color="#FFFFFF" />
                </Pressable>
              )}
            </View>

            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.modalFooterContent}>
                {currentPreviewItem.specTag ? (
                  <View style={styles.modalSpecBadge}>
                    <MaterialCommunityIcons
                      name={(currentPreviewItem.specIcon as any) || 'check-circle-outline'}
                      size={14}
                      color="#2DD4BF"
                    />
                    <Text style={styles.modalSpecText}>{currentPreviewItem.specTag}</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                {onAddEvidence && (
                  <Pressable
                    style={({ pressed }) => [styles.modalAddBtn, pressed && styles.cardPressed]}
                    onPress={() => {
                      setPreviewIndex(null);
                      onAddEvidence();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Đóng góp thêm ảnh"
                  >
                    <MaterialCommunityIcons name="camera-plus-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.modalAddBtnText}>Đóng góp thêm</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  headingTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  newBadgeText: {
    fontSize: 10.5,
    color: '#006874',
    backgroundColor: '#E8FAF6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    fontWeight: '700',
    overflow: 'hidden',
  },
  newBadgeVerified: {
    backgroundColor: '#E6F8F5',
    color: '#007D78',
    fontWeight: '800',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flexShrink: 0,
    minHeight: 32,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
  },
  carouselScroll: {
    marginHorizontal: -20,
  },
  carouselContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.85,
  },
  emptyState: {
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
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 152,
    backgroundColor: '#DCE9E7',
    position: 'relative',
  },
  videoWrapperBg: {
    backgroundColor: '#0F172A',
  },
  videoFallbackBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  illustration: {
    ...StyleSheet.absoluteFill,
  },
  videoPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  videoPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  centerPlayBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  blurTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  blurTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  specTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 78, 88, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  indexPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  indexPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  photoSub: {
    fontSize: 11,
    color: '#64748B',
  },
  ageBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ageBadgeVerified: {
    backgroundColor: '#E6F8F5',
  },
  ageBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  ageBadgeTextVerified: {
    color: '#007D78',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.96)',
    justifyContent: 'space-between',
  },
  modalHeader: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitleBox: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  lightboxSlide: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalVideoEmpty: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playVideoCta: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 125, 120, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playVideoCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  navArrow: {
    position: 'absolute',
    zIndex: 10,
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  modalFooter: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  modalFooterContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalSpecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: 'rgba(45, 212, 191, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 1,
  },
  modalSpecText: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    backgroundColor: '#007D78',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
