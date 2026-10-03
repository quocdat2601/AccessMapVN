import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/shared/theme';

interface FocusedLocationMarkerProps {
  name: string;
  xPercent: number;
  yPercent: number;
}

export function FocusedLocationMarker({
  name,
  xPercent,
  yPercent,
}: FocusedLocationMarkerProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.42, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.75, 1.16]) }],
  }));

  return (
    <View
      style={[styles.container, { left: `${xPercent}%`, top: `${yPercent}%` }]}
      pointerEvents="none"
      accessibilityLabel={`${name}, địa điểm đang được chọn`}
    >
      <Animated.View style={[styles.pulseRing, pulseStyle]} />
      <View style={styles.radiusCircle} />
      <View style={styles.innerGlow} />
      <View style={styles.pin}>
        <FontAwesome5 name="wheelchair" size={23} color={Colors.surface} />
      </View>
      <View style={styles.pinArrow} />
      <View style={styles.pinShadow} />
      <View style={styles.nameBadge}>
        <Text style={styles.nameText} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 150,
    height: 150,
    marginLeft: -75,
    marginTop: -75,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 3,
    borderColor: Colors.primaryContainer,
    backgroundColor: 'rgba(0, 104, 116, 0.1)',
  },
  radiusCircle: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 104, 116, 0.72)',
    backgroundColor: 'rgba(159, 242, 228, 0.14)',
  },
  innerGlow: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(0, 104, 116, 0.13)',
  },
  pin: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 7,
  },
  pinArrow: {
    width: 15,
    height: 15,
    marginTop: -8,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  pinShadow: {
    width: 20,
    height: 6,
    marginTop: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 55, 63, 0.3)',
  },
  nameBadge: {
    position: 'absolute',
    top: 119,
    maxWidth: 160,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  nameText: {
    color: Colors.primary,
    fontSize: 10.5,
    fontWeight: '800',
  },
});
