import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ContributionCTAProps {
  locationId?: string;
  locationName?: string;
  onPress?: () => void;
  onReportIssue?: () => void;
  showReportIssue?: boolean;
}

export function ContributionCTA({
  locationId,
  locationName,
  onPress,
  onReportIssue,
  showReportIssue = false,
}: ContributionCTAProps) {
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, showReportIssue ? styles.contributeButtonWithReport : styles.buttonFull]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Đóng góp dữ liệu tiếp cận"
          activeOpacity={0.88}
        >
          <MaterialCommunityIcons name="video-plus-outline" size={19} color="#FFFFFF" style={styles.buttonIcon} />
          <Text
            style={styles.buttonText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Đóng góp dữ liệu tiếp cận
          </Text>
        </TouchableOpacity>

        {showReportIssue ? (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={onReportIssue}
            accessibilityRole="button"
            accessibilityLabel="Báo thay đổi thông tin tiếp cận"
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="alert-outline" size={17} color="#B45309" style={styles.buttonIcon} />
            <Text
              style={styles.reportButtonText}
              numberOfLines={1}
            >
              Báo thay đổi
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.noteRow}>
        <MaterialCommunityIcons name="star-circle" size={17} color="#007D78" />
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
    paddingBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  button: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#004E58',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonFull: {
    flex: 1,
  },
  contributeButtonWithReport: {
    flex: 1.5,
  },
  reportButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFDF7',
    borderColor: '#F5D7A1',
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  reportButtonText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  noteRow: {
    marginTop: 10,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  note: {
    flex: 1,
    color: '#64748B',
    fontSize: 11.5,
    lineHeight: 16,
  },
  reward: {
    color: '#007D78',
    fontWeight: '800',
  },
});
