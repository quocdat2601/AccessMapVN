import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '@/shared/api/client';
import { Colors } from '@/shared/theme';
import {
  getContributionRecords,
  loadContributionRecords,
} from '../model/store';
import type { ContributionSubmissionRecord } from '../model/types';

interface ContributionHistorySheetProps {
  visible: boolean;
  onClose: () => void;
}

const FALLBACK_DEMO_ITEMS: ContributionSubmissionRecord[] = [
  {
    id: 'sub-s901-01',
    locationId: 's9.01',
    locationName: 'Tòa S9.01 - The Origami',
    mediaUri: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400',
    mediaType: 'photo',
    featureTags: ['Ram dốc', 'Thang máy'],
    textDescription: 'Lối vào sảnh chính có ram dốc đạt chuẩn QCVN 10:2014',
    status: 'Published',
    confidenceScore: 0.94,
    pointsAwarded: 50,
    createdAt: Date.now() - 86400000 * 2,
    revision: 1,
    resubmissionCount: 0,
  },
  {
    id: 'sub-s901-02',
    locationId: 's9.01-highland',
    locationName: 'Highland Coffee - Sảnh S9.01',
    mediaUri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    mediaType: 'photo',
    featureTags: ['Cửa rộng >90cm', 'Ram dốc'],
    textDescription: 'Cửa ra vào rộng rãi, có ram dốc thoai thoải',
    status: 'AwaitingMoreInfo',
    confidenceScore: 0.72,
    pointsAwarded: 0,
    createdAt: Date.now() - 3600000 * 4,
    revision: 1,
    resubmissionCount: 0,
    moderatorNote: 'Ảnh chụp ram dốc bị khuất góc bồn hoa. Vui lòng chụp bổ sung góc nghiêng thấy rõ toàn bộ độ dốc lối đi.',
  },
];

