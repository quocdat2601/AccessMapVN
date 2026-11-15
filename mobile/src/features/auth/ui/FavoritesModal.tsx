import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/shared/theme';
import {
  loadSavedFavorites,
  removeSavedFavoriteById,
  subscribeFavorites,
  type SavedFavoritePlace,
} from '../model/favoritesStorage';

interface FavoritesModalProps {
  visible: boolean;
  isGuest: boolean;
  onClose: () => void;
  onSelectPlace?: (place: SavedFavoritePlace) => void;
}

export function FavoritesModal({ visible, isGuest, onClose, onSelectPlace }: FavoritesModalProps) {
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    12
  );
  const [items, setItems] = useState<SavedFavoritePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await loadSavedFavorites(!isGuest);
      setItems(list);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    if (visible) {
      void loadFavorites();
    }
  }, [visible, loadFavorites]);

  useEffect(() => {
    return subscribeFavorites((updated) => {
      setItems(updated);
    });
  }, []);

  const handleRemove = async (place: SavedFavoritePlace) => {
    try {
      const next = await removeSavedFavoriteById(place.id, !isGuest);
      setItems(next);
    } catch {
      Alert.alert('Lỗi', 'Không thể bỏ lưu địa điểm yêu thích lúc này.');
    }
  };

  const renderTags = (p: SavedFavoritePlace) => {
    const tags: string[] = [];
    if (p.hasRamp) tags.push('Ram dốc');
    if (p.doorWidthOk) tags.push('Cửa rộng >90cm');
    if (p.hasAccessibleElevator) tags.push('Thang máy');
    if (p.hasAccessibleRestroom) tags.push('WC tiếp cận');
    if (p.hasTactilePaving) tags.push('Chỉ dẫn xúc giác');
    return tags;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 16 : safeTop }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="bookmark" size={18} color="#004F58" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Địa điểm yêu thích đã lưu</Text>
              <Text style={styles.headerSub}>{items.length} địa điểm được đánh dấu</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Đóng">
            <Ionicons name="close" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 32 }} />
          ) : items.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="bookmark-plus-outline" size={32} color="#006874" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có địa điểm yêu thích nào</Text>
              <Text style={styles.emptyText}>
                Hãy chạm vào một địa điểm trên bản đồ và nhấn nút &ldquo;Lưu yêu thích&rdquo; ngay trong bảng thông tin chi tiết địa điểm.
              </Text>
            </View>
          ) : (
            items.map((place) => {
              const tags = renderTags(place);
              return (
                <TouchableOpacity
                  key={place.id}
                  style={styles.card}
                  activeOpacity={onSelectPlace ? 0.78 : 1}
                  onPress={() => {
                    if (onSelectPlace) {
                      onSelectPlace(place);
                      onClose();
                    }
                  }}
                >
                  <View style={styles.cardLeftIcon}>
                    <Ionicons name="location" size={20} color="#006874" />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    {place.address ? <Text style={styles.placeAddr}>{place.address}</Text> : null}
                    {tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {tags.map((t) => (
                          <View key={t} style={styles.tagChip}>
                            <Ionicons name="checkmark-circle" size={12} color="#006874" />
                            <Text style={styles.tagText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => void handleRemove(place)}
                    style={styles.removeBtn}
                    accessibilityLabel={`Bỏ lưu ${place.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  closeBtn: { padding: 7, borderRadius: 18, backgroundColor: '#F1F5F9' },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  emptyCard: {
    marginTop: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 13.5, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  cardLeftIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E6F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  placeAddr: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: '#006874' },
  removeBtn: { padding: 9, borderRadius: 12, backgroundColor: '#FEF2F2' },
});
