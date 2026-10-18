import Constants from 'expo-constants';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { reverseGeocode, type PlaceDto } from '@/entities/place';
import type { LocationPoi, MapRegion } from '../../model';
import { AccessibilityLayer } from './AccessibilityLayer';
import { MapCanvas } from './MapCanvas';
import { UserLocationMarker } from './UserLocationMarker';

function cleanPlaceName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/^(office|building|commercial|residential|retail|public|amenity)_+/i, '')
    .replace(/stories\s*\d+/gi, '')
    .replace(/levels\s*\d+/gi, '')
    .replace(/height\s*\d+/gi, '')
    .replace(/^[_\s-]+|[_\s-]+$/g, '')
    .trim();  
}

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

// Vector tile style: supports custom MapTiler/Protomaps via env, falls back to OpenFreeMap Liberty
const DEFAULT_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ||
  'https://tiles.openfreemap.org/styles/liberty';

interface MapViewProps {
  places: PlaceDto[];
  userLatitude: number | null;
  userLongitude: number | null;
  initialRegion: MapRegion;
  onRegionDidChange?: (feature: any) => void;
  onSelectPlace?: (placeId: string | null, place?: PlaceDto | null) => void;
  onSelectOsmPlace?: (place: PlaceDto | null) => void;
  selectedPlaceId?: string | null;
  selectedPlace?: PlaceDto | null;
  showAccessibilityLayer?: boolean;
}

export interface MapViewHandle {
  recenter: () => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
}

