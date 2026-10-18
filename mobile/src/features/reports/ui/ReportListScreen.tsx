import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth';
import { fetchMyReports } from '../api/reportsApi';
import type { ReportReason, ReportStatus, ReportSummary } from '../model/types';

const STATUS_LABELS: Record<ReportStatus, string> = {
  Submitted: 'Đã gửi',
  UnderReview: 'Đang xem xét',
  AwaitingMoreInfo: 'Cần bổ sung',
  LinkedToDispute: 'Đã liên kết tranh chấp',
  Resolved: 'Đã xử lý',
  Rejected: 'Không chấp nhận',
};

const REASON_LABELS: Record<ReportReason, string> = {
  IncorrectFeature: 'Tiện ích không đúng',
  MissingFeature: 'Thiếu tiện ích',
  OutdatedInformation: 'Thông tin đã cũ',
  WrongAddressOrPin: 'Sai địa chỉ hoặc ghim',
  Other: 'Vấn đề khác',
};

function formatDate(value: string): string {
  if (!value) return 'Không rõ thời gian';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không rõ thời gian' : date.toLocaleString('vi-VN');
}

export function ReportListScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchMyReports();
      setReports(result.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Chưa tải được lịch sử báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.centered}>
        <MaterialCommunityIcons name="account-lock-outline" size={44} color="#64748B" />
        <Text style={styles.emptyTitle}>Đăng nhập để xem báo cáo của bạn</Text>
        <Text style={styles.emptyText}>Lịch sử báo cáo là dữ liệu riêng tư và chỉ chủ sở hữu được xem.</Text>
        <TouchableOpacity onPress={() => router.push('/login')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Đăng nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.iconButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#334155" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Báo cáo của tôi</Text>
          <Text style={styles.headerSubtitle}>Theo dõi phản hồi từ nhóm kiểm duyệt</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Đăng xuất"
          onPress={() => {
            void signOut()
              .then(() => router.replace('/map'))
              .catch((error) => {
                setErrorMessage(error instanceof Error ? error.message : 'Chưa thể đăng xuất.');
              });
          }}
          style={styles.logoutButton}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load()} refreshing={loading} tintColor="#006874" />}
      >
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {!loading && reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-text-search-outline" size={38} color="#64748B" />
            <Text style={styles.emptyTitle}>Chưa có báo cáo</Text>
            <Text style={styles.emptyText}>Bạn có thể báo thông tin sai từ phần chi tiết địa điểm.</Text>
          </View>
        ) : null}
        {reports.map((report) => (
          <TouchableOpacity
            key={report.id}
            accessibilityRole="button"
            onPress={() => router.push(`/reports/${report.id}` as never)}
            style={styles.reportCard}
          >
            <View style={styles.reportHeader}>
              <View style={styles.reportCopy}>
                <Text numberOfLines={1} style={styles.reportLocation}>{report.locationName}</Text>
                <Text style={styles.reportReason}>{REASON_LABELS[report.reason] ?? report.reason}</Text>
              </View>
              <View style={[styles.statusBadge, report.status === 'AwaitingMoreInfo' && styles.statusAttention]}>
                <Text style={[styles.statusText, report.status === 'AwaitingMoreInfo' && styles.statusAttentionText]}>
                  {STATUS_LABELS[report.status] ?? report.status}
                </Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.description}>{report.description}</Text>
            <View style={styles.reportFooter}>
              <Text style={styles.dateText}>{formatDate(report.createdAt)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
        {loading && reports.length === 0 ? <ActivityIndicator color="#006874" style={styles.loader} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F8FAFC', flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 },
  iconButton: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  headerCopy: { flex: 1, marginLeft: 12 },
  headerTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#64748B', fontSize: 11.5, marginTop: 2 },
  logoutButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  content: { padding: 14, paddingBottom: 30 },
  reportCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 15, borderWidth: 1, marginBottom: 10, padding: 13 },
  reportHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  reportCopy: { flex: 1 },
  reportLocation: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  reportReason: { color: '#0F766E', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  statusBadge: { backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { color: '#047857', fontSize: 10.5, fontWeight: '700' },
  statusAttention: { backgroundColor: '#FFF7ED' },
  statusAttentionText: { color: '#C2410C' },
  description: { color: '#475569', fontSize: 12.5, lineHeight: 18, marginTop: 9 },
  reportFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  dateText: { color: '#94A3B8', fontSize: 11 },
  loader: { marginTop: 30 },
  errorText: { color: '#B91C1C', fontSize: 12.5, marginBottom: 10 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 18, borderWidth: 1, marginTop: 34, padding: 28 },
  centered: { alignItems: 'center', backgroundColor: '#F8FAFC', flex: 1, justifyContent: 'center', padding: 28 },
  emptyTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptyText: { color: '#64748B', fontSize: 12.5, lineHeight: 19, marginTop: 5, textAlign: 'center' },
  primaryButton: { backgroundColor: '#006874', borderRadius: 12, marginTop: 18, paddingHorizontal: 24, paddingVertical: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: { marginTop: 8, padding: 10 },
  secondaryButtonText: { color: '#006874', fontSize: 13, fontWeight: '700' },
});
