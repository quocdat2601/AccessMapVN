import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface ScoreMeterRingProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  onAnimationComplete?: () => void;
}

export function ScoreMeterRing({
  score,
  size = 130,
  strokeWidth = 11,
  animated = true,
  onAnimationComplete,
}: ScoreMeterRingProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayScore, setDisplayScore] = useState(animated ? 0 : clampedScore);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      setDisplayScore(clampedScore);
      onAnimationComplete?.();
      return;
    }

    animatedValue.setValue(0);
    setDisplayScore(0);

    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    Animated.timing(animatedValue, {
      toValue: clampedScore,
      duration: 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onAnimationComplete?.();
      }
    });

    return () => {
      animatedValue.removeListener(listenerId);
      animatedValue.stopAnimation();
    };
  }, [animated, clampedScore]);

  const strokeDashoffset = circumference - (circumference * displayScore) / 100;

  let strokeColor = '#10b981'; // >= 90% AutoVerified (Emerald)
  let statusBadge = 'CAO';
  if (displayScore < 60) {
    strokeColor = '#f43f5e'; // < 60% AwaitingMoreInfo (Rose)
    statusBadge = 'THẤP';
  } else if (displayScore < 90) {
    strokeColor = '#f59e0b'; // 60-89% PendingModeration (Amber)
    statusBadge = 'TRUNG BÌNH';
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.contentWrap}>
        <Text style={[styles.scoreNumber, { color: strokeColor }]}>{displayScore}%</Text>
        <Text style={styles.scoreLabel}>ĐỘ TIN CẬY</Text>
        <View style={[styles.badge, { backgroundColor: `${strokeColor}25` }]}>
          <Text style={[styles.badgeText, { color: strokeColor }]}>{statusBadge}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scoreLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: -1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
