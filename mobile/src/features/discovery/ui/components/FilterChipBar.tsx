import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

export interface FilterCategory {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  categoryKeys: string[];
}

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: 'all', label: 'Tất cả', icon: 'apps-outline', categoryKeys: [] },
  {
    id: 'restaurant',
    label: 'Quán ăn',
    icon: 'restaurant-outline',
    categoryKeys: ['restaurant', 'food', 'food_court', 'fast_food', 'bakery', 'bar', 'pub'],
  },
  {
    id: 'cafe',
    label: 'Cà phê',
    icon: 'cafe-outline',
    categoryKeys: ['cafe', 'coffee'],
  },
  {
    id: 'mall',
    label: 'Siêu thị / TTTM',
    icon: 'cart-outline',
    categoryKeys: ['mall', 'supermarket', 'market', 'convenience', 'shop', 'store', 'department_store'],
  },
  {
    id: 'hospital',
    label: 'Y tế',
    icon: 'medkit-outline',
    categoryKeys: ['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'],
  },
  {
    id: 'park',
    label: 'Công viên',
    icon: 'leaf-outline',
    categoryKeys: ['park', 'cinema', 'attraction', 'museum'],
  },
];

interface FilterChipBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenAccessibilityFilter: () => void;
  activeAccessibilityCount: number;
}

export function FilterChipBar({
  selectedCategory,
  onSelectCategory,
  onOpenAccessibilityFilter,
  activeAccessibilityCount,
}: FilterChipBarProps) {
  const isAccessibilityActive = activeAccessibilityCount > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Special Accessibility Pill */}
        <TouchableOpacity
          style={[
            styles.chip,
            styles.accessibilityChip,
            isAccessibilityActive && styles.accessibilityChipActive,
          ]}
          onPress={onOpenAccessibilityFilter}
          activeOpacity={0.8}
        >
          <Ionicons
            name="accessibility"
            size={16}
            color={isAccessibilityActive ? '#FFFFFF' : Colors.primary}
          />
          <Text
            style={[
              styles.chipText,
              styles.accessibilityChipText,
              isAccessibilityActive && styles.chipTextActive,
            ]}
          >
            Tiếp cận
          </Text>
          {activeAccessibilityCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeAccessibilityCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Category Chips */}
        {FILTER_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon}
                size={15}
                color={isSelected ? '#FFFFFF' : Colors.textSecondary}
                style={styles.chipIcon}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 3,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  accessibilityChip: {
    borderColor: Colors.primaryContainer,
    backgroundColor: '#F0F9F8',
  },
  accessibilityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  accessibilityChipText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: '#FFFFFF',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
});
