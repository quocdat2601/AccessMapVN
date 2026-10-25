import React, { useMemo } from 'react';
import type { PlaceDto } from '../../model';

interface AccessibilityLayerProps {
  MapLibreGL: any;
  places: PlaceDto[];
  onSelectPlace?: (placeId: string) => void;
  onClusterPress?: (lng: number, lat: number) => void;
  selectedPlaceId?: string | null;
}

function categoryToSpriteIcon(category: string): string {
  switch (category?.toLowerCase()) {
    case 'cafe':
    case 'coffee':
      return 'cafe_11';
    case 'restaurant':
    case 'food_court':
    case 'food':
      return 'restaurant_11';
    case 'fast_food':
      return 'fast_food';
    case 'bar':
    case 'pub':
      return 'bar';
    case 'bakery':
      return 'bakery';

    case 'mall':
    case 'market':
    case 'supermarket':
    case 'convenience':
    case 'shop':
    case 'store':
      return 'shop_11';
    case 'clothes':
    case 'clothing_store':
    case 'department_store':
      return 'clothing_store';

    case 'hospital':
    case 'clinic':
    case 'doctors':
      return 'hospital_11';
    case 'pharmacy':
      return 'pharmacy';
    case 'dentist':
      return 'dentist';

    case 'school':
    case 'university':
    case 'college':
      return 'school';
    case 'library':
      return 'library';

    case 'transit':
    case 'bus_station':
    case 'bus':
      return 'bus';

    case 'hotel':
    case 'motel':
    case 'hostel':
    case 'guest_house':
    case 'lodging':
      return 'lodging';

    case 'attraction':
    case 'museum':
      return 'museum';
    case 'cinema':
      return 'cinema';
    case 'park':
      return 'park';

    case 'bank':
    case 'atm':
      return 'bank_11';

    case 'police':
      return 'police';
    case 'post_office':
      return 'post';

    case 'parking':
      return 'parking';

    case 'hairdresser':
      return 'hairdresser';

    case 'place_of_worship':
      return 'place_of_worship';

    case 'apartment':
    case 'residential':
    case 'building':
    default:
      return 'circle_stroked';
  }
}

export function normalizeScore(score: number): number {
  if (isNaN(score) || score < 0) return -1;
  if (score > 5) return score / 100; // e.g. 85 -> 0.85, 98 -> 0.98
  if (score > 1) return score / 5;   // e.g. 4.0 -> 0.80
  return score;                      // e.g. 0.85 -> 0.85
}

export function getAccessibilityColor(normalizedScore: number): string {
  if (normalizedScore >= 0.7) return '#10b981'; // Xanh lá: Tiếp cận tốt (QCVN 10:2014)
  if (normalizedScore >= 0.4) return '#f59e0b'; // Vàng cam: Tiếp cận một phần
  return '#ef4444'; // Đỏ: Khó tiếp cận / có chướng ngại
}

