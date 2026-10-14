import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth';
import { ApiError } from '@/shared/api/client';
import { castCommunityVote, fetchCommunityState } from '../api/communityApi';
import type {
  CommunityFeatureInput,
  CommunityFeatureState,
  CommunityVoteType,
  FeatureCommunityLabel,
  PublishedFeatureStatus,
} from '../model/types';

const LABELS: Record<FeatureCommunityLabel, string> = {
  CommunityUnderReview: 'Cộng đồng đang xem xét',
  ConflictReported: 'Có báo cáo mâu thuẫn',
  NeedsRecheck: 'Cần kiểm tra lại',
  Reinforced: 'Được cộng đồng củng cố',
  Fresh: 'Mới được xác nhận',
  Uncorroborated: 'Chưa có xác nhận độc lập',
};

const STATUS_LABELS: Record<PublishedFeatureStatus, string> = {
  Available: 'Có sẵn',
  Limited: 'Hạn chế',
  NotAvailable: 'Không có',
  Unknown: 'Chưa rõ',
};

const CHANGE_OPTIONS: PublishedFeatureStatus[] = [
  'Available',
  'Limited',
  'NotAvailable',
  'Unknown',
];

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
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const result = await fetchCommunityState(locationId, feature.featureType);
      setState(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setUnavailable(true);
      else setMessage('Chưa tải được trạng thái cộng đồng.');
    } finally {
      setLoading(false);
    }
  }, [feature.featureType, locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const requireSignIn = () => {
    Alert.alert('Cần đăng nhập', 'Bạn có thể xem công khai, nhưng cần đăng nhập để bỏ phiếu.', [
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
        },
        user.id
      );
      setShowChanges(false);
      setMessage(
        receipt.status === 'PendingValidation'
          ? 'Phiếu đã được ghi nhận và đang xác minh.'
          : 'Phiếu đã được ghi nhận.'
      );
      await load();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setMessage('Dữ liệu đã có phiên bản mới. Đang tải lại để bạn xác nhận đúng phiên bản.');
        await load();
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage('Bạn thao tác quá nhanh. Hãy thử lại sau; phiếu chưa bị nhân đôi.');
      } else {
        setMessage('Chưa gửi được phiếu. Bạn có thể thử lại với cùng yêu cầu.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayedStatus = state?.publishedStatus ?? feature.publishedStatus;
  const voterCount = state?.eligibleVoterCount ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={feature.icon as any} size={19} color="#006874" />
        </View>
        <View style={styles.titleBox}>
          <Text style={styles.featureLabel}>{feature.label}</Text>
          <Text style={styles.baselineText}>
            Công bố: {STATUS_LABELS[displayedStatus]}
            {state?.featureVersion ? ` · v${state.featureVersion}` : ''}
          </Text>
        </View>
        {loading ? <ActivityIndicator size="small" color="#006874" /> : null}
      </View>

      {!loading && unavailable ? (
        <Text style={styles.mutedText}>Chưa có phiên bản tính năng được công bố để xác nhận.</Text>
      ) : null}

      {!loading && state ? (
        <>
          {state.advisory ? (
            <View style={styles.advisoryBox}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#9A3412" />
              <Text style={styles.advisoryText}>{state.advisory.reason}</Text>
            </View>
          ) : null}
          <View style={styles.communityRow}>
            <Text style={styles.communityLabel}>{LABELS[state.label]}</Text>
            <Text style={styles.communityMetric}>
              {voterCount === 0
                ? 'Chưa có phiếu độc lập'
                : `${voterCount} người đã đóng góp quan sát đủ điều kiện`}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submitVote('StillAccurate')}
              style={[styles.accurateButton, submitting && styles.disabled]}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={17} color="#FFFFFF" />
              <Text style={styles.accurateText}>Vẫn chính xác</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => setShowChanges((visible) => !visible)}
              style={[styles.changedButton, submitting && styles.disabled]}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={18} color="#B45309" />
              <Text style={styles.changedText}>Đã thay đổi</Text>
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
                    onPress={() => void submitVote('Changed', option)}
                    style={styles.changeChip}
                  >
                    <Text style={styles.changeChipText}>{STATUS_LABELS[option]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Xác nhận theo từng tiện ích</Text>
      <Text style={styles.sectionDescription}>
        Phiếu cộng đồng không tự sửa dữ liệu đã công bố và không cộng EXP.
      </Text>
      {features.map((feature) => (
        <FeatureCard key={feature.featureType} locationId={locationId} feature={feature} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  sectionDescription: { color: '#64748B', fontSize: 12, lineHeight: 18, marginBottom: 10, marginTop: 3 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, marginBottom: 9, padding: 12 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  iconBox: { alignItems: 'center', backgroundColor: '#ECFEFF', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  titleBox: { flex: 1 },
  featureLabel: { color: '#0F172A', fontSize: 13.5, fontWeight: '700' },
  baselineText: { color: '#64748B', fontSize: 11.5, marginTop: 2 },
  mutedText: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 8 },
  communityRow: { marginTop: 9 },
  communityLabel: { color: '#0F766E', fontSize: 12.5, fontWeight: '700' },
  communityMetric: { color: '#64748B', fontSize: 11.5, marginTop: 2 },
  advisoryBox: { alignItems: 'flex-start', backgroundColor: '#FFF7ED', borderRadius: 9, flexDirection: 'row', gap: 6, marginTop: 9, padding: 8 },
  advisoryText: { color: '#9A3412', flex: 1, fontSize: 11.5, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  accurateButton: { alignItems: 'center', backgroundColor: '#006874', borderRadius: 10, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  accurateText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  changedButton: { alignItems: 'center', backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  changedText: { color: '#B45309', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  changeOptions: { backgroundColor: '#F8FAFC', borderRadius: 10, marginTop: 9, padding: 9 },
  changePrompt: { color: '#334155', fontSize: 11.5, fontWeight: '600' },
  changeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  changeChip: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  changeChipText: { color: '#334155', fontSize: 11.5, fontWeight: '600' },
  messageText: { color: '#475569', fontSize: 11.5, lineHeight: 16, marginTop: 8 },
});
