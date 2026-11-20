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
import { loadContributionRecords, syncPendingSubmissionsWithBackend } from '@/entities/contribution';
import { fetchPlaceEvidence } from '@/entities/place';
import { resolveServiceUrl } from '@/shared/api/client';
import { useAuth } from '@/features/auth';
import { LoginRequiredModal } from '@/shared/ui/LoginRequiredModal';
import {
  castCommunityVote,
  fetchCommunityState,
  FeatureVerificationModal,
  fetchCommunityComments,
  type AccessibilityFeatureType,
  type CommunityFeatureInput,
  type CommunityFeatureState,
  type FeatureCommunityLabel,
  type PublishedFeatureStatus,
  type SubmittedObservation,
} from '@/features/community';
import {
  ReportFormModal,
  type ReportFormData,
  type ReportSummary,
  getReportDraft,
  subscribeReportDraft,
} from '@/features/reports';
import type { PlaceDto } from '../../../model';
import { AccessibilitySummary } from './AccessibilitySummary';
import { CommunityCommentsView } from './CommunityCommentsView';
import { CommunityReviewsSection } from './CommunityReviewsSection';
import { ContributionCTA } from './ContributionCTA';
import { EvidenceGallerySection } from './EvidenceGallerySection';
import { LocationHeader } from './LocationHeader';
import type {
  AccessibilityDetailFeature,
  CommunityReview,
  EvidenceItem,
  FeatureVerificationLevel,
} from './types';

interface LocationDetailSheetProps {
  place: PlaceDto;
  userLatitude?: number | null;
  userLongitude?: number | null;
  isFavorite?: boolean;
  onToggleFavorite?: (place: PlaceDto) => void;
  onClose: () => void;
  onContribute?: (place: PlaceDto) => void;
  onReportIssue?: (place: PlaceDto) => void;
}

type SheetSnap = 'expanded' | 'collapsed' | 'peek';
type DetailSubview = 'overview' | 'comments';

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

function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm');
}

function resolveEvidenceImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('file://')) return rawUrl;
  const baseUrl = resolveServiceUrl(5256, process.env.EXPO_PUBLIC_API_URL);
  if (rawUrl.startsWith('/')) {
    return `${baseUrl}${rawUrl}`;
  }
  if (rawUrl.startsWith('http://localhost:5256/')) {
    return rawUrl.replace('http://localhost:5256', baseUrl);
  }
  if (rawUrl.startsWith('http://127.0.0.1:5256/')) {
    return rawUrl.replace('http://127.0.0.1:5256', baseUrl);
  }
  return rawUrl;
}

function buildVideoMediaUrls(rawUrl?: string | null, resolvedUrl?: string): {
  thumbnailUrl?: string;
  videoUrl?: string;
} {
  if (!resolvedUrl || resolvedUrl.startsWith('file://')) {
    return { videoUrl: resolvedUrl || undefined };
  }
  const baseUrl = resolveServiceUrl(5256, process.env.EXPO_PUBLIC_API_URL);
  const paramUrl = rawUrl && rawUrl.startsWith('/uploads/') ? rawUrl : resolvedUrl;
  const encoded = encodeURIComponent(paramUrl);
  return {
    thumbnailUrl: `${baseUrl}/api/v1/media/video-poster?url=${encoded}`,
    videoUrl: `${baseUrl}/api/v1/media/video-stream?url=${encoded}`,
  };
}

