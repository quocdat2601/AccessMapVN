import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { castCommunityVote, fetchCommunityState, withdrawCommunityVote } from '../api/communityApi';
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

export interface SubmittedObservation {
  voteType: CommunityVoteType;
  proposedStatus?: PublishedFeatureStatus;
  comment?: string;
  reportId?: string;
  reportData?: {
    reason?: string;
    description?: string;
    featureIds?: string[];
    imageUri?: string;
  };
  originalState?: CommunityFeatureState;
  submittedAt: number;
}

const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes grace period

interface FeatureCardProps {
  locationId: string;
  feature: CommunityFeatureInput;
  onRequestReport?: (feature: CommunityFeatureInput, editingData?: SubmittedObservation['reportData']) => void;
  refreshTrigger?: number;
}

function FeatureCard({ locationId, feature, onRequestReport, refreshTrigger }: FeatureCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<CommunityFeatureState | null>(null);
  const [originalBaselineState, setOriginalBaselineState] = useState<CommunityFeatureState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PublishedFeatureStatus | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [submittedObservation, setSubmittedObservation] = useState<SubmittedObservation | null>(null);

  const storageKey = `@accessmap_vote_${user?.id ?? 'anon'}_${locationId}_${feature.featureType}`;

  useEffect(() => {
    let isMounted = true;
    async function loadStoredVote() {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.submittedAt === 'number') {
            setSubmittedObservation(parsed);
          }
        }
      } catch {}
    }
    void loadStoredVote();
    return () => {
      isMounted = false;
    };
  }, [storageKey, refreshTrigger]);

  const isFinalized = submittedObservation
    ? Date.now() - submittedObservation.submittedAt > GRACE_PERIOD_MS
    : false;
  const remainingMinutes = submittedObservation
    ? Math.max(1, Math.round((GRACE_PERIOD_MS - (Date.now() - submittedObservation.submittedAt)) / (60 * 1000)))
    : 0;

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const fetched = await fetchCommunityState(locationId, feature.featureType);
      setState(fetched);
      if (fetched.label !== 'ConflictReported') {
        setOriginalBaselineState(fetched);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setUnavailable(true);
      else setMessage('Chưa tải được trạng thái cộng đồng. Hãy thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [feature.featureType, locationId]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

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

      const observation: SubmittedObservation = {
        voteType,
        proposedStatus,
        comment: note.trim() || undefined,
        originalState: state,
        submittedAt: Date.now(),
      };
      setSubmittedObservation(observation);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(observation));
      } catch {}

      setShowChanges(false);
      setSelectedStatus(null);
      setNote('');
      setMessage(
        receipt.status === 'PendingValidation'
          ? 'Phiếu đã được ghi nhận và đang chờ xác minh.'
          : 'Đã ghi nhận quan sát của bạn thành công.'
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

  const handleEditObservation = () => {
    if (!submittedObservation || isFinalized) return;
    if (onRequestReport && submittedObservation.voteType === 'Changed') {
      onRequestReport(feature, submittedObservation.reportData);
      return;
    }
    if (submittedObservation.voteType === 'Changed') {
      setShowChanges(true);
      setSelectedStatus(submittedObservation.proposedStatus ?? null);
      setNote(submittedObservation.comment ?? '');
    } else {
      setShowChanges(false);
      setSelectedStatus(null);
      setNote('');
    }
    setSubmittedObservation(null);
    setMessage(null);
  };

  const handleDeleteObservation = () => {
    if (!submittedObservation || isFinalized) return;
    Alert.alert(
      'Hủy quan sát & báo cáo',
      'Bạn có muốn xóa quan sát và báo cáo đã gửi để quay lại trạng thái ban đầu không?',
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Hủy quan sát',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await withdrawCommunityVote(locationId, feature.featureType);
              } catch {}
              await AsyncStorage.removeItem(storageKey);

              if (submittedObservation.originalState) {
                setState(submittedObservation.originalState);
              } else if (originalBaselineState) {
                setState(originalBaselineState);
              } else {
                setState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    label: prev.eligibleVoterCount > 0 ? 'Reinforced' : 'Uncorroborated',
                    contradictingVoterCount: 0,
                  };
                });
              }

              setSubmittedObservation(null);
              setShowChanges(false);
              setSelectedStatus(null);
              setNote('');
              setMessage('Đã hủy quan sát. Trạng thái đã được khôi phục về ban đầu.');
            } catch {
              setMessage('Chưa thể hủy quan sát. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const effectiveState = useMemo(() => {
    if (!state) return null;
    if (submittedObservation?.voteType === 'Changed') {
      return {
        ...state,
        label: 'ConflictReported' as FeatureCommunityLabel,
        contradictingVoterCount: Math.max(1, state.contradictingVoterCount || 1),
      };
    }
    return state;
  }, [state, submittedObservation]);

  const displayedStatus = (effectiveState?.publishedStatus ?? feature.publishedStatus) as PublishedFeatureStatus;
  const community = effectiveState
    ? (COMMUNITY_COPY[effectiveState.label as FeatureCommunityLabel] ?? null)
    : null;
  const voters = effectiveState?.eligibleVoterCount ?? 0;
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
            Công bố: {STATUS_LABELS[displayedStatus] ?? displayedStatus}{state?.featureVersion ? ` · v${state.featureVersion}` : ''}
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

          {submittedObservation ? (
            /* Post-submission Thank You Box with Edit/Delete options */
            <View style={styles.submittedBox}>
              <View style={styles.submittedHeader}>
                <View style={styles.submittedIconCircle}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#007D78" />
                </View>
                <View style={styles.submittedCopy}>
                  <Text style={styles.submittedTitle}>Cảm ơn bạn đã hỗ trợ xác thực!</Text>
                  <Text style={styles.submittedSubtitle}>
                    {isFinalized
                      ? 'Quan sát đã được lưu hoàn toàn vào hệ thống cộng đồng.'
                      : `Hệ thống đã ghi nhận quan sát. Bạn có thể chỉnh sửa trong vòng ~${remainingMinutes} phút.`}
                  </Text>
                </View>
              </View>

              <View style={styles.submittedDetailCard}>
                <Text style={styles.submittedDetailHeading}>Nội dung bạn đã gửi:</Text>
                <View style={styles.submittedDetailRow}>
                  <MaterialCommunityIcons
                    name={submittedObservation.voteType === 'StillAccurate' ? 'check' : 'alert-circle-outline'}
                    size={16}
                    color={submittedObservation.voteType === 'StillAccurate' ? '#007D78' : '#B45309'}
                  />
                  <Text style={styles.submittedDetailValue}>
                    {submittedObservation.voteType === 'StillAccurate'
                      ? 'Xác nhận vẫn chính xác theo thực tế'
                      : `Báo thay đổi thành: ${STATUS_LABELS[submittedObservation.proposedStatus ?? 'Unknown']}`}
                  </Text>
                </View>
                {submittedObservation.comment ? (
                  <Text style={styles.submittedCommentText}>
                    "{submittedObservation.comment}"
                  </Text>
                ) : null}
              </View>

              {!isFinalized ? (
                <View style={styles.submittedButtonsRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={handleEditObservation}
                    style={styles.editBtn}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={15} color="#007D78" />
                    <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={handleDeleteObservation}
                    style={styles.deleteBtn}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={15} color="#DC2626" />
                    <Text style={styles.deleteBtnText}>Hủy quan sát</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.finalizedBadge}>
                  <MaterialCommunityIcons name="lock-outline" size={13} color="#64748B" />
                  <Text style={styles.finalizedBadgeText}>Đã lưu hoàn toàn · Không thể chỉnh sửa</Text>
                </View>
              )}
            </View>
          ) : (
            /* Pre-submission Question & 2 Action Buttons */
            <>
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
                    if (onRequestReport) {
                      onRequestReport(feature);
                    } else {
                      setShowChanges((visible) => !visible);
                      setSelectedStatus(null);
                    }
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
          )}
        </>
      ) : null}

      {message ? <Text style={styles.messageText}>{message}</Text> : null}
    </View>
  );
}

