import { Colors } from '@/shared/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ContributionHistorySheet } from '@/entities/contribution';
import { HeaderBar } from './components/HeaderBar';
import { MapControls } from './components/MapControls';
import { MapView, type MapViewHandle } from './components/MapView';
import { LocationDetailSheet } from './components/location-detail';
import { SearchBar } from './components/SearchBar';
import {
  FilterChipBar,
  AccessibilityFilterModal,
  FILTER_CATEGORIES,
  DEFAULT_ACCESSIBILITY_FILTERS,
  type AccessibilityFilterState,
} from './components';
import { useMapRegion } from '../model/hooks/useMapRegion';
import { useNearbyPlaces } from '../model/hooks/useNearbyPlaces';
import { useUserLocation } from '../model/hooks/useUserLocation';
import { unifiedSearch, type GeocodeResult, type PlaceDto } from '@/entities/place';
import { useAuth } from '@/features/auth';
import { LoginRequiredModal } from '@/shared/ui/LoginRequiredModal';

interface DiscoveryScreenProps {
  onNavigateToContribute?: (place: { id: string; name: string; latitude?: number; longitude?: number }) => void;
}

const QUICK_SEARCH_SUGGESTIONS = [
  { id: 'community-demo', icon: 'shield-checkmark', label: 'Trung tâm Phục vụ Cộng đồng (Q.1)', query: 'Trung tâm Phục vụ Cộng đồng' },
  { id: 'hosp', icon: 'medical', label: 'Bệnh viện & Cơ sở y tế', query: 'Bệnh viện' },
  { id: 'cafe', icon: 'cafe', label: 'Quán Cà phê tiếp cận', query: 'Cà phê' },
  { id: 'mall', icon: 'cart', label: 'TTTM & Siêu thị', query: 'Siêu thị' },
  { id: 'pharm', icon: 'fitness', label: 'Nhà thuốc đạt chuẩn', query: 'Nhà thuốc' },
  { id: 'transit', icon: 'bus', label: 'Bến xe & Giao thông', query: 'Bến xe' },
];

