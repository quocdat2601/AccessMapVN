import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors } from '@/shared/theme';

interface LoginRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
  expReward?: number;
  onLoginPress?: () => void;
}

export function LoginRequiredModal({
  visible,
  onClose,
  title = 'Yêu cầu đăng nhập',
  description,
  featureName = 'đóng góp dữ liệu tiếp cận',
  expReward = 50,
  onLoginPress,
}: LoginRequiredModalProps) {
  const router = useRouter();

  const handleNavigateLogin = () => {
    onClose();
    if (onLoginPress) {
      onLoginPress();
    } else {
      router.push('/login');
    }
  };

  const defaultDescription =
    `Để ${featureName}, bạn cần đăng nhập tài khoản nhằm bảo vệ tính xác thực của bản đồ và nhận thưởng điểm EXP.`;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.dialogCard}>
          {/* Top Badge Icon */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-account-outline" size={32} color={Colors.primary} />
          </View>

          {/* Title and Text */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description || defaultDescription}</Text>

          {/* Gamification highlight */}
          {expReward > 0 && (
            <View style={styles.rewardBanner}>
              <MaterialCommunityIcons name="star-circle" size={18} color="#D97706" />
              <Text style={styles.rewardText}>
                Cộng ngay <Text style={styles.rewardBold}>+{expReward} EXP</Text> vào hồ sơ cá nhân
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNavigateLogin}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryButtonText}>Đăng nhập / Đăng ký</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Để sau (Tiếp tục làm khách)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F7F6',
    borderWidth: 2,
    borderColor: '#BFE6D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  rewardText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  rewardBold: {
    fontWeight: '800',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
