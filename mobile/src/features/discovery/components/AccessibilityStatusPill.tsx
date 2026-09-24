import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/shared/theme';

interface AccessibilityStatusPillProps {
  district?: string;
  readinessPercent?: number;
}

export function AccessibilityStatusPill({
  district = 'Q.1',
  readinessPercent = 94,
}: AccessibilityStatusPillProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>
        Tuyến {district}: {readinessPercent}% lối tiếp cận sẵn sàng
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 74,
    left: 14,
    backgroundColor: Colors.overlayBlur,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 202, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.statusGreen,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
});
