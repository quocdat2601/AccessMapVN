/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are intentionally mutated in gesture worklets. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
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
import { Colors } from '@/shared/theme';
import { loadContributionRecords } from '@/entities/contribution';
import { useAuth } from '@/features/auth';
import { CommunityTimelineSection, FeatureCommunitySection } from '@/features/community';
import { ReportFormModal } from '@/features/reports';
import type { PlaceDto } from '../../../model';
import { AccessibilitySummary } from './AccessibilitySummary';
import { AccuracyConfirmationSection } from './AccuracyConfirmationSection';
import { ContributionCTA } from './ContributionCTA';
import { EvidenceGallerySection } from './EvidenceGallerySection';
import { LocationHeader } from './LocationHeader';
import type { AccessibilityDetailFeature, EvidenceItem } from './types';

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
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(Math.max(windowHeight * 0.78, 520), windowHeight * 0.9);
  const collapsedOffset = Math.round(sheetHeight * 0.38);
  const peekOffset = Math.max(sheetHeight - 88, collapsedOffset);

  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(collapsedOffset);
  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const [showReportForm, setShowReportForm] = useState(false);

  const isUnrated =
    place.accessibility_score == null ||
    Number(place.accessibility_score) < 0 ||
    isNaN(Number(place.accessibility_score));

  const trustPercent = isUnrated
    ? 0
    : Math.round(Math.min(Math.max(Number(place.accessibility_score) * 100, 0), 100));

  const distanceStr = useMemo(
    () => calculateDistance(userLatitude, userLongitude, place.lat, place.lng),
    [userLatitude, userLongitude, place.lat, place.lng]
  );

  const localizedCategory = useMemo(() => formatCategory(place.category), [place.category]);

  const features = useMemo<AccessibilityDetailFeature[]>(() => {
    const values = place.legacy_feature_values;
    if (!values) return [];

    const definitions: Array<
      Omit<AccessibilityDetailFeature, 'publishedStatus' | 'status'> & { value: boolean | null }
    > = [
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

  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);

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

    loadEvidence();
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
        />

        <View style={styles.sectionInset}>
          {/* Photos & Evidence with +50 EXP camera tile */}
          <EvidenceGallerySection evidence={evidenceList} onAddEvidence={() => onContribute?.(place)} />

          <CommunityTimelineSection locationId={place.id} onSignIn={() => router.push('/login')} />

          {!isUnrated && features.length > 0 ? (
            <FeatureCommunitySection locationId={place.id} features={features} />
          ) : null}

          {/* Action buttons */}
          {isUnrated ? (
            <ContributionCTA
              locationId={place.id}
              locationName={place.name}
              onPress={() => onContribute?.(place)}
            />
          ) : (
            <AccuracyConfirmationSection
              onReportIssue={() => {
                if (!user) {
                  Alert.alert('Cần đăng nhập', 'Bạn cần đăng nhập để gửi báo cáo.', [
                    { text: 'Để sau', style: 'cancel' },
                    { text: 'Đăng nhập', onPress: () => router.push('/login') },
                  ]);
                  return;
                }
                onReportIssue?.(place);
                setShowReportForm(true);
              }}
              onViewReports={() => router.push((user ? '/reports' : '/login') as never)}
            />
          )}

          {!isUnrated ? (
            <ContributionCTA
              locationId={place.id}
              locationName={place.name}
              onPress={() => onContribute?.(place)}
            />
          ) : null}
        </View>
      </ScrollView>
      <ReportFormModal
        features={features}
        locationId={place.id}
        locationName={place.name}
        onClose={() => setShowReportForm(false)}
        onCreated={() => {
          Alert.alert('Đã gửi báo cáo', 'Báo cáo đã được lưu để nhóm kiểm duyệt xem xét.');
        }}
        visible={showReportForm}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
});

