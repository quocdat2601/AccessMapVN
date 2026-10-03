import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { MapView } from '../components/MapView';
import { HeaderBar } from '../components/HeaderBar';
import { SearchBar } from '../components/SearchBar';
import { MapControls } from '../components/MapControls';
import { PlaceCallout } from '../components/PlaceCallout';
import { useUserLocation } from '../hooks/useUserLocation';
import { useMapRegion } from '../hooks/useMapRegion';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';
import { Colors } from '@/shared/theme';

export function DiscoveryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { location, loading: locationLoading } = useUserLocation();
  const { region, bbox, isZoomedOut, onRegionDidChange, initialRegion } = useMapRegion();
  const {
    places,
    selectedPlace,
    selectedId,
    selectPlace,
    loading: placesLoading,
  } = useNearbyPlaces(bbox);

  if (locationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang xác định vị trí...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        places={places}
        userLatitude={location?.latitude ?? null}
        userLongitude={location?.longitude ?? null}
        initialRegion={initialRegion}
        onRegionDidChange={onRegionDidChange}
        onSelectPlace={selectPlace}
        selectedPlaceId={selectedId}
      />

      {/* UI Overlays */}
      <View style={styles.overlayTop}>
        <HeaderBar />
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <MapControls />

      {isZoomedOut && (
        <View style={styles.zoomHintBanner}>
          <Text style={styles.zoomHintText}>🔍 Phóng to khu vực để xem chi tiết tiếp cận</Text>
        </View>
      )}

      {selectedPlace && (
        <PlaceCallout
          place={selectedPlace}
          onClose={() => selectPlace(null)}
        />
      )}

      {placesLoading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingBannerText}>Đang tải...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.mapCanvasBg ?? '#e5eeed',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary ?? '#6b7280',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  loadingBanner: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadingBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  zoomHintBanner: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
