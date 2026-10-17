import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth';
import { ApiError, AuthenticationRequiredError } from '@/shared/api/client';
import { castCommunityVote, fetchCommunityState } from '../api/communityApi';
import type {
  CommunityFeatureInput,
  CommunityFeatureState,
  CommunityVoteType,
  FeatureCommunityLabel,
  PublishedFeatureStatus,
} from '../model/types';

const STATUS_LABELS: Record<PublishedFeatureStatus, string> = {
  Available: 'Có sẵn',
  Limited: 'Hạn chế',
  NotAvailable: 'Không có',
  Unknown: 'Chưa rõ',
};

const CHANGE_OPTIONS: PublishedFeatureStatus[] = ['Available', 'Limited', 'NotAvailable', 'Unknown'];

const COMMUNITY_COPY: Record<FeatureCommunityLabel, { title: string; icon: string; tone: 'teal' | 'amber' | 'rose' }> = {
  CommunityUnderReview: { title: 'Cộng đồng đang xem xét', icon: 'alert-circle-outline', tone: 'rose' },
  ConflictReported: { title: 'Có quan sát mâu thuẫn', icon: 'alert-circle-outline', tone: 'rose' },
  NeedsRecheck: { title: 'Cần kiểm tra lại', icon: 'clock-alert-outline', tone: 'amber' },
  Reinforced: { title: 'Được cộng đồng củng cố', icon: 'shield-check-outline', tone: 'teal' },
  Fresh: { title: 'Mới được xác nhận', icon: 'check-decagram-outline', tone: 'teal' },
  Uncorroborated: { title: 'Chưa có xác nhận độc lập', icon: 'account-question-outline', tone: 'amber' },
};

interface FeatureCardProps {
  locationId: string;
  feature: CommunityFeatureInput;
}

