import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onSubmit?: () => void;
  isSearching?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onVoicePress?: () => void;
  onFilterPress?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  onSubmit,
  isSearching = false,
  onFocus,
  onBlur,
  onVoicePress,
  onFilterPress,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.outerContainer}>
      <Pressable
        style={[styles.searchBox, isFocused && styles.searchBoxFocused]}
        onPress={() => inputRef.current?.focus()}
      >
        {/* Search Icon / Loader */}
        {isSearching ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.searchIcon} />
        ) : (
          <Ionicons
            name="search"
            size={20}
            color={isFocused ? Colors.primary : Colors.primaryContainer}
            style={styles.searchIcon}
          />
        )}

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Tìm địa điểm, địa chỉ hoặc tọa độ"
          placeholderTextColor={Colors.textPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          accessibilityLabel="Tìm địa điểm tiếp cận"
        />

        {/* Clear Button */}
        {value.length > 0 && onClear && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Xóa tìm kiếm"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

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
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 9,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
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
  searchBoxFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    shadowOpacity: 0.2,
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
  clearButton: {
    padding: 4,
    marginRight: 2,
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