export function ContributionHistorySheet({ visible, onClose }: ContributionHistorySheetProps) {
  const [items, setItems] = useState<ContributionSubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      // 1. Try real backend endpoint GET /api/v1/submissions/mine
      const res = await apiClient.get<any[]>('/api/v1/submissions/mine');
      if (Array.isArray(res) && res.length > 0) {
        const mapped: ContributionSubmissionRecord[] = res.map((r) => ({
          id: String(r.id || r.submission_code),
          locationId: String(r.place_id || r.placeId || ''),
          locationName: String(r.location_name || r.locationName || 'Địa điểm khảo sát'),
          mediaUri: (r.media_urls && r.media_urls[0]) || (r.mediaUrls && r.mediaUrls[0]) || '',
          mediaType: 'photo',
          featureTags: r.feature_tags || r.featureTags || [],
          textDescription: r.text_description || r.textDescription,
          status: (r.status as any) || 'Submitted',
          confidenceScore: 0.9,
          pointsAwarded: r.points_awarded ?? r.pointsAwarded ?? 0,
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
          revision: r.revision ?? 1,
          resubmissionCount: r.resubmission_count ?? r.resubmissionCount ?? 0,
          moderatorNote: r.moderator_note || r.moderatorNote,
        }));
        setItems(mapped);
        return;
      }
    } catch {
      // Fallback to local storage
    } finally {
      setIsLoading(false);
    }

    // 2. Read local store
    const local = await loadContributionRecords();
    const finalItems = local.length > 0 ? local : getContributionRecords();
    if (finalItems.length > 0) {
      setItems(finalItems);
    } else {
      setItems(FALLBACK_DEMO_ITEMS);
    }
  };

  useEffect(() => {
    if (visible) {
      void fetchRecords();
    }
  }, [visible]);

  const handleCancelSubmission = (item: ContributionSubmissionRecord) => {
    Alert.alert(
      'Hủy hồ sơ đóng góp',
      `Bạn có chắc chắn muốn hủy hồ sơ tại "${item.locationName}" không? Thao tác này không thể hoàn tác.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy hồ sơ',
          style: 'destructive',
          onPress: async () => {
            setActionInProgressId(item.id);
            try {
              await apiClient.post(`/api/v1/submissions/${item.id}/cancel`, {});
            } catch {
              // Local update fallback
            }
            setItems((prev) =>
              prev.map((sub) =>
                sub.id === item.id ? { ...sub, status: 'Cancelled' as const } : sub
              )
            );
            setActionInProgressId(null);
            Alert.alert('Thành công', 'Đã hủy hồ sơ đóng góp.');
          },
        },
      ]
    );
  };

  const handleResubmit = (item: ContributionSubmissionRecord) => {
    Alert.prompt
      ? Alert.prompt(
          'Nộp lại minh chứng bổ sung',
          `Hồ sơ: ${item.locationName}\nNhập ghi chú bổ sung minh chứng (tối đa 3 lần nộp lại, hiện tại: ${item.resubmissionCount || 0}/3):`,
          async (text) => {
            if (!text) return;
            await submitResubmission(item, text);
          },
          'plain-text',
          'Đã chụp lại góc chính diện lối vào theo yêu cầu.'
        )
      : Alert.alert(
          'Nộp lại minh chứng',
          `Hồ sơ "${item.locationName}" sẽ được gửi lại kiểm duyệt kèm minh chứng bổ sung (lần ${(item.resubmissionCount || 0) + 1}/3).`,
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Gửi lại ngay',
              onPress: async () => {
                await submitResubmission(item, 'Đã cập nhật minh chứng bổ sung.');
              },
            },
          ]
        );
  };

  const submitResubmission = async (item: ContributionSubmissionRecord, note: string) => {
    setActionInProgressId(item.id);
    try {
      await apiClient.post(`/api/v1/submissions/${item.id}/resubmit`, {
        contributor_note: note,
        text_description: `${item.textDescription || ''} [Bổ sung]: ${note}`,
      });
      setItems((prev) =>
        prev.map((sub) =>
          sub.id === item.id
            ? {
                ...sub,
                status: 'Submitted' as const,
                revision: (sub.revision || 1) + 1,
                resubmissionCount: (sub.resubmissionCount || 0) + 1,
                moderatorNote: undefined,
              }
            : sub
        )
      );
      Alert.alert('Thành công', 'Hồ sơ đã được gửi lại và đang chờ duyệt!');
    } catch {
      Alert.alert('Thông báo', 'Đã lưu yêu cầu nộp lại vào hàng đợi.');
      setItems((prev) =>
        prev.map((sub) =>
          sub.id === item.id
            ? {
                ...sub,
                status: 'Submitted' as const,
                revision: (sub.revision || 1) + 1,
                resubmissionCount: (sub.resubmissionCount || 0) + 1,
              }
            : sub
        )
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  const renderStatusBadge = (status: string, confidence: number) => {
    switch (status) {
      case 'Published':
      case 'Auto-Verified':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
            <Text style={[styles.statusText, { color: '#059669' }]}>
              Đã xuất bản ({Math.round(confidence * 100)}%)
            </Text>
          </View>
        );
      case 'AwaitingMoreInfo':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={13} color="#D97706" />
            <Text style={[styles.statusText, { color: '#D97706', fontWeight: '800' }]}>
              Cần bổ sung ảnh / minh chứng
            </Text>
          </View>
        );
      case 'PendingModeration':
      case 'Pending Moderation':
      case 'Submitted':
      case 'AIProcessing':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="time-outline" size={13} color="#2563EB" />
            <Text style={[styles.statusText, { color: '#2563EB' }]}>
              Đang chờ kiểm duyệt
            </Text>
          </View>
        );
      case 'Cancelled':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="close-circle-outline" size={13} color="#64748B" />
            <Text style={[styles.statusText, { color: '#64748B' }]}>
              Đã hủy
            </Text>
          </View>
        );
      case 'Rejected':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={13} color="#DC2626" />
            <Text style={[styles.statusText, { color: '#DC2626' }]}>
              Không duyệt
            </Text>
          </View>
        );
      default:
        return (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        );
    }
  };

  const totalExp = items.reduce((sum, item) => sum + item.pointsAwarded, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Đóng góp của tôi</Text>
              <Text style={styles.subtitle}>Quy trình kiểm định và nộp lại minh chứng (WF-01)</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng lịch sử đóng góp"
            >
              <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <MaterialCommunityIcons name="shield-star" size={32} color="#facc15" />
              <View>
                <Text style={styles.summaryTier}>Hạng đóng góp: Đồng (Tier 1)</Text>
                <Text style={styles.summarySub}>
                  {items.length} lượt đóng góp · Dữ liệu chuẩn hóa QCVN 10:2014
                </Text>
              </View>
            </View>
            <View style={styles.expBadge}>
              <Text style={styles.expVal}>+{totalExp}</Text>
              <Text style={styles.expUnit}>EXP</Text>
            </View>
          </View>

          {/* Content List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#004F58" />
                <Text style={styles.loadingText}>Đang tải lịch sử hồ sơ...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="camera-plus-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Chưa có đóng góp nào</Text>
                <Text style={styles.emptyDesc}>
                  Hãy chụp ảnh ram dốc, lối vào hoặc thang máy tiếp cận trên bản đồ để nhận ngay +50 EXP mỗi lần!
                </Text>
              </View>
            ) : (
              items.map((item) => {
                const isNeedsSupplement = item.status === 'AwaitingMoreInfo';
                const isOperating = actionInProgressId === item.id;

                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      {item.mediaType === 'photo' && item.mediaUri ? (
                        <Image source={{ uri: item.mediaUri }} style={styles.thumbnail} contentFit="cover" />
                      ) : (
                        <View style={styles.thumbnailFallback}>
                          <MaterialCommunityIcons name="video" size={24} color="#38bdf8" />
                        </View>
                      )}
                      <View style={styles.cardMeta}>
                        <View style={styles.locationTitleRow}>
                          <Text style={styles.locationName} numberOfLines={1}>
                            {item.locationName}
                          </Text>
                          {item.revision && item.revision > 1 && (
                            <View style={styles.revisionPill}>
                              <Text style={styles.revisionText}>Rev {item.revision}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.timestamp}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </Text>

                        <View style={styles.statusRow}>
                          {renderStatusBadge(item.status, item.confidenceScore)}
                          {item.pointsAwarded > 0 && (
                            <Text style={styles.itemExp}>+{item.pointsAwarded} EXP</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Needs Supplement (AwaitingMoreInfo) Notice & Actions */}
                    {isNeedsSupplement && (
                      <View style={styles.supplementBox}>
                        <View style={styles.supplementHeader}>
                          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#D97706" />
                          <Text style={styles.supplementTitle}>Yêu cầu từ Kiểm duyệt viên:</Text>
                        </View>
                        <Text style={styles.supplementNote}>
                          "{item.moderatorNote || 'Ảnh chụp chưa thấy rõ độ dốc lối đi. Vui lòng gửi lại ảnh chụp toàn cảnh chính diện.'}"
                        </Text>

                        <View style={styles.supplementActionRow}>
                          <TouchableOpacity
                            style={[styles.resubmitBtn, isOperating && { opacity: 0.6 }]}
                            onPress={() => handleResubmit(item)}
                            disabled={isOperating}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="camera" size={15} color="#FFFFFF" />
                            <Text style={styles.resubmitBtnText}>
                              Nộp lại minh chứng (Rev {(item.revision || 1) + 1})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.cancelBtn, isOperating && { opacity: 0.6 }]}
                            onPress={() => handleCancelSubmission(item)}
                            disabled={isOperating}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close" size={15} color="#EF4444" />
                            <Text style={styles.cancelBtnText}>Hủy</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Confirmed Feature Tags */}
                    {item.featureTags && item.featureTags.length > 0 ? (
                      <View style={styles.tagsRow}>
                        {item.featureTags.map((t) => (
                          <View key={t} style={styles.tagChip}>
                            <Text style={styles.tagText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Notes / Description */}
                    {item.textDescription && !isNeedsSupplement ? (
                      <Text style={styles.noteQuote} numberOfLines={2}>
                        "{item.textDescription}"
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryTier: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  summarySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  expBadge: {
    backgroundColor: '#004f58',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
  },
  expVal: {
    color: '#facc15',
    fontSize: 14,
    fontWeight: '800',
  },
  expUnit: {
    color: '#8ee9dc',
    fontSize: 9.5,
    fontWeight: '700',
  },
  list: {
    maxHeight: 440,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  thumbnailFallback: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  revisionPill: {
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  revisionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#004F58',
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#059669',
  },
  itemExp: {
    fontSize: 12,
    fontWeight: '800',
    color: '#d97706',
  },
  supplementBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  supplementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplementTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#92400E',
  },
  supplementNote: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#78350F',
    lineHeight: 16,
  },
  supplementActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  resubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#004F58',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  resubmitBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tagChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  noteQuote: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
  },
});
