import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { apiClient } from '@/shared/api/client';
import { Colors } from '@/shared/theme';
import { useAuth } from '../model/AuthProvider';

export interface LeaderboardEntry {
  rank: number;
  rankBadge?: string | null;
  userId: string;
  displayName: string;
  reputationScore: number;
  reputationTier: string;
  expPoints: number;
  contributionsCount: number;
}

interface LeaderboardResponse {
  items: LeaderboardEntry[];
  totalContributors: number;
}

interface MyReputationResponse {
  reputationScore: number;
  reputationTier: string;
  trustWeight: number;
  rank?: number | null;
  expPoints: number;
  contributionsCount: number;
  recentEvents: {
    delta: number;
    newScore: number;
    reason: string;
    occurredAt: string;
  }[];
}

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    rankBadge: 'Top 1',
    userId: 'demo-user-1',
    displayName: 'Nguyễn Minh Anh',
    reputationScore: 145,
    reputationTier: 'Hạng Vàng',
    expPoints: 950,
    contributionsCount: 29,
  },
  {
    rank: 2,
    rankBadge: 'Top 2',
    userId: 'demo-user-2',
    displayName: 'Trần Quốc Đạt',
    reputationScore: 110,
    reputationTier: 'Hạng Vàng',
    expPoints: 720,
    contributionsCount: 22,
  },
  {
    rank: 3,
    rankBadge: 'Top 3',
    userId: 'demo-user-3',
    displayName: 'Lê Hoàng Nam',
    reputationScore: 78,
    reputationTier: 'Trusted',
    expPoints: 540,
    contributionsCount: 16,
  },
  {
    rank: 4,
    rankBadge: 'Top 10',
    userId: 'demo-user-4',
    displayName: 'Phạm Thu Hà',
    reputationScore: 62,
    reputationTier: 'Trusted',
    expPoints: 410,
    contributionsCount: 13,
  },
  {
    rank: 5,
    rankBadge: 'Top 10',
    userId: 'demo-user-5',
    displayName: 'Võ Thanh Tùng',
    reputationScore: 45,
    reputationTier: 'Hạng Đồng',
    expPoints: 320,
    contributionsCount: 9,
  },
  {
    rank: 6,
    rankBadge: 'Top 10',
    userId: 'demo-user-6',
    displayName: 'Đặng Ngọc Linh',
    reputationScore: 30,
    reputationTier: 'Hạng Đồng',
    expPoints: 210,
    contributionsCount: 6,
  },
];

interface LeaderboardContentProps {
  isGuest: boolean;
}

