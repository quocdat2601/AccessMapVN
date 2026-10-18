import { apiClient } from '@/shared/api/client';
import type { BoundingBox, GeocodeResult, PlaceDto, PoiCategory } from '../model/types';

function nullableBoolean(...values: unknown[]): boolean | null {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null);
  return value == null ? null : Boolean(value);
}

export async function fetchPlacesInBBox(
  bbox: BoundingBox,
  zoomLevel: number = 14,
  categories?: string[]
): Promise<PlaceDto[]> {
  try {
    const raw = await apiClient.get<any[]>('/api/v1/places', {
      params: {
        minLng: bbox.west,
        minLat: bbox.south,
        maxLng: bbox.east,
        maxLat: bbox.north,
        zoomLevel,
        categories: categories?.join(','),
      },
    });

    if (!Array.isArray(raw)) return [];

    return raw.map((p) => ({
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      category: (p.category ?? 'other') as PoiCategory,
      address: p.address ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      opening_hours: p.openingHours ?? p.opening_hours ?? null,
      brand: p.brand ?? null,
      operator: p.operator ?? null,
      lng: Number(p.lng ?? 0),
      lat: Number(p.lat ?? 0),
      has_ramp: Boolean(p.hasRamp ?? p.has_ramp),
      has_elevator: Boolean(p.hasAccessibleElevator ?? p.has_accessible_elevator ?? p.has_elevator),
      has_tactile_paving: Boolean(p.hasTactilePaving ?? p.has_tactile_paving),
      has_accessible_restroom: Boolean(p.hasAccessibleRestroom ?? p.has_accessible_restroom),
      door_width_ok: Boolean(p.doorWidthOk ?? p.door_width_ok),
      accessibility_score: typeof p.accessibilityScore === 'number'
        ? p.accessibilityScore
        : typeof p.accessibility_score === 'number'
        ? p.accessibility_score
        : -1,
      accessibility_note: p.accessibilityNote ?? p.accessibility_note ?? null,
      floor_level: p.floorLevel ?? p.floor_level ?? null,
      building_id: p.buildingId ?? p.building_id ?? null,
      has_accessible_elevator: Boolean(p.hasAccessibleElevator ?? p.has_accessible_elevator),
      last_verified_at: p.lastVerifiedAt ?? p.last_verified_at ?? null,
      legacy_feature_values: {
        ramp: nullableBoolean(p.hasRamp, p.has_ramp),
        entranceDoor: nullableBoolean(p.doorWidthOk, p.door_width_ok),
        elevator: nullableBoolean(p.hasAccessibleElevator, p.has_accessible_elevator, p.has_elevator),
        accessibleRestroom: nullableBoolean(p.hasAccessibleRestroom, p.has_accessible_restroom),
        tactilePaving: nullableBoolean(p.hasTactilePaving, p.has_tactile_paving),
      },
    }));
  } catch (error) {
    // Graceful fallback to empty array on transient failure
    return [];
  }
}

