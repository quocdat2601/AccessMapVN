import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface AccuracyConfirmationSectionProps {
  onConfirmAccurate?: () => void;
  onReportIssue?: () => void;
}

export function AccuracyConfirmationSection({
  onConfirmAccurate,
  onReportIssue,
}: AccuracyConfirmationSectionProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    setIsConfirmed(true);
    onConfirmAccurate?.();
    Alert.alert('Cảm ơn bạn!', 'Đã ghi nhận xác nhận tiếp cận. Bạn nhận được +15 EXP cộng đồng!');
  };

  const handleReport = () => {
    onReportIssue?.();
    Alert.alert('Báo lỗi tiếp cận', 'Cảm ơn bạn đã phản hồi. Nhóm kiểm duyệt sẽ xác minh lại thông tin địa điểm này.');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.confirmBtn, isConfirmed && styles.confirmedBtn]}
        onPress={handleConfirm}
        disabled={isConfirmed}
        accessibilityRole="button"
        accessibilityLabel="Vẫn dùng tốt nhận 15 EXP"
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={isConfirmed ? 'check-circle' : 'check-circle-outline'}
          size={20}
          color="#ffffff"
        />
        <Text style={styles.confirmBtnText}>
          {isConfirmed ? 'Đã xác nhận (+15 EXP)' : 'Vẫn dùng tốt (+15 EXP)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportBtn}
        onPress={handleReport}
        accessibilityRole="button"
        accessibilityLabel="Báo lỗi thông tin"
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="alert-circle-outline" size={19} color="#dc2626" />
        <Text style={styles.reportBtnText}>Báo lỗi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#006874',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#006874',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmedBtn: {
    backgroundColor: '#059669',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  reportBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reportBtnText: {
    color: '#dc2626',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