function FeatureCard({ locationId, feature }: FeatureCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<CommunityFeatureState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PublishedFeatureStatus | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      setState(await fetchCommunityState(locationId, feature.featureType));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setUnavailable(true);
      else setMessage('Chưa tải được trạng thái cộng đồng. Hãy thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [feature.featureType, locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const requireSignIn = () => {
    Alert.alert('Cần đăng nhập', 'Bạn có thể xem công khai, nhưng cần đăng nhập để gửi quan sát.', [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Đăng nhập', onPress: () => router.push('/login') },
    ]);
  };

  const submitVote = async (voteType: CommunityVoteType, proposedStatus?: PublishedFeatureStatus) => {
    if (!user) {
      requireSignIn();
      return;
    }
    if (!state?.featureVersion) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const receipt = await castCommunityVote(
        locationId,
        feature.featureType,
        {
          voteType,
          observedFeatureVersion: state.featureVersion,
          proposedStatus,
          comment: note.trim() || undefined,
        },
        user.id
      );
      setShowChanges(false);
      setSelectedStatus(null);
      setNote('');
      setMessage(
        receipt.status === 'PendingValidation'
          ? 'Phiếu đã được ghi nhận và đang chờ xác minh.'
          : 'Đã ghi nhận quan sát của bạn. Thông tin công khai không đổi ngay lập tức.'
      );
      await load();
    } catch (error) {
      if (error instanceof AuthenticationRequiredError || (error instanceof ApiError && error.status === 401)) {
        setMessage('Phiên đăng nhập chưa hợp lệ với máy chủ local. Hãy đăng nhập lại rồi thử lại.');
        requireSignIn();
      } else if (error instanceof ApiError && error.status === 409) {
        setMessage('Dữ liệu đã có phiên bản mới. Đang tải lại để bạn xác nhận đúng phiên bản.');
        await load();
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage('Bạn thao tác quá nhanh. Phiếu chưa bị nhân đôi; hãy thử lại sau.');
      } else if (error instanceof ApiError) {
        setMessage(`Chưa gửi được phiếu: ${error.message}`);
      } else {
        setMessage('Chưa gửi được phiếu. Bạn có thể thử lại với cùng yêu cầu.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayedStatus = state?.publishedStatus ?? feature.publishedStatus;
  const community = state ? COMMUNITY_COPY[state.label] : null;
  const voters = state?.eligibleVoterCount ?? 0;
  const stripeStyle = community?.tone === 'rose'
    ? styles.statusRose
    : community?.tone === 'amber'
      ? styles.statusAmber
      : styles.statusTeal;
  const stripeIcon = community?.tone === 'rose' ? '#BE123C' : community?.tone === 'amber' ? '#A16207' : '#007D78';

  if (!loading && unavailable) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={feature.icon as never} size={20} color="#007D78" />
        </View>
        <View style={styles.titleBox}>
          <Text style={styles.featureLabel}>{feature.label}</Text>
          <Text style={styles.baselineText}>
            Công bố: {STATUS_LABELS[displayedStatus]}{state?.featureVersion ? ` · v${state.featureVersion}` : ''}
          </Text>
        </View>
        {loading ? <ActivityIndicator size="small" color="#007D78" /> : null}
      </View>

      {!loading && state ? (
        <>
          {state.advisory ? (
            <View style={styles.advisoryBox}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#9A3412" />
              <Text style={styles.advisoryText}>{state.advisory.reason}</Text>
            </View>
          ) : null}

          <View style={[styles.statusStrip, stripeStyle]}>
            <MaterialCommunityIcons name={(community?.icon ?? 'shield-check-outline') as never} size={17} color={stripeIcon} />
            <View style={styles.statusCopy}>
              <Text style={styles.communityLabel}>{community?.title ?? 'Đang cập nhật trạng thái cộng đồng'}</Text>
              <Text style={styles.communityMetric}>
                {voters === 0 ? 'Chưa có quan sát độc lập' : `${voters} người đã đóng góp quan sát đủ điều kiện`}
              </Text>
            </View>
          </View>

          <Text style={styles.question}>Thông tin này còn chính xác không?</Text>
          <Text style={styles.questionHint}>
            Xác nhận của bạn giúp cập nhật độ mới dữ liệu; phiếu không tự thay đổi thông tin đã công bố.
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submitVote('StillAccurate')}
              style={[styles.accurateButton, submitting && styles.disabled]}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.accurateText}>{submitting ? 'Đang gửi…' : 'Vẫn chính xác'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => {
                setShowChanges((visible) => !visible);
                setSelectedStatus(null);
              }}
              style={[styles.changedButton, showChanges && styles.changedButtonSelected, submitting && styles.disabled]}
            >
              <MaterialCommunityIcons name="alert-outline" size={18} color="#B45309" />
              <Text style={styles.changedText}>Báo thay đổi</Text>
            </TouchableOpacity>
          </View>

          {showChanges ? (
            <View style={styles.changeOptions}>
              <Text style={styles.changePrompt}>Bạn quan sát thấy trạng thái nào?</Text>
              <View style={styles.changeChips}>
                {CHANGE_OPTIONS.filter((option) => option !== displayedStatus).map((option) => (
                  <TouchableOpacity
                    key={option}
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => setSelectedStatus(option)}
                    style={[styles.changeChip, selectedStatus === option && styles.changeChipSelected]}
                  >
                    <Text style={[styles.changeChipText, selectedStatus === option && styles.changeChipTextSelected]}>
                      {STATUS_LABELS[option]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                accessibilityLabel={`Mô tả thay đổi của ${feature.label}`}
                editable={!submitting}
                multiline
                onChangeText={setNote}
                placeholder="Mô tả ngắn (không bắt buộc nếu đã chọn trạng thái)"
                placeholderTextColor="#94A3B8"
                style={styles.noteInput}
                value={note}
              />
              <TouchableOpacity
                accessibilityRole="button"
                disabled={submitting || !selectedStatus}
                onPress={() => selectedStatus && void submitVote('Changed', selectedStatus)}
                style={[styles.submitChangeButton, (!selectedStatus || submitting) && styles.disabled]}
              >
                <Text style={styles.submitChangeText}>Gửi quan sát thay đổi</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : null}

      {message ? <Text style={styles.messageText}>{message}</Text> : null}
    </View>
  );
}

interface FeatureCommunitySectionProps {
  locationId: string;
  features: CommunityFeatureInput[];
}

export function FeatureCommunitySection({ locationId, features }: FeatureCommunitySectionProps) {
  if (features.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Giúp xác nhận thông tin tiếp cận</Text>
      <Text style={styles.sectionDescription}>
        Chọn từng hạng mục bạn đã quan sát. Một người chỉ có một quan sát hiệu lực trên mỗi phiên bản dữ liệu.
      </Text>
      {features.map((feature) => (
        <FeatureCard key={feature.featureType} locationId={locationId} feature={feature} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
  sectionTitle: { color: '#16302F', fontSize: 19, fontWeight: '800', letterSpacing: -0.25 },
  sectionDescription: { color: '#64748B', fontSize: 12.5, lineHeight: 18, marginBottom: 12, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#D9E5E4', borderRadius: 20, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconBox: { alignItems: 'center', backgroundColor: '#E8FAF6', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  titleBox: { flex: 1 },
  featureLabel: { color: '#18312F', fontSize: 14.5, fontWeight: '800' },
  baselineText: { color: '#64748B', fontSize: 12, marginTop: 3 },
  mutedText: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 10 },
  advisoryBox: { alignItems: 'flex-start', backgroundColor: '#FFF7ED', borderRadius: 10, flexDirection: 'row', gap: 7, marginTop: 11, padding: 9 },
  advisoryText: { color: '#9A3412', flex: 1, fontSize: 12, lineHeight: 17 },
  statusStrip: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 13, padding: 9 },
  statusTeal: { backgroundColor: '#E8FAF6' },
  statusAmber: { backgroundColor: '#FFF8E8' },
  statusRose: { backgroundColor: '#FFF1F2' },
  statusCopy: { flex: 1 },
  communityLabel: { color: '#164E4A', fontSize: 12.5, fontWeight: '800' },
  communityMetric: { color: '#64748B', fontSize: 11.5, marginTop: 2 },
  question: { color: '#18312F', fontSize: 14.5, fontWeight: '800', marginTop: 14 },
  questionHint: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  accurateButton: { alignItems: 'center', backgroundColor: '#007D78', borderRadius: 13, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 46, paddingHorizontal: 8 },
  accurateText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  changedButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#F5D7A1', borderRadius: 13, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 46, paddingHorizontal: 8 },
  changedButtonSelected: { backgroundColor: '#FFF8E8', borderColor: '#EAB65A' },
  changedText: { color: '#B45309', fontSize: 12.5, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  changeOptions: { backgroundColor: '#FFFDF7', borderColor: '#F6E6C4', borderRadius: 13, borderWidth: 1, marginTop: 10, padding: 11 },
  changePrompt: { color: '#48321A', fontSize: 12.5, fontWeight: '700' },
  changeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  changeChip: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  changeChipSelected: { backgroundColor: '#FFF1D6', borderColor: '#D97706' },
  changeChipText: { color: '#334155', fontSize: 11.5, fontWeight: '700' },
  changeChipTextSelected: { color: '#92400E' },
  noteInput: { backgroundColor: '#FFFFFF', borderColor: '#E7D9BF', borderRadius: 10, borderWidth: 1, color: '#1E293B', fontSize: 12.5, marginTop: 10, minHeight: 64, padding: 10, textAlignVertical: 'top' },
  submitChangeButton: { alignItems: 'center', backgroundColor: '#B45309', borderRadius: 10, justifyContent: 'center', marginTop: 9, minHeight: 40 },
  submitChangeText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  messageText: { color: '#475569', fontSize: 12, lineHeight: 17, marginTop: 10 },
});
