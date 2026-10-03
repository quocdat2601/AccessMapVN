import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import type { PlaceDto } from '../types';
import { Colors } from '@/shared/theme';

interface PlaceCalloutProps {
  place: PlaceDto;
  userLatitude?: number | null;
  userLongitude?: number | null;
  onClose: () => void;
}

function formatCategory(category: string): string {
  const map: Record<string, string> = {
    hospital: 'Bệnh viện / Y tế',
    clinic: 'Phòng khám',
    pharmacy: 'Nhà thuốc',
    cafe: 'Quán Cà phê',
    restaurant: 'Nhà hàng / Quán ăn',
    fast_food: 'Đồ ăn nhanh',
    mall: 'TT Thương mại',
    market: 'Cửa hàng / Siêu thị',
    supermarket: 'Siêu thị',
    convenience: 'Cửa hàng tiện lợi',
    hotel: 'Khách sạn / Lưu trú',
    transit: 'Giao thông công cộng',
    town_hall: 'Cơ quan hành chính',
    government: 'Cơ quan nhà nước',
    school: 'Giáo dục / Trường học',
    bank: 'Ngân hàng / ATM',
    other: 'Địa điểm công cộng',
  };
  return map[category?.toLowerCase()] ?? category ?? 'Địa điểm';
}

function calculateDistance(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): string | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 1) return `Cách ${Math.round(d * 1000)} m`;
  return `Cách ${d.toFixed(1)} km`;
}

function ScoreBadge({ score }: { score: number | string }) {
  const numScore = Number(score);
  if (numScore < 0 || isNaN(numScore)) {
    return (
      <View style={[styles.badge, { backgroundColor: '#64748b' }]}>
        <Text style={styles.badgeText}>Chưa có dữ liệu tiếp cận</Text>
      </View>
    );
  }
  const percentage = Math.round(numScore * 100);
  let bg = Colors.accessRed ?? '#e74c3c';
  let label = 'Khó tiếp cận';
  if (numScore >= 0.8) {
    bg = Colors.accessGreen ?? '#2ecc71';
    label = 'Dễ tiếp cận';
  } else if (numScore >= 0.5) {
    bg = Colors.accessYellow ?? '#f39c12';
    label = 'Trung bình';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{percentage}% — {label}</Text>
    </View>
  );
}

function FeatureTag({ label, available }: { label: string; available?: boolean }) {
  return (
    <View style={[styles.tag, available ? styles.tagAvailable : styles.tagUnavailable]}>
      <Text style={[styles.tagText, available ? styles.tagTextAvailable : styles.tagTextUnavailable]}>
        {available ? '✓' : '✗'} {label}
      </Text>
    </View>
  );
}

export function PlaceCallout({ place, userLatitude, userLongitude, onClose }: PlaceCalloutProps) {
  const isUnrated = Number(place.accessibility_score) < 0 || isNaN(Number(place.accessibility_score));
  const distanceStr = calculateDistance(userLatitude, userLongitude, place.lat, place.lng);
  const localizedCat = formatCategory(place.category);

  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(60);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [place.id]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{localizedCat}</Text>
            </View>
            {place.brand && place.brand.toLowerCase() !== place.name.toLowerCase() && (
              <View style={styles.brandPill}>
                <Text style={styles.brandText}>{place.brand}</Text>
              </View>
            )}
            {distanceStr && (
              <View style={styles.distancePill}>
                <Text style={styles.distanceText}>{distanceStr}</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* Address Row (Clean, without icon) */}
      {place.address ? (
        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>Địa chỉ</Text>
          <Text style={styles.addressValue} numberOfLines={2}>{place.address}</Text>
        </View>
      ) : null}

      {/* Contact & Hours Info (if present) */}
      {(place.opening_hours || place.phone || place.website) && (
        <View style={styles.contactBox}>
          {place.opening_hours ? (
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Giờ mở cửa:</Text>
              <Text style={styles.contactValue}>{place.opening_hours}</Text>
            </View>
          ) : null}
          {place.phone ? (
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Điện thoại:</Text>
              <Text style={styles.contactValue}>{place.phone}</Text>
            </View>
          ) : null}
          {place.website ? (
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Website:</Text>
              <Text style={styles.contactValue} numberOfLines={1}>{place.website}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Accessibility Status Section */}
      <View style={styles.statusSection}>
        {!isUnrated && <ScoreBadge score={place.accessibility_score} />}

        {isUnrated ? (
          <View style={styles.crowdsourceCard}>
            <Text style={styles.crowdsourceDesc}>
              Chưa có dữ liệu tiếp cận cho người khó khăn khi di chuyển.
            </Text>
            <Pressable style={styles.crowdsourceBtn}>
              <Text style={styles.crowdsourceBtnText}>+ Đóng góp khảo sát tiếp cận</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tagRow}>
            <FeatureTag label="Lối dốc" available={Boolean(place.has_ramp)} />
            <FeatureTag label="Thang máy" available={Boolean(place.has_elevator || place.has_accessible_elevator)} />
            <FeatureTag label="Gạch dẫn hướng" available={Boolean(place.has_tactile_paving)} />
            <FeatureTag label="WC tiếp cận" available={Boolean(place.has_accessible_restroom)} />
            <FeatureTag label="Cửa rộng" available={Boolean(place.door_width_ok)} />
          </View>
        )}

        {!isUnrated && place.accessibility_note ? (
          <Text style={styles.note}>{place.accessibility_note}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  distancePill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  brandPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  contactBox: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  contactValue: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  addressBox: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  statusSection: {
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  crowdsourceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  crowdsourceDesc: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10,
    lineHeight: 17,
  },
  crowdsourceBtn: {
    backgroundColor: Colors.primary ?? '#208AEF',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  crowdsourceBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagAvailable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  tagUnavailable: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagTextAvailable: {
    color: '#166534',
  },
  tagTextUnavailable: {
    color: '#991b1b',
  },
  note: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 6,
  },
});

