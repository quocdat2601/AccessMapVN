import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LocationPoi } from '../types';
import { LocationMarker } from './LocationMarker';
import { FocusedLocationMarker } from './FocusedLocationMarker';
import { Colors } from '@/shared/theme';

export interface MapFocusTarget {
  key: number;
  poiId?: string;
  name: string;
  xPercent: number;
  yPercent: number;
}

interface MapCanvasProps {
  locations: LocationPoi[];
  onSelectLocation: (id: string) => void;
  zoomLevel?: number;
  focusTarget?: MapFocusTarget | null;
  onMapPress?: () => void;
}

export function MapCanvas({
  locations,
  onSelectLocation,
  zoomLevel = 1,
  focusTarget,
  onMapPress,
}: MapCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animatedScale = useSharedValue(zoomLevel);
  const animatedTranslateX = useSharedValue(0);
  const animatedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (focusTarget && canvasSize.width > 0 && canvasSize.height > 0) {
      const targetX = canvasSize.width * 0.5;
      const targetY = canvasSize.height * 0.25;
      const locationX = canvasSize.width * (focusTarget.xPercent / 100);
      const locationY = canvasSize.height * (focusTarget.yPercent / 100);

      animatedScale.value = withTiming(1.38, {
        duration: 560,
        easing: Easing.out(Easing.cubic),
      });
      animatedTranslateX.value = withTiming((targetX - locationX) * 0.74, {
        duration: 560,
        easing: Easing.out(Easing.cubic),
      });
      animatedTranslateY.value = withTiming((targetY - locationY) * 0.74, {
        duration: 560,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    animatedScale.value = withTiming(zoomLevel, { duration: 240 });
    animatedTranslateX.value = withTiming(0, { duration: 240 });
    animatedTranslateY.value = withTiming(0, { duration: 240 });
  }, [
    animatedScale,
    animatedTranslateX,
    animatedTranslateY,
    canvasSize.height,
    canvasSize.width,
    focusTarget,
    zoomLevel,
  ]);

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animatedTranslateX.value },
      { translateY: animatedTranslateY.value },
      { scale: animatedScale.value },
    ],
  }));

  return (
    <View
      style={styles.canvasContainer}
      onLayout={({ nativeEvent }) => {
        const { width, height } = nativeEvent.layout;
        setCanvasSize((current) =>
          current.width === width && current.height === height ? current : { width, height }
        );
      }}
    >
      <Animated.View style={[styles.mapLayer, animatedMapStyle]}>
      {/* ── Realistic Stylized Saigon Urban Grid (SVG) ──────────────── */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 700"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#e5eeed" />
            <Stop offset="1" stopColor="#dce8e6" />
          </LinearGradient>
          <LinearGradient id="buildingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#f3f6f5" />
            <Stop offset="1" stopColor="#e8eceb" />
          </LinearGradient>
          <LinearGradient id="parkGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#d6eedc" />
            <Stop offset="1" stopColor="#c5e6cc" />
          </LinearGradient>
        </Defs>

        {/* Base Map Canvas */}
        <Rect width="400" height="700" fill="url(#bgGrad)" />

        {/* Parks & Greenery */}
        <Path d="M 0 540 L 70 540 L 70 650 L 0 650 Z" fill="url(#parkGrad)" />
        <Path d="M 330 80 L 400 80 L 400 160 L 330 160 Z" fill="url(#parkGrad)" />

        {/* City Urban Blocks */}
        <G fill="url(#buildingGrad)" stroke="#cdd9d6" strokeWidth="1">
          {/* Block 1 (Top-Left: Le Thanh Ton & Pasteur) */}
          <Path d="M 40 100 L 140 135 L 120 180 L 20 145 Z" />
          <Path d="M 160 140 L 260 175 L 240 220 L 140 185 Z" />

          {/* Block 2 (Center-Right: Saigon Centre & Takashimaya Complex) */}
          <Path d="M 180 250 L 290 320 L 250 380 L 140 310 Z" />
          <Path d="M 210 270 L 260 300 L 240 330 L 190 300 Z" fill="#e2eae8" />

          {/* Block 3 (Rex Hotel area) */}
          <Path d="M 230 70 L 320 100 L 300 150 L 210 120 Z" />

          {/* Block 4 (Ben Thanh & Saigon Square area) */}
          <Path d="M 80 340 L 170 400 L 140 450 L 50 390 Z" />
          <Path d="M 100 470 L 180 520 L 150 560 L 70 510 Z" />

          {/* Block 5 (South-East: Huynh Thuc Khang) */}
          <Path d="M 270 420 L 380 490 L 340 560 L 230 490 Z" />
        </G>

        {/* Main Road Arteries */}
        {/* Le Loi Boulevard (Diagonal wide thoroughfare) */}
        <Path
          d="M -30 230 L 430 520"
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
        />
        <Path
          d="M -30 230 L 430 520"
          stroke="#e8eceb"
          strokeWidth="32"
          strokeLinecap="round"
        />

        {/* Nam Ky Khoi Nghia */}
        <Path
          d="M 60 0 L 280 700"
          stroke="#ffffff"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <Path
          d="M 60 0 L 280 700"
          stroke="#e8eceb"
          strokeWidth="24"
          strokeLinecap="round"
        />

        {/* Pasteur Street */}
        <Path
          d="M 160 0 L 340 600"
          stroke="#ffffff"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Le Thanh Ton */}
        <Path
          d="M 0 80 L 400 180"
          stroke="#ffffff"
          strokeWidth="22"
          strokeLinecap="round"
        />

        {/* Nguyen Trung Truc */}
        <Path
          d="M 0 300 L 120 700"
          stroke="#ffffff"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Huynh Thuc Khang */}
        <Path
          d="M 200 480 L 400 620"
          stroke="#ffffff"
          strokeWidth="20"
          strokeLinecap="round"
        />

        {/* Pedestrian Crosswalk & Ramp Indicators */}
        <G stroke="#00a896" strokeWidth="2.5" strokeDasharray="3, 3" opacity={0.7}>
          <Path d="M 175 320 L 195 335" />
          <Path d="M 140 290 L 160 305" />
          <Path d="M 215 350 L 235 365" />
        </G>

        {/* User Current Location Indicator Marker */}
        <G>
          <Circle cx="155" cy="335" r="14" fill="rgba(0, 104, 116, 0.18)" />
          <Circle cx="155" cy="335" r="7" fill="#006874" stroke="#ffffff" strokeWidth="2.5" />
          <Circle cx="155" cy="335" r="2.5" fill="#ffffff" />
        </G>
      </Svg>

      {/* ── Street Names Overlay (Rotated Typography) ─────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Le Loi */}
        <Text style={[styles.streetLabel, { left: 160, top: 310, transform: [{ rotate: '34deg' }] }]}>
          Lê Lợi
        </Text>
        <Text style={[styles.streetLabel, { left: 260, top: 380, transform: [{ rotate: '34deg' }] }]}>
          Lê Lợi
        </Text>

        {/* Nam Ky Khoi Nghia */}
        <Text style={[styles.streetLabel, { left: 110, top: 220, transform: [{ rotate: '70deg' }] }]}>
          Nam Kỳ Khởi Nghĩa
        </Text>
        <Text style={[styles.streetLabel, { left: 200, top: 490, transform: [{ rotate: '70deg' }] }]}>
          Nam Kỳ Khởi Nghĩa
        </Text>

        {/* Pasteur */}
        <Text style={[styles.streetLabel, { left: 175, top: 80, transform: [{ rotate: '72deg' }] }]}>
          Pasteur
        </Text>

        {/* Le Thanh Ton */}
        <Text style={[styles.streetLabel, { left: 30, top: 75, transform: [{ rotate: '15deg' }] }]}>
          Lê Thánh Tôn
        </Text>

        {/* Nguyen Trung Truc */}
        <Text style={[styles.streetLabel, { left: 10, top: 410, transform: [{ rotate: '72deg' }] }]}>
          Nguyễn Trung Trực
        </Text>

        {/* Huynh Thuc Khang */}
        <Text style={[styles.streetLabel, { left: 260, top: 560, transform: [{ rotate: '35deg' }] }]}>
          Đ. Huỳnh Thúc Kháng
        </Text>
      </View>

      {onMapPress ? (
        <Pressable
          style={styles.mapTapTarget}
          onPress={onMapPress}
          accessibilityRole="button"
          accessibilityLabel="Đóng chi tiết và quay lại bản đồ"
        />
      ) : null}

      {/* ── Interactive POI Markers ───────────────────────────────── */}
      {locations
        .filter((poi) => poi.id !== focusTarget?.poiId)
        .map((poi) => (
          <LocationMarker key={poi.id} poi={poi} onPress={onSelectLocation} />
        ))}
      {focusTarget ? (
        <FocusedLocationMarker
          key={focusTarget.key}
          name={focusTarget.name}
          xPercent={focusTarget.xPercent}
          yPercent={focusTarget.yPercent}
        />
      ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    backgroundColor: Colors.mapCanvasBg || '#e5eeed',
    overflow: 'hidden',
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mapTapTarget: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
  },
  streetLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textStreet,
    opacity: 0.85,
    letterSpacing: -0.2,
  },
});