function isFullAddress(addr?: string | null): boolean {
  if (!addr) return false;
  return addr.includes(',');
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractImmediateAddress(features: any[]): string | null {
  for (const f of features) {
    const p = f?.properties;
    if (p?.['addr:street']) {
      const num = p['addr:housenumber'] ? `${p['addr:housenumber']} ` : '';
      const ward = p['addr:suburb'] || p['addr:district'] ? `, ${p['addr:suburb'] || p['addr:district']}` : '';
      return `${num}${p['addr:street']}${ward}`;
    }
    if (p?.['addr:full']) return p['addr:full'];
  }

  const roadFeature = features.find((f: any) => {
    const p = f?.properties;
    const name = p?.name || p?.['name:vi'] || p?.name_vi;
    if (!name) return false;
    const layer = (f?.layer?.id || '').toLowerCase();
    const cls = (p?.class || '').toLowerCase();
    return (
      layer.includes('road') ||
      layer.includes('transportation') ||
      layer.includes('street') ||
      ['street', 'primary', 'secondary', 'tertiary', 'residential', 'service', 'motorway', 'trunk'].includes(cls)
    );
  });

  const areaFeature = features.find((f: any) => {
    const p = f?.properties;
    const name = p?.name || p?.['name:vi'] || p?.name_vi;
    if (!name) return false;
    const layer = (f?.layer?.id || '').toLowerCase();
    const cls = (p?.class || '').toLowerCase();
    return (
      (layer.includes('place') || layer.includes('boundary') || ['suburb', 'neighbourhood', 'quarter', 'district', 'city'].includes(cls)) &&
      name !== (roadFeature?.properties?.name || roadFeature?.properties?.['name:vi'])
    );
  });

  const roadName = roadFeature?.properties?.name || roadFeature?.properties?.['name:vi'] || roadFeature?.properties?.name_vi;
  const areaName = areaFeature?.properties?.name || areaFeature?.properties?.['name:vi'] || areaFeature?.properties?.name_vi;

  if (roadName && areaName) return `${roadName}, ${areaName}`;
  if (roadName) return roadName;
  if (areaName) return areaName;
  return null;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({
  places,
  userLatitude,
  userLongitude,
  initialRegion,
  onRegionDidChange,
  onSelectPlace,
  onSelectOsmPlace,
  selectedPlaceId,
  selectedPlace,
  showAccessibilityLayer = true,
}, ref) {
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const [activeTapPoint, setActiveTapPoint] = useState<{ lng: number; lat: number; name?: string } | null>(null);

  const flyToPlace = (lng: number, lat: number, zoom = 16) => {
    // Offset south so marker is centered in the upper viewport above the bottom sheet
    const targetLat = lat - 0.0028;
    cameraRef.current?.flyTo({ center: [lng, targetLat], zoom, duration: 750 });
  };

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (userLatitude == null || userLongitude == null) return;
      cameraRef.current?.flyTo({ center: [userLongitude, userLatitude], zoom: 16, duration: 800 });
    },
    flyTo: (lng: number, lat: number, zoom: number = 16) => {
      flyToPlace(lng, lat, zoom);
    },
    zoomIn: async () => {
      try {
        const zoom = await mapRef.current?.getZoom();
        if (typeof zoom === 'number') {
          cameraRef.current?.zoomTo(Math.min(zoom + 1, 20), 300);
        }
      } catch {}
    },
    zoomOut: async () => {
      try {
        const zoom = await mapRef.current?.getZoom();
        if (typeof zoom === 'number') {
          cameraRef.current?.zoomTo(Math.max(zoom - 1, 3), 300);
        }
      } catch {}
    },
    resetNorth: () => {
      try {
        cameraRef.current?.setCamera({ heading: 0, animationDuration: 400 });
      } catch {}
    },
  }), [userLatitude, userLongitude]);

  const currentResolvingId = useRef<string | null>(null);

  const handleSelectAppPlace = async (placeId: string, immediateAddr?: string | null) => {
    if (currentResolvingId.current === placeId) return;
    const matched = places.find((p) => p.id === placeId);
    if (!matched) return;

    flyToPlace(matched.lng, matched.lat);
    currentResolvingId.current = placeId;
    setActiveTapPoint(null);
    onSelectOsmPlace?.(null);

    const initialAddress = matched.address || immediateAddr || null;
    const needsGeocode = !isFullAddress(initialAddress);

    // Optimistic UI: Open place callout immediately (0ms)
    onSelectPlace?.(placeId, {
      ...matched,
      address: initialAddress,
      isAddressLoading: needsGeocode,
    });

    if (!needsGeocode) {
      currentResolvingId.current = null;
      return;
    }

    try {
      const addr = await reverseGeocode(matched.lat, matched.lng);
      if (currentResolvingId.current !== placeId) return;
      const finalAddress = addr || initialAddress;
      matched.address = finalAddress;
      onSelectPlace?.(placeId, {
        ...matched,
        address: finalAddress,
        isAddressLoading: false,
      });
    } catch {
      if (currentResolvingId.current === placeId) {
        onSelectPlace?.(placeId, {
          ...matched,
          address: initialAddress,
          isAddressLoading: false,
        });
      }
    } finally {
      if (currentResolvingId.current === placeId) {
        currentResolvingId.current = null;
      }
    }
  };

  const handleMapPress = async (event: any) => {
    const nativeEvent = event?.nativeEvent;
    if (!nativeEvent?.point || !mapRef.current) return;

    try {
      const point = nativeEvent.point;
      const px = Array.isArray(point) ? point[0] : (point as any)?.x;
      const py = Array.isArray(point) ? point[1] : (point as any)?.y;

      let features: any[] = [];
      if (typeof px === 'number' && typeof py === 'number' && !isNaN(px) && !isNaN(py)) {
        try {
          features = await mapRef.current.queryRenderedFeatures([
            [px - 24, py - 24],
            [px + 24, py + 24],
          ]);
        } catch {
          features = [];
        }
      }

      if (!features || features.length === 0) {
        try {
          features = (await mapRef.current.queryRenderedFeatures(point)) ?? [];
        } catch {
          features = [];
        }
      }

      if (!features || features.length === 0) {
        // If nativeEvent already has bubbled features, use them
        features = nativeEvent?.features ?? [];
      }

      // Priority 0: Check if user tapped directly on or near their current location marker
      const tapCoords: [number, number] | null =
        event?.geometry?.coordinates ||
        nativeEvent?.lngLat ||
        (nativeEvent?.coordinate ? [nativeEvent.coordinate.longitude, nativeEvent.coordinate.latitude] : null);

      const isUserLocationTap =
        userLatitude != null &&
        userLongitude != null &&
        (features.some((f: any) => f?.properties?.isUserLocation || (f?.layer?.id && f.layer.id.includes('user-location'))) ||
          (tapCoords && getDistanceMeters(userLatitude, userLongitude, tapCoords[1], tapCoords[0]) <= 35));

      if (isUserLocationTap && userLatitude != null && userLongitude != null) {
        flyToPlace(userLongitude, userLatitude);
        const myPlaceId = 'my-current-location';
        currentResolvingId.current = myPlaceId;
        setActiveTapPoint(null);
        onSelectPlace?.(null);

        const immediateAddress = extractImmediateAddress(features);
        const userPlace: PlaceDto = {
          id: myPlaceId,
          name: 'Vị trí hiện tại của bạn',
          category: 'gps' as any,
          address: immediateAddress || 'Đang tải địa chỉ...',
          phone: null,
          website: null,
          opening_hours: null,
          brand: null,
          operator: null,
          lng: userLongitude,
          lat: userLatitude,
          has_ramp: false,
          has_elevator: false,
          has_tactile_paving: false,
          has_accessible_restroom: false,
          door_width_ok: false,
          accessibility_score: -1,
          accessibility_note: null,
          isAddressLoading: !isFullAddress(immediateAddress),
        };

        onSelectOsmPlace?.(userPlace);

        if (!isFullAddress(immediateAddress)) {
          try {
            const addr = await reverseGeocode(userLatitude, userLongitude);
            if (currentResolvingId.current !== myPlaceId) return;
            onSelectOsmPlace?.({
              ...userPlace,
              address: addr || 'Vị trí hiện tại',
              isAddressLoading: false,
            });
          } catch {
            if (currentResolvingId.current === myPlaceId) {
              onSelectOsmPlace?.({
                ...userPlace,
                address: 'Vị trí hiện tại',
                isAddressLoading: false,
              });
            }
          } finally {
            if (currentResolvingId.current === myPlaceId) {
              currentResolvingId.current = null;
            }
          }
        } else {
          currentResolvingId.current = null;
        }
        return;
      }

      if (!features || features.length === 0) {
        setActiveTapPoint(null);
        onSelectPlace?.(null);
        onSelectOsmPlace?.(null);
        return;
      }

      const immediateAddress = extractImmediateAddress(features);

      // Priority 1: Check if user tapped directly on an AccessMapVN place marker
      const appFeature = features.find(
        (f: any) => f?.properties?.id && places.some((p) => p.id === f.properties.id)
      );
      if (appFeature) {
        await handleSelectAppPlace(appFeature.properties.id, immediateAddress);
        return;
      }

      // Priority 2: Check if tapped base map feature matches an existing loaded place
      const namedFeature = features.find(
        (f: any) =>
          f?.properties?.name ||
          f?.properties?.name_en ||
          f?.properties?.name_vi ||
          f?.properties?.['name:vi']
      );

      if (namedFeature) {
        const props = namedFeature.properties;
        const rawName = props.name || props['name:vi'] || props.name_vi || props.name_en;
        const name = cleanPlaceName(rawName);

        if (!name) {
          setActiveTapPoint(null);
          onSelectPlace?.(null);
          onSelectOsmPlace?.(null);
          return;
        }

        const matchedExisting = places.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (matchedExisting) {
          await handleSelectAppPlace(matchedExisting.id, immediateAddress);
          return;
        }

        // Priority 3: Truly unrated base map feature
        const coords = tapCoords ?? nativeEvent.lngLat ?? [initialRegion.longitude, initialRegion.latitude];
        const placeId = `osm-${namedFeature.id ?? Math.round(coords[0] * 10000)}`;
        const baseCategory = (props.category || props.class || props.subclass || props.amenity || 'other') as any;

        // Show immediate selection pin on map while address resolves
        flyToPlace(coords[0], coords[1]);
        setActiveTapPoint({ lng: coords[0], lat: coords[1], name });

        const phone = props.phone || props['contact:phone'] || null;
        const website = props.website || props['contact:website'] || null;
        const openingHours = props.opening_hours || props.openingHours || null;
        const brand = props.brand || null;
        const operator = props.operator || null;
        const quickAddr = props['addr:street']
          ? `${props['addr:housenumber'] ? props['addr:housenumber'] + ' ' : ''}${props['addr:street']}`
          : null;

        const initialAddress = isFullAddress(quickAddr)
          ? quickAddr
          : isFullAddress(immediateAddress)
          ? immediateAddress
          : quickAddr || immediateAddress || null;

        const needsGeocode = !isFullAddress(initialAddress) && Boolean(coords[1] && coords[0]);

        const baseOsmPlace: PlaceDto = {
          id: placeId,
          name,
          category: baseCategory,
          address: initialAddress,
          phone,
          website,
          opening_hours: openingHours,
          brand,
          operator,
          lng: coords[0],
          lat: coords[1],
          has_ramp: false,
          has_elevator: false,
          has_tactile_paving: false,
          has_accessible_restroom: false,
          door_width_ok: false,
          accessibility_score: -1,
          accessibility_note: null,
          isAddressLoading: needsGeocode,
        };

        currentResolvingId.current = placeId;
        setActiveTapPoint(null);
        onSelectPlace?.(null);
        onSelectOsmPlace?.(baseOsmPlace);

        if (!needsGeocode) {
          currentResolvingId.current = null;
          return;
        }

        try {
          const addr = await reverseGeocode(coords[1], coords[0]);
          if (currentResolvingId.current !== placeId) return;
          const finalAddress = addr || initialAddress;
          onSelectOsmPlace?.({
            ...baseOsmPlace,
            address: finalAddress,
            isAddressLoading: false,
          });
        } catch {
          if (currentResolvingId.current === placeId) {
            onSelectOsmPlace?.({
              ...baseOsmPlace,
              address: initialAddress,
              isAddressLoading: false,
            });
          }
        } finally {
          if (currentResolvingId.current === placeId) {
            currentResolvingId.current = null;
          }
        }
      } else {
        currentResolvingId.current = null;
        setActiveTapPoint(null);
        onSelectPlace?.(null);
        onSelectOsmPlace?.(null);
      }
    } catch {
      currentResolvingId.current = null;
      setActiveTapPoint(null);
      onSelectPlace?.(null);
      onSelectOsmPlace?.(null);
    }
  };

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
      <MapLibreGL.Map
        ref={mapRef}
        style={styles.map}
        mapStyle={DEFAULT_STYLE_URL}
        logo={false}
        attribution={false}
        compass
        onRegionDidChange={onRegionDidChange}
        onPress={handleMapPress}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialRegion.longitude, initialRegion.latitude],
            zoom: initialRegion.zoom,
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
            onSelectPlace={handleSelectAppPlace}
            selectedPlaceId={selectedPlaceId}
          />
        )}

        {Boolean(selectedPlace || activeTapPoint) && (
          <MapLibreGL.GeoJSONSource
            id="selected-place-pin"
            data={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: selectedPlace
                  ? [selectedPlace.lng, selectedPlace.lat]
                  : [activeTapPoint!.lng, activeTapPoint!.lat],
              },
              properties: {
                name: selectedPlace?.name || activeTapPoint?.name || '',
              },
            }}
          >
            <MapLibreGL.Layer
              type="circle"
              id="selected-place-pulse"
              paint={{
                circleRadius: 22,
                circleColor: '#ef4444',
                circleOpacity: 0.25,
                circleStrokeWidth: 0,
              }}
            />
            <MapLibreGL.Layer
              type="circle"
              id="selected-place-dot"
              paint={{
                circleRadius: 9,
                circleColor: '#ef4444',
                circleStrokeWidth: 3,
                circleStrokeColor: '#ffffff',
              }}
            />
            <MapLibreGL.Layer
              type="symbol"
              id="selected-place-label"
              layout={{
                textField: ['get', 'name'],
                textSize: 12,
                textFont: ['Noto Sans Bold'],
                textOffset: [0, 1.8],
                textAnchor: 'top',
                textMaxWidth: 10,
              }}
              paint={{
                textColor: '#0f172a',
                textHaloColor: '#ffffff',
                textHaloWidth: 2,
              }}
            />
          </MapLibreGL.GeoJSONSource>
        )}
      </MapLibreGL.Map>
    </View>
  );
});

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