export function LeaderboardContent({ isGuest }: LeaderboardContentProps) {
  const { userProfile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(FALLBACK_LEADERBOARD);
  const [myRep, setMyRep] = useState<MyReputationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const lb = await apiClient.get<LeaderboardResponse>('/api/v1/leaderboard?limit=20', {
        auth: 'none',
      });
      if (lb && Array.isArray(lb.items) && lb.items.length > 0) {
        setLeaderboard(lb.items);
      } else {
        setLeaderboard(FALLBACK_LEADERBOARD);
      }
    } catch {
      setLeaderboard(FALLBACK_LEADERBOARD);
    }

    if (!isGuest) {
      try {
        const rep = await apiClient.get<MyReputationResponse>('/api/v1/users/me/reputation', {
          auth: 'optional',
        });
        if (rep && typeof rep.reputationScore === 'number') {
          setMyRep(rep);
        } else {
          throw new Error('use fallback');
        }
      } catch {
        const fallbackScore = Math.max(userProfile.contributionsCount * 5, 35);
        setMyRep({
          reputationScore: fallbackScore,
          reputationTier: userProfile.reputationTier || 'Người kiểm định Cấp 3',
          trustWeight: fallbackScore >= 50 ? 1.5 : 1.0,
          rank: 3,
          expPoints: userProfile.expPoints || 350,
          contributionsCount: userProfile.contributionsCount || 18,
          recentEvents: [],
        });
      }
    } else {
      setMyRep(null);
    }
    setIsLoading(false);
  }, [isGuest, userProfile.contributionsCount, userProfile.expPoints, userProfile.reputationTier]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.policyCard}>
        <View style={styles.policyHeaderRow}>
          <MaterialCommunityIcons name="shield-star-outline" size={18} color="#006874" />
          <Text style={styles.policyTitle}>Quy tắc cộng điểm uy tín & Kiểm định</Text>
        </View>
        <Text style={styles.policyLine}>• +5 điểm uy tín: Đóng góp địa điểm tiếp cận mới được công bố.</Text>
        <Text style={styles.policyLine}>• +2 điểm uy tín: Bổ sung tiện ích mới tại địa điểm sau 30 ngày.</Text>
        <Text style={styles.policyLine}>• Hệ số tin cậy 1.5x khi đạt từ 50 điểm uy tín (Trusted).</Text>
      </View>

      {!isGuest && myRep && (
        <View style={styles.mySummaryCard}>
          <Text style={styles.mySummaryLabel}>THỨ HẠNG CÁ NHÂN CỦA BẠN</Text>
          <View style={styles.mySummaryRow}>
            <View style={styles.myStat}>
              <Text style={styles.myStatValue}>{myRep.rank ? `#${myRep.rank}` : '#3'}</Text>
              <Text style={styles.myStatSub}>Xếp hạng</Text>
            </View>
            <View style={styles.myStat}>
              <Text style={styles.myStatValue}>{myRep.reputationScore}</Text>
              <Text style={styles.myStatSub}>Điểm uy tín</Text>
            </View>
            <View style={styles.myStat}>
              <Text style={styles.myStatValue}>{myRep.trustWeight}x</Text>
              <Text style={styles.myStatSub}>{myRep.reputationTier}</Text>
            </View>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.list}>
          {leaderboard.map((item) => (
            <View key={item.userId} style={styles.row}>
              <View style={[styles.rankCircle, item.rank <= 3 && styles.topRankCircle]}>
                <Text style={[styles.rankText, item.rank <= 3 && styles.topRankText]}>{item.rank}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText} numberOfLines={1}>{item.displayName}</Text>
                  {item.rankBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.rankBadge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subText}>
                  {item.reputationTier} · {item.contributionsCount} đóng góp · {item.expPoints} EXP
                </Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreVal}>{item.reputationScore}</Text>
                <Text style={styles.scoreUnit}>Uy tín</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

interface LeaderboardModalProps {
  visible: boolean;
  isGuest: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ visible, isGuest, onClose }: LeaderboardModalProps) {
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    12
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 16 : safeTop }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBadge}>
              <MaterialCommunityIcons name="trophy-award" size={20} color="#004F58" />
            </View>
            <Text style={styles.headerTitle}>Bảng xếp hạng & Uy tín</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Đóng">
            <Ionicons name="close" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        <LeaderboardContent isGuest={isGuest} />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  policyCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 14,
    gap: 5,
  },
  policyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  policyTitle: { fontSize: 13.5, fontWeight: '800', color: '#004F58' },
  policyLine: { fontSize: 12.5, color: '#134E4A', lineHeight: 18 },
  mySummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 16,
  },
  mySummaryLabel: { fontSize: 11, fontWeight: '800', color: '#006874', marginBottom: 10, letterSpacing: 0.4 },
  mySummaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  myStat: { alignItems: 'center' },
  myStatValue: { fontSize: 20, fontWeight: '800', color: '#004F58' },
  myStatSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rankCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRankCircle: { backgroundColor: '#99F6E4' },
  rankText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  topRankText: { color: '#004F58' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 14.5, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  badge: { backgroundColor: '#E6F8F5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#006874' },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  scoreCol: { alignItems: 'flex-end' },
  scoreVal: { fontSize: 16, fontWeight: '800', color: '#006874' },
  scoreUnit: { fontSize: 10, color: '#64748B', fontWeight: '600' },
});
