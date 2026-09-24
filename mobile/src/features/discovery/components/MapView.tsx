import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import type { PlaceDto, MapRegion } from '../types';
import { AccessibilityLayer } from './AccessibilityLayer';
import { UserLocationMarker } from './UserLocationMarker';
import { Colors } from '@/shared/theme';

// ponytail: using MapTiler free tier; upgrade path: self-hosted TileServer GL
const MAPTILER_STYLE_URL =
  'https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_free_key';

// Fallback to a basic OSM style if no API key is set
const FALLBACK_STYLE_URL =
  'https://demotiles.maplibre.org/style.json';

interface MapViewProps {
  places: PlaceDto[];
  userLatitude: number | null;
  userLongitude: number | null;
  initialRegion: MapRegion;
  onRegionDidChange?: (feature: GeoJSON.Feature<GeoJSON.Point>) => void;
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
  const cameraRef = useRef<MapLibreGL.Camera>(null);

  const styleUrl = FALLBACK_STYLE_URL;

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={styleUrl}
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
            latitude={userLatitude}
            longitude={userLongitude}
          />
        )}

        {showAccessibilityLayer && (
          <AccessibilityLayer
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
});
