/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are intentionally mutated in gesture worklets. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/shared/theme';
import type { PlaceDto } from '../../types';
import { AccessibilitySummary } from './AccessibilitySummary';
import { AccuracyConfirmationSection } from './AccuracyConfirmationSection';
import { ContributionCTA } from './ContributionCTA';
import { EvidenceGallerySection } from './EvidenceGallerySection';
import { LocationHeader } from './LocationHeader';
import type { AccessibilityDetailFeature } from './types';

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
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(Math.max(windowHeight * 0.7, 440), 560);
  const collapsedOffset = Math.round(sheetHeight * 0.38);
  const peekOffset = Math.max(sheetHeight - 88, collapsedOffset);

  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(collapsedOffset);
  const [snap, setSnap] = useState<SheetSnap>('collapsed');

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

  // ponytail: has_accessible_elevator is ignored because the DB column defaults to true for every row; re-enable once the default is fixed.
  const features = useMemo<AccessibilityDetailFeature[]>(() => {
    const list: AccessibilityDetailFeature[] = [];
    if (place.has_ramp) list.push({ id: 'ramp', icon: 'slope-uphill', label: 'Ram dốc' });
    if (place.has_elevator) list.push({ id: 'elevator', icon: 'elevator-passenger', label: 'Thang máy tiếp cận' });
    if (place.door_width_ok) list.push({ id: 'door', icon: 'door', label: 'Cửa đủ rộng' });
    if (place.has_accessible_restroom) list.push({ id: 'toilet', icon: 'toilet', label: 'WC tiếp cận xe lăn' });
    if (place.has_tactile_paving) list.push({ id: 'tactile', icon: 'dots-grid', label: 'Gạch dẫn hướng' });
    return list;
  }, [place]);

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
          address={place.address}
          isAddressLoading={place.isAddressLoading}
          openingHours={place.opening_hours}
          phone={place.phone}
          website={place.website}
        />

        <AccessibilitySummary isUnrated={isUnrated} trustPercent={trustPercent} features={features} />

        <View style={styles.sectionInset}>
          {/* Photos & Evidence with +50 EXP camera tile */}
          <EvidenceGallerySection evidence={[]} onAddEvidence={() => onContribute?.(place)} />

          {/* Action buttons */}
          {isUnrated ? (
            <ContributionCTA
              locationId={place.id}
              locationName={place.name}
              onPress={() => onContribute?.(place)}
            />
          ) : (
            <AccuracyConfirmationSection
              onReportIssue={() => onReportIssue?.(place)}
            />
          )}
        </View>
      </ScrollView>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    paddingHorizontal: 18,
  },
});

