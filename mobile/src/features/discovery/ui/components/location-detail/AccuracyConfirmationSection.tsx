import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AccuracyConfirmationSectionProps {
  onReportIssue(): void;
  onViewReports(): void;
}

/** Place-level actions. Feature confirmation is intentionally handled per version above. */
export function AccuracyConfirmationSection({
  onReportIssue,
  onViewReports,
}: AccuracyConfirmationSectionProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onReportIssue}
        style={styles.reportButton}
      >
        <MaterialCommunityIcons name="alert-circle-outline" size={19} color="#B91C1C" />
        <Text style={styles.reportText}>Báo thông tin sai</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onViewReports}
        style={styles.historyButton}
      >
        <MaterialCommunityIcons name="clipboard-text-clock-outline" size={19} color="#006874" />
        <Text style={styles.historyText}>Báo cáo của tôi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 24, marginTop: 8 },
  reportButton: { alignItems: 'center', backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 13, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 47, paddingHorizontal: 8 },
  reportText: { color: '#B91C1C', fontSize: 12.5, fontWeight: '700' },
  historyButton: { alignItems: 'center', backgroundColor: '#ECFEFF', borderColor: '#A5F3FC', borderRadius: 13, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 47, paddingHorizontal: 8 },
  historyText: { color: '#006874', fontSize: 12.5, fontWeight: '700' },
});
