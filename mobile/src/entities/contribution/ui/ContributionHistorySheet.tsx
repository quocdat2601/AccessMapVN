import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import {
  getContributionRecords,
  loadContributionRecords,
  syncPendingSubmissionsWithBackend,
} from '../model/store';
import type { ContributionSubmissionRecord } from '../model/types';

interface ContributionHistorySheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ContributionHistorySheet({ visible, onClose }: ContributionHistorySheetProps) {
  const [items, setItems] = useState<ContributionSubmissionRecord[]>([]);

  useEffect(() => {
    if (visible) {
      void syncPendingSubmissionsWithBackend().then((records) => {
        setItems(records.length > 0 ? records : getContributionRecords());
      });
    }
  }, [visible]);

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
              <Text style={styles.subtitle}>Quy trình thẩm định AI đa tầng (SCR-03)</Text>
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

          {/* Gamification Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <MaterialCommunityIcons name="shield-star" size={32} color="#facc15" />
              <View>
                <Text style={styles.summaryTier}>Hạng đóng góp: Đồng (Tier 1)</Text>
                <Text style={styles.summarySub}>
                  {items.length} lượt đóng góp · Tỷ lệ tin cậy trung bình 88%
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
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="camera-plus-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Chưa có đóng góp nào</Text>
                <Text style={styles.emptyDesc}>
                  Hãy chụp ảnh ram dốc, lối vào hoặc thang máy tiếp cận trên bản đồ để nhận ngay +50 EXP mỗi lần!
                </Text>
              </View>
            ) : (
              items.map((item) => (
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
                      <Text style={styles.locationName} numberOfLines={1}>
                        {item.locationName}
                      </Text>
                      <Text style={styles.timestamp}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                      <View style={styles.statusRow}>
                        {item.status === 'Rejected' ? (
                          <View style={[styles.statusBadge, { backgroundColor: '#fef2f2' }]}>
                            <MaterialCommunityIcons name="close-circle" size={13} color="#ef4444" />
                            <Text style={[styles.statusText, { color: '#ef4444' }]}>
                              Đã từ chối hồ sơ
                            </Text>
                          </View>
                        ) : item.status === 'Pending Moderation' || item.status === 'Submitted' ? (
                          <View style={[styles.statusBadge, { backgroundColor: '#fffbeb' }]}>
                            <MaterialCommunityIcons name="clock-outline" size={13} color="#d97706" />
                            <Text style={[styles.statusText, { color: '#d97706' }]}>
                              Đang chờ duyệt
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.statusBadge}>
                            <MaterialCommunityIcons name="check-circle" size={13} color="#10b981" />
                            <Text style={styles.statusText}>
                              Tự động phê duyệt ({Math.round(item.confidenceScore * 100)}%)
                            </Text>
                          </View>
                        )}
                        <Text style={styles.itemExp}>
                          {item.status === 'Rejected'
                            ? '+0 EXP'
                            : item.status === 'Pending Moderation' || item.status === 'Submitted'
                              ? 'Chờ duyệt'
                              : `+${item.pointsAwarded} EXP`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Confirmed Feature Tags */}
                  {item.featureTags.length > 0 ? (
                    <View style={styles.tagsRow}>
                      {item.featureTags.map((t) => (
                        <View key={t} style={styles.tagChip}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Notes / Description */}
                  {item.textDescription ? (
                    <Text style={styles.noteQuote} numberOfLines={2}>
                      "{item.textDescription}"
                    </Text>
                  ) : null}
                </View>
              ))
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
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
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
    fontSize: 12,
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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryTier: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  summarySub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  expBadge: {
    backgroundColor: '#004f58',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  expVal: {
    color: '#facc15',
    fontSize: 15,
    fontWeight: '800',
  },
  expUnit: {
    color: '#8ee9dc',
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
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
  locationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
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
    paddingVertical: 2,
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
