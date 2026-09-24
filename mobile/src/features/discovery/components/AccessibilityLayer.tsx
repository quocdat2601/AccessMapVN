import React, { useMemo } from 'react';
import type { PlaceDto } from '../types';
import { Colors } from '@/shared/theme';

interface AccessibilityLayerProps {
  MapLibreGL: any;
  places: PlaceDto[];
  onSelectPlace?: (placeId: string) => void;
  selectedPlaceId?: string | null;
}

function scoreToColor(score: number): string {
  if (score >= 0.8) return Colors.accessGreen ?? '#2ecc71';
  if (score >= 0.5) return Colors.accessYellow ?? '#f39c12';
  return Colors.accessRed ?? '#e74c3c';
}

function categoryToEmoji(category: string): string {
  const map: Record<string, string> = {
    mall: '🏬',
    hotel: '🏨',
    hospital: '🏥',
    transit: '🚇',
    market: '🛒',
    other: '📍',
  };
  return map[category] ?? '📍';
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
    features: places.map((p) => ({
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
        score: p.accessibility_score,
        color: scoreToColor(p.accessibility_score),
        emoji: categoryToEmoji(p.category),
        isSelected: p.id === selectedPlaceId,
      },
    })),
  }), [places, selectedPlaceId]);

  return (
    <MapLibreGL.ShapeSource
      id="accessibility-places"
      shape={geojson}
      onPress={(e: any) => {
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          onSelectPlace?.(feature.properties.id as string);
        }
      }}
    >
      {/* Outer glow ring for accessibility score */}
      <MapLibreGL.CircleLayer
        id="places-glow"
        style={{
          circleRadius: 18,
          circleColor: ['get', 'color'],
          circleOpacity: 0.2,
          circleStrokeWidth: 0,
        }}
      />

      {/* Inner circle marker */}
      <MapLibreGL.CircleLayer
        id="places-marker"
        style={{
          circleRadius: [
            'case',
            ['get', 'isSelected'], 12,
            9,
          ],
          circleColor: ['get', 'color'],
          circleOpacity: 0.9,
          circleStrokeWidth: 2.5,
          circleStrokeColor: '#ffffff',
        }}
      />

      {/* Category labels */}
      <MapLibreGL.SymbolLayer
        id="places-label"
        style={{
          textField: ['get', 'name'],
          textSize: 11,
          textFont: ['Open Sans Regular'],
          textOffset: [0, 1.8],
          textAnchor: 'top',
          textColor: Colors.textPrimary ?? '#1a1a2e',
          textHaloColor: '#ffffff',
          textHaloWidth: 1.5,
          textMaxWidth: 12,
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
