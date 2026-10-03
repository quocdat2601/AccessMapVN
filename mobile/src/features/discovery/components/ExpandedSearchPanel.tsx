import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { SearchLocation } from '../types';

interface ExpandedSearchPanelProps {
  locations: SearchLocation[];
  query: string;
  onChangeQuery: (query: string) => void;
  onCancel: () => void;
  onSelectLocation: (location: SearchLocation) => void;
  onFilterPress?: () => void;
  onVoicePress?: () => void;
}

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/\bcentre\b/g, 'center')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ExpandedSearchPanel({
  locations,
  query,
  onChangeQuery,
  onCancel,
  onSelectLocation,
  onFilterPress,
  onVoicePress,
}: ExpandedSearchPanelProps) {
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [showRecent, setShowRecent] = useState(true);

  const normalizedQuery = normalizeSearchText(query);
  const hasQuery = normalizedQuery.length > 0;
  const visibleLocations = useMemo(() => {
    if (!hasQuery) return showRecent ? locations.slice(0, 3) : [];

    return locations.filter((location) =>
      normalizeSearchText(`${location.name} ${location.address}`).includes(normalizedQuery)
    );
  }, [hasQuery, locations, normalizedQuery, showRecent]);

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Ionicons name="search-outline" size={24} color={Colors.primary} />
          <TextInput
            autoFocus
            style={styles.searchInput}
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Tìm địa điểm"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            selectionColor={Colors.primaryContainer}
            accessibilityLabel="Tìm địa điểm theo tên hoặc địa chỉ"
          />
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={onVoicePress}
            accessibilityRole="button"
            accessibilityLabel="Tìm kiếm bằng giọng nói"
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Hủy tìm kiếm"
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.personalizationButton}
          onPress={() => setIsPersonalized((current) => !current)}
          accessibilityRole="switch"
          accessibilityState={{ checked: isPersonalized }}
          accessibilityLabel="Cá nhân hóa kết quả"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="wheelchair-accessibility"
            size={20}
            color={Colors.primaryContainer}
          />
          <Text style={styles.personalizationText}>Cá nhân hóa</Text>
          <View style={[styles.toggleBadge, !isPersonalized && styles.toggleBadgeOff]}>
            <Text style={[styles.toggleText, !isPersonalized && styles.toggleTextOff]}>
              {isPersonalized ? 'ON' : 'OFF'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc tìm kiếm"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="tune-variant" size={22} color={Colors.textSecondary} />
          <Text style={styles.filterText}>Bộ lọc</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {hasQuery ? 'KẾT QUẢ TÌM KIẾM' : 'ĐỊA ĐIỂM GẦN ĐÂY'}
        </Text>
        {!hasQuery && showRecent ? (
          <TouchableOpacity
            onPress={() => setShowRecent(false)}
            accessibilityRole="button"
            accessibilityLabel="Xóa tất cả địa điểm gần đây"
            activeOpacity={0.7}
          >
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.resultsList}
        contentContainerStyle={visibleLocations.length === 0 ? styles.emptyList : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {visibleLocations.length > 0 ? (
          visibleLocations.map((location, index) => (
            <TouchableOpacity
              key={location.id}
              style={[styles.resultRow, index > 0 && styles.resultDivider]}
              onPress={() => onSelectLocation(location)}
              accessibilityRole="button"
              accessibilityLabel={`${location.name}, ${location.address}`}
              activeOpacity={0.7}
            >
              <View style={styles.historyIcon}>
                <MaterialCommunityIcons name="history" size={23} color={Colors.textMuted} />
              </View>
              <View style={styles.resultCopy}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {location.name}
                </Text>
                <Text style={styles.resultAddress} numberOfLines={1}>
                  {location.address}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="arrow-top-left"
                size={25}
                color={Colors.textMuted}
                style={styles.resultArrow}
              />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {hasQuery ? 'Không tìm thấy địa điểm phù hợp' : 'Chưa có địa điểm gần đây'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchField: {
    flex: 1,
    height: 52,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    paddingVertical: 0,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  voiceButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  cancelButton: {
    minWidth: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  personalizationButton: {
    height: 36,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  personalizationText: {
    color: Colors.primaryContainer,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleBadge: {
    minWidth: 42,
    height: 25,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBadgeOff: {
    backgroundColor: Colors.surface,
  },
  toggleText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  toggleTextOff: {
    color: Colors.textMuted,
  },
  filterButton: {
    height: 36,
    borderRadius: 20,
    paddingHorizontal: 13,
    backgroundColor: Colors.surfaceVariant,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    height: 58,
    paddingHorizontal: 20,
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clearText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  resultsList: {
    maxHeight: 186,
    marginHorizontal: 20,
  },
  resultRow: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  resultAddress: {
    color: Colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 1,
  },
  resultArrow: {
    marginLeft: 8,
    marginRight: 1,
  },
  emptyList: {
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
