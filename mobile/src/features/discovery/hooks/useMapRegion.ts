import { useState, useCallback, useRef } from 'react';
import type { BoundingBox, MapRegion } from '../types';

const DEBOUNCE_MS = 300;

const HCMC_INITIAL: MapRegion = {
  latitude: 10.7769,
  longitude: 106.7009,
  zoom: 15,
};

export function useMapRegion() {
  const [region, setRegion] = useState<MapRegion>(HCMC_INITIAL);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onRegionDidChange = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Point>) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties as Record<string, unknown> | undefined;
      const zoom = (props?.zoomLevel as number) ?? region.zoom;
      const bounds = props?.visibleBounds as [number[], number[]] | undefined;

      setRegion({
        latitude: coords[1],
        longitude: coords[0],
        zoom,
      });

      if (bounds) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setBbox({
            north: bounds[0][1],
            east: bounds[0][0],
            south: bounds[1][1],
            west: bounds[1][0],
          });
        }, DEBOUNCE_MS);
      }
    },
    [region.zoom]
  );

  return { region, bbox, onRegionDidChange, initialRegion: HCMC_INITIAL };
}
