import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { branding } from '@/shared/config/branding';
import { Colors } from '@/shared/theme';

interface HeaderBarProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export function HeaderBar({ onNotificationPress, onProfilePress }: HeaderBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.contentRow}>
        <View style={styles.leftSection}>
          {/* Reuse the same replaceable brand asset shown on Intro and Login. */}
          <View style={styles.logoBadge}>
            <Image
              accessibilityIgnoresInvertColors
              source={branding.logo}
              style={styles.logoImage}
            />
          </View>

          {/* Brand Titles */}
          <View style={styles.titleContainer}>
            <Text style={styles.brandSubtitle}>{branding.appName}</Text>
            <Text style={styles.brandTitle}>Location Gallery</Text>
          </View>
        </View>

        {/* Right Actions: Notification & Profile */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Hồ sơ cá nhân"
            activeOpacity={0.7}
          >
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.overlayBlur,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    width: '100%',
  },
  contentRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    height: 48,
    resizeMode: 'contain',
    width: 48,
  },
  titleContainer: {
    justifyContent: 'center',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.poiHospital,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
