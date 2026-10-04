import React, { useMemo } from 'react';
import type { PlaceDto } from '../types';

interface AccessibilityLayerProps {
  MapLibreGL: any;
  places: PlaceDto[];
  onSelectPlace?: (placeId: string) => void;
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

function getAccessibilityColor(score: number): string {
  if (score >= 0.8) return '#10b981'; // Xanh lá: Tiếp cận tốt
  if (score >= 0.5) return '#f59e0b'; // Vàng cam: Tiếp cận một phần
  return '#ef4444'; // Đỏ: Khó tiếp cận
}

export function AccessibilityLayer({
  MapLibreGL,
  places,
  onSelectPlace,
  selectedPlaceId,
}: AccessibilityLayerProps) {
  if (!MapLibreGL) return null;

  const geojson: any = useMemo(() => ({
    type: 'FeatureCollection',
    features: places.map((p) => {
      const score = Number(p.accessibility_score);
      const isRated = !isNaN(score) && score >= 0;
      const accessColor = isRated ? getAccessibilityColor(score) : '#94a3b8';
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
          score,
          isRated,
          accessColor,
          icon,
          isSelected: p.id === selectedPlaceId,
        },
      };
    }),
  }), [places, selectedPlaceId]);

  return (
    <MapLibreGL.GeoJSONSource
      id="accessibility-places"
      data={geojson}
      hitbox={{ top: 20, bottom: 20, left: 20, right: 20 }}
      onPress={(e: any) => {
        const features = e?.nativeEvent?.features ?? e?.features;
        const feature = features?.[0];
        if (feature?.properties?.id) {
          onSelectPlace?.(feature.properties.id as string);
        }
      }}
    >
      {/* Viền tròn màu tiếp cận - chỉ hiển thị cho các địa điểm ĐÃ CÓ ĐÁNH GIÁ (isRated = true) */}
      <MapLibreGL.Layer
        type="circle"
        id="places-rated-badge"
        minZoomLevel={13}
        filter={['==', ['get', 'isRated'], true]}
        style={{
          circleRadius: [
            'case',
            ['get', 'isSelected'], 15,
            12,
          ],
          circleColor: '#ffffff',
          circleOpacity: 0.95,
          circleStrokeWidth: 2.5,
          circleStrokeColor: ['get', 'accessColor'],
        }}
      />

      {/* Icon thể loại POI + Tên địa điểm */}
      <MapLibreGL.Layer
        type="symbol"
        id="places-symbols"
        minZoomLevel={13}
        layout={{
          iconImage: ['get', 'icon'],
          iconSize: 1.0,
          iconAllowOverlap: true,
          iconIgnorePlacement: true,
          textAllowOverlap: false,
          textField: ['get', 'name'],
          textSize: 11,
          textFont: ['Noto Sans Regular'],
          textOffset: [0, 0.8],
          textAnchor: 'top',
          textMaxWidth: 9,
          textOptional: true,
        }}
        paint={{
          textColor: '#202124',
          textHaloColor: '#ffffff',
          textHaloWidth: 1.5,
          textHaloBlur: 0.5,
        }}
      />
    </MapLibreGL.GeoJSONSource>
  );
}
