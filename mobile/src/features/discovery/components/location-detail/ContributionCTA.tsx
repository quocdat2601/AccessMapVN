import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

export function ContributionCTA() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => Alert.alert('Đóng góp dữ liệu tiếp cận', 'Luồng đóng góp sẽ được kết nối ở bước tiếp theo.')}
        accessibilityRole="button"
        activeOpacity={0.82}
      >
        <MaterialCommunityIcons name="plus-box-outline" size={22} color={Colors.surface} />
        <Text style={styles.buttonText}>Đóng góp dữ liệu tiếp cận</Text>
      </TouchableOpacity>
      <View style={styles.noteRow}>
        <MaterialCommunityIcons name="star-circle-outline" size={20} color={Colors.primaryContainer} />
        <Text style={styles.note}>
          Chụp ảnh hoặc quay video 5–10s để bổ sung bằng chứng thực tế • Nhận{' '}
          <Text style={styles.reward}>+50 điểm thưởng cộng đồng</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 34,
  },
  button: {
    height: 58,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  noteRow: {
    marginTop: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  note: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  reward: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
