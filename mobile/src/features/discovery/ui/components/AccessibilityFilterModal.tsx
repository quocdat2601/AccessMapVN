import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

export interface AccessibilityFilterState {
  wheelchair: boolean;
  elevator: boolean;
  restroom: boolean;
  tactilePaving: boolean;
  highVerified: boolean;
}

export const DEFAULT_ACCESSIBILITY_FILTERS: AccessibilityFilterState = {
  wheelchair: false,
  elevator: false,
  restroom: false,
  tactilePaving: false,
  highVerified: false,
};

interface AccessibilityFilterModalProps {
  visible: boolean;
  currentFilters: AccessibilityFilterState;
  onApply: (filters: AccessibilityFilterState) => void;
  onClose: () => void;
}

export function AccessibilityFilterModal({
  visible,
  currentFilters,
  onApply,
  onClose,
}: AccessibilityFilterModalProps) {
  const [draftFilters, setDraftFilters] = useState<AccessibilityFilterState>(currentFilters);

  // Sync draft state with incoming currentFilters whenever modal opens
  useEffect(() => {
    if (visible) {
      setDraftFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const toggleFilter = (key: keyof AccessibilityFilterState) => {
    setDraftFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = Object.values(draftFilters).filter(Boolean).length;

  const handleReset = () => {
    setDraftFilters(DEFAULT_ACCESSIBILITY_FILTERS);
  };

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Drag indicator */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Tiêu chuẩn Tiếp cận</Text>
              <Text style={styles.subtitle}>
                Lọc địa điểm theo nhu cầu hỗ trợ cụ thể của bạn
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Filter options */}
          <View style={styles.optionsList}>
            {/* 1. Wheelchair */}
            <View style={styles.optionRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="body" size={20} color="#0284C7" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Tiếp cận xe lăn</Text>
                <Text style={styles.optionDescription}>
                  Có ram dốc thoải hoặc lối vào cửa rộng không bậc
                </Text>
              </View>
              <Switch
                value={draftFilters.wheelchair}
                onValueChange={() => toggleFilter('wheelchair')}
                trackColor={{ false: '#E2E8F0', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* 2. Elevator */}
            <View style={styles.optionRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="swap-vertical" size={20} color="#16A34A" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Thang máy tiếp cận</Text>
                <Text style={styles.optionDescription}>
                  Có thang máy di chuyển giữa các tầng có bảng điều khiển thấp
                </Text>
              </View>
              <Switch
                value={draftFilters.elevator}
                onValueChange={() => toggleFilter('elevator')}
                trackColor={{ false: '#E2E8F0', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* 3. Accessible Restroom */}
            <View style={styles.optionRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="water" size={20} color="#D97706" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Nhà vệ sinh tiếp cận</Text>
                <Text style={styles.optionDescription}>
                  Có phòng vệ sinh riêng có tay vịn và cửa mở rộng
                </Text>
              </View>
              <Switch
                value={draftFilters.restroom}
                onValueChange={() => toggleFilter('restroom')}
                trackColor={{ false: '#E2E8F0', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* 4. Tactile Paving */}
            <View style={styles.optionRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="footsteps" size={20} color="#9333EA" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Lối dẫn đường xúc giác</Text>
                <Text style={styles.optionDescription}>
                  Có vạch gạch xúc giác dẫn hướng hoặc cảnh báo người khiếm thị
                </Text>
              </View>
              <Switch
                value={draftFilters.tactilePaving}
                onValueChange={() => toggleFilter('tactilePaving')}
                trackColor={{ false: '#E2E8F0', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* 5. High Verified Score */}
            <View style={styles.optionRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFE4E6' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#E11D48" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Đạt chuẩn kiểm định cao</Text>
                <Text style={styles.optionDescription}>
                  Chỉ hiện các địa điểm có điểm tiếp cận tin cậy từ 80% trở lên
                </Text>
              </View>
              <Switch
                value={draftFilters.highVerified}
                onValueChange={() => toggleFilter('highVerified')}
                trackColor={{ false: '#E2E8F0', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Thiết lập lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.88}
            >
              <Text style={styles.applyButtonText}>
                {activeCount > 0 ? `Áp dụng (${activeCount})` : 'Áp dụng tất cả'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  optionsList: {
    gap: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
    marginRight: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
