import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNearbyLocations } from '../hooks/useNearbyLocations';
import { SEARCH_LOCATIONS } from '../data/mockSearchLocations';
import { SearchLocation } from '../types';
import {
  HeaderBar,
  SearchBar,
  ExpandedSearchPanel,
  MapCanvas,
  MapFocusTarget,
  MapControls,
  AccessibilityStatusPill,
  LocationDetailSheet,
  MOCK_SAIGON_CENTRE_DETAIL,
} from '../components';
import { BottomNavBar, TabId } from '@/shared/components';
import { Colors } from '@/shared/theme';

export function LocationPickerScreen() {
  const {
    locations,
    selectLocation,
    showAccessibilityLayer,
    toggleLayer,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetNorth,
  } = useNearbyLocations();

  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedLocation, setFocusedLocation] = useState<SearchLocation | null>(null);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);
  const focusSequenceRef = useRef(0);
  const detailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (detailTimerRef.current) clearTimeout(detailTimerRef.current);
    },
    []
  );

  const detailData = useMemo(() => {
    if (!focusedLocation) return MOCK_SAIGON_CENTRE_DETAIL;
    return {
      ...MOCK_SAIGON_CENTRE_DETAIL,
      id: focusedLocation.id,
      name: focusedLocation.name,
      address:
        focusedLocation.id === 'saigon-centre-search'
          ? MOCK_SAIGON_CENTRE_DETAIL.address
          : focusedLocation.address,
    };
  }, [focusedLocation]);

  const openSearch = () => {
    if (detailTimerRef.current) {
      clearTimeout(detailTimerRef.current);
      detailTimerRef.current = null;
    }
    setFocusTarget(null);
    setFocusedLocation(null);
    setIsDetailVisible(false);
    setIsDetailExpanded(false);
    setIsSearchExpanded(true);
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearchExpanded(false);
  };

  const closeLocationDetail = useCallback(() => {
    if (detailTimerRef.current) {
      clearTimeout(detailTimerRef.current);
      detailTimerRef.current = null;
    }
    setIsDetailVisible(false);
    setIsDetailExpanded(false);
    setFocusTarget(null);
    setFocusedLocation(null);
    setSearchQuery('');
    setIsSearchExpanded(false);
  }, []);

  const handleMapLocationSelect = (id: string) => {
    selectLocation(id);
    if (focusTarget) closeLocationDetail();
  };

  const handleSearchLocationSelect = (location: SearchLocation) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearchExpanded(false);
    setIsDetailVisible(false);
    setIsDetailExpanded(false);
    setFocusedLocation(location);

    if (location.poiId) selectLocation(location.poiId);

    focusSequenceRef.current += 1;
    setFocusTarget({
      key: focusSequenceRef.current,
      poiId: location.poiId,
      name: location.name,
      xPercent: location.xPercent,
      yPercent: location.yPercent,
    });

    if (detailTimerRef.current) clearTimeout(detailTimerRef.current);
    detailTimerRef.current = setTimeout(() => {
      setIsDetailVisible(true);
    }, 520);
  };

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
      <View
        style={styles.mapViewport}
        onLayout={({ nativeEvent }) => setMapHeight(nativeEvent.layout.height)}
      >
        <MapCanvas
          locations={locations}
          onSelectLocation={handleMapLocationSelect}
          zoomLevel={zoomLevel}
          focusTarget={focusTarget}
          onMapPress={focusTarget ? closeLocationDetail : undefined}
        />

        {/* ── Floating Search Box ─────────────────────────────────── */}
        {!isDetailExpanded ? (
          <View
            style={[styles.searchOverlay, isSearchExpanded && styles.expandedSearchOverlay]}
            pointerEvents="box-none"
          >
            {isSearchExpanded ? (
              <ExpandedSearchPanel
                locations={SEARCH_LOCATIONS}
                query={searchQuery}
                onChangeQuery={setSearchQuery}
                onCancel={closeSearch}
                onSelectLocation={handleSearchLocationSelect}
                onVoicePress={handleVoiceSearch}
                onFilterPress={handleFilterPress}
              />
            ) : (
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={openSearch}
                onVoicePress={handleVoiceSearch}
                onFilterPress={handleFilterPress}
              />
            )}
          </View>
        ) : null}

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
        {!focusTarget ? (
          <AccessibilityStatusPill district="Q.1" readinessPercent={94} />
        ) : (
          <View style={styles.radiusBadge}>
            <MaterialCommunityIcons name="shield-check-outline" size={17} color={Colors.primary} />
            <Text style={styles.radiusText}>Bán kính hợp lệ: 20m</Text>
          </View>
        )}

        {isDetailVisible && mapHeight > 0 ? (
          <LocationDetailSheet
            data={detailData}
            containerHeight={mapHeight}
            onClose={closeLocationDetail}
            onExpandedChange={setIsDetailExpanded}
          />
        ) : null}
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
    zIndex: 20,
  },
  expandedSearchOverlay: {
    top: 0,
  },
  radiusBadge: {
    position: 'absolute',
    left: 16,
    top: '34%',
    height: 34,
    borderRadius: 9,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 8,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
    elevation: 4,
  },
  radiusText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
