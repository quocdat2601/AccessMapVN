import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branding } from '@/shared/config/branding';
import { Colors } from '@/shared/theme';
import { useAuth } from '../model/AuthProvider';

export default function ProfileScreen() {
  const router = useRouter();
  const { isGuest, sendPasswordReset, signOut, userProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'AM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
            router.replace('/map');
          } catch (error) {
            Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể đăng xuất.');
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleResetPassword = async () => {
    if (!userProfile.email) return;
    setIsResettingPassword(true);
    try {
      await sendPasswordReset(userProfile.email);
      Alert.alert(
        'Đã gửi liên kết',
        `Hướng dẫn đổi mật khẩu đã được gửi đến email ${userProfile.email}. Vui lòng kiểm tra hộp thư.`
      );
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {userProfile.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(userProfile.fullName)}</Text>
              </View>
            )}
            {!isGuest && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>

          <Text style={styles.userName}>{userProfile.fullName}</Text>
          <Text style={styles.userEmail}>
            {isGuest ? 'Đang trải nghiệm chế độ Khách' : userProfile.email}
          </Text>

          <View style={styles.rolePill}>
            <MaterialCommunityIcons
              name={isGuest ? 'account-outline' : 'shield-check'}
              size={15}
              color={isGuest ? '#64748B' : Colors.primary}
            />
            <Text style={[styles.roleText, isGuest && { color: '#64748B' }]}>
              {isGuest ? 'Khách tham quan' : 'Thành viên Đóng góp'}
            </Text>
          </View>

          {isGuest && (
            <View style={styles.guestNoticeBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#007D78" />
              <Text style={styles.guestNoticeText}>
                Đăng nhập để tích lũy điểm thưởng EXP (+50 EXP/đóng góp), lưu địa điểm yêu thích và xuất bản dữ liệu tiếp cận.
              </Text>
              <TouchableOpacity
                style={styles.guestLoginBtn}
                onPress={() => router.push('/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.guestLoginBtnText}>Đăng nhập / Đăng ký ngay</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Section */}
        {!isGuest && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons name="star-circle" size={20} color="#D97706" />
              <Text style={styles.statsTitle}>ĐIỂM THƯỞNG CỘNG ĐỒNG</Text>
            </View>

            <View style={styles.expHeroRow}>
              <Text style={styles.expNumber}>+{userProfile.expPoints}</Text>
              <Text style={styles.expUnit}>EXP TÍCH LUỸ</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile.contributionsCount}</Text>
                <Text style={styles.statLabel}>Đóng góp</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile.reportsCount}</Text>
                <Text style={styles.statLabel}>Báo cáo</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Hạng Bạc</Text>
                <Text style={styles.statLabel}>Danh tiếng</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>TÍNH NĂNG & DỮ LIỆU</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/reports')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="alert-box-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>Lịch sử báo cáo sai sót</Text>
              <Text style={styles.menuItemSub}>Xem tiến trình xử lý các báo cáo bạn đã gửi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {!isGuest && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleResetPassword}
              disabled={isResettingPassword}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="key-change" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>Đổi mật khẩu</Text>
                <Text style={styles.menuItemSub}>Gửi email hướng dẫn thiết lập mật khẩu mới</Text>
              </View>
              {isResettingPassword ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Quy chuẩn QCVN 10:2014/BXD',
                'Hệ thống áp dụng Quy chuẩn kỹ thuật quốc gia về Xây dựng công trình đảm bảo người khuyết tật tiếp cận sử dụng (Độ dốc ≤ 1/12, Cửa ≥ 90cm, Lối dẫn xúc giác...).'
              );
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FDF4FF' }]}>
              <MaterialCommunityIcons name="book-open-outline" size={20} color="#9333EA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>Tiêu chuẩn tiếp cận QCVN</Text>
              <Text style={styles.menuItemSub}>Tìm hiểu các tiêu chí đo đạc và thẩm định</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        {!isGuest ? (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isSigningOut}
            activeOpacity={0.75}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                <Text style={styles.signOutText}>Đăng xuất khỏi thiết bị</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.secondaryBackBtn}
            onPress={() => router.replace('/map')}
            activeOpacity={0.75}
          >
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBackBtnText}>Quay lại Bản đồ</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionFooter}>
          {branding.appName} Mobile • Phiên bản 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 36,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F7F6',
    borderWidth: 2,
    borderColor: '#007D78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#007D78',
    letterSpacing: 1,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  guestNoticeBox: {
    marginTop: 18,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    gap: 8,
  },
  guestNoticeText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  guestLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  guestLoginBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  expHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  expNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#B45309',
  },
  expUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  menuItemSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  secondaryBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBackBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  versionFooter: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});