export async function fetchPlaceById(id: string): Promise<PlaceDto | null> {
  try {
    const p = await apiClient.get<any>(`/api/v1/places/${encodeURIComponent(id)}`);
    if (!p || !p.id) return null;

    return {
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      category: (p.category ?? 'other') as PoiCategory,
      address: p.address ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      opening_hours: p.openingHours ?? p.opening_hours ?? null,
      brand: p.brand ?? null,
      operator: p.operator ?? null,
      lng: Number(p.lng ?? 0),
      lat: Number(p.lat ?? 0),
      has_ramp: Boolean(p.hasRamp ?? p.has_ramp),
      has_elevator: Boolean(p.hasAccessibleElevator ?? p.has_accessible_elevator ?? p.has_elevator),
      has_tactile_paving: Boolean(p.hasTactilePaving ?? p.has_tactile_paving),
      has_accessible_restroom: Boolean(p.hasAccessibleRestroom ?? p.has_accessible_restroom),
      door_width_ok: Boolean(p.doorWidthOk ?? p.door_width_ok),
      accessibility_score: typeof p.accessibilityScore === 'number'
        ? p.accessibilityScore
        : typeof p.accessibility_score === 'number'
        ? p.accessibility_score
        : -1,
      accessibility_note: p.accessibilityNote ?? p.accessibility_note ?? null,
      floor_level: p.floorLevel ?? p.floor_level ?? null,
      building_id: p.buildingId ?? p.building_id ?? null,
      has_accessible_elevator: Boolean(p.hasAccessibleElevator ?? p.has_accessible_elevator),
      last_verified_at: p.lastVerifiedAt ?? p.last_verified_at ?? null,
      legacy_feature_values: {
        ramp: nullableBoolean(p.hasRamp, p.has_ramp),
        entranceDoor: nullableBoolean(p.doorWidthOk, p.door_width_ok),
        elevator: nullableBoolean(p.hasAccessibleElevator, p.has_accessible_elevator, p.has_elevator),
        accessibleRestroom: nullableBoolean(p.hasAccessibleRestroom, p.has_accessible_restroom),
        tactilePaving: nullableBoolean(p.hasTactilePaving, p.has_tactile_paving),
      },
    };
  } catch {
    return null;
  }
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

  try {
    const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
      headers: { 'User-Agent': 'AccessMapVN/1.0' },
      signal: AbortSignal.timeout(900),
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

export async function searchAccessMapPlaces(
  query: string,
  options?: { lat?: number; lng?: number; limit?: number }
): Promise<PlaceDto[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const raw = await apiClient.get<any[]>('/api/v1/places/search', {
      params: {
        q: trimmed,
        lat: options?.lat,
        lng: options?.lng,
        limit: options?.limit ?? 6,
      },
      auth: 'none',
    });

    if (!Array.isArray(raw)) return [];

    return raw.map((p) => ({
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      category: (p.category ?? 'other') as PoiCategory,
      address: p.address ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      opening_hours: p.openingHours ?? p.opening_hours ?? null,
      brand: p.brand ?? null,
      operator: p.operator ?? null,
      lng: Number(p.lng ?? 0),
      lat: Number(p.lat ?? 0),
      has_ramp: Boolean(p.hasRamp ?? p.has_ramp),
      has_elevator: Boolean(p.hasAccessibleElevator ?? p.has_accessible_elevator ?? p.has_elevator),
      has_tactile_paving: Boolean(p.hasTactilePaving ?? p.has_tactile_paving),
      has_accessible_restroom: Boolean(p.hasAccessibleRestroom ?? p.has_accessible_restroom),
      door_width_ok: Boolean(p.doorWidthOk ?? p.door_width_ok),
      accessibility_score: typeof p.accessibilityScore === 'number'
        ? p.accessibilityScore
        : typeof p.accessibility_score === 'number'
        ? p.accessibility_score
        : -1,
      accessibility_note: p.accessibilityNote ?? p.accessibility_note ?? null,
      floor_level: p.floorLevel ?? p.floor_level ?? null,
      building_id: p.buildingId ?? p.building_id ?? null,
      has_accessible_elevator: Boolean(p.hasAccessibleElevator ?? p.has_accessible_elevator),
      last_verified_at: p.lastVerifiedAt ?? p.last_verified_at ?? null,
      legacy_feature_values: {
        ramp: nullableBoolean(p.hasRamp, p.has_ramp),
        entranceDoor: nullableBoolean(p.doorWidthOk, p.door_width_ok),
        elevator: nullableBoolean(p.hasAccessibleElevator, p.has_accessible_elevator, p.has_elevator),
        accessibleRestroom: nullableBoolean(p.hasAccessibleRestroom, p.has_accessible_restroom),
        tactilePaving: nullableBoolean(p.hasTactilePaving, p.has_tactile_paving),
      },
    }));
  } catch {
    return [];
  }
}

export async function unifiedSearch(
  query: string,
  options?: { lat?: number; lng?: number; limit?: number }
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const [accessMapResults, osmResults] = await Promise.all([
    searchAccessMapPlaces(trimmed, options),
    forwardGeocode(trimmed, options),
  ]);

  const accessMapFormatted: GeocodeResult[] = accessMapResults.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: p.address || 'Địa điểm trong AccessMap',
    lat: p.lat,
    lng: p.lng,
    type: p.category,
    source: 'accessmap',
    placeDto: p,
  }));

  const osmFormatted: GeocodeResult[] = osmResults.map((item) => ({
    ...item,
    source: 'osm',
  }));

  return [...accessMapFormatted, ...osmFormatted];
}