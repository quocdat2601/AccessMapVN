import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AccuracyConfirmationSectionProps {
  onStillAccurate?: () => void;
  onReportIssue: () => void;
  isSubmitting?: boolean;
}

export function AccuracyConfirmationSection({
  onStillAccurate,
  onReportIssue,
  isSubmitting,
}: AccuracyConfirmationSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.questionIconBox}>
          <MaterialCommunityIcons name="help-circle-outline" size={19} color="#006874" />
        </View>
        <Text style={styles.title}>Thông tin này còn chính xác không?</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Cần 1 xác nhận</Text>
        </View>
      </View>

      <Text style={styles.desc}>
        Xác nhận của bạn sẽ giúp cập nhật độ mới của thông tin.
      </Text>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.accurateBtn}
          onPress={onStillAccurate}
          activeOpacity={0.82}
          disabled={isSubmitting}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFFFFF" />
          <Text style={styles.accurateText}>Vẫn chính xác</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeBtn}
          onPress={onReportIssue}
          activeOpacity={0.82}
          disabled={isSubmitting}
        >
          <MaterialCommunityIcons name="alert-outline" size={16} color="#B45309" />
          <Text style={styles.changeText}>Báo thay đổi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionIconBox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  badge: {
    backgroundColor: '#CCFBF1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  desc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accurateBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#004E58',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  accurateText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  changeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  changeText: {
    color: '#B45309',
    fontSize: 12.5,
    fontWeight: '800',
  },
});