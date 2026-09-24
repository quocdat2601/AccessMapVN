import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNearbyLocations } from '../hooks/useNearbyLocations';
import {
  HeaderBar,
  SearchBar,
  MapCanvas,
  MapControls,
  AccessibilityStatusPill,
} from '../components';
import { BottomNavBar, TabId } from '@/shared/components';
import { Colors } from '@/shared/theme';

export function LocationPickerScreen() {
  const {
    locations,
    selectedLocation,
    searchQuery,
    setSearchQuery,
    selectLocation,
    showAccessibilityLayer,
    toggleLayer,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetNorth,
  } = useNearbyLocations();

  const [activeTab, setActiveTab] = useState<TabId>('map');

  const handleNotificationPress = () => {
    Alert.alert('Thông báo', 'Bạn có 2 bản cập nhật đánh giá lối đi tiếp cận mới.');
  };

  const handleProfilePress = () => {
    Alert.alert('Hồ sơ người dùng', 'AccessMap VN Contributor Level 2');
  };

  const handleVoiceSearch = () => {
    Alert.alert('Tìm kiếm giọng nói', 'Đang lắng nghe: "Tìm dốc cho xe lăn gần đây"...');
  };

  const handleFilterPress = () => {
    Alert.alert('Bộ lọc tiếp cận', 'Tiêu chuẩn QCVN 10:2014:\n• Có lối dốc xe lăn\n• Cửa rộng >= 80cm\n• Thang máy hỗ trợ');
  };

  const handleMyLocation = () => {
    Alert.alert('Vị trí của bạn', 'Đang ở gần giao lộ Lê Lợi - Nam Kỳ Khởi Nghĩa, Quận 1.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <HeaderBar
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
      />

      {/* ── Main Map Canvas Viewport ──────────────────────────────── */}
      <View style={styles.mapViewport}>
        <MapCanvas
          locations={locations}
          onSelectLocation={selectLocation}
          zoomLevel={zoomLevel}
        />

        {/* ── Floating Search Box ─────────────────────────────────── */}
        <View style={styles.searchOverlay} pointerEvents="box-none">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onVoicePress={handleVoiceSearch}
            onFilterPress={handleFilterPress}
          />
        </View>

        {/* ── Floating Right Map Controls ─────────────────────────── */}
        <MapControls
          onResetNorth={resetNorth}
          onToggleLayer={toggleLayer}
          isLayerActive={showAccessibilityLayer}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onMyLocation={handleMyLocation}
        />

        {/* ── Floating Bottom Status Pill ─────────────────────────── */}
        <AccessibilityStatusPill district="Q.1" readinessPercent={94} />
      </View>

      {/* ── Bottom Navigation Bar ─────────────────────────────────── */}
      <BottomNavBar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  searchOverlay: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
