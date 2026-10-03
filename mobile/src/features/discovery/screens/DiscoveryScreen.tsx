import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapView, type MapViewHandle } from '../components/MapView';
import { HeaderBar } from '../components/HeaderBar';
import { SearchBar } from '../components/SearchBar';
import { MapControls } from '../components/MapControls';
import { PlaceCallout } from '../components/PlaceCallout';
import { useUserLocation } from '../hooks/useUserLocation';
import { useMapRegion } from '../hooks/useMapRegion';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';
import { forwardGeocode } from '../services/placesApi';
import { Colors } from '@/shared/theme';

import type { PlaceDto, GeocodeResult } from '../types';

export function DiscoveryScreen() {
  const mapViewRef = useRef<MapViewHandle>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAccessibilityLayer, setShowAccessibilityLayer] = useState(true);
  const [osmPlace, setOsmPlace] = useState<PlaceDto | null>(null);
  const { location, loading: locationLoading } = useUserLocation();
  const { region, bbox, isZoomedOut, onRegionDidChange, initialRegion } = useMapRegion();
  const {
    places,
    selectedPlace,
    selectedId,
    selectPlace,
    loading: placesLoading,
  } = useNearbyPlaces(bbox);

  const activePlace = selectedPlace ?? osmPlace;

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await forwardGeocode(q, {
          lat: location?.latitude,
          lng: location?.longitude,
          limit: 5,
        });
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, location?.latitude, location?.longitude]);

  const handleSelectSearchResult = (result: GeocodeResult) => {
    setShowResults(false);
    setSearchQuery(result.name);
    mapViewRef.current?.flyTo(result.lng, result.lat, 16);
    selectPlace(null);
    setOsmPlace({
      id: `search-${result.id}`,
      name: result.name,
      category: 'other',
      address: result.displayName,
      lng: result.lng,
      lat: result.lat,
      has_ramp: false,
      has_elevator: false,
      has_tactile_paving: false,
      has_accessible_restroom: false,
      door_width_ok: false,
      accessibility_score: -1,
      accessibility_note: null,
    });
  };

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
        ref={mapViewRef}
        places={places}
        userLatitude={location?.latitude ?? null}
        userLongitude={location?.longitude ?? null}
        initialRegion={initialRegion}
        onRegionDidChange={onRegionDidChange}
        onSelectPlace={(id) => {
          setOsmPlace(null);
          selectPlace(id);
        }}
        onSelectOsmPlace={(p) => {
          if (p) {
            selectPlace(null);
            setOsmPlace(p);
          } else {
            setOsmPlace(null);
            selectPlace(null);
          }
        }}
        selectedPlaceId={selectedId}
        selectedPlace={activePlace}
        showAccessibilityLayer={showAccessibilityLayer}
      />

      {/* UI Overlays */}
      <View style={styles.overlayTop}>
        <HeaderBar />
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => {
            setSearchQuery('');
            setSearchResults([]);
            setShowResults(false);
          }}
          isSearching={isSearching}
        />

        {showResults && searchResults.length > 0 && (
          <View style={styles.resultsDropdown}>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() => handleSelectSearchResult(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-sharp" size={18} color={Colors.primary} style={styles.resultIcon} />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>{item.displayName}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <MapControls
        onMyLocation={() => mapViewRef.current?.recenter()}
        onToggleLayer={() => setShowAccessibilityLayer((prev) => !prev)}
        isLayerActive={showAccessibilityLayer}
      />

      {isZoomedOut && (
        <View style={styles.zoomHintBanner}>
          <Text style={styles.zoomHintText}>🔍 Phóng to khu vực để xem chi tiết tiếp cận</Text>
        </View>
      )}

      {activePlace && (
        <PlaceCallout
          place={activePlace}
          userLatitude={location?.latitude}
          userLongitude={location?.longitude}
          onClose={() => {
            selectPlace(null);
            setOsmPlace(null);
          }}
        />
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
  resultsDropdown: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    maxHeight: 280,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  resultIcon: {
    marginRight: 10,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 11,
    color: '#64748b',
  },
});
