import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPlacesInBBox, type BoundingBox, type PlaceDto } from '@/entities/place';

export function useNearbyPlaces(bbox: BoundingBox | null) {
  const [places, setPlaces] = useState<PlaceDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, PlaceDto>>(new Map());
  const lastFetchedBox = useRef<BoundingBox | null>(null);

  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  const fetchPlaces = useCallback(async (box: BoundingBox) => {

    // Spatial containment check: if visible screen is already inside previously fetched buffered area, skip request
    if (
      lastFetchedBox.current &&
      box.north <= lastFetchedBox.current.north &&
      box.south >= lastFetchedBox.current.south &&
      box.east <= lastFetchedBox.current.east &&
      box.west >= lastFetchedBox.current.west
    ) {
      return;
    }

    // Expand bounding box by 50% in all 4 directions to prefetch nearby venues
    const latMargin = (box.north - box.south) * 0.5;
    const lngMargin = (box.east - box.west) * 0.5;
    const bufferedBox: BoundingBox = {
      north: box.north + latMargin,
      south: box.south - latMargin,
      east: box.east + lngMargin,
      west: box.west - lngMargin,
    };

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlacesInBBox(bufferedBox);
      lastFetchedBox.current = bufferedBox;

      // Accumulative merge: keep existing loaded places so they never disappear or flash while panning
      data.forEach((p) => cacheRef.current.set(p.id, p));

      // LRU eviction if cache exceeds 1200 venues
      if (cacheRef.current.size > 1200) {
        const excess = cacheRef.current.size - 1000;
        const keys = cacheRef.current.keys();
        for (let i = 0; i < excess; i++) {
          const k = keys.next().value;
          if (k) cacheRef.current.delete(k);
        }
      }

      setPlaces(Array.from(cacheRef.current.values()));
    } catch {
      // Keep existing cached places on transient network failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bbox) {
      fetchPlaces(bbox);
    } else {
      // Zoom Gate: Clear markers when zoomed out to prevent citywide clutter
      setPlaces([]);
      lastFetchedBox.current = null;
    }
  }, [bbox, fetchPlaces]);

  const refresh = useCallback(() => {
    lastFetchedBox.current = null;
    if (bbox) {
      fetchPlaces(bbox);
    }
  }, [bbox, fetchPlaces]);

  return {
    places,
    selectedPlace,
    selectedId,
    selectPlace: setSelectedId,
    loading,
    error,
    refresh,
  };
}
