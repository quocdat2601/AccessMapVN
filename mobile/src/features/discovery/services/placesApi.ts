import { supabase } from '@/shared/lib/supabase';
import type { BoundingBox, GeocodeResult, PlaceDto } from '../types';

export async function fetchPlacesInBBox(
  bbox: BoundingBox,
  zoomLevel: number = 14
): Promise<PlaceDto[]> {
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_places_in_bbox', {
    min_lng: bbox.west,
    min_lat: bbox.south,
    max_lng: bbox.east,
    max_lat: bbox.north,
    zoom_level: zoomLevel,
    category_filter: null,
  });

  if (error) throw error;
  return (data as PlaceDto[]) ?? [];
}

const geocodeCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AccessMapVN/1.0 (https://accessmap.vn)',
        'Accept-Language': 'vi,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return (data?.display_name as string) ?? null;

    const parts = [
      addr.house_number,
      addr.road,
      addr.suburb || addr.quarter || addr.neighbourhood,
      addr.city_district || addr.district,
    ].filter(Boolean);

    const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name as string);
    if (formatted) {
      if (geocodeCache.size > 200) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey) geocodeCache.delete(firstKey);
      }
      geocodeCache.set(cacheKey, formatted);
    }
    return formatted ?? null;
  } catch {
    return null;
  }
}

const forwardGeocodeCache = new Map<string, GeocodeResult[]>();

export async function forwardGeocode(
  query: string,
  options?: { lat?: number; lng?: number; limit?: number }
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const limit = options?.limit ?? 5;
  const cacheKey = `${trimmed.toLowerCase()}_${limit}_${options?.lat?.toFixed(2) ?? ''}_${options?.lng?.toFixed(2) ?? ''}`;
  if (forwardGeocodeCache.has(cacheKey)) {
    return forwardGeocodeCache.get(cacheKey)!;
  }

  try {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&countrycodes=vn&limit=${limit}&addressdetails=1`;
    if (options?.lat != null && options?.lng != null) {
      const d = 0.2;
      url += `&viewbox=${options.lng - d},${options.lat + d},${options.lng + d},${options.lat - d}`;
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AccessMapVN/1.0 (https://accessmap.vn)',
        'Accept-Language': 'vi,en;q=0.9',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const results: GeocodeResult[] = data.map((item: any) => ({
      id: String(item.place_id ?? `${item.lat},${item.lon}`),
      name: item.name || item.display_name?.split(',')[0] || trimmed,
      displayName: item.display_name || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.class,
    }));

    if (forwardGeocodeCache.size > 100) {
      const firstKey = forwardGeocodeCache.keys().next().value;
      if (firstKey) forwardGeocodeCache.delete(firstKey);
    }
    forwardGeocodeCache.set(cacheKey, results);

    return results;
  } catch {
    return [];
  }
}
