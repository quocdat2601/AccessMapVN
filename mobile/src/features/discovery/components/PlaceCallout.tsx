import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { PlaceDto } from '../types';
import { Colors } from '@/shared/theme';

interface PlaceCalloutProps {
  place: PlaceDto;
  onClose: () => void;
}

function ScoreBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  let bg = Colors.accessRed ?? '#e74c3c';
  let label = 'Khó tiếp cận';
  if (score >= 0.8) {
    bg = Colors.accessGreen ?? '#2ecc71';
    label = 'Dễ tiếp cận';
  } else if (score >= 0.5) {
    bg = Colors.accessYellow ?? '#f39c12';
    label = 'Trung bình';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{percentage}% — {label}</Text>
    </View>
  );
}

function FeatureTag({ label, available }: { label: string; available: boolean }) {
  return (
    <View style={[styles.tag, available ? styles.tagAvailable : styles.tagUnavailable]}>
      <Text style={[styles.tagText, available ? styles.tagTextAvailable : styles.tagTextUnavailable]}>
        {available ? '✓' : '✗'} {label}
      </Text>
    </View>
  );
}

export function PlaceCallout({ place, onClose }: PlaceCalloutProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
          <Text style={styles.category}>{place.category}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <ScoreBadge score={place.accessibility_score} />

      <View style={styles.tagRow}>
        <FeatureTag label="Lối dốc" available={place.has_ramp} />
        <FeatureTag label="Thang máy" available={place.has_elevator} />
        <FeatureTag label="Gạch dẫn hướng" available={place.has_tactile_paving} />
        <FeatureTag label="WC tiếp cận" available={place.has_accessible_restroom} />
        <FeatureTag label="Cửa rộng" available={place.door_width_ok} />
      </View>

      {place.accessibility_note && (
        <Text style={styles.note}>{place.accessibility_note}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary ?? '#1a1a2e',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary ?? '#6b7280',
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#6b7280',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagAvailable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  tagUnavailable: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagTextAvailable: {
    color: '#166534',
  },
  tagTextUnavailable: {
    color: '#991b1b',
  },
  note: {
    fontSize: 13,
    color: Colors.textSecondary ?? '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
