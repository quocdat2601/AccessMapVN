import { MOCK_S901_PLACES } from '../model/mockS901Places';
import type { GeocodeResult } from '../model/types';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Great-circle Haversine distance in meters between two WGS84 coordinates.
 */
export function approxDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Infinity;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fallbackReverseGeocodeFromMocks(
  lat: number,
  lng: number,
  maxDistanceMeters: number = 300
): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let nearestLabel: string | null = null;
  let minDistance = Infinity;

  for (const place of MOCK_S901_PLACES) {
    const distance = approxDistanceMeters(lat, lng, place.lat, place.lng);
    if (distance <= maxDistanceMeters && distance < minDistance) {
      minDistance = distance;
      nearestLabel = place.address ? `${place.name}, ${place.address}` : place.name;
    }
  }

  return nearestLabel ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function fallbackGeocodeFromMocks(
  query: string,
  limit: number = 5
): GeocodeResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2 || limit <= 0) return [];

  const matches: GeocodeResult[] = [];
  for (const place of MOCK_S901_PLACES) {
    const searchable = [place.name, place.address, place.brand, place.category]
      .filter((v): v is string => Boolean(v))
      .join(' ')
      .toLowerCase();

    if (searchable.includes(trimmed)) {
      matches.push({
        id: place.id,
        name: place.name,
        displayName: place.address || 'Địa điểm tại TP.HCM',
        lat: place.lat,
        lng: place.lng,
        type: place.category,
        source: 'accessmap',
        placeDto: place,
      });
      if (matches.length >= limit) break;
    }
  }

  return matches;
}
