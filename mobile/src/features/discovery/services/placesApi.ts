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

function cleanDisplayName(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/,\s*\d{5,6}/g, '')
    .replace(/,\s*Việt Nam$/i, '')
    .trim();
}

function formatNominatim(data: any): string {
  const addr = data?.address;
  const displayName = data?.display_name as string;
  if (!addr) return cleanDisplayName(displayName) || displayName;

  const num = addr.house_number ? `${addr.house_number} ` : '';
  const road = addr.road || addr.pedestrian || addr.footway || '';
  const streetPart = `${num}${road}`.trim();

  const locality = addr.residential || '';
  const ward = addr.suburb || addr.quarter || addr.neighbourhood || addr.ward || addr.hamlet || '';
  const district = addr.city_district || addr.district || addr.county || '';
  const city = addr.city || addr.town || addr.province || addr.state || '';

  const parts = [streetPart, locality, ward, district, city].filter(Boolean);
  if (parts.length >= 2) {
    return parts.join(', ');
  }
  return cleanDisplayName(displayName) || parts.join(', ');
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Try Photon first (fast, ~150ms, no strict 1 req/s rate-limit)
  try {
    const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
      headers: { 'User-Agent': 'AccessMapVN/1.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (photonRes.ok) {
      const data = await photonRes.json();
      const p = data?.features?.[0]?.properties;
      if (p) {
        const num = p.housenumber ? `${p.housenumber} ` : '';
        const street = p.street || p.name || '';
        const streetPart = `${num}${street}`.trim();
        const locality = p.locality || '';
        const district = p.district && p.district !== locality ? p.district : '';
        const city = p.city || p.state || '';
        const parts = [streetPart, locality, district, city].filter(Boolean);
        if (parts.length >= 2) {
          const formatted = parts.join(', ');
          geocodeCache.set(cacheKey, formatted);
          return formatted;
        }
      }
    }
  } catch {
    // Fallback to Nominatim
  }

  // 2. Fallback to Nominatim with full address parser
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AccessMapVN/1.0 (https://accessmap.vn)',
        'Accept-Language': 'vi,en;q=0.9',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const formatted = formatNominatim(data);
    if (formatted) {
      if (geocodeCache.size > 200) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey) geocodeCache.delete(firstKey);
      }
      geocodeCache.set(cacheKey, formatted);
      return formatted;
    }
    return null;
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
