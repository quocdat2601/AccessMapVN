import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth';
import {
  fetchCommunityComments,
  fetchLocationTimeline,
  submitCommunityComment,
} from '../api/communityApi';
import type { PublicCommunityComment, PublicTimelineItem } from '../model/types';

interface Props {
  locationId: string;
  onSignIn: () => void;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('vi-VN');
}

export function CommunityTimelineSection({ locationId, onSignIn }: Props) {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<PublicTimelineItem[]>([]);
  const [comments, setComments] = useState<PublicCommunityComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [timelineItems, commentItems] = await Promise.all([
        fetchLocationTimeline(locationId),
        fetchCommunityComments(locationId),
      ]);
      setTimeline(timelineItems);
      setComments(commentItems);
    } catch {
      setTimeline([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!user) {
      onSignIn();
      return;
    }
    const normalized = body.trim();
    if (!normalized) return;
    setSubmitting(true);
    try {
      await submitCommunityComment(locationId, normalized, user.id);
      setBody('');
      Alert.alert('Đã gửi bình luận', 'Bình luận sẽ hiển thị sau khi được kiểm duyệt.');
    } catch (error) {
      Alert.alert('Không thể gửi', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons color="#0f766e" name="timeline-clock-outline" size={20} />
        <Text style={styles.title}>Lịch sử & bình luận cộng đồng</Text>
      </View>
      {loading ? <ActivityIndicator color="#0f766e" /> : null}
      {!loading && timeline.slice(0, 3).map((item) => (
        <View key={item.id} style={styles.timelineItem}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <Text style={styles.body}>{item.summary}</Text>
            <Text style={styles.meta}>{formatDate(item.occurredAt)}</Text>
          </View>
        </View>
      ))}
      {!loading && comments.map((comment) => (
        <View key={comment.id} style={[styles.comment, comment.isRecentContext && styles.recentComment]}>
          <Text style={styles.body}>{comment.body}</Text>
          <Text style={styles.meta}>{comment.authorLabel} · {formatDate(comment.createdAt)}</Text>
        </View>
      ))}
      <TextInput
        accessibilityLabel="Bình luận cộng đồng"
        maxLength={2000}
        multiline
        onChangeText={setBody}
        placeholder={user ? 'Chia sẻ ghi chú hữu ích tại địa điểm...' : 'Đăng nhập để bình luận'}
        style={styles.input}
        value={body}
      />
      <TouchableOpacity
        accessibilityRole="button"
        disabled={submitting || Boolean(user && !body.trim())}
        onPress={submit}
        style={[styles.button, (submitting || Boolean(user && !body.trim())) && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{user ? (submitting ? 'Đang gửi...' : 'Gửi để kiểm duyệt') : 'Đăng nhập'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopColor: '#e2e8f0', borderTopWidth: 1, marginTop: 18, paddingTop: 16 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  title: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  timelineItem: { flexDirection: 'row', marginBottom: 9 },
  dot: { backgroundColor: '#14b8a6', borderRadius: 4, height: 8, marginRight: 9, marginTop: 5, width: 8 },
  copy: { flex: 1 },
  body: { color: '#334155', fontSize: 12.5, lineHeight: 18 },
  meta: { color: '#94a3b8', fontSize: 10.5, marginTop: 2 },
  comment: { backgroundColor: '#f8fafc', borderRadius: 10, marginTop: 8, padding: 10 },
  recentComment: { backgroundColor: '#f0fdfa', borderColor: '#99f6e4', borderWidth: 1 },
  input: { borderColor: '#cbd5e1', borderRadius: 10, borderWidth: 1, color: '#0f172a', marginTop: 12, minHeight: 72, padding: 10, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: '#0f766e', borderRadius: 10, marginTop: 8, paddingVertical: 11 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
});