interface FeatureCommunitySectionProps {
  locationId: string;
  features: CommunityFeatureInput[];
  hideHeader?: boolean;
  onRequestReport?: (feature: CommunityFeatureInput, editingData?: SubmittedObservation['reportData']) => void;
  refreshTrigger?: number;
}

export function FeatureCommunitySection({
  locationId,
  features,
  hideHeader,
  onRequestReport,
  refreshTrigger,
}: FeatureCommunitySectionProps) {
  if (features.length === 0) return null;

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <>
          <Text style={styles.sectionTitle}>Giúp xác nhận thông tin tiếp cận</Text>
          <Text style={styles.sectionDescription}>
            Chọn từng hạng mục bạn đã quan sát. Một người chỉ có một quan sát hiệu lực trên mỗi phiên bản dữ liệu.
          </Text>
        </>
      )}
      {features.map((feature) => (
        <FeatureCard
          key={feature.featureType}
          locationId={locationId}
          feature={feature}
          onRequestReport={onRequestReport}
          refreshTrigger={refreshTrigger}
        />
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
  submittedBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  submittedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 10,
  },
  submittedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  submittedCopy: {
    flex: 1,
  },
  submittedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  submittedSubtitle: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  submittedDetailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  submittedDetailHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  submittedDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submittedDetailValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  submittedCommentText: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 4,
  },
  submittedButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007D78',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  finalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  finalizedBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
