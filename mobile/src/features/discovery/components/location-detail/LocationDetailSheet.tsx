/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are intentionally mutated in gesture worklets. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { AccessibilitySummary } from './AccessibilitySummary';
import { AccuracyConfirmationSection } from './AccuracyConfirmationSection';
import { CommunityReviewsSection } from './CommunityReviewsSection';
import { ContributionCTA } from './ContributionCTA';
import { EvidenceGallerySection } from './EvidenceGallerySection';
import { LocationHeader } from './LocationHeader';
import { LocationDetailData } from './types';

interface LocationDetailSheetProps {
  data: LocationDetailData;
  containerHeight: number;
  collapseRequest: number;
  onClose: () => void;
  onExpandedChange?: (isExpanded: boolean) => void;
}

type SheetSnap = 'expanded' | 'collapsed' | 'peek';

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 230,
  mass: 0.85,
};

export function LocationDetailSheet({
  data,
  containerHeight,
  collapseRequest,
  onClose,
  onExpandedChange,
}: LocationDetailSheetProps) {
  const sheetHeight = Math.max(containerHeight - 62, 320);
  const collapsedOffset = Math.round(sheetHeight * 0.44);
  const peekOffset = Math.max(sheetHeight - 96, collapsedOffset);
  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(collapsedOffset);
  const [snap, setSnap] = useState<SheetSnap>('collapsed');

  useEffect(() => {
    translateY.value = sheetHeight;
    translateY.value = withTiming(collapsedOffset, { duration: 420 });
  }, [collapsedOffset, sheetHeight, translateY]);

  useEffect(() => {
    if (collapseRequest === 0) return;
    translateY.value = withSpring(collapsedOffset, SPRING_CONFIG);
    setSnap('collapsed');
    onExpandedChange?.(false);
  }, [collapseRequest, collapsedOffset, onExpandedChange, translateY]);

  const setSnapFromAnimation = useCallback((nextSnap: SheetSnap) => {
    setSnap(nextSnap);
    onExpandedChange?.(nextSnap === 'expanded');
  }, [onExpandedChange]);

  const snapTo = (nextSnap: SheetSnap) => {
    const target = nextSnap === 'expanded' ? 0 : nextSnap === 'peek' ? peekOffset : collapsedOffset;
    translateY.value = withSpring(target, SPRING_CONFIG);
    setSnap(nextSnap);
    onExpandedChange?.(nextSnap === 'expanded');
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
            projected > peekOffset + 68 ||
            (event.velocityY > 1150 && translateY.value > collapsedOffset);

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
    [
      collapsedOffset,
      dragStartY,
      onClose,
      peekOffset,
      setSnapFromAnimation,
      sheetHeight,
      translateY,
    ]
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
            accessibilityLabel="Kéo để thay đổi chiều cao bảng chi tiết"
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
            <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </GestureDetector>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          snap === 'collapsed' && { paddingBottom: collapsedOffset + 28 },
        ]}
        scrollEnabled={snap !== 'peek'}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LocationHeader
          name={data.name}
          address={data.address}
          standardLabel={data.standardLabel}
        />
        <AccessibilitySummary
          trustPercent={data.trustPercent}
          confirmationCount={data.confirmationCount}
          lastVerified={data.lastVerified}
          verificationState={data.verificationState}
          features={data.features}
        />
        <View style={styles.sectionInset}>
          <CommunityReviewsSection reviews={data.reviews} />
          <EvidenceGallerySection evidence={data.evidence} />
          <AccuracyConfirmationSection />
          <ContributionCTA locationId={data.id} locationName={data.name} />
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
    bottom: 62,
    zIndex: 15,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.surface,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
  },
  dragArea: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleButton: {
    width: 112,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#c4cac9',
  },
  closeButton: {
    position: 'absolute',
    right: 11,
    top: 5,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  sectionInset: {
    paddingHorizontal: 18,
  },
});