export function LocationDetailSheet({
  place,
  userLatitude,
  userLongitude,
  isFavorite = false,
  onToggleFavorite,
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
  const subviewProgress = useSharedValue(0);

  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const [activeSubview, setActiveSubview] = useState<DetailSubview>('overview');
  const [showReportForm, setShowReportForm] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalFeature, setLoginModalFeature] = useState('đóng góp dữ liệu tiếp cận');
  const [reportInitialFeature, setReportInitialFeature] = useState<AccessibilityFeatureType | undefined>(undefined);
  const [reportInitialData, setReportInitialData] = useState<ReportFormData | undefined>(undefined);
  const [verificationRefreshKey, setVerificationRefreshKey] = useState(0);
  const [liveFeatureStates, setLiveFeatureStates] = useState<
    Partial<Record<AccessibilityFeatureType, CommunityFeatureState>>
  >({});

  const myCommentsStorageKey = `@accessmap_my_comments_${place.id}`;

  useEffect(() => {
    return subscribeReportDraft(() => {
      const draft = getReportDraft();
      if (draft && draft.isOpen && (draft.locationId === place.id || !draft.locationId)) {
        setShowReportForm(true);
      }
    });
  }, [place.id]);

  const isUnrated =
    place.accessibility_score == null ||
    Number(place.accessibility_score) < 0 ||
    isNaN(Number(place.accessibility_score));

  const [currentTimestamp] = useState(() => Date.now());
  const isRecentVerified = useMemo(() => {
    if (!place.last_verified_at) return false;
    const verifiedTime = new Date(place.last_verified_at).getTime();
    if (isNaN(verifiedTime)) return false;
    const diffDays = (currentTimestamp - verifiedTime) / (1000 * 60 * 60 * 24);
    // Tolerate negative diff due to server UTC timestamp vs local time
    return diffDays >= -2 && diffDays <= 180;
  }, [place.last_verified_at, currentTimestamp]);

  const rawScore = Number(place.accessibility_score);
  const isDemo2 = place.id === '70000000-0000-0000-0000-000000000002';
  const isDemo1 = place.id === '70000000-0000-0000-0000-000000000001';
  // A location is only fully verified (WF-02) if explicitly audited/certified compliant.
  // Community submissions (WF-01) represent preliminary surveys without physical dimension audits.
  const isFullyVerified = isDemo2 || Boolean(
    (place as any).audit_status === 'verified_compliant' ||
    (place as any).is_fully_verified === true
  );

  const normalizedScore = Math.round(
    rawScore <= 1
      ? rawScore * 100
      : rawScore <= 10
        ? rawScore * 10
        : Math.min(rawScore, 100)
  );

  const trustPercent = isUnrated ? 0 : normalizedScore;

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
      { id: 'ramp', featureType: 'Ramp', icon: 'slope-uphill', label: 'Ram dốc lối vào', description: 'Tiếp cận lối vào bằng ram dốc', value: values.ramp ?? (place.has_ramp ? true : null) },
      { id: 'door', featureType: 'EntranceDoor', icon: 'door', label: 'Cửa ra vào tiếp cận', description: 'Độ rộng và ngưỡng cửa phù hợp', value: values.entranceDoor },
      { id: 'elevator', featureType: 'Elevator', icon: 'elevator-passenger', label: 'Thang máy tiếp cận', description: 'Thang máy dành cho lộ trình tiếp cận', value: values.elevator ?? (place.has_accessible_elevator ? true : null) },
      { id: 'toilet', featureType: 'AccessibleRestroom', icon: 'toilet', label: 'Nhà vệ sinh tiếp cận', description: 'Không gian và tay vịn hỗ trợ', value: values.accessibleRestroom ?? (place.has_accessible_restroom ? true : null) },
    ];

    // WF-02 reads its truth from published LocationFeature rows.
    // Differentiate features that have verified compliant specs from presence-only reports.
    return definitions.map(({ value, ...definition }): AccessibilityDetailFeature => {
      let verificationLevel: FeatureVerificationLevel = 'unknown';
      let status = 'Chưa rõ';
      let specLabel: string | undefined;

      if (definition.id === 'door') {
        if (value === true || place.door_width_ok === true) {
          verificationLevel = isFullyVerified ? 'verified_compliant' : 'unverified_presence';
          status = isFullyVerified ? 'Đạt chuẩn' : 'Có cửa vào';
          specLabel = isFullyVerified ? 'Thông thủy ≥ 90cm' : 'Khảo sát cộng đồng';
        } else if (isFullyVerified && (value === false || place.door_width_ok === false)) {
          verificationLevel = 'not_available';
          status = 'Không có';
          specLabel = 'Không có cửa riêng';
        } else {
          verificationLevel = 'unknown';
          status = 'Chưa rõ';
        }
      } else if (value === true || (definition.id === 'ramp' && place.has_ramp)) {
        verificationLevel = isFullyVerified ? 'verified_compliant' : 'unverified_presence';
        status = isFullyVerified ? 'Đạt chuẩn' : 'Có ram dốc';
        specLabel = isFullyVerified
          ? (definition.id === 'ramp'
              ? 'Độ dốc ≤ 1:12'
              : definition.id === 'elevator'
                ? 'Bảng nút thấp & chữ nổi'
                : 'Có tay vịn & quay xe')
          : 'Khảo sát cộng đồng';
      } else if (isFullyVerified && value === false) {
        verificationLevel = 'not_available';
        status = 'Không có';
        specLabel = 'Không có tiện ích';
      } else {
        // In community surveys, un-surveyed items are unknown, not affirmatively absent
        verificationLevel = 'unknown';
        status = 'Chưa rõ';
      }

      const publishedStatus: PublishedFeatureStatus =
        verificationLevel === 'verified_compliant' || verificationLevel === 'unverified_presence'
          ? 'Available'
          : verificationLevel === 'not_available'
            ? 'NotAvailable'
            : 'Unknown';

      return {
        ...definition,
        publishedStatus,
        verificationLevel,
        status,
        specLabel,
      };
    }).map((item): AccessibilityDetailFeature => {
      const liveState = liveFeatureStates[item.featureType];
      if (!liveState) return item;

      let nextVerificationLevel: FeatureVerificationLevel = item.verificationLevel ?? 'unknown';
      let nextStatus = item.status;
      if (liveState.publishedStatus === 'Limited') {
        nextVerificationLevel = 'limited';
        nextStatus = 'Hạn chế';
      } else if (liveState.publishedStatus === 'NotAvailable') {
        nextVerificationLevel = 'not_available';
        nextStatus = 'Không có';
      } else if (liveState.publishedStatus === 'Available') {
        nextVerificationLevel = isFullyVerified ? 'verified_compliant' : 'unverified_presence';
        nextStatus = isFullyVerified ? 'Đạt chuẩn' : (item.status === 'Chưa rõ' ? 'Có tiện ích' : item.status);
      }

      return {
        ...item,
        publishedStatus: liveState.publishedStatus,
        verificationLevel: nextVerificationLevel,
        status: nextStatus,
        communityLabel: liveState.label as FeatureCommunityLabel,
        eligibleVoterCount: liveState.eligibleVoterCount,
        contradictingVoterCount: liveState.contradictingVoterCount,
        freshnessPercent: Math.round((liveState.freshnessFactor ?? 1) * 100),
        advisory: liveState.advisory
          ? { reason: liveState.advisory.reason, endsAt: liveState.advisory.endsAt }
          : null,
        featureVersion: liveState.featureVersion,
      };
    });
  }, [place, isFullyVerified, liveFeatureStates]);

  const hasPublishedAccessibilityInfo =
    !isUnrated && features.some((feature) => feature.publishedStatus !== 'Unknown');
  const hasDemoCommunityContent = isDemo1 || isDemo2;
  const verifiableFeatures = useMemo(() => {
    if (hasDemoCommunityContent) return features;
    const known = features.filter((feature) => feature.publishedStatus !== 'Unknown');
    return known.length > 0 ? known : features;
  }, [hasDemoCommunityContent, features]);
  const publishedFeaturesCount = useMemo(() => {
    if (hasDemoCommunityContent) return features.length;
    return verifiableFeatures.filter((feature) => feature.publishedStatus === 'Available' || feature.publishedStatus === 'Limited').length;
  }, [hasDemoCommunityContent, features.length, verifiableFeatures]);

  const displayAccessibilityNote = useMemo(() => {
    if (place.accessibility_note && place.accessibility_note !== 'Chưa có dữ liệu khảo sát tiếp cận') {
      return place.accessibility_note;
    }
    if (isFullyVerified && publishedFeaturesCount > 0) {
      return `Đã xác minh đặc tính kỹ thuật đạt chuẩn QCVN 10:2014.`;
    }
    if (publishedFeaturesCount > 0) {
      return `Khảo sát sơ bộ: Chưa đo đạc độ dốc ram & chiều rộng cửa. Người dùng xe lăn nên có người trợ giúp.`;
    }
    return place.accessibility_note;
  }, [place.accessibility_note, isFullyVerified, publishedFeaturesCount]);

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
      if (primaryFeatureType && formData) {
        const derivedStatus: PublishedFeatureStatus =
          formData.proposedStatus ??
          (formData.reason === 'Blocked' || formData.reason === 'Incorrect' ? 'NotAvailable' : 'Limited');
        const currentVersion = liveFeatureStates[primaryFeatureType]?.featureVersion || 1;

        try {
          await castCommunityVote(
            place.id,
            primaryFeatureType,
            {
              voteType: 'Changed',
              observedFeatureVersion: currentVersion,
              proposedStatus: derivedStatus,
              comment: formData.description,
            },
            user?.id ?? 'anon'
          );
        } catch {}

        const storageKey = `@accessmap_vote_${user?.id ?? 'anon'}_${place.id}_${primaryFeatureType}`;
        const observation: SubmittedObservation = {
          voteType: 'Changed',
          proposedStatus: derivedStatus,
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
    [liveFeatureStates, place.id, user]
  );

  useEffect(() => {
    let isMounted = true;
    const coreTypes: AccessibilityFeatureType[] = ['Ramp', 'EntranceDoor', 'Elevator', 'AccessibleRestroom'];
    void Promise.all(
      coreTypes.map(async (featureType) => {
        try {
          return await fetchCommunityState(place.id, featureType);
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      const next: Partial<Record<AccessibilityFeatureType, CommunityFeatureState>> = {};
      results.forEach((item) => {
        if (item) next[item.featureType] = item;
      });
      setLiveFeatureStates(next);
    });
    return () => {
      isMounted = false;
    };
  }, [place.id, verificationRefreshKey]);

  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);

  useEffect(() => {
    let isMounted = true;
    function getEvidenceTitle(featureTags?: string[]): string {
      if (!featureTags || featureTags.length === 0) return 'Ảnh khảo sát';
      if (featureTags.includes('exterior_ramp_present') || featureTags.includes('ramp_slope_comfortable')) return 'Ram dốc';
      if (featureTags.includes('door_width_ok') || featureTags.includes('door_threshold_flat')) return 'Cửa vào';
      if (featureTags.includes('elevator_present') || featureTags.includes('elevator_accessible')) return 'Thang máy';
      if (featureTags.includes('accessible_restroom') || featureTags.includes('restroom_accessible_stall')) return 'Nhà vệ sinh';
      if (featureTags.includes('tactile_paving_guiding') || featureTags.includes('tactile_paving_warning')) return 'Lối xúc giác';
      return 'Ảnh khảo sát';
    }

    function getEvidenceSpec(featureTags?: string[]): { tag: string; icon: string } {
      if (!featureTags || featureTags.length === 0) return { tag: 'Minh chứng tiếp cận', icon: 'check-circle-outline' };
      if (featureTags.includes('exterior_ramp_present') || featureTags.includes('ramp_slope_comfortable')) {
        return { tag: 'Ram dốc', icon: 'slope-uphill' };
      }
      if (featureTags.includes('door_width_ok')) {
        return { tag: 'Cửa ra vào', icon: 'door-open' };
      }
      if (featureTags.includes('door_threshold_flat')) {
        return { tag: 'Ngạch cửa phẳng', icon: 'ray-start-end' };
      }
      if (featureTags.includes('elevator_present') || featureTags.includes('elevator_accessible')) {
        return { tag: 'Thang máy', icon: 'elevator-passenger-outline' };
      }
      if (featureTags.includes('accessible_restroom') || featureTags.includes('restroom_accessible_stall')) {
        return { tag: 'WC cho xe lăn', icon: 'wheelchair-accessibility' };
      }
      if (featureTags.includes('tactile_paving_guiding') || featureTags.includes('tactile_paving_warning')) {
        return { tag: 'Lối đi xúc giác', icon: 'dots-grid' };
      }
      return { tag: 'Minh chứng tiếp cận', icon: 'check-circle-outline' };
    }

    async function loadEvidence() {
      const items: EvidenceItem[] = [];
      const seenUrls = new Set<string>();

      try {
        const remoteEvidence = await fetchPlaceEvidence(place.id);
        remoteEvidence.forEach((r) => {
          const resolved = resolveEvidenceImageUrl(r.imageUrl);
          if (resolved && !seenUrls.has(resolved)) {
            seenUrls.add(resolved);
            const spec = getEvidenceSpec(r.featureTags);
            const isVideo = isVideoMediaUrl(resolved);
            const videoUrls = isVideo ? buildVideoMediaUrls(r.imageUrl, resolved) : {};
            items.push({
              id: r.id,
              title: r.title || getEvidenceTitle(r.featureTags),
              subtitle: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : (r.subtitle ?? 'Đã công bố'),
              badge: r.badge || 'Đã xác thực',
              imageUrl: resolved,
              mediaType: isVideo ? 'video' : 'image',
              thumbnailUrl: isVideo ? videoUrls.thumbnailUrl : resolved,
              videoUrl: videoUrls.videoUrl,
              specTag: spec.tag,
              specIcon: spec.icon,
            });
          }
        });
      } catch {}

      try {
        await syncPendingSubmissionsWithBackend();
        const localRecords = await loadContributionRecords();
        localRecords
          .filter(
            (r) =>
              r.locationId === place.id &&
              r.mediaUri &&
              r.status !== 'Rejected' &&
              r.status !== 'Auto-Verified' &&
              r.status !== 'Published'
          )
          .forEach((r) => {
            const resolved = resolveEvidenceImageUrl(r.mediaUri);
            if (resolved && !seenUrls.has(resolved)) {
              seenUrls.add(resolved);
              const isVideo = r.mediaType === 'video' || isVideoMediaUrl(resolved);
              const videoUrls = isVideo ? buildVideoMediaUrls(r.mediaUri, resolved) : {};
              items.push({
                id: r.id,
                title: `${getEvidenceTitle(r.featureTags)} (Chờ duyệt)`,
                subtitle: new Date(r.createdAt).toLocaleDateString('vi-VN'),
                badge: 'Đang chờ duyệt',
                imageUrl: resolved,
                mediaType: isVideo ? 'video' : 'image',
                thumbnailUrl: isVideo ? videoUrls.thumbnailUrl : resolved,
                videoUrl: videoUrls.videoUrl,
                specTag: isVideo ? 'Video · Đang chờ duyệt' : 'Ảnh đóng góp · Đang chờ duyệt',
                specIcon: 'clock-outline',
              });
            }
          });
      } catch {}

      // Fake demo evidence for the 2 demo venues only
      if (items.length === 0) {
        if (isDemo1) {
          items.push({
            id: 'demo-1-ramp',
            title: 'Ram dốc lối Pasteur',
            subtitle: '96 ngày trước • Bởi Mai Anh',
            badge: 'Đã xác thực',
            imageUrl: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=800&q=80',
          });
        } else if (isDemo2) {
          items.push({
            id: 'demo-2-ramp',
            title: 'Ram dốc & Lối vào tiếp cận chuẩn',
            subtitle: 'Vừa xác thực • Bởi Chuyên viên Thẩm định',
            badge: 'Đã thẩm định',
            imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
          });
        }
      }

      if (isMounted) {
        setEvidenceList(items);
      }
    }

    async function loadComments() {
      let localOwnComments: CommunityReview[] = [];
      try {
        const rawLocal = await AsyncStorage.getItem(myCommentsStorageKey);
        if (rawLocal) {
          localOwnComments = JSON.parse(rawLocal);
        }
      } catch {}

      let remoteMapped: CommunityReview[] = [];
      try {
        const items = await fetchCommunityComments(place.id);
        if (items && items.length > 0) {
          remoteMapped = items.map((c) => {
            const author = c.authorLabel || 'Thành viên cộng đồng';
            const initials = author.slice(0, 2).toUpperCase();
            const date = new Date(c.createdAt);
            const age = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
            return {
              id: c.id,
              author,
              initials,
              age,
              helpfulCount: Math.max(1, Math.round((c.recencyWeight || 1) * 10)),
              likesCount: Math.max(1, Math.round((c.recencyWeight || 1) * 4)),
              comment: c.body,
              status: 'Approved',
              createdAtIso: c.createdAt,
            };
          });
        }
      } catch {}

      if (isMounted) {
        const remoteIds = new Set(remoteMapped.map((r) => r.id));
        const remoteBodies = new Set(remoteMapped.map((r) => r.comment.trim()));
        const pendingOwn = localOwnComments.filter(
          (loc) => !remoteIds.has(loc.id) && !remoteBodies.has(loc.comment.trim())
        );
        setCommunityReviews([...pendingOwn, ...remoteMapped]);
      }
    }

    void loadEvidence();
    void loadComments();

    return () => {
      isMounted = false;
    };
  }, [isDemo1, isDemo2, myCommentsStorageKey, place.id]);

  // Slide up from bottom and reset subview when place changes
  useEffect(() => {
    translateY.value = sheetHeight;
    translateY.value = withTiming(collapsedOffset, { duration: 380 });
    setSnap('collapsed');
    subviewProgress.value = 0;
    setActiveSubview('overview');
  }, [place.id, collapsedOffset, sheetHeight, subviewProgress, translateY]);

  const setSnapFromAnimation = useCallback((nextSnap: SheetSnap) => {
    setSnap(nextSnap);
  }, []);

  const snapTo = useCallback(
    (nextSnap: SheetSnap) => {
      const target =
        nextSnap === 'expanded' ? 0 : nextSnap === 'peek' ? peekOffset : collapsedOffset;
      translateY.value = withSpring(target, SPRING_CONFIG);
      setSnap(nextSnap);
    },
    [collapsedOffset, peekOffset, translateY]
  );

  const openCommentsSection = useCallback(() => {
    snapTo('expanded');
    setActiveSubview('comments');
    subviewProgress.value = withSpring(1, SPRING_CONFIG);
  }, [snapTo, subviewProgress]);

  const closeCommentsSection = useCallback(() => {
    subviewProgress.value = withTiming(0, { duration: 240 }, (finished) => {
      if (finished) runOnJS(setActiveSubview)('overview');
    });
  }, [subviewProgress]);

  const handleCommentAdded = useCallback(
    (newReview: CommunityReview) => {
      setCommunityReviews((prev) => {
        const next = [newReview, ...prev.filter((r) => r.id !== newReview.id)];
        const ownOnly = next.filter((r) => r.isOwn);
        void AsyncStorage.setItem(myCommentsStorageKey, JSON.stringify(ownOnly)).catch(() => {});
        return next;
      });
    },
    [myCommentsStorageKey]
  );

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

  const overviewSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -sheetWidth * subviewProgress.value }],
    opacity: 1 - subviewProgress.value * 0.35,
  }));

  const commentsSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheetWidth * (1 - subviewProgress.value) }],
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
        </View>
      </GestureDetector>

      <View style={styles.subviewViewport}>
        {/* Main Overview Page */}
        <Animated.View
          style={[styles.subviewPage, overviewSlideStyle]}
          pointerEvents={activeSubview === 'overview' ? 'auto' : 'none'}
        >
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
              standardLabel={isFullyVerified ? 'Đạt QCVN 10:2014' : undefined}
              address={place.address}
              isAddressLoading={place.isAddressLoading}
              openingHours={place.opening_hours}
              phone={place.phone}
              website={place.website}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(place) : undefined}
              onClose={dismissSheet}
            />

            <AccessibilitySummary
              isUnrated={isUnrated}
              trustPercent={trustPercent}
              features={features}
              note={displayAccessibilityNote}
              hasRamp={Boolean(place.has_ramp)}
              doorWidthOk={Boolean(place.door_width_ok)}
              hasTactile={Boolean(place.has_tactile_paving)}
              lastVerifiedAt={place.last_verified_at}
              isFullyVerified={isFullyVerified}
              onHelpConfirmPress={() => {
                if (!user) {
                  setLoginModalFeature('xác nhận tiện ích tiếp cận');
                  setShowLoginModal(true);
                  return;
                }
                setShowVerificationModal(true);
              }}
            />

            <View style={styles.sectionInset}>
              <CommunityReviewsSection
                reviews={communityReviews}
                onViewAll={openCommentsSection}
                showDemoContent={hasDemoCommunityContent}
                isVerified={isFullyVerified}
              />

              <EvidenceGallerySection
                evidence={evidenceList}
                onAddEvidence={() => {
                  if (!user) {
                    setLoginModalFeature('đóng góp ảnh minh chứng');
                    setShowLoginModal(true);
                    return;
                  }
                  onContribute?.(place);
                }}
                showDemoContent={hasDemoCommunityContent}
                isVerified={isFullyVerified}
              />

              <ContributionCTA
                locationId={place.id}
                locationName={place.name}
                onPress={() => {
                  if (!user) {
                    setLoginModalFeature('đóng góp dữ liệu tiếp cận');
                    setShowLoginModal(true);
                    return;
                  }
                  onContribute?.(place);
                }}
                showReportIssue={false}
                onReportIssue={() => {
                  if (!user) {
                    setLoginModalFeature('báo thay đổi thông tin tiếp cận');
                    setShowLoginModal(true);
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
        </Animated.View>

        {/* Right-to-Left Community Comments Subview Page */}
        <Animated.View
          style={[styles.subviewPage, styles.commentsOverlayPage, commentsSlideStyle]}
          pointerEvents={activeSubview === 'comments' ? 'auto' : 'none'}
        >
          <CommunityCommentsView
            locationId={place.id}
            locationName={place.name}
            locationCategory={localizedCategory}
            reviews={communityReviews}
            showDemoContent={hasDemoCommunityContent}
            isVerified={isFullyVerified}
            onBack={closeCommentsSection}
            onCommentAdded={handleCommentAdded}
            onRequireLogin={(featureLabel) => {
              setLoginModalFeature(featureLabel);
              setShowLoginModal(true);
            }}
          />
        </Animated.View>
      </View>

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
        features={verifiableFeatures}
        isFullyVerified={isFullyVerified}
        onRequestReport={handleRequestReportFromFeature}
        refreshTrigger={verificationRefreshKey}
        onClose={() => setShowVerificationModal(false)}
      />
      <LoginRequiredModal
        visible={showLoginModal}
        featureName={loginModalFeature}
        onClose={() => setShowLoginModal(false)}
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
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleButton: {
    width: 100,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  subviewViewport: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  subviewPage: {
    flex: 1,
  },
  commentsOverlayPage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
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
});
