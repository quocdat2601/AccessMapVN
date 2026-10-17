import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branding } from '@/shared/config/branding';
import { useAuth } from '@/features/auth';

const ILLUSTRATION = require('@/assets/branding/introillustration.png');
// Native pixel size of the illustration; overlay effects are placed in this coordinate space.
const ILLUSTRATION_WIDTH = 390;
const ILLUSTRATION_HEIGHT = 497;

const INTRO_DURATION = 3_600;
const EXIT_DURATION = 380;
const CALM_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const COLORS = {
  surface: '#FFFFFF',
  panel: '#F7FCFA', // Matches the illustration's own backdrop so the image blends seamlessly.
  accent: '#1FAF7F',
  accentSoft: '#BFE6D9',
  dotIdle: '#BFDCD7',
  title: '#0B4A50',
};

// Twinkling accents placed around the illustration (in illustration pixels).
const SPARKLES = [
  { x: 52, y: 118, size: 9, delay: 0 },
  { x: 344, y: 104, size: 7, delay: 450 },
  { x: 360, y: 300, size: 10, delay: 900 },
  { x: 30, y: 262, size: 6, delay: 1_300 },
  { x: 204, y: 92, size: 6, delay: 650 },
];

// Map pin base inside the illustration, used for the ground ripple.
const PIN_BASE = { x: 255, y: 290 };

const brandPrefix = branding.appName.replace(/VN$/, '');
const brandSuffix = branding.appName.endsWith('VN') ? 'VN' : '';

