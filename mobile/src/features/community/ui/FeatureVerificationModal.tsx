import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CommunityFeatureInput } from '../model/types';
import { FeatureCommunitySection, type SubmittedObservation } from './FeatureCommunitySection';

interface FeatureVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
  features: CommunityFeatureInput[];
  isFullyVerified?: boolean;
  onRequestReport?: (feature: CommunityFeatureInput, editingData?: SubmittedObservation['reportData']) => void;
  refreshTrigger?: number;
}

export function FeatureVerificationModal({
  visible,
  onClose,
  locationId,
  locationName,
  features,
  isFullyVerified,
  onRequestReport,
  refreshTrigger,
}: FeatureVerificationModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          {/* Top Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Top Bar with Location Name and Close Button */}
          <View style={styles.topRow}>
            <View style={styles.locationPill}>
              <MaterialCommunityIcons name="map-marker-radius" size={15} color="#007D78" />
              <Text numberOfLines={1} style={styles.locationPillText}>
                {locationName}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Đóng xác thực"
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Main Title & Subtitle */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.mainTitle}>Xác thực thông tin tiếp cận</Text>
              {isFullyVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={13} color="#007D78" />
                  <Text style={styles.verifiedBadgeText}>Đã chuẩn mẫu</Text>
                </View>
              )}
            </View>
            <Text style={styles.mainSub}>
              Quan sát thực tế của bạn giúp cộng đồng người khuyết tật di chuyển an toàn và độc lập hơn.
            </Text>
          </View>

          {/* Informative Guidance Banner */}
          <View style={styles.guidanceBanner}>
            <View style={styles.guidanceHeader}>
              <MaterialCommunityIcons name="shield-check-outline" size={17} color="#007D78" />
              <Text style={styles.guidanceTitle}>Hướng dẫn xác thực nhanh</Text>
            </View>
            <View style={styles.guidanceRow}>
              <Text style={styles.guidanceBullet}>•</Text>
              <Text style={styles.guidanceText}>
                Chọn <Text style={styles.guidanceBold}>Vẫn chính xác</Text> nếu tiện ích thực tế hoạt động tốt.
              </Text>
            </View>
            <View style={styles.guidanceRow}>
              <Text style={styles.guidanceBullet}>•</Text>
              <Text style={styles.guidanceText}>
                Chọn <Text style={styles.guidanceBold}>Báo thay đổi</Text> nếu bị rào chắn, hư hỏng hoặc sai lệch.
              </Text>
            </View>
            <View style={styles.guidanceRow}>
              <Text style={styles.guidanceBullet}>•</Text>
              <Text style={styles.guidanceText}>
                Hệ thống cho phép <Text style={styles.guidanceBold}>chỉnh sửa hoặc hủy</Text> quan sát trong vòng 30 phút.
              </Text>
            </View>
          </View>

          {/* Features List ScrollView */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <FeatureCommunitySection
              locationId={locationId}
              features={features}
              hideHeader
              onRequestReport={onRequestReport}
              refreshTrigger={refreshTrigger}
            />
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.doneButton}
              accessibilityRole="button"
              accessibilityLabel="Xong"
              activeOpacity={0.85}
            >
              <Text style={styles.doneButtonText}>Đóng & Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    height: '88%',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8FAF6',
    borderWidth: 1,
    borderColor: '#BFE7E0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: '82%',
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007D78',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#16302F',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#A8E7DC',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007D78',
  },
  mainSub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  guidanceBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#F3FAF8',
    borderWidth: 1,
    borderColor: '#BFE7E0',
    borderRadius: 14,
    padding: 12,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  guidanceTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#007D78',
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  guidanceBullet: {
    fontSize: 12,
    color: '#007D78',
    fontWeight: '800',
  },
  guidanceText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    flex: 1,
  },
  guidanceBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  doneButton: {
    height: 44,
    backgroundColor: '#007D78',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
