import { supabase } from '@/shared/lib/supabase';
import type { BoundingBox, PlaceDto } from '../types';

export async function fetchPlacesInBBox(bbox: BoundingBox): Promise<PlaceDto[]> {
  const { data, error } = await supabase.rpc('get_places_in_bbox', {
    min_lng: bbox.west,
    min_lat: bbox.south,
    max_lng: bbox.east,
    max_lat: bbox.north,
  });

  if (error) throw error;
  return (data as PlaceDto[]) ?? [];
}
