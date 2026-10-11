import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/shared/theme';
import { CommunityReview } from './types';
import { SectionHeading } from './SectionHeading';

interface CommunityReviewsSectionProps {
  reviews: CommunityReview[];
}

export function CommunityReviewsSection({ reviews }: CommunityReviewsSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeading
        icon="comment-outline"
        title="Nhận xét cộng đồng"
        meta={`(${reviews.length + 14})`}
        actionLabel="Xem tất cả"
        onActionPress={() => Alert.alert('Nhận xét cộng đồng', 'Danh sách đầy đủ sẽ được bổ sung sau.')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        {reviews.map((review) => (
          <View key={review.id} style={styles.card}>
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{review.initials}</Text>
              </View>
              <View style={styles.authorCopy}>
                <Text style={styles.author}>{review.author}</Text>
                <Text style={styles.age}>{review.age}</Text>
              </View>
              <TouchableOpacity style={styles.helpfulBadge} activeOpacity={0.7}>
                <MaterialCommunityIcons name="triangle" size={10} color={Colors.primary} />
                <Text style={styles.helpfulText}>{review.helpfulCount} hữu ích</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.comment} numberOfLines={4}>
              “{review.comment}”
            </Text>
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
    gap: 10,
  },
  card: {
    width: 286,
    minHeight: 146,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  avatarText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  authorCopy: {
    flex: 1,
  },
  author: {
    color: Colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  age: {
    marginTop: 1,
    color: Colors.textMuted,
    fontSize: 11.5,
  },
  helpfulBadge: {
    height: 27,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    color: Colors.primary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  comment: {
    marginTop: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
});
