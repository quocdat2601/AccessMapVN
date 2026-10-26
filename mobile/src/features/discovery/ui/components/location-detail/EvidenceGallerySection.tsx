import React, { useState } from 'react';
import { Image, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const hasItems = evidence.length > 0 || showDemoContent;
  const firstItem = evidence[0];
  const currentPreviewItem = previewIndex !== null ? evidence[previewIndex] ?? firstItem : null;

  const handleOpenPreview = () => {
    if (onViewAll) {
      onViewAll();
    } else if (evidence.length > 0) {
      setPreviewIndex(0);
    } else if (onAddEvidence) {
      onAddEvidence();
    }
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
          <TouchableOpacity
            onPress={handleOpenPreview}
            hitSlop={8}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>
              {showDemoContent ? 'Xem tất cả (28)' : `Xem tất cả (${evidence.length})`}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color="#006874" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onAddEvidence}
            hitSlop={8}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>Đóng góp ảnh</Text>
            <MaterialCommunityIcons name="plus" size={14} color="#006874" />
          </TouchableOpacity>
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
        /* Featured Big Photo Banner */
        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={firstItem?.imageUrl ? 0.88 : 1}
          onPress={() => {
            if (firstItem?.imageUrl) {
              setPreviewIndex(0);
            } else {
              handleOpenPreview();
            }
          }}
        >
          <View style={styles.imageWrapper}>
            {firstItem?.imageUrl ? (
              <Image
                source={{ uri: firstItem.imageUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <EvidenceIllustration />
            )}

            {/* Badges on the image */}
            {firstItem?.isFaceBlurred ? (
              <View style={styles.blurTag}>
                <MaterialCommunityIcons name="eye-off-outline" size={11} color="#FFFFFF" />
                <Text style={styles.blurTagText}>Mặt đã làm mờ</Text>
              </View>
            ) : null}

            {firstItem?.specTag ? (
              <View style={styles.specTag}>
                <MaterialCommunityIcons name={(firstItem.specIcon as any) || 'check-circle-outline'} size={11} color="#FFFFFF" />
                <Text style={styles.specTagText}>{firstItem.specTag}</Text>
              </View>
            ) : firstItem ? (
              firstItem.title === 'Cửa vào' ? (
                <View style={styles.specTag}>
                  <MaterialCommunityIcons name="door-open" size={11} color="#FFFFFF" />
                  <Text style={styles.specTagText}>Cửa ra vào rộng rãi</Text>
                </View>
              ) : firstItem.title === 'Ram dốc' ? (
                <View style={styles.specTag}>
                  <MaterialCommunityIcons name="slope-uphill" size={11} color="#FFFFFF" />
                  <Text style={styles.specTagText}>
                    {isVerified ? 'Độ dốc 1:12 đạt chuẩn QCVN 10' : 'Độ dốc 1:12 đạt chuẩn'}
                  </Text>
                </View>
              ) : null
            ) : (
              <View style={styles.specTag}>
                <MaterialCommunityIcons name="slope-uphill" size={11} color="#FFFFFF" />
                <Text style={styles.specTagText}>
                  {isVerified ? 'Độ dốc 1:12 đạt chuẩn QCVN 10' : 'Độ dốc 1:12 đạt chuẩn'}
                </Text>
              </View>
            )}

          </View>

          {/* Info below image */}
          <View style={styles.infoRow}>
            <View style={styles.infoTextContainer}>
              <Text style={styles.photoTitle}>
                {firstItem?.title ?? (isVerified ? 'Ram dốc & Lối vào tiếp cận chuẩn' : 'Ram dốc lối Pasteur')}
              </Text>
              <Text style={styles.photoSub}>
                {firstItem
                  ? `Bằng chứng gần nhất • ${firstItem.subtitle}`
                  : isVerified
                  ? 'Bằng chứng gần nhất • Vừa xác thực • Bởi Chuyên viên Thẩm định'
                  : 'Bằng chứng gần nhất • 96 ngày trước • Bởi Mai Anh'}
              </Text>
            </View>
            <View style={[styles.ageBadge, isVerified && styles.ageBadgeVerified]}>
              <MaterialCommunityIcons
                name={isVerified ? 'check-decagram-outline' : 'history'}
                size={12}
                color={isVerified ? '#007D78' : '#B45309'}
              />
              <Text style={[styles.ageBadgeText, isVerified && styles.ageBadgeTextVerified]}>
                {firstItem?.subtitle ?? (isVerified ? 'Đã xác thực' : '96 ngày trước')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {currentPreviewItem?.imageUrl && (
        <Modal
          visible={previewIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewIndex(null)}
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            {/* Top Bar */}
            <SafeAreaView style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleBox}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {currentPreviewItem.title || 'Ảnh bằng chứng tiếp cận'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {evidence.length > 1
                      ? `${(previewIndex ?? 0) + 1}/${evidence.length} • ${currentPreviewItem.subtitle || 'Đã xác thực'}`
                      : currentPreviewItem.subtitle || 'Đã xác thực'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setPreviewIndex(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng xem ảnh"
                >
                  <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Central Photo View */}
            <View style={styles.modalBody}>
              {evidence.length > 1 && (previewIndex ?? 0) > 0 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.navArrowLeft]}
                  onPress={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="chevron-left" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              <Image
                source={{ uri: currentPreviewItem.imageUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />

              {evidence.length > 1 && (previewIndex ?? 0) < evidence.length - 1 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.navArrowRight]}
                  onPress={() =>
                    setPreviewIndex((prev) =>
                      prev !== null && prev < evidence.length - 1 ? prev + 1 : prev
                    )
                  }
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="chevron-right" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom info & actions */}
            <SafeAreaView style={styles.modalFooter}>
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
                  <TouchableOpacity
                    style={styles.modalAddBtn}
                    onPress={() => {
                      setPreviewIndex(null);
                      onAddEvidence();
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="camera-plus-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.modalAddBtnText}>Đóng góp thêm ảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
            </SafeAreaView>
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
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
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
    height: 140,
    backgroundColor: '#DCE9E7',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  illustration: {
    ...StyleSheet.absoluteFill,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 78, 88, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    gap: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  photoSub: {
    fontSize: 11,
    color: '#64748B',
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  ageBadgeVerified: {
    backgroundColor: '#E6F8F5',
  },
  ageBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
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
    paddingVertical: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 8,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  navArrow: {
    position: 'absolute',
    zIndex: 10,
    top: '50%',
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingVertical: 12,
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
