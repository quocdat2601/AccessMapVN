import React, { useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContributionHistorySheet } from '@/entities/contribution';
import { useAuth } from '@/features/auth';
import { LeaderboardContent } from '@/features/auth/ui/LeaderboardModal';
import { BottomNavBar } from '@/shared/ui/BottomNavBar';

export interface CommunityScreenProps {
  hideBottomNav?: boolean;
}

export function CommunityScreen({ hideBottomNav = false }: CommunityScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const [showHistory, setShowHistory] = useState(false);

  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    12
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topHeader, { paddingTop: safeTop }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconCircle}>
              <MaterialCommunityIcons name="trophy-award" size={20} color="#004F58" />
            </View>
            <View>
              <Text style={styles.headerOverline}>CỘNG ĐỒNG & ĐÓNG GÓP</Text>
              <Text style={styles.headerTitle}>Bảng Xếp Hạng Uy Tín</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => setShowHistory(true)}
              activeOpacity={0.78}
            >
              <MaterialCommunityIcons name="history" size={16} color="#004F58" />
              <Text style={styles.actionPillText}>Đóng góp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => router.push('/reports' as any)}
              accessibilityLabel="Lịch sử báo cáo"
              activeOpacity={0.78}
            >
              <Ionicons name="flag-outline" size={18} color="#004F58" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <LeaderboardContent isGuest={isGuest} />
      </View>

      <ContributionHistorySheet visible={showHistory} onClose={() => setShowHistory(false)} />

      {!hideBottomNav && <BottomNavBar activeTab="community" />}
    </View>
  );
}

export default CommunityScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#004F58',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#004F58',
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
