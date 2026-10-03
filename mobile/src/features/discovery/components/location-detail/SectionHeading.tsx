import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface SectionHeadingProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  meta?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeading({
  icon,
  title,
  meta,
  actionLabel,
  onActionPress,
}: SectionHeadingProps) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={22} color={Colors.primaryContainer} />
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {actionLabel ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onActionPress}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    flexShrink: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  action: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