export default function IntroScreen() {
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const hasNavigated = useRef(false);
  const [isIntroDone, setIntroDone] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // Entrance tracks.
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoRotate = useRef(new Animated.Value(-1)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(-10)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.6)).current;
  const artOpacity = useRef(new Animated.Value(0)).current;
  const artScale = useRef(new Animated.Value(0.9)).current;
  const artTranslateY = useRef(new Animated.Value(28)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(16)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyTranslateY = useRef(new Animated.Value(16)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Ambient loops.
  const floatProgress = useRef(new Animated.Value(0)).current;
  const rippleProgress = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(0)).current;
  const sparkleValues = useRef(SPARKLES.map(() => new Animated.Value(0))).current;

  // Dot progress runs on the JS driver because it animates width and color.
  const dotProgress = useRef(new Animated.Value(0)).current;

  // Exit.
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;
    const running: Animated.CompositeAnimation[] = [];
    let reducedMotionTimeout: ReturnType<typeof setTimeout> | undefined;

    const run = (animation: Animated.CompositeAnimation, onDone?: () => void) => {
      running.push(animation);
      animation.start(({ finished }) => {
        if (finished && isMounted) onDone?.();
      });
    };

    const timing = (
      value: Animated.Value,
      toValue: number,
      duration: number,
      easing = CALM_EASING,
      useNativeDriver = true,
    ) => Animated.timing(value, { toValue, duration, easing, useNativeDriver });

    const startIntro = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (!isMounted) return;

      if (reduceMotion) {
        // Show the final composition immediately and keep the full reading time.
        [logoScale, brandOpacity, panelOpacity, haloScale, artOpacity, artScale].forEach((v) =>
          v.setValue(1),
        );
        [titleOpacity, bodyOpacity, dotsOpacity].forEach((v) => v.setValue(1));
        [logoRotate, brandTranslateY, artTranslateY, titleTranslateY, bodyTranslateY].forEach(
          (v) => v.setValue(0),
        );
        reducedMotionTimeout = setTimeout(() => isMounted && setIntroDone(true), INTRO_DURATION);
        return;
      }

      const entrance = Animated.parallel([
        // Header: logo pops in with a small twist, then the wordmark slides down.
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
          timing(logoRotate, 0, 700),
        ]),
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([timing(brandOpacity, 1, 600), timing(brandTranslateY, 0, 600)]),
        ]),
        // Illustration stage.
        Animated.sequence([
          Animated.delay(200),
          Animated.parallel([
            timing(panelOpacity, 1, 700, Easing.out(Easing.quad)),
            timing(haloScale, 1, 1_100),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(350),
          Animated.parallel([
            timing(artOpacity, 1, 700),
            Animated.spring(artScale, {
              toValue: 1,
              friction: 7,
              tension: 60,
              useNativeDriver: true,
            }),
            timing(artTranslateY, 0, 900),
          ]),
        ]),
        // Copy, staggered.
        Animated.sequence([
          Animated.delay(950),
          Animated.parallel([timing(titleOpacity, 1, 650), timing(titleTranslateY, 0, 650)]),
        ]),
        Animated.sequence([
          Animated.delay(1_100),
          Animated.parallel([timing(bodyOpacity, 1, 650), timing(bodyTranslateY, 0, 650)]),
        ]),
        Animated.sequence([Animated.delay(1_250), timing(dotsOpacity, 1, 400)]),
      ]);
      run(entrance);

      // Gentle hover of the illustration.
      run(
        Animated.loop(
          Animated.sequence([
            timing(floatProgress, 1, 1_600, Easing.inOut(Easing.sin)),
            timing(floatProgress, 0, 1_600, Easing.inOut(Easing.sin)),
          ]),
        ),
      );

      // Ripple under the map pin.
      run(
        Animated.sequence([
          Animated.delay(900),
          Animated.loop(
            Animated.sequence([
              timing(rippleProgress, 1, 1_400, Easing.out(Easing.cubic)),
              timing(rippleProgress, 0, 0),
            ]),
          ),
        ]),
      );

      // Soft breathing ring around the logo.
      run(
        Animated.sequence([
          Animated.delay(600),
          Animated.loop(
            Animated.sequence([
              timing(logoPulse, 1, 1_500, Easing.out(Easing.quad)),
              timing(logoPulse, 0, 0),
            ]),
          ),
        ]),
      );

      // Staggered twinkles.
      sparkleValues.forEach((value, index) => {
        run(
          Animated.sequence([
            Animated.delay(800 + SPARKLES[index].delay),
            Animated.loop(
              Animated.sequence([
                timing(value, 1, 650, Easing.out(Easing.quad)),
                timing(value, 0, 750, Easing.in(Easing.quad)),
                Animated.delay(500),
              ]),
            ),
          ]),
        );
      });

      // Dots double as a progress indicator across the intro's lifetime.
      run(
        Animated.sequence([
          Animated.delay(1_300),
          timing(dotProgress, 1, 600, Easing.inOut(Easing.cubic), false),
          Animated.delay(450),
          timing(dotProgress, 2, 600, Easing.inOut(Easing.cubic), false),
          Animated.delay(INTRO_DURATION - 1_300 - 600 - 450 - 600),
        ]),
        () => setIntroDone(true),
      );
    };

    void startIntro();

    return () => {
      isMounted = false;
      running.forEach((animation) => animation.stop());
      if (reducedMotionTimeout) clearTimeout(reducedMotionTimeout);
    };
    // Animated values are stable refs; the intro must only run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateNext = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace(session ? '/map' : '/login');
  }, [router, session]);

  // Leave only when both the intro has played and the auth state is known.
  useEffect(() => {
    if (!isIntroDone || isLoading || hasNavigated.current) return;

    const exit = Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.04,
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    exit.start(() => navigateNext());

    return () => exit.stop();
  }, [exitOpacity, exitScale, isIntroDone, isLoading, navigateNext]);

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

  // Fit the illustration inside the stage while keeping its aspect ratio.
  const artWidth = Math.min(stage.width, (stage.height * ILLUSTRATION_WIDTH) / ILLUSTRATION_HEIGHT);
  const artHeight = (artWidth * ILLUSTRATION_HEIGHT) / ILLUSTRATION_WIDTH;
  const unit = artWidth / ILLUSTRATION_WIDTH;

  const logoSpin = logoRotate.interpolate({ inputRange: [-1, 0], outputRange: ['-20deg', '0deg'] });
  const floatY = floatProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const rippleScale = rippleProgress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] });
  const rippleOpacity = rippleProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.55, 0],
  });
  const logoPulseScale = logoPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const logoPulseOpacity = logoPulse.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.35, 0],
  });

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          style={[styles.container, { opacity: exitOpacity, transform: [{ scale: exitScale }] }]}
        >
          {/* Brand header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logoWrap}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.logoPulse,
                    { opacity: logoPulseOpacity, transform: [{ scale: logoPulseScale }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.logoBadge,
                    { transform: [{ scale: logoScale }, { rotate: logoSpin }] },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="wheelchair-accessibility"
                    size={22}
                    color={COLORS.surface}
                  />
                </Animated.View>
              </View>
              <Animated.Text
                accessibilityRole="header"
                style={[
                  styles.brandName,
                  { opacity: brandOpacity, transform: [{ translateY: brandTranslateY }] },
                ]}
              >
                {brandPrefix}
                {brandSuffix ? <Text style={styles.brandSuffix}> {brandSuffix}</Text> : null}
              </Animated.Text>
            </View>
            <Animated.Text
              style={[
                styles.tagline,
                { opacity: brandOpacity, transform: [{ translateY: brandTranslateY }] },
              ]}
            >
              {branding.tagline}
            </Animated.Text>
          </View>

          {/* Illustration stage */}
          <Animated.View style={[styles.stage, { opacity: panelOpacity }]} onLayout={onStageLayout}>
            <Animated.View
              pointerEvents="none"
              style={[styles.halo, { transform: [{ scale: haloScale }] }]}
            />
            {artWidth > 0 ? (
              <Animated.View
                style={{
                  height: artHeight,
                  width: artWidth,
                  opacity: artOpacity,
                  transform: [{ translateY: artTranslateY }, { translateY: floatY }, { scale: artScale }],
                }}
              >
                <Image
                  accessibilityLabel="Người dùng xe lăn tra cứu các địa điểm thân thiện trên bản đồ"
                  source={ILLUSTRATION}
                  style={styles.illustration}
                />

                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.ripple,
                    {
                      height: 44 * unit,
                      left: (PIN_BASE.x - 44) * unit,
                      top: (PIN_BASE.y - 22) * unit,
                      width: 88 * unit,
                      borderRadius: 44 * unit,
                      opacity: rippleOpacity,
                      transform: [{ scale: rippleScale }],
                    },
                  ]}
                />

                {SPARKLES.map((sparkle, index) => {
                  const value = sparkleValues[index];
                  const size = sparkle.size * unit;
                  return (
                    <Animated.View
                      key={`${sparkle.x}-${sparkle.y}`}
                      pointerEvents="none"
                      style={[
                        styles.sparkle,
                        {
                          height: size,
                          left: sparkle.x * unit - size / 2,
                          top: sparkle.y * unit - size / 2,
                          width: size,
                          opacity: value,
                          transform: [
                            { rotate: '45deg' },
                            {
                              scale: value.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 1.15],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  );
                })}
              </Animated.View>
            ) : null}
          </Animated.View>

          {/* Copy */}
          <View style={styles.copy}>
            <Animated.Text
              style={[
                styles.title,
                { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
              ]}
            >
              Khám phá những địa điểm{'\n'}thân thiện với bạn
            </Animated.Text>
            <Animated.Text
              style={[
                styles.body,
                { opacity: bodyOpacity, transform: [{ translateY: bodyTranslateY }] },
              ]}
            >
              Tìm kiếm, đóng góp và cùng xây dựng{'\n'}một cộng đồng dễ tiếp cận hơn.
            </Animated.Text>

            <Animated.View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.dots, { opacity: dotsOpacity }]}
            >
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      width: dotProgress.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [8, 22, 8],
                        extrapolate: 'clamp',
                      }),
                      backgroundColor: dotProgress.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [COLORS.dotIdle, branding.colors.primary, COLORS.dotIdle],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              ))}
            </Animated.View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logoWrap: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  logoPulse: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    height: 40,
    position: 'absolute',
    width: 40,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: branding.colors.primary,
    borderColor: COLORS.accentSoft,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: branding.colors.primaryDark,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 40,
    elevation: 3,
  },
  brandName: {
    color: COLORS.title,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  brandSuffix: {
    color: COLORS.accent,
  },
  tagline: {
    color: branding.colors.mutedText,
    fontSize: 14,
    marginTop: 6,
  },
  stage: {
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  halo: {
    aspectRatio: 1,
    backgroundColor: '#EAF6F1',
    borderRadius: 999,
    position: 'absolute',
    width: '115%',
  },
  illustration: {
    height: '100%',
    resizeMode: 'contain',
    width: '100%',
  },
  ripple: {
    backgroundColor: 'rgba(31, 175, 127, 0.18)',
    borderColor: COLORS.accent,
    borderWidth: 1.5,
    position: 'absolute',
  },
  sparkle: {
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    position: 'absolute',
  },
  copy: {
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  title: {
    color: COLORS.title,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 32,
    textAlign: 'center',
  },
  body: {
    color: branding.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 10,
    marginTop: 22,
  },
  dot: {
    borderRadius: 4,
    height: 8,
  },
});