export function AccessibilityLayer({
  MapLibreGL,
  places,
  onSelectPlace,
  selectedPlaceId,
}: AccessibilityLayerProps) {
  const geojson: any = useMemo(() => ({
    type: 'FeatureCollection',
    features: places.map((p) => {
      const rawScore = Number(p.accessibility_score);
      const normalizedScore = normalizeScore(rawScore);
      const isRated = normalizedScore >= 0;
      const accessColor = isRated ? getAccessibilityColor(normalizedScore) : '#94a3b8';
      const icon = categoryToSpriteIcon(p.category);

      return {
        type: 'Feature' as const,
        id: p.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat],
        },
        properties: {
          id: p.id,
          name: p.name,
          category: p.category,
          score: normalizedScore,
          isRated,
          accessColor,
          icon,
          isSelected: p.id === selectedPlaceId,
        },
      };
    }),
  }), [places, selectedPlaceId]);

  if (!MapLibreGL) return null;

  return (
    <MapLibreGL.GeoJSONSource
      id="accessibility-places"
      data={geojson}
      cluster={false}
      hitbox={{ top: 22, bottom: 22, left: 22, right: 22 }}
      onPress={(e: any) => {
        const features = e?.nativeEvent?.features ?? e?.features;
        const feature = features?.[0];
        if (!feature) return;

        if (feature?.properties?.id) {
          onSelectPlace?.(feature.properties.id as string);
        }
      }}
    >
      {/* 1. Unrated places: Subtle dots at zoom >= 13 */}
      <MapLibreGL.Layer
        type="circle"
        id="places-unrated-dot"
        minZoomLevel={13}
        filter={['==', ['get', 'isRated'], false]}
        paint={{
          circleRadius: [
            'interpolate',
            ['linear'],
            ['zoom'],
            13, 3.5,
            16, 6,
          ],
          circleColor: '#94a3b8',
          circleOpacity: 0.85,
          circleStrokeWidth: 1.5,
          circleStrokeColor: '#ffffff',
        }}
      />

      {/* 2. Unrated places label: subtle gray name at zoom >= 15 */}
      <MapLibreGL.Layer
        type="symbol"
        id="places-unrated-symbols"
        minZoomLevel={15}
        filter={['==', ['get', 'isRated'], false]}
        layout={{
          textField: ['get', 'name'],
          textSize: 10,
          textFont: ['Noto Sans Regular'],
          textOffset: [0, 1.2],
          textAnchor: 'top',
          textMaxWidth: 8,
          textOptional: true,
          textAllowOverlap: false,
        }}
        paint={{
          textColor: '#64748b',
          textHaloColor: '#ffffff',
          textHaloWidth: 1.5,
          textHaloBlur: 0.5,
        }}
      />

      {/* 3. Rated / Verified Places: Outer White Badge with Accessibility Ring */}
      <MapLibreGL.Layer
        type="circle"
        id="places-rated-badge"
        minZoomLevel={11}
        filter={['all', ['==', ['get', 'isRated'], true], ['!=', ['get', 'isSelected'], true]]}
        paint={{
          circleRadius: [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 7,
            14, 11,
            16, 14,
          ],
          circleColor: '#ffffff',
          circleOpacity: 0.98,
          circleStrokeWidth: [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 2.5,
            14, 3,
            16, 3.5,
          ],
          circleStrokeColor: ['get', 'accessColor'],
        }}
      />

      {/* 4. Rated / Verified Places: Inner Colored Center Dot */}
      <MapLibreGL.Layer
        type="circle"
        id="places-rated-center"
        minZoomLevel={11}
        filter={['all', ['==', ['get', 'isRated'], true], ['!=', ['get', 'isSelected'], true]]}
        paint={{
          circleRadius: [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 3.5,
            14, 5.5,
            16, 7.5,
          ],
          circleColor: ['get', 'accessColor'],
          circleOpacity: 1,
        }}
      />

      {/* 5. Selected Place: Prominent Highlight Ring */}
      <MapLibreGL.Layer
        type="circle"
        id="places-selected-badge"
        minZoomLevel={11}
        filter={['==', ['get', 'isSelected'], true]}
        paint={{
          circleRadius: [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 10,
            14, 14,
            16, 17,
          ],
          circleColor: '#ffffff',
          circleOpacity: 1,
          circleStrokeWidth: 4,
          circleStrokeColor: ['get', 'accessColor'],
        }}
      />

      {/* 6. Rated / Verified Places: Bold Name Label (visible from zoom 12, always displayed) */}
      <MapLibreGL.Layer
        type="symbol"
        id="places-rated-label"
        minZoomLevel={12}
        filter={['==', ['get', 'isRated'], true]}
        layout={{
          textField: ['get', 'name'],
          textSize: 11,
          textFont: ['Noto Sans Bold'],
          textOffset: [0, 1.4],
          textAnchor: 'top',
          textMaxWidth: 10,
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
        paint={{
          textColor: '#0f172a',
          textHaloColor: '#ffffff',
          textHaloWidth: 2,
          textHaloBlur: 0.5,
        }}
      />
    </MapLibreGL.GeoJSONSource>
  );
}
