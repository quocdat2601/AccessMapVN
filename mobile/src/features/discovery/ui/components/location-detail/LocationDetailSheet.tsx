/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are intentionally mutated in gesture worklets. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/shared/theme';
import { loadContributionRecords } from '@/entities/contribution';
import { useAuth } from '@/features/auth';
import {
  castCommunityVote,
  FeatureVerificationModal,
  fetchCommunityComments,
  type AccessibilityFeatureType,
  type CommunityFeatureInput,
  type SubmittedObservation,
} from '@/features/community';
import { ReportFormModal, type ReportFormData, type ReportSummary } from '@/features/reports';
import type { PlaceDto } from '../../../model';
import { AccessibilitySummary } from './AccessibilitySummary';
import { CommunityReviewsSection } from './CommunityReviewsSection';
import { ContributionCTA } from './ContributionCTA';
import { EvidenceGallerySection } from './EvidenceGallerySection';
import { LocationHeader } from './LocationHeader';
import type { AccessibilityDetailFeature, CommunityReview, EvidenceItem } from './types';

interface LocationDetailSheetProps {
  place: PlaceDto;
  userLatitude?: number | null;
  userLongitude?: number | null;
  onClose: () => void;
  onContribute?: (place: PlaceDto) => void;
  onReportIssue?: (place: PlaceDto) => void;
}

type SheetSnap = 'expanded' | 'collapsed' | 'peek';

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 220,
  mass: 0.85,
};

function formatCategory(category: string): string {
  const map: Record<string, string> = {
    parking: 'Bãi đỗ xe',
    gps: 'Vị trí hiện tại',
    hospital: 'Bệnh viện / Y tế',
    clinic: 'Phòng khám',
    pharmacy: 'Nhà thuốc',
    cafe: 'Quán Cà phê',
    restaurant: 'Nhà hàng / Quán ăn',
    fast_food: 'Đồ ăn nhanh',
    mall: 'TT Thương mại',
    market: 'Cửa hàng / Siêu thị',
    supermarket: 'Siêu thị',
    convenience: 'Cửa hàng tiện lợi',
    hotel: 'Khách sạn / Lưu trú',
    transit: 'Giao thông công cộng',
    town_hall: 'Cơ quan hành chính',
    government: 'Cơ quan nhà nước',
    school: 'Giáo dục / Trường học',
    bank: 'Ngân hàng / ATM',
    other: 'Địa điểm công cộng',
  };
  return map[category?.toLowerCase()] ?? category ?? 'Địa điểm';
}

function calculateDistance(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): string | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 1) return `Cách ${Math.round(d * 1000)} m`;
  return `Cách ${d.toFixed(1)} km`;
}

