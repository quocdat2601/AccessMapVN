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
    (event: any) => {
      const data = event?.nativeEvent ?? event;
      if (!data) return;

      let lat: number | undefined;
      let lng: number | undefined;
      let zoom: number | undefined;
      let north: number | undefined;
      let south: number | undefined;
      let east: number | undefined;
      let west: number | undefined;

      if (Array.isArray(data.center)) {
        // MapLibre RN v11 format: center is [lng, lat], bounds is [west, south, east, north]
        lng = data.center[0];
        lat = data.center[1];
        zoom = data.zoom;
        if (Array.isArray(data.bounds) && data.bounds.length === 4) {
          [west, south, east, north] = data.bounds;
        }
      } else if (data.geometry?.coordinates) {
        // Legacy GeoJSON format
        lng = data.geometry.coordinates[0];
        lat = data.geometry.coordinates[1];
        const props = data.properties as Record<string, unknown> | undefined;
        zoom = (props?.zoomLevel as number) ?? region.zoom;
        const b = props?.visibleBounds as [number[], number[]] | undefined;
        if (b && Array.isArray(b) && b.length >= 2) {
          north = b[0][1];
          east = b[0][0];
          south = b[1][1];
          west = b[1][0];
        }
      }

      if (lat != null && lng != null) {
        const currentZoom = zoom ?? region.zoom;
        setRegion({
          latitude: lat,
          longitude: lng,
          zoom: currentZoom,
        });

        if (north != null && south != null && east != null && west != null) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            if (currentZoom >= 12) {
              setBbox({ north, east, south, west });
            } else {
              setBbox(null);
            }
          }, DEBOUNCE_MS);
        }
      }
    },
    [region.zoom]
  );

  const isZoomedOut = region.zoom < 12;

  return { region, bbox, isZoomedOut, onRegionDidChange, initialRegion: HCMC_INITIAL };
}
