import { useState, useEffect, useCallback } from 'react';
import type { BoundingBox, PlaceDto } from '../types';
import { fetchPlacesInBBox } from '../services/placesApi';
import { Colors } from '@/shared/theme';

// ponytail: hardcoded mock data for Phase 3; upgrade path: remove when Supabase is live
const MOCK_PLACES: PlaceDto[] = [
  {
    id: 'saigon-centre',
    name: 'Saigon Centre',
    category: 'mall',
    lng: 106.6999,
    lat: 10.7731,
    has_ramp: true,
    has_elevator: true,
    has_tactile_paving: false,
    has_accessible_restroom: true,
    door_width_ok: true,
    accessibility_score: 0.92,
    accessibility_note: 'Chuẩn tiếp cận xe lăn toàn diện',
  },
  {
    id: 'rex-hotel',
    name: 'Khách sạn Rex Sài Gòn',
    category: 'hotel',
    lng: 106.7013,
    lat: 10.7762,
    has_ramp: true,
    has_elevator: true,
    has_tactile_paving: false,
    has_accessible_restroom: false,
    door_width_ok: true,
    accessibility_score: 0.75,
    accessibility_note: null,
  },
  {
    id: 'takashimaya',
    name: 'Takashimaya',
    category: 'mall',
    lng: 106.7003,
    lat: 10.7725,
    has_ramp: false,
    has_elevator: true,
    has_tactile_paving: false,
    has_accessible_restroom: false,
    door_width_ok: true,
    accessibility_score: 0.65,
    accessibility_note: null,
  },
  {
    id: 'saigon-square',
    name: 'Sài Gòn Square',
    category: 'market',
    lng: 106.6991,
    lat: 10.7716,
    has_ramp: false,
    has_elevator: false,
    has_tactile_paving: false,
    has_accessible_restroom: false,
    door_width_ok: false,
    accessibility_score: 0.30,
    accessibility_note: 'Lối vào có bậc tam cấp',
  },
  {
    id: 'ben-thanh-station',
    name: 'Ga Bến Thành',
    category: 'transit',
    lng: 106.6980,
    lat: 10.7721,
    has_ramp: false,
    has_elevator: true,
    has_tactile_paving: true,
    has_accessible_restroom: false,
    door_width_ok: true,
    accessibility_score: 0.70,
    accessibility_note: 'Có thang máy và gạch dẫn hướng xúc giác',
  },
  {
    id: 'saigon-hospital',
    name: 'Bệnh viện Đa khoa Sài Gòn',
    category: 'hospital',
    lng: 106.6975,
    lat: 10.7695,
    has_ramp: true,
    has_elevator: true,
    has_tactile_paving: false,
    has_accessible_restroom: true,
    door_width_ok: true,
    accessibility_score: 0.85,
    accessibility_note: 'Có lối dốc chuẩn',
  },
];

const hasSupabase = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL);

export function useNearbyPlaces(bbox: BoundingBox | null) {
  const [places, setPlaces] = useState<PlaceDto[]>(MOCK_PLACES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  const fetchPlaces = useCallback(async (box: BoundingBox) => {
    if (!hasSupabase) {
      setPlaces(MOCK_PLACES);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlacesInBBox(box);
      setPlaces(data.length > 0 ? data : MOCK_PLACES);
    } catch {
      // Graceful fallback to mock data during local development
      setPlaces(MOCK_PLACES);
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
    }
  }, [bbox, fetchPlaces]);

  return {
    places,
    selectedPlace,
    selectedId,
    selectPlace: setSelectedId,
    loading,
    error,
  };
}
