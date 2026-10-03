import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { EvidenceItem } from './types';
import { SectionHeading } from './SectionHeading';

interface EvidenceGallerySectionProps {
  evidence: EvidenceItem[];
}

function EvidenceIllustration() {
  return (
    <View style={styles.illustration}>
      <Svg width="100%" height="100%" viewBox="0 0 320 150">
        <Rect width="320" height="150" fill="#dce9e7" />
        <Rect x="30" y="24" width="260" height="90" rx="4" fill="#98aaa8" />
        <Rect x="46" y="39" width="96" height="75" fill="#5b716f" />
        <Rect x="160" y="39" width="112" height="75" fill="#718886" />
        <Rect x="77" y="48" width="36" height="66" fill="#d9e5e3" />
        <Path d="M 12 128 L 206 105 L 308 105 L 308 139 L 12 139 Z" fill="#f6f7f6" />
        <Path d="M 24 126 L 207 105" stroke="#006874" strokeWidth="4" />
        <Path d="M 24 136 L 209 114" stroke="#006874" strokeWidth="4" />
        <Path d="M 24 126 L 24 141 M 64 121 L 64 136 M 104 116 L 104 132 M 144 112 L 144 127 M 184 107 L 184 122" stroke="#006874" strokeWidth="2" />
      </Svg>
      <View style={styles.photoShade} />
    </View>
  );
}

export function EvidenceGallerySection({ evidence }: EvidenceGallerySectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeading
        icon="camera-outline"
        title="Ảnh & bằng chứng cộng đồng"
        meta={`(${evidence.length + 26} ảnh)`}
        actionLabel="Xem tất cả"
        onActionPress={() => Alert.alert('Bằng chứng cộng đồng', 'Thư viện đầy đủ sẽ được bổ sung sau.')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {evidence.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.imageWrap}>
              <EvidenceIllustration />
              {item.isFaceBlurred ? (
                <View style={styles.blurBadge}>
                  <MaterialCommunityIcons name="blur" size={14} color={Colors.surface} />
                  <Text style={styles.blurText}>Mặt đã làm mờ</Text>
                </View>
              ) : null}
              <View style={styles.evidenceBadge}>
                <MaterialCommunityIcons name="ruler" size={14} color={Colors.surface} />
                <Text style={styles.evidenceBadgeText}>{item.badge}</Text>
              </View>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  cards: {
    paddingTop: 10,
    paddingRight: 18,
    gap: 12,
  },
  card: {
    width: 318,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  imageWrap: {
    height: 150,
  },
  illustration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  photoShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 55, 63, 0.08)',
  },
  blurBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    height: 27,
    borderRadius: 14,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(25, 28, 28, 0.68)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  blurText: {
    color: Colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  evidenceBadge: {
    position: 'absolute',
    left: 10,
    bottom: 9,
    height: 29,
    borderRadius: 15,
    paddingHorizontal: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  evidenceBadgeText: {
    color: Colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  cardCopy: {
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: Colors.textMuted,
    fontSize: 11.5,
  },
});
