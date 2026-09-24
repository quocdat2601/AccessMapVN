import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

export type TabId = 'map' | 'contribute' | 'community' | 'profile';

interface BottomNavBarProps {
  activeTab?: TabId;
  onTabPress?: (tab: TabId) => void;
}

export function BottomNavBar({ activeTab = 'map', onTabPress }: BottomNavBarProps) {
  return (
    <View style={styles.container}>
      {/* Tab 1: Bản đồ */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('map')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'map' }}
        accessibilityLabel="Bản đồ"
      >
        <View style={activeTab === 'map' ? styles.activePill : styles.iconContainer}>
          <MaterialCommunityIcons
            name="map-outline"
            size={22}
            color={activeTab === 'map' ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <Text style={[styles.tabLabel, activeTab === 'map' && styles.activeTabLabel]}>
          Bản đồ
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Đóng góp */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('contribute')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'contribute' }}
        accessibilityLabel="Đóng góp"
      >
        <View style={activeTab === 'contribute' ? styles.activePill : styles.iconContainer}>
          <MaterialCommunityIcons
            name="map-marker-plus-outline"
            size={22}
            color={activeTab === 'contribute' ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <Text style={[styles.tabLabel, activeTab === 'contribute' && styles.activeTabLabel]}>
          Đóng góp
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Cộng đồng */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('community')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'community' }}
        accessibilityLabel="Cộng đồng"
      >
        <View style={activeTab === 'community' ? styles.activePill : styles.iconContainer}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={20}
            color={activeTab === 'community' ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <Text style={[styles.tabLabel, activeTab === 'community' && styles.activeTabLabel]}>
          Cộng đồng
        </Text>
      </TouchableOpacity>

      {/* Tab 4: Cá nhân */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onTabPress?.('profile')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'profile' }}
        accessibilityLabel="Cá nhân"
      >
        <View style={activeTab === 'profile' ? styles.activePill : styles.iconContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color={activeTab === 'profile' ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <Text style={[styles.tabLabel, activeTab === 'profile' && styles.activeTabLabel]}>
          Cá nhân
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.overlayBlur,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 48,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 56,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  activePill: {
    width: 56,
    height: 28,
    backgroundColor: Colors.primaryLight,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: -0.25,
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
