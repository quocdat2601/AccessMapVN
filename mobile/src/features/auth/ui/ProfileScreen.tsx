import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { startContributionFlow } from '@/features/contribution';
import {
  AccessibilityFilterModal,
  DEFAULT_ACCESSIBILITY_FILTERS,
  getSelectedCriteriaList,
  normalizeAccessibilityFilters,
  type AccessibilityFilterState,
} from '@/features/discovery/ui/components/AccessibilityFilterModal';
import { apiClient } from '@/shared/api/client';
import { BottomNavBar } from '@/shared/ui/BottomNavBar';
import { useAuth } from '../model/AuthProvider';
import { loadSavedFavorites, subscribeFavorites } from '../model/favoritesStorage';
import { FavoritesModal } from './FavoritesModal';
import { LeaderboardModal } from './LeaderboardModal';
import { AccessibilitySettingsModal } from '@/features/accessibility';

const DEFAULT_CHIP_LABELS = ['Lối đi không bậc', 'Lối vào rộng >90cm', 'Thang máy'];

interface ProfileScreenProps {
  hideBottomNav?: boolean;
}

export default function ProfileScreen({ hideBottomNav = false }: ProfileScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    12
  );

  const { isGuest, sendPasswordReset, signOut, user, userProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [showProfileFilterModal, setShowProfileFilterModal] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const [savedFilters, setSavedFilters] = useState<AccessibilityFilterState>(
    DEFAULT_ACCESSIBILITY_FILTERS
  );
  const [favoritesCount, setFavoritesCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function loadProfileData() {
      try {
        const rawPrefs = await AsyncStorage.getItem('@accessmap_saved_preferences');
        if (rawPrefs && active) {
          setSavedFilters(normalizeAccessibilityFilters(JSON.parse(rawPrefs)));
        }
      } catch {}

      try {
        const favs = await loadSavedFavorites(!isGuest);
        if (active) {
          setFavoritesCount(favs.length);
        }
      } catch {}
    }

    void loadProfileData();
    return () => {
      active = false;
    };
  }, [isGuest]);

  useEffect(() => {
    return subscribeFavorites((items) => {
      setFavoritesCount(items.length);
    });
  }, []);

  const handleSaveAccessibilityProfile = useCallback(
    async (filters: AccessibilityFilterState) => {
      setIsSavingPrefs(true);
      try {
        const normalized = normalizeAccessibilityFilters(filters);
        await AsyncStorage.setItem('@accessmap_saved_preferences', JSON.stringify(normalized));
        setSavedFilters(normalized);
        if (user) {
          await apiClient.put('/api/v1/users/me/preferences', normalized, { auth: 'optional' }).catch(() => {});
        }
      } finally {
        setIsSavingPrefs(false);
      }
    },
    [user]
  );

  const selectedCriteria = useMemo(() => getSelectedCriteriaList(savedFilters), [savedFilters]);
  const visibleChipLabels = useMemo(() => {
    if (selectedCriteria.length === 0) return DEFAULT_CHIP_LABELS;
    return selectedCriteria.slice(0, 3).map((c) => c.label);
  }, [selectedCriteria]);
  const extraCriteriaCount = useMemo(() => {
    if (selectedCriteria.length > 3) return selectedCriteria.length - 3;
    return 2;
  }, [selectedCriteria.length]);

  const getInitials = (name: string) => {
    if (!name) return 'MA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất tài khoản', 'Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
            router.replace('/map' as any);
          } catch (error) {
            Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể đăng xuất.');
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleAccountSettings = () => {
    if (isGuest) {
      router.push('/login' as any);
      return;
    }
    Alert.alert(
      'Cài đặt tài khoản & Tiện ích',
      `Tài khoản: ${userProfile.email || userProfile.fullName}`,
      [
        {
          text: 'Cài đặt trợ năng',
          onPress: () => setShowAccessibilitySettings(true),
        },
        {
          text: 'Gửi email đổi mật khẩu',
          onPress: async () => {
            if (!userProfile.email) return;
            setIsResettingPassword(true);
            try {
              await sendPasswordReset(userProfile.email);
              Alert.alert('Đã gửi liên kết', `Đã gửi hướng dẫn tới ${userProfile.email}.`);
            } catch (error) {
              Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể gửi email.');
            } finally {
              setIsResettingPassword(false);
            }
          },
        },
        { text: 'Đóng', style: 'cancel' },
      ]
    );
  };

  const displayFullName = isGuest
    ? 'Nguyễn Minh Anh (Khách)'
    : userProfile.fullName || 'Nguyễn Minh Anh';
  const displayContact = isGuest
    ? '+84 98 ••• •842'
    : userProfile.email || '+84 98 ••• •842';
  const displayExpPoints = userProfile.expPoints > 0 ? userProfile.expPoints : 350;
  const displayContributions =
    userProfile.contributionsCount > 0 ? userProfile.contributionsCount : 18;
  const displayTier =
    userProfile.reputationTier && userProfile.reputationTier !== 'Tân binh'
      ? userProfile.reputationTier
      : 'Người kiểm định Cấp 3';

  return (
    <View style={styles.container}>
      {/* Top App Bar matching Figma */}
      <View style={[styles.topAppBar, { paddingTop: safeTop }]}>
        <View style={styles.topAppBarRow}>
          <View style={styles.topBarLeft}>
            <View style={styles.wheelchairCircle}>
              <MaterialCommunityIcons name="wheelchair-accessibility" size={19} color="#004F58" />
            </View>
            <Text style={styles.topBarTitle}>Cá Nhân</Text>
          </View>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topIconBtn}
              onPress={handleAccountSettings}
              accessibilityLabel="Cài đặt"
            >
              <Ionicons name="settings-outline" size={20} color="#334155" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topUserCircle}
              onPress={() => {
                if (isGuest) router.push('/login' as any);
              }}
              accessibilityLabel="Tài khoản"
            >
              <Ionicons name="person-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Heading Row */}
        <View style={styles.pageHeadingRow}>
          <View>
            <Text style={styles.pageOverline}>TÀI KHOẢN & TIỆN ÍCH</Text>
            <Text style={styles.pageMainTitle}>Cá nhân</Text>
          </View>
          <TouchableOpacity
            style={styles.pageGearCircle}
            onPress={handleAccountSettings}
            activeOpacity={0.78}
          >
            {isResettingPassword ? (
              <ActivityIndicator size="small" color="#004F58" />
            ) : (
              <Ionicons name="settings-outline" size={20} color="#334155" />
            )}
          </TouchableOpacity>
        </View>

        {/* 1. User Identity Card */}
        <View style={styles.card}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrapper}>
              {userProfile.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{getInitials(displayFullName)}</Text>
                </View>
              )}
              <View style={styles.verifiedAvatarDot}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.identityInfo}>
              <Text style={styles.identityName} numberOfLines={1}>
                {displayFullName}
              </Text>
              <Text style={styles.identityPhone} numberOfLines={1}>
                {displayContact}
              </Text>
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#004F58" />
                <Text style={styles.verifiedPillText}>
                  {isGuest ? 'Chế độ Khách' : 'Đã xác thực'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editCircleBtn}
              onPress={handleAccountSettings}
              accessibilityLabel="Chỉnh sửa hồ sơ"
              activeOpacity={0.78}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#004F58" />
            </TouchableOpacity>
          </View>

          {isGuest && (
            <TouchableOpacity
              style={styles.guestLoginBanner}
              onPress={() => router.push('/login' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={17} color="#004F58" />
              <Text style={styles.guestLoginBannerText}>
                Đăng nhập để đồng bộ hồ sơ tiếp cận & tích lũy điểm thưởng
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#004F58" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Hồ sơ tiếp cận Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.mintCircleIcon}>
                <MaterialCommunityIcons name="wheelchair-accessibility" size={19} color="#004F58" />
              </View>
              <Text style={styles.cardTitle}>Hồ sơ tiếp cận</Text>
            </View>
            <TouchableOpacity
              style={styles.cardLinkBtn}
              onPress={() => setShowProfileFilterModal(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.cardLinkText}>Quản lý hồ sơ</Text>
              <Ionicons name="chevron-forward" size={14} color="#006874" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileStatusRow}>
            <Text style={styles.profileStatusDesc}>
              Đang lưu tiêu chí ưu tiên di chuyển cá nhân
            </Text>
            <View style={styles.establishedPill}>
              <Text style={styles.establishedPillText}>Đã thiết lập</Text>
            </View>
          </View>

          <View style={styles.criteriaChipsWrap}>
            {visibleChipLabels.map((label) => (
              <View key={label} style={styles.criterionChip}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#006874" />
                <Text style={styles.criterionChipText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sparkleNoteRow}>
            <Ionicons name="sparkles-outline" size={15} color="#006874" />
            <Text style={styles.sparkleNoteText}>
              +{extraCriteriaCount} tiêu chí khác được lưu làm mặc định khi tìm kiếm hành trình.
            </Text>
          </View>
        </View>

        {/* 3. Địa điểm yêu thích Card */}
        <TouchableOpacity
          style={[styles.card, styles.favoriteCardRow]}
          onPress={() => setShowFavorites(true)}
          activeOpacity={0.82}
        >
          <View style={styles.mintSquareIcon}>
            <Ionicons name="bookmark" size={18} color="#004F58" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Địa điểm yêu thích</Text>
            <Text style={styles.favoriteSubText} numberOfLines={1}>
              Các địa điểm bạn đã lưu để tra cứu nhanh
            </Text>
          </View>
          <View style={styles.countBadgePill}>
            <Text style={styles.countBadgeText}>{favoritesCount} địa điểm</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#64748B" />
        </TouchableOpacity>

        {/* 3. Điểm thưởng & danh tiếng Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.mintCircleIcon}>
                <MaterialCommunityIcons name="medal-outline" size={19} color="#004F58" />
              </View>
              <Text style={styles.cardTitle}>Điểm thưởng & danh tiếng</Text>
            </View>
            <TouchableOpacity
              style={styles.cardLinkBtn}
              onPress={() => setShowLeaderboard(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.cardLinkText}>Xem chi tiết</Text>
              <Ionicons name="chevron-forward" size={14} color="#006874" />
            </TouchableOpacity>
          </View>

          {/* Sub-box 1: Điểm thưởng khả dụng */}
          <View style={styles.rewardInnerBox}>
            <View style={styles.rewardBoxTopRow}>
              <Text style={styles.rewardBoxLabelTeal}>Điểm thưởng khả dụng</Text>
              <MaterialCommunityIcons name="star-circle-outline" size={18} color="#006874" />
            </View>
            <View style={styles.pointsHeroRow}>
              <Text style={styles.pointsBigNumber}>{displayExpPoints}</Text>
              <Text style={styles.pointsUnit}>điểm</Text>
            </View>
            <View style={styles.rewardBoxFootRow}>
              <MaterialCommunityIcons name="star-outline" size={14} color="#006874" />
              <Text style={styles.rewardBoxFootText}>Tích luỹ từ các đóng góp tiếp cận chính xác.</Text>
            </View>
          </View>

          {/* Sub-box 2: Danh tiếng đóng góp */}
          <View style={styles.rewardInnerBox}>
            <View style={styles.rewardBoxTopRow}>
              <Text style={styles.rewardBoxLabelGray}>Danh tiếng đóng góp</Text>
              <MaterialCommunityIcons name="seal-variant" size={18} color="#475569" />
            </View>
            <View style={styles.tierNameRow}>
              <View style={styles.tierGreenDot} />
              <Text style={styles.tierNameText}>{displayTier}</Text>
            </View>
            <View style={styles.rewardBoxFootRow}>
              <MaterialCommunityIcons name="check-decagram-outline" size={14} color="#006874" />
              <Text style={styles.rewardBoxFootText}>
                Dựa trên {displayContributions} lượt xác minh chuẩn xác.
              </Text>
            </View>
          </View>

          {/* Mint progress banner */}
          <TouchableOpacity
            style={styles.levelUpBanner}
            onPress={() => setShowLeaderboard(true)}
            activeOpacity={0.82}
          >
            <Ionicons name="flag-outline" size={15} color="#004F58" />
            <Text style={styles.levelUpBannerText}>
              Còn 2 đóng góp nữa để thăng cấp!{' '}
              <Text style={styles.levelUpBannerLink}>Khám phá</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. Menu List Card */}
        <View style={styles.menuCard}>
          {/* Cài đặt Trợ Năng dành cho Người khuyết tật */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowAccessibilitySettings(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#E6F8F5' }]}>
              <MaterialCommunityIcons name="human-wheelchair" size={20} color="#004F58" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.menuRowLabel}>Cài đặt trợ năng</Text>
                <View style={styles.a11yBadge}>
                  <Text style={styles.a11yBadgeText}>WCAG AAA</Text>
                </View>
              </View>
              <Text style={styles.menuRowSubLabel}>
                Chữ lớn, tương phản cao, rung &amp; giọng đọc
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleAccountSettings}
            activeOpacity={0.75}
          >
            <View style={styles.menuIconCircle}>
              <MaterialCommunityIcons name="account-cog-outline" size={19} color="#334155" />
            </View>
            <Text style={styles.menuRowLabel}>Cài đặt tài khoản</Text>
            <Ionicons name="chevron-forward" size={17} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                'Quyền riêng tư & Dữ liệu vị trí',
                'Vị trí GPS chỉ được sử dụng để tìm kiếm địa điểm tiếp cận xung quanh và đối chiếu khoảng cách (≤50m) khi bạn gửi ảnh đóng góp thực địa.'
              )
            }
            activeOpacity={0.75}
          >
            <View style={styles.menuIconCircle}>
              <MaterialCommunityIcons name="shield-check-outline" size={19} color="#334155" />
            </View>
            <Text style={styles.menuRowLabel}>Quyền riêng tư & Dữ liệu vị trí</Text>
            <Ionicons name="chevron-forward" size={17} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/reports' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.menuIconCircle}>
              <MaterialCommunityIcons name="headset" size={19} color="#334155" />
            </View>
            <Text style={styles.menuRowLabel}>Trợ giúp & Phản hồi khẩn cấp</Text>
            <Ionicons name="chevron-forward" size={17} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                'Điều khoản & Tiêu chuẩn tiếp cận',
                'Hệ thống đánh giá mức độ tiếp cận dựa trên Quy chuẩn kỹ thuật quốc gia QCVN 10:2014/BXD (Độ dốc ram ≤ 1/12, Cửa thông thủy ≥ 90cm, Thang máy & Gạch dẫn hướng xúc giác).'
              )
            }
            activeOpacity={0.75}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="document-text-outline" size={18} color="#334155" />
            </View>
            <Text style={styles.menuRowLabel}>Điều khoản & Tiêu chuẩn tiếp cận</Text>
            <Ionicons name="chevron-forward" size={17} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => {
              if (isGuest) {
                router.push('/login' as any);
              } else {
                handleSignOut();
              }
            }}
            disabled={isSigningOut}
            activeOpacity={0.75}
          >
            <View style={styles.menuIconCircleRed}>
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <Ionicons name="log-out-outline" size={19} color="#B91C1C" />
              )}
            </View>
            <Text style={styles.menuRowLabelRed}>
              {isGuest ? 'Đăng nhập tài khoản' : 'Đăng xuất tài khoản'}
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#B91C1C" />
          </TouchableOpacity>
        </View>

        {/* 6. Dark Teal CTA Banner matching Figma */}
        <View style={styles.ctaDarkCard}>
          <View style={styles.ctaIconCircle}>
            <MaterialCommunityIcons name="hand-heart-outline" size={22} color="#99F6E4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Cùng mở rộng dữ liệu</Text>
            <Text style={styles.ctaSub} numberOfLines={2}>
              Đánh giá lối dốc và bậc tam cấp giúp 1.200+ người di chuyển an toàn
            </Text>
          </View>
          <TouchableOpacity
            style={styles.ctaMintButton}
            onPress={() =>
              startContributionFlow(router, {
                id: 's9.01',
                name: 'Tòa S9.01 - The Origami',
                latitude: 10.8454,
                longitude: 106.8373,
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.ctaMintButtonText}>Chụp ảnh</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerTextWrap}>
          <Text style={styles.footerLine1}>AccessMap VN v1.4.2 • Dữ liệu vì cộng đồng</Text>
          <Text style={styles.footerLine2}>
            Tiêu chuẩn tiếp cận không rào cản Việt Nam QCVN 10:2014
          </Text>
        </View>
      </ScrollView>

      <LeaderboardModal
        visible={showLeaderboard}
        isGuest={isGuest}
        onClose={() => setShowLeaderboard(false)}
      />

      <FavoritesModal
        visible={showFavorites}
        isGuest={isGuest}
        onClose={() => setShowFavorites(false)}
      />

      <AccessibilitySettingsModal
        visible={showAccessibilitySettings}
        onClose={() => setShowAccessibilitySettings(false)}
      />

      <AccessibilityFilterModal
        visible={showProfileFilterModal}
        currentFilters={savedFilters}
        onApply={(next) => void handleSaveAccessibilityProfile(next)}
        onSaveDefault={(next) => void handleSaveAccessibilityProfile(next)}
        isSavingDefault={isSavingPrefs}
        onClose={() => setShowProfileFilterModal(false)}
      />

      {!hideBottomNav && <BottomNavBar activeTab="profile" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5F4',
  },
  topAppBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topAppBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wheelchairCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUserCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004F58',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  pageHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pageOverline: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#006874',
    letterSpacing: 0.5,
  },
  pageMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  pageGearCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F5',
    borderWidth: 2,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#004F58',
  },
  verifiedAvatarDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#006874',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: 3,
  },
  identityName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  identityPhone: {
    fontSize: 12.5,
    color: '#475569',
  },
  verifiedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#99F6E4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004F58',
  },
  editCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestLoginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F8F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  guestLoginBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#004F58',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mintCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mintSquareIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  cardLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardLinkText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#006874',
  },
  profileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileStatusDesc: {
    flex: 1,
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },
  establishedPill: {
    backgroundColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  establishedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004F58',
  },
  criteriaChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  criterionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  criterionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  sparkleNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  favoriteCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favoriteSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  countBadgePill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  rewardInnerBox: {
    backgroundColor: '#EFF3F2',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  rewardBoxTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardBoxLabelTeal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006874',
  },
  rewardBoxLabelGray: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pointsHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  pointsBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#004F58',
  },
  pointsUnit: {
    fontSize: 14,
    fontWeight: '800',
    color: '#004F58',
  },
  rewardBoxFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  rewardBoxFootText: {
    fontSize: 11.5,
    color: '#475569',
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginVertical: 2,
  },
  tierGreenDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#006874',
  },
  tierNameText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F8F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  levelUpBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#004F58',
  },
  levelUpBannerLink: {
    color: '#006874',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF3F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuRowSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  a11yBadge: {
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  a11yBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#004F58',
  },
  menuIconCircleRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowLabelRed: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
  },
  ctaDarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#005058',
    borderRadius: 18,
    padding: 16,
  },
  ctaIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(153, 246, 228, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaSub: {
    fontSize: 11.5,
    color: '#CCFBF1',
    marginTop: 2,
    lineHeight: 16,
  },
  ctaMintButton: {
    backgroundColor: '#99F6E4',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  ctaMintButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#004F58',
  },
  footerTextWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  footerLine1: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  footerLine2: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
});
