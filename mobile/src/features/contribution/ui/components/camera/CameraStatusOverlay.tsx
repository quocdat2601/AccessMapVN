import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GpsSnapshot } from '@/entities/contribution';
import { styles } from './CameraStatusOverlay.styles';

interface CameraStatusOverlayProps {
  currentAddress?: string | null;
  gps?: GpsSnapshot | null;
}

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export function CameraStatusOverlay({ currentAddress, gps }: CameraStatusOverlayProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  const dayStr = DAY_NAMES[now.getDay()];
  const dateStr = `${now.getDate().toString().padStart(2, '0')} Tháng ${(now.getMonth() + 1).toString().padStart(2, '0')}, ${now.getFullYear()}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Strictly Centered Viewfinder Corner Reticle */}
      <View style={styles.reticleCenterWrap}>
        <View style={styles.reticleBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* TimeMark-style Live Audit Stamp / Watermark on bottom-left */}
      <View style={styles.auditWatermark}>
        <View style={styles.watermarkHeader}>
          <Text style={styles.timeBig}>{timeStr}</Text>
          <View style={styles.timeDivider} />
          <View style={styles.dateCol}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.dayText}>{dayStr}</Text>
          </View>
        </View>

        <View style={styles.watermarkLocationRow}>
          <MaterialCommunityIcons name="crosshairs-gps" size={13} color="#5eead4" />
          <Text style={styles.watermarkLocationText} numberOfLines={1}>
            {currentAddress || 'Đang lấy địa chỉ thực tế…'}
          </Text>
        </View>

        {gps ? (
          <Text style={styles.watermarkGpsText}>
            {`${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`}
            {gps.accuracy != null ? ` (±${Math.round(gps.accuracy)}m)` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