export function LocationDetailSheet({
  place,
  userLatitude,
  userLongitude,
  onClose,
  onContribute,
  onReportIssue,
}: LocationDetailSheetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const sheetWidth = isTablet ? Math.min(windowWidth - 48, 580) : windowWidth;
  const sheetHeight = Math.min(Math.max(windowHeight * 0.78, 520), windowHeight * 0.9);
  const collapsedOffset = Math.round(sheetHeight * 0.38);
  const peekOffset = Math.max(sheetHeight - 88, collapsedOffset);

  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(collapsedOffset);
  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const [showReportForm, setShowReportForm] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [reportInitialFeature, setReportInitialFeature] = useState<AccessibilityFeatureType | undefined>(undefined);
  const [reportInitialData, setReportInitialData] = useState<ReportFormData | undefined>(undefined);
  const [verificationRefreshKey, setVerificationRefreshKey] = useState(0);

  const isUnrated =
    place.accessibility_score == null ||
    Number(place.accessibility_score) < 0 ||
    isNaN(Number(place.accessibility_score));

  const rawScore = Number(place.accessibility_score);
  const trustPercent = isUnrated
    ? 0
    : Math.round(rawScore > 1 ? Math.min(rawScore, 100) : Math.max(rawScore * 100, 0));

  const [currentTimestamp] = useState(() => Date.now());
  const isRecentVerified = useMemo(() => {
    if (!place.last_verified_at) return false;
    const diffDays = (currentTimestamp - new Date(place.last_verified_at).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 90;
  }, [place.last_verified_at, currentTimestamp]);

  const isDemo2 = place.id === '70000000-0000-0000-0000-000000000002';
  const isDemo1 = place.id === '70000000-0000-0000-0000-000000000001';
  const isFullyVerified = isDemo2 || (!isDemo1 && !isUnrated && trustPercent >= 75 && isRecentVerified);

  const distanceStr = useMemo(
    () => calculateDistance(userLatitude, userLongitude, place.lat, place.lng),
    [userLatitude, userLongitude, place.lat, place.lng]
  );

  const localizedCategory = useMemo(() => formatCategory(place.category), [place.category]);

  const features = useMemo<AccessibilityDetailFeature[]>(() => {
    const values = place.legacy_feature_values;
    if (!values) return [];

    const definitions: (Omit<AccessibilityDetailFeature, 'publishedStatus' | 'status'> & {
      value: boolean | null;
    })[] = [
      { id: 'ramp', featureType: 'Ramp', icon: 'slope-uphill', label: 'Ram dốc lối vào', description: 'Tiếp cận lối vào bằng ram dốc', value: values.ramp },
      { id: 'door', featureType: 'EntranceDoor', icon: 'door', label: 'Cửa ra vào tiếp cận', description: 'Độ rộng và ngưỡng cửa phù hợp', value: values.entranceDoor },
      { id: 'elevator', featureType: 'Elevator', icon: 'elevator-passenger', label: 'Thang máy tiếp cận', description: 'Thang máy dành cho lộ trình tiếp cận', value: values.elevator },
      { id: 'toilet', featureType: 'AccessibleRestroom', icon: 'toilet', label: 'Nhà vệ sinh tiếp cận', description: 'Không gian và tay vịn hỗ trợ', value: values.accessibleRestroom },
      { id: 'tactile', featureType: 'TactilePaving', icon: 'dots-grid', label: 'Gạch dẫn hướng xúc giác', description: 'Dẫn hướng cho người khiếm thị', value: values.tactilePaving },
    ];

    // WF-02 reads its truth from published LocationFeature rows. Keeping this
    // catalogue lets a published feature appear even if the old boolean is null.
    return definitions.map(({ value, ...definition }) => ({
      ...definition,
      publishedStatus: value == null ? 'Unknown' : value ? 'Available' : 'NotAvailable',
      status: value ? 'Có sẵn' : 'Không có',
    }));
  }, [place]);

  const hasPublishedAccessibilityInfo =
    !isUnrated && features.some((feature) => feature.publishedStatus !== 'Unknown');
  const hasDemoCommunityContent = isDemo1 || isDemo2;
  const publishedFeaturesCount = useMemo(() => {
    if (hasDemoCommunityContent) return features.length;
    return features.filter((feature) => feature.publishedStatus === 'Available').length;
  }, [hasDemoCommunityContent, features]);
  const showVerificationSection =
    !isFullyVerified && (hasDemoCommunityContent || (hasPublishedAccessibilityInfo && publishedFeaturesCount > 0));

  const handleRequestReportFromFeature = useCallback(
    (feature: CommunityFeatureInput, editingData?: SubmittedObservation['reportData']) => {
      if (!user) {
        Alert.alert('Cần đăng nhập', 'Bạn cần đăng nhập để gửi báo cáo.', [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => router.push('/login') },
        ]);
        return;
      }
      setShowVerificationModal(false);
      setReportInitialFeature(feature.featureType);
      setReportInitialData(
        editingData
          ? {
              reason: (editingData.reason as any) ?? 'Changed',
              description: editingData.description ?? '',
              featureIds: editingData.featureIds ?? [],
              imageUri: editingData.imageUri,
            }
          : undefined
      );
      setShowReportForm(true);
    },
    [router, user]
  );

  const handleReportCreated = useCallback(
    async (
      report: ReportSummary,
      primaryFeatureType?: AccessibilityFeatureType,
      formData?: ReportFormData
    ) => {
      Alert.alert('Đã gửi báo cáo', 'Báo cáo mâu thuẫn đã được ghi nhận. Bạn có thể chỉnh sửa trong vòng 30 phút.');

      if (primaryFeatureType && formData) {
        try {
          await castCommunityVote(
            place.id,
            primaryFeatureType,
            {
              voteType: 'Changed',
              observedFeatureVersion: 1,
              comment: formData.description,
            },
            user?.id ?? 'anon'
          );
        } catch {}

        const storageKey = `@accessmap_vote_${user?.id ?? 'anon'}_${place.id}_${primaryFeatureType}`;
        const observation: SubmittedObservation = {
          voteType: 'Changed',
          proposedStatus: 'Limited',
          comment: formData.description,
          reportId: report.id,
          reportData: formData,
          submittedAt: Date.now(),
        };
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(observation));
        } catch {}
      }

      setVerificationRefreshKey((k) => k + 1);
      setShowVerificationModal(true);
    },
    [place.id, user]
  );

  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);

  useEffect(() => {
    let isMounted = true;
    function getEvidenceTitle(featureTags?: string[]): string {
      if (!featureTags || featureTags.length === 0) return 'Ảnh khảo sát';
      if (featureTags.includes('exterior_ramp_present')) return 'Ram dốc';
      if (featureTags.includes('door_width_ok')) return 'Cửa vào';
      if (featureTags.includes('elevator_present')) return 'Thang máy';
      if (featureTags.includes('accessible_restroom')) return 'Nhà vệ sinh';
      return 'Ảnh khảo sát';
    }

    async function loadEvidence() {
      const items: EvidenceItem[] = [];
      const seenUrls = new Set<string>();

      try {
        const localRecords = await loadContributionRecords();
        localRecords
          .filter((r) => r.locationId === place.id && r.mediaUri)
          .forEach((r) => {
            if (!seenUrls.has(r.mediaUri)) {
              seenUrls.add(r.mediaUri);
              items.push({
                id: r.id,
                title: getEvidenceTitle(r.featureTags),
                subtitle: new Date(r.createdAt).toLocaleDateString('vi-VN'),
                badge: 'Đã xác thực',
                imageUrl: r.mediaUri,
              });
            }
          });
      } catch {}

      if (isMounted) {
        setEvidenceList(items);
      }
    }

    async function loadComments() {
      try {
        const items = await fetchCommunityComments(place.id);
        if (isMounted && items && items.length > 0) {
          const mapped: CommunityReview[] = items.map((c) => {
            const author = c.authorLabel || 'Cộng đồng';
            const initials = author.slice(0, 2).toUpperCase();
            const date = new Date(c.createdAt);
            const age = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
            return {
              id: c.id,
              author,
              initials,
              age,
              helpfulCount: Math.max(1, Math.round((c.recencyWeight || 1) * 10)),
              comment: c.body,
            };
          });
          setCommunityReviews(mapped);
          return;
        }
      } catch {}

      if (isMounted) {
        setCommunityReviews([]);
      }
    }

    void loadEvidence();
    void loadComments();

    return () => {
      isMounted = false;
    };
  }, [place.id]);

  // Slide up from bottom when place changes
  useEffect(() => {
    translateY.value = sheetHeight;
    translateY.value = withTiming(collapsedOffset, { duration: 380 });
    setSnap('collapsed');
  }, [place.id, collapsedOffset, sheetHeight, translateY]);

  const setSnapFromAnimation = useCallback((nextSnap: SheetSnap) => {
    setSnap(nextSnap);
  }, []);

  const snapTo = (nextSnap: SheetSnap) => {
    const target = nextSnap === 'expanded' ? 0 : nextSnap === 'peek' ? peekOffset : collapsedOffset;
    translateY.value = withSpring(target, SPRING_CONFIG);
    setSnap(nextSnap);
  };

  const dismissSheet = useCallback(() => {
    translateY.value = withTiming(sheetHeight, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [onClose, sheetHeight, translateY]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          translateY.value = Math.min(
            peekOffset,
            Math.max(0, dragStartY.value + event.translationY)
          );
        })
        .onEnd((event) => {
          const projected = translateY.value + event.velocityY * 0.12;
          const shouldDismiss =
            projected > peekOffset + 60 ||
            (event.velocityY > 1100 && translateY.value > collapsedOffset);

          if (shouldDismiss) {
            translateY.value = withTiming(sheetHeight, { duration: 220 }, (finished) => {
              if (finished) runOnJS(onClose)();
            });
            return;
          }

          const candidates: { snap: SheetSnap; value: number }[] = [
            { snap: 'expanded', value: 0 },
            { snap: 'collapsed', value: collapsedOffset },
            { snap: 'peek', value: peekOffset },
          ];
          let nearest = candidates[0];
          for (const candidate of candidates) {
            if (Math.abs(candidate.value - projected) < Math.abs(nearest.value - projected)) {
              nearest = candidate;
            }
          }
          translateY.value = withSpring(nearest.value, SPRING_CONFIG);
          runOnJS(setSnapFromAnimation)(nearest.snap);
        }),
    [collapsedOffset, dragStartY, onClose, peekOffset, setSnapFromAnimation, sheetHeight, translateY]
  );

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    width: sheetWidth,
  }));

  return (
    <Animated.View style={[styles.sheet, { height: sheetHeight }, animatedSheetStyle]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragArea}>
          <TouchableOpacity
            style={styles.handleButton}
            onPress={() => snapTo(snap === 'expanded' ? 'collapsed' : 'expanded')}
            accessibilityRole="adjustable"
            accessibilityLabel="Kéo để thay đổi chiều cao chi tiết địa điểm"
            activeOpacity={0.8}
          >
            <View style={styles.dragHandle} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismissSheet}
            accessibilityRole="button"
            accessibilityLabel="Đóng thông tin địa điểm"
            activeOpacity={0.72}
          >
            <MaterialCommunityIcons name="close" size={19} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </GestureDetector>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          snap === 'collapsed' && { paddingBottom: collapsedOffset + 24 },
        ]}
        scrollEnabled={snap !== 'peek'}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LocationHeader
          name={place.name}
          category={localizedCategory}
          brand={place.brand}
          distanceStr={distanceStr}
          standardLabel={!isUnrated ? 'Đạt QCVN 10:2014' : undefined}
          address={place.address}
          isAddressLoading={place.isAddressLoading}
          openingHours={place.opening_hours}
          phone={place.phone}
          website={place.website}
        />

        <AccessibilitySummary
          isUnrated={isUnrated}
          trustPercent={trustPercent}
          features={features}
          note={place.accessibility_note}
          hasRamp={Boolean(place.has_ramp)}
          doorWidthOk={Boolean(place.door_width_ok)}
          hasTactile={Boolean(place.has_tactile_paving)}
          lastVerifiedAt={place.last_verified_at}
          isFullyVerified={isFullyVerified}
          onHelpConfirmPress={() => setShowVerificationModal(true)}
        />

        <View style={styles.sectionInset}>
          <CommunityReviewsSection
            reviews={communityReviews}
            showDemoContent={hasDemoCommunityContent}
            isVerified={isFullyVerified}
          />

          <EvidenceGallerySection
            evidence={evidenceList}
            onAddEvidence={() => onContribute?.(place)}
            showDemoContent={hasDemoCommunityContent}
            isVerified={isFullyVerified}
          />

          {showVerificationSection && (
            <TouchableOpacity
              style={styles.verificationCard}
              onPress={() => setShowVerificationModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Mở danh sách xác nhận thông tin tiếp cận"
              activeOpacity={0.82}
            >
              <View style={styles.verificationCardLeft}>
                <View style={styles.verificationCardIconBox}>
                  <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#007D78" />
                </View>
                <View style={styles.verificationCardTextContainer}>
                  <View style={styles.verificationCardTitleRow}>
                    <Text style={styles.verificationCardTitle}>Giúp xác nhận thông tin tiếp cận</Text>
                    <View style={styles.verificationBadge}>
                      <Text style={styles.verificationBadgeText}>{publishedFeaturesCount} tiện ích</Text>
                    </View>
                  </View>
                  <Text style={styles.verificationCardSub}>
                    Kiểm tra và xác nhận thực tế ram dốc, cửa vào, thang máy, WC...
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#007D78" />
            </TouchableOpacity>
          )}

          <ContributionCTA
            locationId={place.id}
            locationName={place.name}
            onPress={() => onContribute?.(place)}
            showReportIssue={hasPublishedAccessibilityInfo}
            onReportIssue={() => {
              if (!user) {
                router.push('/login');
                return;
              }
              onReportIssue?.(place);
              setReportInitialFeature(undefined);
              setReportInitialData(undefined);
              setShowReportForm(true);
            }}
          />
        </View>
      </ScrollView>
      <ReportFormModal
        features={features}
        locationId={place.id}
        locationName={place.name}
        initialFeatureType={reportInitialFeature}
        initialFormData={reportInitialData}
        onClose={() => {
          setShowReportForm(false);
          setReportInitialFeature(undefined);
          setReportInitialData(undefined);
        }}
        onCreated={handleReportCreated}
        visible={showReportForm}
      />
      <FeatureVerificationModal
        visible={showVerificationModal}
        locationId={place.id}
        locationName={place.name}
        features={features}
        isFullyVerified={isFullyVerified}
        onRequestReport={handleRequestReportFromFeature}
        refreshTrigger={verificationRefreshKey}
        onClose={() => setShowVerificationModal(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    zIndex: 25,
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dragArea: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleButton: {
    width: 100,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionInset: {
    paddingHorizontal: 20,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3FAF8',
    borderWidth: 1,
    borderColor: '#BFE7E0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  verificationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 6,
  },
  verificationCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#A8E7DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationCardTextContainer: {
    flex: 1,
  },
  verificationCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  verificationCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#164E4A',
  },
  verificationBadge: {
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  verificationBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#007D78',
  },
  verificationCardSub: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
});
