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

const INTRO_DURATION = 3_000;
const CALM_EASING = Easing.bezier(0.22, 1, 0.36, 1);

// Prototype welcome only: it establishes the product identity before the future auth flow begins.
export default function IntroScreen() {
  const router = useRouter();
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
    let isMounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    let reducedMotionTimeout: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (isMounted && !hasNavigated.current) {
        hasNavigated.current = true;
        // TODO(auth): Replace this prototype hand-off with the real session/auth decision.
        router.replace('/login');
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
          <View style={[styles.street, styles.streetUpper]} />
          <View style={[styles.street, styles.streetMiddle]} />
          <View style={[styles.street, styles.streetLower]} />
          <View style={[styles.street, styles.streetVerticalLeft]} />
          <View style={[styles.street, styles.streetVerticalRight]} />
          <View style={[styles.mapBlock, styles.mapBlockTop]} />
          <View style={[styles.mapBlock, styles.mapBlockBottom]} />
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
          <View style={[styles.routeSegment, styles.routeSegmentLeft]} />
          <View style={[styles.routeSegment, styles.routeSegmentMiddle]} />
          <View style={[styles.routeSegment, styles.routeSegmentRight]} />
          <View style={[styles.waypoint, styles.waypointStart]} />
          <View style={[styles.waypoint, styles.waypointMiddle]} />
          <View style={[styles.communityNode, styles.communityNodeTop]} />
          <View style={[styles.communityNode, styles.communityNodeBottom]} />
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
  street: {
    backgroundColor: branding.colors.grid,
    borderRadius: 99,
    height: 2,
    opacity: 0.3,
    position: 'absolute',
  },
  streetUpper: {
    left: -30,
    right: 35,
    top: '24%',
    transform: [{ rotate: '-7deg' }],
  },
  streetMiddle: {
    left: 20,
    right: -50,
    top: '48%',
    transform: [{ rotate: '9deg' }],
  },
  streetLower: {
    left: -40,
    right: -10,
    top: '74%',
    transform: [{ rotate: '-10deg' }],
  },
  streetVerticalLeft: {
    bottom: -50,
    left: '18%',
    top: -60,
    transform: [{ rotate: '8deg' }],
    width: 2,
  },
  streetVerticalRight: {
    bottom: -60,
    right: '16%',
    top: -40,
    transform: [{ rotate: '-12deg' }],
    width: 2,
  },
  mapBlock: {
    backgroundColor: branding.colors.primarySoft,
    borderColor: branding.colors.grid,
    borderRadius: 24,
    borderWidth: 1,
    opacity: 0.34,
    position: 'absolute',
    transform: [{ rotate: '-7deg' }],
  },
  mapBlockTop: {
    height: 84,
    left: -22,
    top: '29%',
    width: 112,
  },
  mapBlockBottom: {
    bottom: '17%',
    height: 96,
    right: -24,
    width: 132,
  },
  routeContext: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  routeSegment: {
    backgroundColor: branding.colors.primary,
    borderRadius: 99,
    height: 3,
    opacity: 0.38,
    position: 'absolute',
  },
  routeSegmentLeft: {
    left: '7%',
    top: '63%',
    transform: [{ rotate: '-18deg' }],
    width: '29%',
  },
  routeSegmentMiddle: {
    left: '32%',
    top: '57%',
    transform: [{ rotate: '-6deg' }],
    width: '25%',
  },
  routeSegmentRight: {
    left: '53%',
    top: '52%',
    transform: [{ rotate: '-18deg' }],
    width: '20%',
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
    left: '8%',
    top: '62%',
  },
  waypointMiddle: {
    left: '33%',
    top: '56%',
  },
  communityNode: {
    backgroundColor: branding.colors.primary,
    borderRadius: 5,
    height: 10,
    opacity: 0.22,
    position: 'absolute',
    width: 10,
  },
  communityNodeTop: {
    right: '17%',
    top: '30%',
  },
  communityNodeBottom: {
    bottom: '25%',
    left: '18%',
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
