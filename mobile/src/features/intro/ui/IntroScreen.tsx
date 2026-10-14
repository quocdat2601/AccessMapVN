import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branding } from '@/shared/config/branding';
import { useAuth } from '@/features/auth';

const INTRO_DURATION = 3_000;
const CALM_EASING = Easing.bezier(0.22, 1, 0.36, 1);

// Prototype welcome only: it establishes the product identity before the future auth flow begins.
export default function IntroScreen() {
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const hasNavigated = useRef(false);
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const routeOpacity = useRef(new Animated.Value(0)).current;
  const routeTranslateX = useRef(new Animated.Value(-12)).current;
  const markerOpacity = useRef(new Animated.Value(0)).current;
  const markerScale = useRef(new Animated.Value(0.94)).current;
  const markerTranslateY = useRef(new Animated.Value(10)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (isLoading) return;

    let isMounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    let reducedMotionTimeout: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (isMounted && !hasNavigated.current) {
        hasNavigated.current = true;
        router.replace(session ? '/map' : '/login');
      }
    };

    const startIntro = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (!isMounted) return;

      if (reduceMotion) {
        // Preserve the full reading time while removing non-essential movement.
        backgroundOpacity.setValue(1);
        routeOpacity.setValue(1);
        routeTranslateX.setValue(0);
        markerOpacity.setValue(1);
        markerScale.setValue(1);
        markerTranslateY.setValue(0);
        pulseProgress.setValue(1);
        copyOpacity.setValue(1);
        copyTranslateY.setValue(0);
        reducedMotionTimeout = setTimeout(finish, INTRO_DURATION);
        return;
      }

      // Each track begins on the requested timeline; the longest ends at 2.5s,
      // followed by a 0.5s hold so the complete brand composition remains readable.
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(backgroundOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(500),
            Animated.parallel([
              Animated.timing(routeOpacity, {
                toValue: 1,
                duration: 900,
                easing: CALM_EASING,
                useNativeDriver: true,
              }),
              Animated.timing(routeTranslateX, {
                toValue: 0,
                duration: 900,
                easing: CALM_EASING,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.delay(1_000),
            Animated.parallel([
              Animated.timing(markerOpacity, {
                toValue: 1,
                duration: 700,
                easing: CALM_EASING,
                useNativeDriver: true,
              }),
              Animated.timing(markerTranslateY, {
                toValue: 0,
                duration: 700,
                easing: CALM_EASING,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(markerScale, {
                  toValue: 1.025,
                  duration: 600,
                  easing: CALM_EASING,
                  useNativeDriver: true,
                }),
                Animated.timing(markerScale, {
                  toValue: 1,
                  duration: 400,
                  easing: Easing.inOut(Easing.quad),
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.delay(100),
                Animated.timing(pulseProgress, {
                  toValue: 1,
                  duration: 900,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]),
          Animated.sequence([
            Animated.delay(1_600),
            Animated.parallel([
              Animated.timing(copyOpacity, {
                toValue: 1,
                duration: 900,
                easing: CALM_EASING,
                useNativeDriver: true,
              }),
              Animated.timing(copyTranslateY, {
                toValue: 0,
                duration: 900,
                easing: CALM_EASING,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),
        Animated.delay(500),
      ]);

      animation.start(({ finished }) => {
        if (finished) finish();
      });
    };

    void startIntro();

    return () => {
      isMounted = false;
      animation?.stop();
      if (reducedMotionTimeout) clearTimeout(reducedMotionTimeout);
    };
  }, [
    backgroundOpacity,
    copyOpacity,
    copyTranslateY,
    markerOpacity,
    markerScale,
    markerTranslateY,
    pulseProgress,
    routeOpacity,
    routeTranslateX,
    router,
    session,
    isLoading,
  ]);

  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.2, 0.07],
  });
  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.18],
  });

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[styles.mapContext, { opacity: backgroundOpacity }]}
        >
          <View style={styles.backgroundWash} />
          <View style={[styles.mapBlock, styles.mapBlockTopLeft]} />
          <View style={[styles.mapBlock, styles.mapBlockTopRight]} />
          <View style={[styles.mapBlock, styles.mapBlockBottomLeft]} />
          <View style={[styles.mapBlock, styles.mapBlockBottomRight]} />
          <View style={[styles.road, styles.roadHorizontalTop]} />
          <View style={[styles.road, styles.roadHorizontalUpper]} />
          <View style={[styles.road, styles.roadHorizontalMiddle]} />
          <View style={[styles.road, styles.roadHorizontalLower]} />
          <View style={[styles.road, styles.roadHorizontalBottom]} />
          <View style={[styles.road, styles.roadVerticalFarLeft]} />
          <View style={[styles.road, styles.roadVerticalLeft]} />
          <View style={[styles.road, styles.roadVerticalMiddle]} />
          <View style={[styles.road, styles.roadVerticalRight]} />
          <View style={[styles.road, styles.roadVerticalFarRight]} />
        </Animated.View>

        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.routeContext,
            { opacity: routeOpacity, transform: [{ translateX: routeTranslateX }] },
          ]}
        >
          <View style={[styles.routeSegment, styles.routeSegmentStart]} />
          <View style={[styles.routeSegment, styles.routeSegmentFirstTurn]} />
          <View style={[styles.routeSegment, styles.routeSegmentMiddle]} />
          <View style={[styles.routeSegment, styles.routeSegmentSecondTurn]} />
          <View style={[styles.routeSegment, styles.routeSegmentArrival]} />
          <View style={[styles.waypoint, styles.waypointStart]} />
          <View style={[styles.waypoint, styles.waypointFirstTurn]} />
          <View style={[styles.waypoint, styles.waypointSecondTurn]} />

          {/* Small popup-style pins make the background read as places on a map. */}
          <View style={[styles.locationBubble, styles.locationBubbleTop]}>
            <View style={styles.locationPin}>
              <View style={styles.locationPinDot} />
            </View>
            <View style={styles.locationBubbleTail} />
          </View>
          <View style={[styles.locationBubble, styles.locationBubbleRight]}>
            <View style={styles.locationPin}>
              <View style={styles.locationPinDot} />
            </View>
            <View style={styles.locationBubbleTail} />
          </View>
          <View style={[styles.locationBubble, styles.locationBubbleBottom]}>
            <View style={styles.locationPin}>
              <View style={styles.locationPinDot} />
            </View>
            <View style={styles.locationBubbleTail} />
          </View>
        </Animated.View>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.markerStage,
              {
                opacity: markerOpacity,
                transform: [{ translateY: markerTranslateY }, { scale: markerScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.markerPulse,
                { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
              ]}
            />
            <View style={styles.markerCard}>
              <Image
                accessibilityLabel={`${branding.appName}, địa điểm tiếp cận trên bản đồ`}
                source={branding.logo}
                style={styles.logo}
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.copy,
              { opacity: copyOpacity, transform: [{ translateY: copyTranslateY }] },
            ]}
          >
            <Text style={styles.appName}>{branding.appName}</Text>
            <Text style={styles.tagline}>{branding.tagline}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: branding.colors.background,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mapContext: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  backgroundWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: branding.colors.primarySoft,
    opacity: 0.18,
  },
  mapBlock: {
    backgroundColor: branding.colors.primarySoft,
    borderColor: branding.colors.grid,
    borderRadius: 22,
    borderWidth: 1,
    opacity: 0.42,
    position: 'absolute',
  },
  mapBlockTopLeft: {
    height: '16%',
    left: '4%',
    top: '4%',
    width: '39%',
  },
  mapBlockTopRight: {
    height: '17%',
    right: '4%',
    top: '25%',
    width: '37%',
  },
  mapBlockBottomLeft: {
    bottom: '8%',
    height: '18%',
    left: '5%',
    width: '37%',
  },
  mapBlockBottomRight: {
    bottom: '7%',
    height: '19%',
    right: '4%',
    width: '38%',
  },
  road: {
    backgroundColor: '#FFFFFF',
    borderColor: branding.colors.grid,
    borderRadius: 99,
    borderWidth: 1,
    opacity: 0.58,
    position: 'absolute',
  },
  roadHorizontalTop: {
    height: 17,
    left: -24,
    right: -24,
    top: '21%',
  },
  roadHorizontalUpper: {
    height: 13,
    left: '10%',
    right: -24,
    top: '33%',
  },
  roadHorizontalMiddle: {
    height: 19,
    left: -24,
    right: '9%',
    top: '45%',
  },
  roadHorizontalLower: {
    height: 13,
    left: -24,
    right: '17%',
    top: '58%',
  },
  roadHorizontalBottom: {
    bottom: '28%',
    height: 16,
    left: '8%',
    right: -24,
  },
  roadVerticalFarLeft: {
    bottom: '16%',
    left: '4%',
    top: '10%',
    width: 12,
  },
  roadVerticalLeft: {
    bottom: -24,
    left: '15%',
    top: -24,
    width: 16,
  },
  roadVerticalMiddle: {
    bottom: '4%',
    left: '46%',
    top: '12%',
    width: 19,
  },
  roadVerticalRight: {
    bottom: -24,
    right: '12%',
    top: -24,
    width: 15,
  },
  roadVerticalFarRight: {
    bottom: '10%',
    right: '29%',
    top: '6%',
    width: 12,
  },
  routeContext: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  routeSegment: {
    backgroundColor: branding.colors.primary,
    borderRadius: 99,
    opacity: 0.38,
    position: 'absolute',
  },
  routeSegmentStart: {
    height: 3,
    left: '8%',
    top: '68%',
    width: '17%',
  },
  routeSegmentFirstTurn: {
    height: '11%',
    left: '24%',
    top: '57%',
    width: 3,
  },
  routeSegmentMiddle: {
    height: 3,
    left: '24%',
    top: '57%',
    width: '17%',
  },
  routeSegmentSecondTurn: {
    height: '11%',
    left: '40%',
    top: '46%',
    width: 3,
  },
  routeSegmentArrival: {
    height: 3,
    left: '40%',
    top: '46%',
    width: '10%',
  },
  waypoint: {
    backgroundColor: branding.colors.background,
    borderColor: branding.colors.primary,
    borderRadius: 7,
    borderWidth: 3,
    height: 14,
    position: 'absolute',
    width: 14,
  },
  waypointStart: {
    left: '7%',
    top: '67.2%',
  },
  waypointFirstTurn: {
    left: '22.7%',
    top: '56.2%',
  },
  waypointSecondTurn: {
    left: '38.7%',
    top: '45.2%',
  },
  locationBubble: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: branding.colors.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: branding.colors.primaryDark,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    width: 38,
    elevation: 2,
  },
  locationBubbleTop: {
    left: '10.5%',
    top: '16.5%',
  },
  locationBubbleRight: {
    right: '7.5%',
    top: '40.5%',
  },
  locationBubbleBottom: {
    bottom: '24.5%',
    left: '41.5%',
  },
  locationBubbleTail: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: branding.colors.primarySoft,
    borderBottomWidth: 1,
    borderRightColor: branding.colors.primarySoft,
    borderRightWidth: 1,
    bottom: -5,
    height: 10,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 10,
  },
  locationPin: {
    alignItems: 'center',
    backgroundColor: branding.colors.primary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    height: 17,
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    width: 17,
  },
  locationPinDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    height: 6,
    transform: [{ rotate: '45deg' }],
    width: 6,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  markerStage: {
    alignItems: 'center',
    height: 148,
    justifyContent: 'center',
    width: 148,
  },
  markerPulse: {
    backgroundColor: branding.colors.primarySoft,
    borderColor: branding.colors.primary,
    borderRadius: 72,
    borderWidth: 2,
    height: 144,
    position: 'absolute',
    width: 144,
  },
  markerCard: {
    alignItems: 'center',
    backgroundColor: branding.colors.background,
    borderColor: branding.colors.primarySoft,
    borderRadius: 36,
    borderWidth: 1,
    height: 132,
    justifyContent: 'center',
    width: 132,
  },
  logo: {
    height: 160,
    resizeMode: 'contain',
    width: 160,
  },
  copy: {
    alignItems: 'center',
    marginTop: 24,
  },
  appName: {
    color: branding.colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  tagline: {
    color: branding.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
