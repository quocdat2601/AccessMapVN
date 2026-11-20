import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { startContributionFlow } from '@/features/contribution';

export type BottomNavTab = 'map' | 'contribute' | 'community' | 'profile';

interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onTabPress?: (tab: BottomNavTab) => void;
  onContributePress?: () => void;
}

export function BottomNavBar({ activeTab, onTabPress, onContributePress }: BottomNavBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8);

  const handlePress = (tab: BottomNavTab) => {
    if (tab === 'contribute') {
      if (onContributePress) {
        onContributePress();
        return;
      }
      startContributionFlow(router, {
        id: 's9.01',
        name: 'Tòa S9.01 - The Origami',
        latitude: 10.8454,
        longitude: 106.8373,
      });
      return;
    }

    if (onTabPress) {
      onTabPress(tab);
      return;
    }

    if (tab === activeTab) return;

    if (tab === 'map') {
      router.replace('/map' as any);
      return;
    }

    if (tab === 'community') {
      router.replace('/community' as any);
      return;
    }

    if (tab === 'profile') {
      router.replace('/profile' as any);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      <View style={styles.innerRow}>
        {/* 1. Bản đồ */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('map')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'map' }}
          accessibilityLabel="Bản đồ"
          activeOpacity={0.7}
        >
          <View style={[styles.iconPill, activeTab === 'map' && styles.iconPillActive]}>
            <Ionicons
              name={activeTab === 'map' ? 'map' : 'map-outline'}
              size={19}
              color={activeTab === 'map' ? '#004F58' : '#475569'}
            />
          </View>
          <Text style={[styles.tabLabel, activeTab === 'map' && styles.tabLabelActive]}>
            Bản đồ
          </Text>
        </TouchableOpacity>

        {/* 2. Đóng góp */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('contribute')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'contribute' }}
          accessibilityLabel="Đóng góp"
          activeOpacity={0.7}
        >
          <View style={[styles.iconPill, activeTab === 'contribute' && styles.iconPillActive]}>
            <MaterialCommunityIcons
              name={activeTab === 'contribute' ? 'map-marker-plus' : 'map-marker-plus-outline'}
              size={21}
              color={activeTab === 'contribute' ? '#004F58' : '#475569'}
            />
          </View>
          <Text style={[styles.tabLabel, activeTab === 'contribute' && styles.tabLabelActive]}>
            Đóng góp
          </Text>
        </TouchableOpacity>

        {/* 3. Cộng đồng */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('community')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'community' }}
          accessibilityLabel="Cộng đồng & Bảng xếp hạng"
          activeOpacity={0.7}
        >
          <View style={[styles.iconPill, activeTab === 'community' && styles.iconPillActive]}>
            <Ionicons
              name={activeTab === 'community' ? 'chatbubbles' : 'chatbubbles-outline'}
              size={20}
              color={activeTab === 'community' ? '#004F58' : '#475569'}
            />
          </View>
          <Text style={[styles.tabLabel, activeTab === 'community' && styles.tabLabelActive]}>
            Cộng đồng
          </Text>
        </TouchableOpacity>

        {/* 4. Cá nhân */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handlePress('profile')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'profile' }}
          accessibilityLabel="Cá nhân"
          activeOpacity={0.7}
        >
          <View style={[styles.iconPill, activeTab === 'profile' && styles.iconPillActive]}>
            <Ionicons
              name={activeTab === 'profile' ? 'person-circle' : 'person-circle-outline'}
              size={22}
              color={activeTab === 'profile' ? '#004F58' : '#475569'}
            />
          </View>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            Cá nhân
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 62,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: '#99F6E4',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 1,
  },
  tabLabelActive: {
    color: '#004F58',
    fontWeight: '800',
  },
});
