import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onVoicePress?: () => void;
  onFilterPress?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  onVoicePress,
  onFilterPress,
}: SearchBarProps) {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.searchBox}>
        {/* Search Icon */}
        <Ionicons name="search" size={20} color={Colors.primaryContainer} style={styles.searchIcon} />

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder="Tìm địa điểm, địa chỉ hoặc tọa độ"
          placeholderTextColor={Colors.textPlaceholder}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          accessibilityLabel="Tìm địa điểm tiếp cận"
        />

        {/* Voice Search Button */}
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={onVoicePress}
          accessibilityRole="button"
          accessibilityLabel="Tìm kiếm bằng giọng nói"
          activeOpacity={0.7}
        >
          <Ionicons name="mic-outline" size={19} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc tiêu chuẩn tiếp cận"
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={17} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 9,
  },
  searchBox: {
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: Colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },
  voiceButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
