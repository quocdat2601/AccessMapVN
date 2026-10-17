import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth';
import { ApiError } from '@/shared/api/client';
import { addReportEvidence, fetchMyReport, uploadReportMedia } from '../api/reportsApi';
import type { ReportDetail, ReportStatus } from '../model/types';

const STATUS_LABELS: Record<ReportStatus, string> = {
  Submitted: 'Đã gửi',
  UnderReview: 'Đang xem xét',
  AwaitingMoreInfo: 'Cần bổ sung thông tin',
  LinkedToDispute: 'Đã liên kết tranh chấp',
  Resolved: 'Đã xử lý',
  Rejected: 'Không chấp nhận',
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không rõ thời gian' : date.toLocaleString('vi-VN');
}

export function ReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const reportId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceAsset, setEvidenceAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !reportId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      setReport(await fetchMyReport(reportId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Chưa tải được báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [reportId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitEvidence = async () => {
    if (!report || !user || (evidenceText.trim().length < 3 && !evidenceAsset)) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const ownedMediaId = evidenceAsset
        ? await uploadReportMedia(report.locationId, evidenceAsset, user.id)
        : undefined;
      const updated = await addReportEvidence(
        report.id,
        {
          description: evidenceText.trim() || undefined,
          ownedMediaId,
          expectedVersion: report.version,
        },
        user.id
      );
      setReport(updated);
      setEvidenceText('');
      setEvidenceAsset(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage('Báo cáo vừa được cập nhật. Dữ liệu mới đã được tải lại.');
        await load();
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Chưa bổ sung được thông tin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pickEvidence = async () => {
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Bạn cần cho phép truy cập thư viện để chọn minh chứng.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });
    if (!result.canceled) setEvidenceAsset(result.assets[0] ?? null);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.centerText}>Bạn cần đăng nhập để xem báo cáo riêng tư này.</Text>
        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Đăng nhập</Text>
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
        <Text style={styles.headerTitle}>Chi tiết báo cáo</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color="#006874" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {report ? (
            <>
              <View style={styles.card}>
                <View style={styles.titleRow}>
                  <Text style={styles.locationName}>{report.locationName}</Text>
                  <View style={styles.statusBadge}><Text style={styles.statusText}>{STATUS_LABELS[report.status]}</Text></View>
                </View>
                <Text style={styles.description}>{report.description}</Text>
                <Text style={styles.meta}>Mã báo cáo: {report.id}</Text>
                {report.featureType ? <Text style={styles.meta}>Tiện ích: {report.featureType} · phiên bản quan sát {report.observedFeatureVersion ?? 'không rõ'}</Text> : null}
                {report.isStaleBaseline ? <Text style={styles.warning}>Phiên bản bạn quan sát đã cũ; báo cáo vẫn được lưu làm lịch sử và không trở thành phiếu.</Text> : null}
                {report.publicResolutionNote ? <Text style={styles.resolution}>{report.publicResolutionNote}</Text> : null}
              </View>

              {report.status === 'AwaitingMoreInfo' ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Bổ sung thông tin</Text>
                  {report.requestForInformation ? <Text style={styles.requestText}>{report.requestForInformation}</Text> : null}
                  <TextInput
                    multiline
                    onChangeText={setEvidenceText}
                    placeholder="Trả lời yêu cầu của nhóm kiểm duyệt..."
                    style={styles.evidenceInput}
                    textAlignVertical="top"
                    value={evidenceText}
                  />
                  <TouchableOpacity onPress={() => void pickEvidence()} style={styles.mediaButton}>
                    <MaterialCommunityIcons name="paperclip" size={18} color="#006874" />
                    <Text style={styles.mediaButtonText}>
                      {evidenceAsset ? 'Đổi tệp minh chứng' : 'Chọn ảnh hoặc video'}
                    </Text>
                  </TouchableOpacity>
                  {evidenceAsset ? (
                    <View style={styles.selectedMedia}>
                      <Text numberOfLines={1} style={styles.selectedMediaText}>
                        {evidenceAsset.fileName ??
                          (evidenceAsset.type === 'video' ? 'Video đã chọn' : 'Ảnh đã chọn')}
                      </Text>
                      <TouchableOpacity
                        accessibilityLabel="Bỏ tệp minh chứng"
                        onPress={() => setEvidenceAsset(null)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color="#B91C1C" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <Text style={styles.privateNote}>Nội dung bổ sung không được công khai.</Text>
                  <TouchableOpacity disabled={submitting || (evidenceText.trim().length < 3 && !evidenceAsset)} onPress={() => void submitEvidence()} style={[styles.primaryButton, (submitting || (evidenceText.trim().length < 3 && !evidenceAsset)) && styles.disabled]}>
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Gửi bổ sung</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}

              {report.evidence.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Thông tin đã bổ sung</Text>
                  {report.evidence.map((item) => (
                    <View key={item.id} style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineCopy}>
                        <Text style={styles.timelineTitle}>{item.description || 'Bằng chứng hình ảnh riêng tư'}</Text>
                        <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tiến trình xử lý</Text>
                {report.history.map((item) => (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineCopy}>
                      <Text style={styles.timelineTitle}>{STATUS_LABELS[item.toStatus] ?? item.toStatus}</Text>
                      {item.reason ? <Text style={styles.timelineText}>{item.reason}</Text> : null}
                      <Text style={styles.meta}>{formatDate(item.occurredAt)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F8FAFC', flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 },
  iconButton: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  headerTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800', marginLeft: 12 },
  content: { padding: 14, paddingBottom: 34 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 15, borderWidth: 1, marginBottom: 11, padding: 14 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  locationName: { color: '#0F172A', flex: 1, fontSize: 16, fontWeight: '800' },
  statusBadge: { backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { color: '#047857', fontSize: 10.5, fontWeight: '700' },
  description: { color: '#334155', fontSize: 13, lineHeight: 19, marginTop: 10 },
  meta: { color: '#94A3B8', fontSize: 10.5, lineHeight: 15, marginTop: 5 },
  warning: { backgroundColor: '#FFF7ED', borderRadius: 9, color: '#9A3412', fontSize: 11.5, lineHeight: 17, marginTop: 10, padding: 9 },
  resolution: { backgroundColor: '#ECFDF5', borderRadius: 9, color: '#065F46', fontSize: 12, lineHeight: 18, marginTop: 10, padding: 9 },
  cardTitle: { color: '#1E293B', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  requestText: { color: '#C2410C', fontSize: 12.5, lineHeight: 18, marginBottom: 9 },
  evidenceInput: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 11, borderWidth: 1, color: '#0F172A', minHeight: 92, padding: 11 },
  mediaButton: { alignItems: 'center', borderColor: '#99D5DB', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 9, minHeight: 42, paddingHorizontal: 12 },
  mediaButtonText: { color: '#006874', fontSize: 12.5, fontWeight: '700' },
  selectedMedia: { alignItems: 'center', backgroundColor: '#F0FDFA', borderRadius: 9, flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 8, padding: 9 },
  selectedMediaText: { color: '#115E59', flex: 1, fontSize: 11.5 },
  privateNote: { color: '#64748B', fontSize: 11, marginTop: 6 },
  primaryButton: { alignItems: 'center', backgroundColor: '#006874', borderRadius: 11, justifyContent: 'center', marginTop: 11, minHeight: 45, paddingHorizontal: 20 },
  primaryText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  timelineItem: { flexDirection: 'row', marginBottom: 11 },
  timelineDot: { backgroundColor: '#0D9488', borderRadius: 5, height: 10, marginRight: 10, marginTop: 4, width: 10 },
  timelineCopy: { flex: 1 },
  timelineTitle: { color: '#334155', fontSize: 12.5, fontWeight: '700' },
  timelineText: { color: '#64748B', fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  errorText: { color: '#B91C1C', fontSize: 12.5, lineHeight: 18, marginBottom: 10 },
  centered: { alignItems: 'center', backgroundColor: '#F8FAFC', flex: 1, justifyContent: 'center', padding: 28 },
  centerText: { color: '#475569', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