export function DiscoveryScreen({ onNavigateToContribute }: DiscoveryScreenProps = {}) {
  const router = useRouter();
  const mapViewRef = useRef<MapViewHandle>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAccessibilityLayer, setShowAccessibilityLayer] = useState(true);
  const [osmPlace, setOsmPlace] = useState<PlaceDto | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuth();
  const { location, loading: locationLoading } = useUserLocation();
  const { bbox, isZoomedOut, onRegionDidChange, initialRegion } = useMapRegion(location);
  const {
    places,
    selectedPlace,
    selectedId,
    selectPlace,
    refresh,
  } = useNearbyPlaces(bbox);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [accessibilityFilters, setAccessibilityFilters] =
    useState<AccessibilityFilterState>(DEFAULT_ACCESSIBILITY_FILTERS);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  const activeAccessibilityCount = useMemo(() => {
    return Object.values(accessibilityFilters).filter(Boolean).length;
  }, [accessibilityFilters]);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // 1. Category Filter
      if (selectedCategory !== 'all') {
        const catConfig = FILTER_CATEGORIES.find((c) => c.id === selectedCategory);
        if (catConfig && catConfig.categoryKeys.length > 0) {
          const pCat = p.category?.toLowerCase() || '';
          const matches = catConfig.categoryKeys.some((k) => pCat.includes(k));
          if (!matches) return false;
        }
      }

      // 2. Accessibility Filters
      if (accessibilityFilters.wheelchair) {
        if (!p.has_ramp && !p.door_width_ok) return false;
      }
      if (accessibilityFilters.elevator) {
        if (!p.has_elevator) return false;
      }
      if (accessibilityFilters.restroom) {
        if (!p.has_accessible_restroom) return false;
      }
      if (accessibilityFilters.tactilePaving) {
        if (!p.has_tactile_paving) return false;
      }
      if (accessibilityFilters.highVerified) {
        if (p.accessibility_score < 0.8) return false;
      }

      return true;
    });
  }, [places, selectedCategory, accessibilityFilters]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const activePlace = osmPlace ?? selectedPlace;
  const hasCenteredUser = useRef(false);

  // Android Back Handler / Return Gesture
  useEffect(() => {
    const onBackPress = () => {
      // 1. If search dropdown / suggestions are showing, close search
      if (showResults || isSearchFocused || searchQuery.length > 0) {
        setShowResults(false);
        setIsSearchFocused(false);
        setSearchQuery('');
        Keyboard.dismiss();
        return true;
      }
      // 2. If location detail sheet is open, close sheet and return to map
      if (activePlace || selectedId) {
        selectPlace(null);
        setOsmPlace(null);
        return true;
      }
      // 3. Otherwise let OS perform default back
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activePlace, selectedId, showResults, isSearchFocused, searchQuery, selectPlace]);

  useEffect(() => {
    if (location && !hasCenteredUser.current) {
      hasCenteredUser.current = true;
      mapViewRef.current?.flyTo(location.longitude, location.latitude, 16);
    }
  }, [location?.latitude, location?.longitude]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await unifiedSearch(q, {
          lat: location?.latitude,
          lng: location?.longitude,
          limit: 6,
        });
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, location?.latitude, location?.longitude]);

  const handleSelectSearchResult = (result: GeocodeResult) => {
    setShowResults(false);
    setIsSearchFocused(false);
    Keyboard.dismiss();
    setSearchQuery(result.name);
    mapViewRef.current?.flyTo(result.lng, result.lat, 16);
    selectPlace(null);

    // If result is already an AccessMap place, preserve its ID and feature data
    if (result.placeDto) {
      setOsmPlace(result.placeDto);
      selectPlace(result.placeDto.id);
      return;
    }

    setOsmPlace({
      id: `search-${result.id}`,
      name: result.name,
      category: 'other',
      address: result.displayName,
      lng: result.lng,
      lat: result.lat,
      has_ramp: false,
      has_elevator: false,
      has_tactile_paving: false,
      has_accessible_restroom: false,
      door_width_ok: false,
      accessibility_score: -1,
      accessibility_note: null,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapViewRef}
        places={filteredPlaces}
        userLatitude={location?.latitude ?? null}
        userLongitude={location?.longitude ?? null}
        initialRegion={initialRegion}
        onRegionDidChange={onRegionDidChange}
        onSelectPlace={(id, place) => {
          setOsmPlace(place ?? null);
          selectPlace(id);
        }}
        onSelectOsmPlace={(p) => {
          if (p) {
            selectPlace(null);
            setOsmPlace(p);
          } else {
            setOsmPlace(null);
            selectPlace(null);
          }
        }}
        selectedPlaceId={selectedId}
        selectedPlace={activePlace}
        showAccessibilityLayer={showAccessibilityLayer}
      />

      {/* UI Overlays */}
      <View style={styles.overlayTop}>
        <HeaderBar />
        <View style={styles.searchWrapper}>
          <SearchBar
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length >= 2) {
                setShowResults(true);
              }
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              if (activePlace) {
                selectPlace(null);
                setOsmPlace(null);
              }
            }}
            onClear={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowResults(false);
              setIsSearchFocused(false);
              Keyboard.dismiss();
            }}
            isSearching={isSearching}
          />

          {/* Quick suggestions when search is focused and query is empty */}
          {isSearchFocused && searchQuery.trim().length === 0 && (
            <View style={styles.resultsDropdown}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsHeaderText}>GỢI Ý TÌM KIẾM NHANH</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsSearchFocused(false);
                    Keyboard.dismiss();
                  }}
                  hitSlop={10}
                >
                  <Text style={styles.suggestionsCloseText}>Đóng</Text>
                </TouchableOpacity>
              </View>
              {QUICK_SEARCH_SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => {
                    setSearchQuery(item.query);
                    setIsSearchFocused(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} style={styles.resultIcon} />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName}>{item.label}</Text>
                    <Text style={styles.resultAddress}>Khảo sát tiêu chuẩn tiếp cận</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showResults && searchResults.length > 0 && (
            <ScrollView
              style={styles.resultsDropdown}
              contentContainerStyle={styles.resultsDropdownContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.resultItem, item.source === 'accessmap' && styles.resultItemAccessMap]}
                  onPress={() => handleSelectSearchResult(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.source === 'accessmap' ? 'shield-checkmark' : 'location-sharp'}
                    size={18}
                    color={Colors.primary}
                    style={styles.resultIcon}
                  />
                  <View style={styles.resultTextContainer}>
                    <View style={styles.resultTitleRow}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      {item.source === 'accessmap' && (
                        <View style={styles.accessMapTag}>
                          <Text style={styles.accessMapTagText}>AccessMap</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.resultAddress} numberOfLines={1}>{item.displayName}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {!isSearchFocused && !showResults && (
          <>
            <FilterChipBar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onOpenAccessibilityFilter={() => setShowAccessibilityModal(true)}
              activeAccessibilityCount={activeAccessibilityCount}
            />

            {/* Active filter count / Empty state banner - positioned directly under FilterChipBar without overlap */}
            {(selectedCategory !== 'all' || activeAccessibilityCount > 0) && !isZoomedOut && (
              <View style={styles.filterStatsBadge}>
                <Text style={styles.filterStatsText}>
                  {filteredPlaces.length > 0
                    ? `🎯 ${filteredPlaces.length} địa điểm tiếp cận phù hợp`
                    : '⚠️ Không có địa điểm nào phù hợp'}
                </Text>
                {filteredPlaces.length === 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory('all');
                      setAccessibilityFilters(DEFAULT_ACCESSIBILITY_FILTERS);
                    }}
                    style={styles.resetFilterMiniBtn}
                  >
                    <Text style={styles.resetFilterMiniText}>Đặt lại</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      <MapControls
        onMyLocation={() => mapViewRef.current?.recenter()}
        onResetNorth={() => mapViewRef.current?.resetNorth()}
        onZoomIn={() => mapViewRef.current?.zoomIn()}
        onZoomOut={() => mapViewRef.current?.zoomOut()}
        onToggleLayer={() => setShowAccessibilityLayer((prev) => !prev)}
        isLayerActive={showAccessibilityLayer}
        onToggleLegend={() => setShowLegend((prev) => !prev)}
        isLegendActive={showLegend}
      />

      {/* Map Legend Card */}
      {showLegend && (
        <View style={styles.legendCard}>
          <View style={styles.legendHeader}>
            <View style={styles.legendHeaderTitleRow}>
              <Ionicons name="information-circle" size={16} color={Colors.primary} />
              <Text style={styles.legendTitle}>Mức độ tiếp cận</Text>
            </View>
            <TouchableOpacity onPress={() => setShowLegend(false)} hitSlop={10}>
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981', borderColor: '#059669' }]} />
            <Text style={styles.legendLabel}>Tiếp cận tốt (đạt chuẩn QCVN 10)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b', borderColor: '#d97706' }]} />
            <Text style={styles.legendLabel}>Tiếp cận một phần (cần hỗ trợ)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444', borderColor: '#dc2626' }]} />
            <Text style={styles.legendLabel}>Khó tiếp cận / có chướng ngại</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#94a3b8', borderColor: '#64748b' }]} />
            <Text style={styles.legendLabel}>Địa điểm chưa khảo sát</Text>
          </View>
        </View>
      )}

      {isZoomedOut && (
        <View style={styles.zoomHintBanner}>
          <Text style={styles.zoomHintText}>🔍 Phóng to khu vực để xem chi tiết tiếp cận</Text>
        </View>
      )}

      {!activePlace && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setShowHistory(true)}
            accessibilityRole="button"
            accessibilityLabel="Xem lịch sử đóng góp tiếp cận"
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="history" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contributeFab}
            onPress={() => {
              if (!user) {
                setShowLoginModal(true);
                return;
              }
              onNavigateToContribute?.({
                id: 'new-location',
                name: 'Địa điểm mới gần bạn',
                latitude: location?.latitude,
                longitude: location?.longitude,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Đóng góp tiện ích tiếp cận mới"
            activeOpacity={0.88}
          >
            <Ionicons name="camera" size={20} color={Colors.surface} />
            <Text style={styles.contributeFabText}>Đóng góp tiếp cận</Text>
            <View style={styles.contributeExpBadge}>
              <Text style={styles.contributeExpText}>+50 EXP</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {activePlace && (
        <LocationDetailSheet
          place={activePlace}
          userLatitude={location?.latitude}
          userLongitude={location?.longitude}
          onClose={() => {
            selectPlace(null);
            setOsmPlace(null);
          }}
          onContribute={(p) => {
            onNavigateToContribute?.({ id: p.id, name: p.name, latitude: p.lat, longitude: p.lng });
          }}
        />
      )}

      <ContributionHistorySheet
        visible={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <LoginRequiredModal
        visible={showLoginModal}
        featureName="đóng góp tiếp cận mới"
        onClose={() => setShowLoginModal(false)}
      />

      <AccessibilityFilterModal
        visible={showAccessibilityModal}
        currentFilters={accessibilityFilters}
        onApply={(newFilters) => setAccessibilityFilters(newFilters)}
        onClose={() => setShowAccessibilityModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.mapCanvasBg ?? '#e5eeed',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary ?? '#6b7280',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchWrapper: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  zoomHintBanner: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsDropdown: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    maxHeight: 320,
    overflow: 'hidden',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  resultsDropdownContent: {
    paddingVertical: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  resultIcon: {
    marginRight: 10,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  accessMapTag: {
    backgroundColor: '#E8FAF6',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  accessMapTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006874',
  },
  resultItemAccessMap: {
    backgroundColor: '#FAFDFD',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 11,
    color: '#64748b',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  suggestionsCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 15,
  },
  historyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contributeFab: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  contributeFabText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  contributeExpBadge: {
    backgroundColor: '#004f58',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  contributeExpText: {
    color: '#8ee9dc',
    fontSize: 11,
    fontWeight: '800',
  },
  filterStatsBadge: {
    alignSelf: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  filterStatsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resetFilterMiniBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  resetFilterMiniText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  legendCard: {
    position: 'absolute',
    top: 195,
    right: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    width: 230,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legendHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
});
