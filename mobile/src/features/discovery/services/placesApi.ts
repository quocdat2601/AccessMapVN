import { supabase } from '@/shared/lib/supabase';
import type { BoundingBox, PlaceDto } from '../types';

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
  });

  if (error) throw error;
  return (data as PlaceDto[]) ?? [];
}
