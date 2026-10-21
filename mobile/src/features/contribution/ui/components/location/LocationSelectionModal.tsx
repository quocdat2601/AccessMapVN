import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { fetchPlacesInBBox, reverseGeocode, type PlaceDto } from '@/entities/place';
import { calculateHaversineDistanceMeters } from '../../../lib/verificationEngine';

export interface SelectedLocationData {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
}

interface LocationSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocationName: string;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  currentAddress?: string | null;
  onSelectLocation: (location: SelectedLocationData) => void;
}

export function LocationSelectionModal({
  visible,
  onClose,
  currentLocationName,
  currentLatitude,
  currentLongitude,
  currentAddress,
  onSelectLocation,
}: LocationSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<'nearby' | 'manual'>('nearby');
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceDto[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Manual inputs
  const [customName, setCustomName] = useState(currentLocationName || '');
  const [customAddress, setCustomAddress] = useState(currentAddress || '');
  const [customLat, setCustomLat] = useState(currentLatitude ? String(currentLatitude) : '');
  const [customLng, setCustomLng] = useState(currentLongitude ? String(currentLongitude) : '');
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  useEffect(() => {
    if (visible && currentLatitude && currentLongitude) {
      setCustomLat(String(currentLatitude));
      setCustomLng(String(currentLongitude));
      setCustomName(currentLocationName || '');
      setCustomAddress(currentAddress || '');

      // Load nearby places
      setIsLoadingNearby(true);
      const delta = 0.008; // ~800 meters bounding box
      const bbox = {
        west: currentLongitude - delta,
        east: currentLongitude + delta,
        south: currentLatitude - delta,
        north: currentLatitude + delta,
      };

      fetchPlacesInBBox(bbox, 16)
        .then((places) => {
          // Sort by distance from current user coords
          const sorted = [...places].sort((a, b) => {
            const distA = calculateHaversineDistanceMeters(
              { latitude: currentLatitude, longitude: currentLongitude },
              { latitude: a.lat, longitude: a.lng }
            );
            const distB = calculateHaversineDistanceMeters(
              { latitude: currentLatitude, longitude: currentLongitude },
              { latitude: b.lat, longitude: b.lng }
            );
            return distA - distB;
          });
          setNearbyPlaces(sorted.slice(0, 8));
        })
        .catch(() => setNearbyPlaces([]))
        .finally(() => setIsLoadingNearby(false));
    }
  }, [visible, currentLatitude, currentLongitude, currentLocationName, currentAddress]);

  const handleGetCurrentGps = async () => {
    setIsRefreshingGps(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCustomLat(String(lat));
      setCustomLng(String(lng));

      const addr = await reverseGeocode(lat, lng);
      if (addr) {
        setCustomAddress(addr);
        if (!customName || customName === 'Địa điểm mới gần bạn') {
          setCustomName(addr.split(',')[0]?.trim() || 'Vị trí hiện tại');
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshingGps(false);
    }
  };

  const handleApplyManual = () => {
    const lat = parseFloat(customLat) || currentLatitude || 10.8454;
    const lng = parseFloat(customLng) || currentLongitude || 106.8373;
    const name = customName.trim() || 'Địa điểm tùy chọn';

    onSelectLocation({
      id: `custom-${Date.now()}`,
      name,
      address: customAddress.trim() || undefined,
      latitude: lat,
      longitude: lng,
    });
    onClose();
  };

  const handleSelectNearby = (place: PlaceDto) => {
    onSelectLocation({
      id: place.id,
      name: place.name,
      address: place.address || undefined,
      latitude: place.lat,
      longitude: place.lng,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.indicator} />
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>Chọn vị trí đóng góp</Text>
                <Text style={styles.subtitle}>
                  Xác định địa điểm chính xác giúp người khuyết tật tìm thấy tiện ích
                </Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            {/* Current Selected Location Card */}
            <View style={styles.currentCard}>
              <View style={styles.currentIconWrap}>
                <MaterialCommunityIcons name="map-marker-check" size={20} color="#006874" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentLabel}>ĐỊA ĐIỂM ĐANG CHỌN</Text>
                <Text style={styles.currentName} numberOfLines={1}>
                  {currentLocationName || 'Chưa xác định'}
                </Text>
                <Text style={styles.currentSub} numberOfLines={1}>
                  {currentAddress ||
                    (currentLatitude && currentLongitude
                      ? `${currentLatitude.toFixed(5)}, ${currentLongitude.toFixed(5)}`
                      : 'Đang tải vị trí...')}
                </Text>
              </View>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabBar}>
              <Pressable
                style={[styles.tabItem, activeTab === 'nearby' && styles.tabItemActive]}
                onPress={() => setActiveTab('nearby')}
              >
                <MaterialCommunityIcons
                  name="store-marker-outline"
                  size={16}
                  color={activeTab === 'nearby' ? '#006874' : '#64748b'}
                />
                <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>
                  Địa điểm gần bạn
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabItem, activeTab === 'manual' && styles.tabItemActive]}
                onPress={() => setActiveTab('manual')}
              >
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={16}
                  color={activeTab === 'manual' ? '#006874' : '#64748b'}
                />
                <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                  Tùy chỉnh GPS / Tên
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {activeTab === 'nearby' ? (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Các địa điểm xung quanh tọa độ của bạn</Text>
                  <Pressable
                    style={styles.refreshGpsBtn}
                    onPress={handleGetCurrentGps}
                    disabled={isRefreshingGps}
                  >
                    {isRefreshingGps ? (
                      <ActivityIndicator size="small" color="#006874" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="crosshairs" size={14} color="#006874" />
                        <Text style={styles.refreshGpsText}>Cập nhật GPS</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {isLoadingNearby ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#006874" />
                    <Text style={styles.loadingText}>Đang quét các địa điểm tiếp cận gần nhất...</Text>
                  </View>
                ) : nearbyPlaces.length > 0 ? (
                  nearbyPlaces.map((place) => {
                    const distance =
                      currentLatitude && currentLongitude
                        ? calculateHaversineDistanceMeters(
                            { latitude: currentLatitude, longitude: currentLongitude },
                            { latitude: place.lat, longitude: place.lng }
                          )
                        : null;

                    return (
                      <Pressable
                        key={place.id}
                        style={({ pressed }) => [styles.placeCard, pressed && styles.placeCardPressed]}
                        onPress={() => handleSelectNearby(place)}
                      >
                        <View style={styles.placeIconBadge}>
                          <MaterialCommunityIcons name="domain" size={18} color="#006874" />
                        </View>
                        <View style={styles.placeInfo}>
                          <Text style={styles.placeName} numberOfLines={1}>
                            {place.name}
                          </Text>
                          <Text style={styles.placeAddress} numberOfLines={1}>
                            {place.address || 'Không có địa chỉ chi tiết'}
                          </Text>
                        </View>
                        {distance != null ? (
                          <View style={styles.distanceBadge}>
                            <Text style={styles.distanceText}>
                              {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyBox}>
                    <MaterialCommunityIcons name="map-marker-question-outline" size={36} color="#94a3b8" />
                    <Text style={styles.emptyText}>Chưa có địa điểm đã lưu gần vị trí này.</Text>
                    <Text style={styles.emptySubText}>
                      Bạn có thể chuyển sang tab &quot;Tùy chỉnh GPS / Tên&quot; để đặt tên địa điểm mới.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              /* Manual Tab */
              <View style={styles.manualForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tên địa điểm đóng góp *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="VD: Cổng chính Tòa nhà A, Quán Highlands Coffee..."
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Địa chỉ hiển thị (nếu có)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="VD: 123 Lê Lợi, P. Bến Nghé, Quận 1"
                    value={customAddress}
                    onChangeText={setCustomAddress}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.coordsRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Vĩ độ (Latitude)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10.8454"
                      value={customLat}
                      onChangeText={setCustomLat}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Kinh độ (Longitude)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="106.8373"
                      value={customLng}
                      onChangeText={setCustomLng}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.gpsSyncBtn}
                  onPress={handleGetCurrentGps}
                  disabled={isRefreshingGps}
                >
                  {isRefreshingGps ? (
                    <ActivityIndicator size="small" color="#006874" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#006874" />
                      <Text style={styles.gpsSyncText}>Lấy tọa độ & địa chỉ GPS hiện tại của tôi</Text>
                    </>
                  )}
                </Pressable>

                <Pressable style={styles.applyBtn} onPress={handleApplyManual}>
                  <MaterialCommunityIcons name="check" size={18} color="#ffffff" />
                  <Text style={styles.applyBtnText}>Áp dụng vị trí này</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '86%',
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  indicator: {
    width: 38,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#e6f7f6',
    borderWidth: 1,
    borderColor: '#b2ece7',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  currentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006874',
    letterSpacing: 0.5,
  },
  currentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  currentSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabItemActive: {
    backgroundColor: '#e6f7f6',
    borderColor: '#006874',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#006874',
    fontWeight: '700',
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refreshGpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006874',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
  },
  placeCardPressed: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  placeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  placeAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 280,
  },
  manualForm: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gpsSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#f0fdfa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  gpsSyncText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#006874',
    borderRadius: 12,
    marginTop: 6,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
