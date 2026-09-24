import { useState, useMemo } from 'react';
import { LocationPoi } from '../types';
import { Colors } from '@/shared/theme';

const INITIAL_POIS: LocationPoi[] = [
  {
    id: 'saigon-centre',
    name: 'Saigon Centre',
    category: 'mall',
    xPercent: 50,
    yPercent: 49,
    accessibility: {
      hasRamp: true,
      hasElevator: true,
      doorWidthOk: true,
      hasAccessibleRestroom: true,
      note: 'Chuẩn tiếp cận xe lăn toàn diện',
    },
    isSelected: true,
    accentColor: Colors.primary,
  },
  {
    id: 'rex-hotel',
    name: 'Khách sạn Rex Sài Gòn',
    category: 'hotel',
    xPercent: 66,
    yPercent: 18,
    accessibility: {
      hasRamp: true,
      hasElevator: true,
    },
    accentColor: Colors.poiHotel,
  },
  {
    id: 'takashimaya',
    name: 'Takashimaya',
    category: 'mall',
    xPercent: 40,
    yPercent: 54,
    accessibility: {
      hasElevator: true,
      doorWidthOk: true,
    },
    accentColor: Colors.poiRetail,
  },
  {
    id: 'saigon-square',
    name: 'Sài Gòn Square',
    category: 'market',
    xPercent: 38,
    yPercent: 60,
    accessibility: {
      hasRamp: false,
      note: 'Lối vào có bậc tam cấp',
    },
    accentColor: Colors.poiMarket,
  },
  {
    id: 'ben-thanh-station',
    name: 'Ga Bến Thành',
    category: 'transit',
    xPercent: 18,
    yPercent: 65,
    accessibility: {
      hasElevator: true,
      hasTactilePaving: true,
      note: 'Có thang máy và gạch dẫn hướng xúc giác',
    },
    accentColor: Colors.poiTransit,
  },
  {
    id: 'saigon-hospital',
    name: 'Bệnh viện Đa khoa Sài Gòn',
    category: 'hospital',
    xPercent: 22,
    yPercent: 77,
    accessibility: {
      hasRamp: true,
      note: 'Có lối dốc chuẩn',
    },
    accentColor: Colors.poiHospital,
    badgeLabel: 'Có lối dốc chuẩn',
  },
];

export function useNearbyLocations() {
  const [locations, setLocations] = useState<LocationPoi[]>(INITIAL_POIS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('saigon-centre');
  const [showAccessibilityLayer, setShowAccessibilityLayer] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedId),
    [locations, selectedId]
  );

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter((loc) => loc.name.toLowerCase().includes(q));
  }, [locations, searchQuery]);

  const selectLocation = (id: string) => {
    setSelectedId(id);
    setLocations((prev) =>
      prev.map((loc) => ({
        ...loc,
        isSelected: loc.id === id,
      }))
    );
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 2.0));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.8));
  const resetNorth = () => setZoomLevel(1.0);
  const toggleLayer = () => setShowAccessibilityLayer((prev) => !prev);

  return {
    locations: filteredLocations,
    selectedLocation,
    searchQuery,
    setSearchQuery,
    selectLocation,
    showAccessibilityLayer,
    toggleLayer,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetNorth,
  };
}
