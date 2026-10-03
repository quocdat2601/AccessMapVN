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
    <MapLibreGL.GeoJSONSource
      id="accessibility-places"
      data={geojson}
      cluster
      clusterRadius={50}
      clusterMaxZoom={14}
      hitbox={{ top: 20, bottom: 20, left: 20, right: 20 }}
      onPress={(e: any) => {
        const features = e?.nativeEvent?.features ?? e?.features;
        const feature = features?.[0];
        if (feature?.properties?.cluster) {
          return;
        }
        if (feature?.properties?.id) {
          onSelectPlace?.(feature.properties.id as string);
        }
      }}
    >
      {/* Cluster circle background */}
      <MapLibreGL.Layer
        type="circle"
        id="places-clusters"
        filter={['has', 'point_count']}
        style={{
          circleColor: [
            'step',
            ['get', 'point_count'],
            '#208AEF',
            5,
            '#f39c12',
            15,
            '#e67e22',
            30,
            '#e74c3c',
          ],
          circleRadius: [
            'step',
            ['get', 'point_count'],
            18,
            5,
            22,
            15,
            26,
            30,
            32,
          ],
          circleOpacity: 0.9,
          circleStrokeWidth: 2.5,
          circleStrokeColor: '#ffffff',
        }}
      />

      {/* Cluster point count label */}
      <MapLibreGL.Layer
        type="symbol"
        id="places-cluster-count"
        filter={['has', 'point_count']}
        style={{
          textField: '{point_count_abbreviated}',
          textSize: 12,
          textColor: '#ffffff',
          textFont: ['Noto Sans Bold'],
        }}
      />

      {/* Outer glow ring for unclustered individual place */}
      <MapLibreGL.Layer
        type="circle"
        id="places-glow"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleRadius: 18,
          circleColor: ['get', 'color'],
          circleOpacity: 0.2,
          circleStrokeWidth: 0,
        }}
      />

      {/* Inner circle marker for unclustered individual place */}
      <MapLibreGL.Layer
        type="circle"
        id="places-marker"
        filter={['!', ['has', 'point_count']]}
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

      {/* Category labels for unclustered individual place */}
      <MapLibreGL.Layer
        type="symbol"
        id="places-label"
        filter={['!', ['has', 'point_count']]}
        style={{
          textField: ['get', 'name'],
          textSize: 11,
          textFont: ['Noto Sans Regular'],
          textOffset: [0, 1.8],
          textAnchor: 'top',
          textColor: Colors.textPrimary ?? '#1a1a2e',
          textHaloColor: '#ffffff',
          textHaloWidth: 1.5,
          textMaxWidth: 12,
        }}
      />
    </MapLibreGL.GeoJSONSource>
  );
}
