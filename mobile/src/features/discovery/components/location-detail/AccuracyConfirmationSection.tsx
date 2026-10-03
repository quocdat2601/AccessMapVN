import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

type AccuracyResponse = 'accurate' | 'changed' | null;

export function AccuracyConfirmationSection() {
  const [response, setResponse] = useState<AccuracyResponse>(null);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons name="help-circle-outline" size={22} color={Colors.primaryContainer} />
        <Text style={styles.title}>Thông tin này còn chính xác không?</Text>
      </View>
      <Text style={styles.description}>
        Xác nhận của bạn giúp dữ liệu luôn mới và đáng tin cậy.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.accurateButton, response === 'accurate' && styles.selectedButton]}
          onPress={() => setResponse('accurate')}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={19} color={Colors.primary} />
          <Text style={styles.accurateText}>
            {response === 'accurate' ? 'Đã xác nhận' : 'Vẫn chính xác'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.reportButton, response === 'changed' && styles.reportSelected]}
          onPress={() => setResponse('changed')}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="alert-outline" size={19} color={Colors.poiHospital} />
          <Text style={styles.reportText}>
            {response === 'changed' ? 'Đã ghi nhận' : 'Báo thay đổi'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    marginTop: 13,
    flexDirection: 'row',
    gap: 9,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  accurateButton: {
    backgroundColor: Colors.primaryLight,
  },
  selectedButton: {
    borderWidth: 1.5,
    borderColor: Colors.primaryContainer,
  },
  accurateText: {
    color: Colors.primary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  reportButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#cfd5d4',
  },
  reportSelected: {
    borderColor: Colors.poiHospital,
    backgroundColor: '#fff5f4',
  },
  reportText: {
    color: Colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
