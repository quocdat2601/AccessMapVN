import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { EvidenceItem } from './types';

interface EvidenceGallerySectionProps {
  evidence: EvidenceItem[];
  onAddEvidence?: () => void;
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

function EvidenceThumbItem({ item }: { item: EvidenceItem }) {
  const [loadError, setLoadError] = React.useState(false);

  return (
    <View style={styles.thumbCard}>
      <View style={styles.thumbIllustration}>
        {item.imageUrl && !loadError ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => setLoadError(true)}
          />
        ) : (
          <EvidenceIllustration />
        )}
        <View style={styles.thumbLabelOverlay}>
          <Text style={styles.thumbLabelText} numberOfLines={1}>{item.title}</Text>
        </View>
      </View>
    </View>
  );
}

export function EvidenceGallerySection({ evidence, onAddEvidence }: EvidenceGallerySectionProps) {
  const photoCount = evidence.length;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingLeft}>
          <MaterialCommunityIcons name="camera-outline" size={18} color={Colors.primary} />
          <Text style={styles.headingTitle}>Hình ảnh tiếp cận</Text>
        </View>
        <Text style={styles.headingCount}>
          {photoCount > 0 ? `${photoCount} ảnh` : 'Chưa có ảnh'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {evidence.map((item) => (
          <EvidenceThumbItem key={item.id} item={item} />
        ))}

        {/* Dashed Camera +50 EXP Tile */}
        <TouchableOpacity
          style={styles.addCard}
          onPress={onAddEvidence}
          accessibilityRole="button"
          accessibilityLabel="Chụp ảnh đóng góp nhận 50 EXP"
          activeOpacity={0.78}
        >
          <View style={styles.addCardContent}>
            <MaterialCommunityIcons name="camera-plus-outline" size={26} color={Colors.primary} />
            <Text style={styles.addCardExp}>+50 EXP</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headingCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  cards: {
    gap: 10,
    paddingRight: 10,
  },
  thumbCard: {
    width: 108,
    height: 84,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#dce9e7',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbIllustration: {
    flex: 1,
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
  },
  thumbLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  addCard: {
    width: 96,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.8,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardContent: {
    alignItems: 'center',
    gap: 4,
  },
  addCardExp: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
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
});
