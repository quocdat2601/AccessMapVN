import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ScoreMeterRingProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
}

export function ScoreMeterRing({
  score,
  size = 130,
  strokeWidth = 11,
}: ScoreMeterRingProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * clampedScore) / 100;

  let strokeColor = '#10b981'; // >= 80% AutoVerified (Emerald)
  let statusBadge = 'CAO';
  if (clampedScore < 60) {
    strokeColor = '#f43f5e'; // < 60% AwaitingMoreInfo (Rose)
    statusBadge = 'THẤP';
  } else if (clampedScore < 80) {
    strokeColor = '#f59e0b'; // 60-79% PendingModeration (Amber)
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
        <Text style={[styles.scoreNumber, { color: strokeColor }]}>{clampedScore}%</Text>
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
    color: '#94a3b8',
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
