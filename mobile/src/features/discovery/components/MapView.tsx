import React, { useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PlaceDto, MapRegion, LocationPoi } from '../types';
import { AccessibilityLayer } from './AccessibilityLayer';
import { UserLocationMarker } from './UserLocationMarker';
import { MapCanvas } from './MapCanvas';
import { Colors } from '@/shared/theme';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants.executionEnvironment as string) === 'storeClient';
const isWeb = Platform.OS === 'web';

let MapLibreGL: any = null;
if (!isExpoGo && !isWeb) {
  try {
    MapLibreGL = require('@maplibre/maplibre-react-native');
  } catch {
    MapLibreGL = null;
  }
}

// Fallback to a basic OSM style if no API key is set
const FALLBACK_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

interface MapViewProps {
  places: PlaceDto[];
  userLatitude: number | null;
  userLongitude: number | null;
  initialRegion: MapRegion;
  onRegionDidChange?: (feature: any) => void;
  onSelectPlace?: (placeId: string) => void;
  selectedPlaceId?: string | null;
  showAccessibilityLayer?: boolean;
}

export function MapView({
  places,
  userLatitude,
  userLongitude,
  initialRegion,
  onRegionDidChange,
  onSelectPlace,
  selectedPlaceId,
  showAccessibilityLayer = true,
}: MapViewProps) {
  const cameraRef = useRef<any>(null);

  // Convert real lat/lng places into SVG LocationPoi coordinates for Expo Go / Web fallback
  const fallbackLocations = useMemo<LocationPoi[]>(() => {
    return places.map((p, idx) => {
      // District 1 bounding approximation for SVG projection
      const minLng = 106.692;
      const maxLng = 106.710;
      const minLat = 10.768;
      const maxLat = 10.785;
      const x = Math.max(15, Math.min(85, ((p.lng - minLng) / (maxLng - minLng)) * 100));
      const y = Math.max(20, Math.min(80, (1 - (p.lat - minLat) / (maxLat - minLat)) * 100));

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        xPercent: Number.isFinite(x) ? x : 30 + idx * 15,
        yPercent: Number.isFinite(y) ? y : 40 + idx * 10,
        isSelected: p.id === selectedPlaceId,
        accessibility: {
          hasRamp: p.has_ramp,
          hasElevator: p.has_elevator,
          hasTactilePaving: p.has_tactile_paving,
          hasAccessibleRestroom: p.has_accessible_restroom,
          doorWidthOk: p.door_width_ok,
          note: p.accessibility_note ?? undefined,
        },
      };
    });
  }, [places, selectedPlaceId]);

  // When running in Expo Go or Web, render interactive SVG map fallback
  if (!MapLibreGL) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackNotice}>
          <Text style={styles.fallbackNoticeText}>
            {isWeb ? '🌐 Chế độ Web — Bản đồ Prototype SVG' : '📱 Chế độ Expo Go — Bản đồ Prototype SVG'}
          </Text>
        </View>
        <MapCanvas
          locations={fallbackLocations}
          onSelectLocation={(id) => onSelectPlace?.(id)}
          zoomLevel={1}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={FALLBACK_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onRegionDidChange={onRegionDidChange}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialRegion.longitude, initialRegion.latitude],
            zoomLevel: initialRegion.zoom,
          }}
        />

        {userLatitude != null && userLongitude != null && (
          <UserLocationMarker
            MapLibreGL={MapLibreGL}
            latitude={userLatitude}
            longitude={userLongitude}
          />
        )}

        {showAccessibilityLayer && (
          <AccessibilityLayer
            MapLibreGL={MapLibreGL}
            places={places}
            onSelectPlace={onSelectPlace}
            selectedPlaceId={selectedPlaceId}
          />
        )}
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fallbackNotice: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(32, 138, 239, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fallbackNoticeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
