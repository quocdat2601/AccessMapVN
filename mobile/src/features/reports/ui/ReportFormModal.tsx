import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth';
import type {
  AccessibilityFeatureType,
  CommunityFeatureInput,
  CommunityFeatureState,
} from '@/features/community';
import { fetchCommunityState } from '@/features/community';
import { runAiPreScan } from '@/features/contribution/api/aiPreScanService';
import { uploadMediaToBackend } from '@/features/contribution/api/mediaUploadService';
import { ApiError } from '@/shared/api/client';
import { createReport } from '../api/reportsApi';
import {
  clearReportDraft,
  getActiveUploadPromise,
  getReportDraft,
  setActiveUploadPromise,
  setReportDraft,
  type ReportEvidenceDraft,
} from '../model/reportDraftStore';
import type { ReportReason, ReportSummary } from '../model/types';

type FormReasonType = 'Changed' | 'Blocked' | 'Incorrect' | 'Other';

interface ReasonOption {
  type: FormReasonType;
  title: string;
  sub: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  apiReason: ReportReason;
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    type: 'Changed',
    title: 'Đã thay đổi',
    sub: 'Khác biệt so với hiện tại',
    icon: 'refresh',
    apiReason: 'OutdatedInformation',
  },
  {
    type: 'Blocked',
    title: 'Bị cản trở',
    sub: 'Rào chắn, thi công',
    icon: 'cancel',
    apiReason: 'IncorrectFeature',
  },
  {
    type: 'Incorrect',
    title: 'Sai lệch',
    sub: 'Thông tin không đúng',
    icon: 'alert-outline',
    apiReason: 'IncorrectFeature',
  },
  {
    type: 'Other',
    title: 'Khác',
    sub: 'Góp ý bổ sung khác',
    icon: 'dots-horizontal',
    apiReason: 'Other',
  },
];

interface FeatureItemOption {
  id: string;
  label: string;
  backendFeatureType?: AccessibilityFeatureType;
}

const FEATURE_OPTIONS: FeatureItemOption[] = [
  { id: 'ramp', label: 'Ram dốc', backendFeatureType: 'Ramp' },
  { id: 'elevator', label: 'Thang máy', backendFeatureType: 'Elevator' },
  { id: 'auto_door', label: 'Cửa ra vào', backendFeatureType: 'EntranceDoor' },
  { id: 'flat_entrance', label: 'Lối vào phẳng', backendFeatureType: 'EntranceDoor' },
  { id: 'accessible_toilet', label: 'WC tiếp cận', backendFeatureType: 'AccessibleRestroom' },
  { id: 'tactile_paving', label: 'Gạch dẫn hướng', backendFeatureType: 'TactilePaving' },
  { id: 'priority_parking', label: 'Bãi đỗ xe ưu tiên' },
];

export interface ReportFormData {
  reason: FormReasonType;
  description: string;
  featureIds: string[];
  imageUri?: string;
}

interface ReportFormModalProps {
  visible: boolean;
  locationId: string;
  locationName: string;
  features: CommunityFeatureInput[];
  initialFeatureType?: AccessibilityFeatureType;
  initialFormData?: Partial<ReportFormData>;
  onClose(): void;
  onCreated?(
    report: ReportSummary,
    primaryFeatureType?: AccessibilityFeatureType,
    formData?: ReportFormData
  ): void;
}

function resolveFeatureIds(type?: AccessibilityFeatureType): string[] {
  switch (type) {
    case 'Ramp':
      return ['ramp'];
    case 'Elevator':
      return ['elevator'];
    case 'EntranceDoor':
      return ['auto_door'];
    case 'AccessibleRestroom':
      return ['accessible_toilet'];
    case 'TactilePaving':
      return ['tactile_paving'];
    default:
      return ['ramp'];
  }
}

export function ReportFormModal({
  visible,
  locationId,
  locationName,
  features,
  initialFeatureType,
  initialFormData,
  onClose,
  onCreated,
}: ReportFormModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<FormReasonType>('Changed');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>(['ramp']);
  const [description, setDescription] = useState('');
  const [featureStates, setFeatureStates] = useState<Partial<Record<AccessibilityFeatureType, CommunityFeatureState>>>({});
  const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [evidence, setEvidence] = useState<ReportEvidenceDraft | null>(null);
  const [pickedUploadedUrl, setPickedUploadedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEvidenceLowConfidence = Boolean(
    evidence && evidence.aiScore != null && evidence.aiScore < 60
  );

  useEffect(() => {
    if (!visible) return;

    const draft = getReportDraft();
    if (draft && (draft.locationId === locationId || !draft.locationId)) {
      setSelectedReason(draft.reason ?? 'Changed');
      if (draft.featureIds && draft.featureIds.length > 0) {
        setSelectedFeatureIds(draft.featureIds);
      } else {
        setSelectedFeatureIds(resolveFeatureIds(initialFeatureType));
      }
      setDescription(draft.description ?? '');
      if (draft.evidence) {
        setEvidence(draft.evidence);
      }
    } else {
      if (initialFormData?.reason) {
        setSelectedReason(initialFormData.reason);
      } else {
        setSelectedReason('Changed');
      }

      if (initialFormData?.featureIds && initialFormData.featureIds.length > 0) {
        setSelectedFeatureIds(initialFormData.featureIds);
      } else {
        setSelectedFeatureIds(resolveFeatureIds(initialFeatureType));
      }

      setDescription(initialFormData?.description ?? '');
      setPickedAsset(initialFormData?.imageUri ? ({ uri: initialFormData.imageUri } as ImagePicker.ImagePickerAsset) : null);
    }
    setErrorMessage(null);
  }, [visible, locationId, initialFeatureType, initialFormData]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    void Promise.all(
      features.map(async (feature) => {
        try {
          return await fetchCommunityState(locationId, feature.featureType);
        } catch {
          return null;
        }
      })
    ).then((states) => {
      if (!mounted) return;
      const next: Partial<Record<AccessibilityFeatureType, CommunityFeatureState>> = {};
      states.forEach((state) => {
        if (state) next[state.featureType] = state;
      });
      setFeatureStates(next);
    });
    return () => {
      mounted = false;
    };
  }, [features, locationId, visible]);

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((item) => item !== id) : prev) : [...prev, id]
    );
  };

  const handlePickImage = async () => {
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Cần cấp quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setIsAnalyzingImage(true);
      try {
        const scanResult = await runAiPreScan(asset.uri);
        const detected = scanResult.features.filter((f) => f.detected && f.confidence > 0);
        const maxConf = detected.length > 0 ? Math.max(...detected.map((f) => f.confidence)) : 0;
        const aiScore = Math.round(maxConf * 100);

        if (detected.length === 0 || aiScore < 60) {
          Alert.alert(
            'Độ tin cậy quá thấp',
            `Ảnh được chọn không phát hiện rõ đặc điểm tiếp cận nào hoặc độ tin cậy AI quá thấp (${aiScore}% < 60%).\n\nBáo cáo mâu thuẫn yêu cầu minh chứng đạt tối thiểu 60% độ tin cậy AI. Vui lòng chọn ảnh chụp rõ góc lối vào, ram dốc hoặc bậc thang.`,
            [{ text: 'Đồng ý', style: 'default' }]
          );
          setPickedAsset(null);
          setEvidence(null);
          return;
        }

        const evidenceObj: ReportEvidenceDraft = {
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          aiScore,
          confidenceScore: maxConf,
          featureTags: detected.map((f) => f.label),
          aiSummary: `Ảnh từ thư viện: ${scanResult.summary}\nĐiểm tin cậy AI: ${aiScore}/100`,
          uploadedUrl: undefined,
          isUploading: true,
        };
        setEvidence(evidenceObj);
        setPickedAsset(null);

        // Pre-upload in background immediately
        if (asset.uri && !asset.uri.startsWith('http')) {
          const promise = uploadMediaToBackend(asset.uri, asset.base64 ?? undefined);
          setActiveUploadPromise(promise);
          promise
            .then((url) => {
              setEvidence((prev) => (prev ? { ...prev, uploadedUrl: url, isUploading: false } : null));
            })
            .catch(() => {
              setEvidence((prev) => (prev ? { ...prev, isUploading: false } : null));
            });
        }
      } catch (err) {
        console.warn('AI analysis failed for picked image', err);
        setErrorMessage('Không thể phân tích ảnh đã chọn. Vui lòng thử lại.');
      } finally {
        setIsAnalyzingImage(false);
      }
    }
  };

  const handleOpenAppCamera = (targetMode: 'photo' | 'video' = 'photo') => {
    setReportDraft({
      locationId,
      locationName,
      reason: selectedReason,
      description,
      featureIds: selectedFeatureIds,
      evidence,
      isOpen: false,
    });
    onClose();
    router.push({
      pathname: '/contribute/camera',
      params: {
        flow: 'report',
        locationId,
        locationName,
      },
    } as never);
  };

  const resetAndClose = () => {
    setSelectedReason('Changed');
    setSelectedFeatureIds(['ramp']);
    setDescription('');
    setPickedAsset(null);
    setPickedUploadedUrl(null);
    setEvidence(null);
    clearReportDraft();
    setActiveUploadPromise(null);
    setErrorMessage(null);
    onClose();
  };

  const submit = async () => {
    if (!user) {
      setErrorMessage('Bạn cần đăng nhập để gửi báo cáo.');
      return;
    }
    if (description.trim().length < 5) {
      setErrorMessage('Vui lòng nhập mô tả chi tiết quan sát (tối thiểu 5 ký tự).');
      return;
    }
    if (isEvidenceLowConfidence) {
      setErrorMessage('Ảnh minh chứng có độ tin cậy AI quá thấp (< 60%). Vui lòng bấm Chụp lại hoặc gỡ bỏ ảnh để tiếp tục.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const activeReasonOpt = REASON_OPTIONS.find((r) => r.type === selectedReason)!;
    const selectedLabels = FEATURE_OPTIONS.filter((f) => selectedFeatureIds.includes(f.id)).map(
      (f) => f.label
    );
    const primaryFeatureOpt = FEATURE_OPTIONS.find(
      (f) => selectedFeatureIds.includes(f.id) && f.backendFeatureType
    );
    const primaryFeatureType = primaryFeatureOpt?.backendFeatureType;

    const fullDescription =
      selectedLabels.length > 0
        ? `[Hạng mục: ${selectedLabels.join(', ')}]\n${description.trim()}`
        : description.trim();

    let uploadedMediaUrl: string | undefined = undefined;
    let aiAnalysisJson: string | undefined = undefined;

    if (evidence) {
      if (evidence.uploadedUrl) {
        uploadedMediaUrl = evidence.uploadedUrl;
      } else if (evidence.uri.startsWith('http')) {
        uploadedMediaUrl = evidence.uri;
      } else {
        const inFlight = getActiveUploadPromise();
        if (inFlight) {
          try {
            uploadedMediaUrl = await inFlight;
          } catch {
            try {
              uploadedMediaUrl = await uploadMediaToBackend(evidence.uri, evidence.base64);
            } catch (e) {
              console.warn('Upload fallback failed', e);
            }
          }
        } else {
          try {
            uploadedMediaUrl = await uploadMediaToBackend(evidence.uri, evidence.base64);
          } catch (uploadErr) {
            console.warn('Failed to upload evidence to server', uploadErr);
          }
        }
      }
      aiAnalysisJson =
        evidence.aiSummary ||
        (evidence.aiScore != null
          ? `Điểm tin cậy AI: ${evidence.aiScore}/100\nĐặc tính: ${evidence.featureTags.join(', ')}`
          : 'Minh chứng chụp từ Camera AI');
    } else if (pickedAsset) {
      if (pickedUploadedUrl) {
        uploadedMediaUrl = pickedUploadedUrl;
      } else if (pickedAsset.uri.startsWith('http')) {
        uploadedMediaUrl = pickedAsset.uri;
      } else {
        const inFlight = getActiveUploadPromise();
        if (inFlight) {
          try {
            uploadedMediaUrl = await inFlight;
          } catch {
            try {
              uploadedMediaUrl = await uploadMediaToBackend(pickedAsset.uri, pickedAsset.base64 ?? undefined);
            } catch (e) {
              console.warn('Upload fallback failed', e);
            }
          }
        } else {
          try {
            uploadedMediaUrl = await uploadMediaToBackend(pickedAsset.uri, pickedAsset.base64 ?? undefined);
          } catch (uploadErr) {
            console.warn('Failed to upload picked asset to server', uploadErr);
          }
        }
      }
      aiAnalysisJson = 'Ảnh minh chứng đính kèm từ thư viện ảnh';
    }

    try {
      const state = primaryFeatureType ? featureStates[primaryFeatureType] : undefined;
      const report = await createReport(
        locationId,
        {
          reason: activeReasonOpt.apiReason,
          description: fullDescription,
          featureType: primaryFeatureType,
          observedFeatureVersion: state?.featureVersion,
          evidenceMediaUrl: uploadedMediaUrl,
          aiAnalysisJson,
        },
        user.id
      );

      clearReportDraft();
      onCreated?.(report, primaryFeatureType, {
        reason: selectedReason,
        description: description.trim(),
        featureIds: selectedFeatureIds,
        imageUri: uploadedMediaUrl || evidence?.uri || pickedAsset?.uri,
      });
      resetAndClose();

      Alert.alert(
        'Đã gửi báo cáo',
        evidence
          ? 'Báo cáo mâu thuẫn kèm minh chứng ảnh & phân tích AI đã được ghi nhận thành công (+30 EXP).'
          : 'Báo cáo đã được ghi nhận. Quản trị viên sẽ sớm kiểm tra và xác thực.',
        [{ text: 'Đóng', style: 'default' }]
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setErrorMessage('Bạn đã đạt giới hạn báo cáo cho địa điểm này hôm nay.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Chưa gửi được báo cáo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={resetAndClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Sheet Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Location pill + Close button */}
          <View style={styles.topRow}>
            <View style={styles.locationPill}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color="#006874" />
              <Text numberOfLines={1} style={styles.locationPillText}>
                {locationName}
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeButton} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Main Title */}
          <Text style={styles.mainTitle}>Báo thay đổi thông tin tiếp cận</Text>
          <Text style={styles.mainSub}>Cho biết điều gì tại địa điểm này không còn chính xác.</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. Bạn muốn báo cáo điều gì? */}
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepTitle}>1. Bạn muốn báo cáo điều gì?</Text>
              <Text style={styles.stepHint}>Chọn 1 lý do</Text>
            </View>
            <View style={styles.reasonGrid}>
              {REASON_OPTIONS.map((item) => {
                const isSelected = selectedReason === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.reasonCard, isSelected && styles.reasonCardSelected]}
                    onPress={() => setSelectedReason(item.type)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reasonCardTop}>
                      <Text style={[styles.reasonCardTitle, isSelected && styles.reasonCardTitleSelected]}>
                        {item.title}
                      </Text>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={17}
                        color={isSelected ? '#006874' : item.type === 'Blocked' ? '#DC2626' : item.type === 'Incorrect' ? '#F59E0B' : '#64748B'}
                      />
                    </View>
                    <Text style={styles.reasonCardSub}>{item.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Hạng mục bị ảnh hưởng? */}
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepTitle}>2. Hạng mục bị ảnh hưởng?</Text>
              <Text style={styles.stepHint}>Chọn nhiều mục</Text>
            </View>
            <View style={styles.featureChipsRow}>
              {FEATURE_OPTIONS.map((f) => {
                const isSelected = selectedFeatureIds.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.featureChip, isSelected && styles.featureChipSelected]}
                    onPress={() => toggleFeature(f.id)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                    )}
                    <Text style={[styles.featureChipText, isSelected && styles.featureChipTextSelected]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Mô tả chi tiết quan sát */}
            <Text style={styles.stepTitle}>3. Mô tả chi tiết quan sát</Text>
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Nhập mô tả điều bạn quan sát thấy..."
              placeholderTextColor="#94A3B8"
              style={styles.descInput}
              textAlignVertical="top"
              value={description}
            />

            {/* 4. Thêm bằng chứng */}
            <View style={styles.stepHeaderRow}>
              <Text style={styles.stepTitle}>4. Thêm bằng chứng</Text>
              <View style={styles.rewardBadge}>
                <MaterialCommunityIcons name="star-circle" size={13} color="#007D78" />
                <Text style={styles.rewardBadgeText}>+30 điểm thưởng</Text>
              </View>
            </View>
            <View style={styles.evidenceBtnRow}>
              <TouchableOpacity
                style={styles.evidenceActionBtn}
                onPress={() => handleOpenAppCamera('photo')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="camera-outline" size={16} color="#1E293B" />
                <Text style={styles.evidenceActionText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.evidenceActionBtn}
                onPress={() => handleOpenAppCamera('video')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="video-outline" size={16} color="#1E293B" />
                <Text style={styles.evidenceActionText}>Quay video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.evidenceActionBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="image-outline" size={16} color="#1E293B" />
                <Text style={styles.evidenceActionText}>Thư viện</Text>
              </TouchableOpacity>
            </View>
            {isAnalyzingImage && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#f0fdfa', borderRadius: 8, marginBottom: 12 }}>
                <ActivityIndicator size="small" color="#006874" />
                <Text style={{ fontSize: 13, color: '#006874', fontWeight: '500' }}>AI đang phân tích và kiểm tra độ tin cậy ảnh...</Text>
              </View>
            )}

            {/* Attached AI Evidence or Picked Asset */}
            {evidence ? (
              <View style={[styles.aiEvidenceCard, isEvidenceLowConfidence && { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }]}>
                <View style={styles.aiEvidenceHeader}>
                  <View style={styles.aiBadgeGroup}>
                    {isEvidenceLowConfidence ? (
                      <View style={[styles.aiScoreBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                        <MaterialCommunityIcons name="alert-circle" size={14} color="#dc2626" />
                        <Text style={[styles.aiScoreText, { color: '#dc2626' }]}>
                          Độ tin cậy thấp: {evidence.aiScore ?? 0}/100 {'(< 60%)'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.aiScoreBadge}>
                        <MaterialCommunityIcons name="robot" size={14} color="#0D9488" />
                        <Text style={styles.aiScoreText}>
                          AI Duyệt: {evidence.aiScore ?? 90}/100
                        </Text>
                      </View>
                    )}
                    {evidence.isUploading ? (
                      <View style={styles.uploadingBadge}>
                        <ActivityIndicator size="small" color="#0284C7" style={{ transform: [{ scale: 0.7 }] }} />
                        <Text style={styles.uploadingText}>Đang tải lên...</Text>
                      </View>
                    ) : isEvidenceLowConfidence ? (
                      <View style={[styles.readyBadge, { backgroundColor: '#fee2e2' }]}>
                        <MaterialCommunityIcons name="close-circle-outline" size={13} color="#dc2626" />
                        <Text style={[styles.readyText, { color: '#dc2626' }]}>Không hợp lệ</Text>
                      </View>
                    ) : (
                      <View style={styles.readyBadge}>
                        <MaterialCommunityIcons name="cloud-check-outline" size={13} color="#059669" />
                        <Text style={styles.readyText}>Sẵn sàng</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.aiEvidenceHeaderActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenAppCamera('photo')}
                      style={styles.retakeBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="camera-retake-outline" size={13} color="#006874" />
                      <Text style={styles.retakeBtnText}>Chụp lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEvidence(null)}
                      style={styles.removeEvidenceBtn}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {isEvidenceLowConfidence && (
                  <View style={{ marginTop: 8, marginHorizontal: 12, padding: 8, backgroundColor: '#ffffff', borderRadius: 6, borderWidth: 1, borderColor: '#fca5a5', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="alert-octagon" size={16} color="#dc2626" />
                    <Text style={{ fontSize: 12, color: '#dc2626', flex: 1, fontWeight: '500' }}>
                      Ảnh minh chứng có độ tin cậy AI thấp {'(< 60%)'}. Bạn cần bấm "Chụp lại" ảnh rõ nét hơn hoặc gỡ ảnh trước khi gửi báo cáo.
                    </Text>
                  </View>
                )}

                <View style={styles.aiEvidenceBody}>
                  <Image source={{ uri: evidence.uri }} style={styles.aiEvidenceThumb} resizeMode="cover" />
                  <View style={styles.aiEvidenceInfo}>
                    <Text style={styles.aiEvidenceTagTitle}>Đặc tính AI ghi nhận:</Text>
                    <View style={styles.aiEvidenceTagsRow}>
                      {evidence.featureTags && evidence.featureTags.length > 0 ? (
                        evidence.featureTags.map((tag) => (
                          <View key={tag} style={styles.aiTagPill}>
                            <Text style={styles.aiTagPillText}>{tag}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.aiEmptyTagText}>Chung</Text>
                      )}
                    </View>
                    {evidence.aiSummary ? (
                      <Text numberOfLines={3} style={styles.aiSummarySnippet}>
                        {evidence.aiSummary}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : pickedAsset ? (
              <View style={styles.attachmentBox}>
                <View style={styles.attachmentThumbWrapper}>
                  <Image source={{ uri: pickedAsset.uri }} style={styles.attachmentThumb} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeAttachBtn}
                    onPress={() => setPickedAsset(null)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons name="close" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.attachmentCopy}>
                  <View style={styles.attachPill}>
                    <Text style={styles.attachPillText}>1 ảnh đã đính kèm</Text>
                  </View>
                  <Text style={styles.attachHint}>Ảnh thực tế giúp cộng đồng kiểm chứng nhanh hơn.</Text>
                </View>
              </View>
            ) : null}

            {/* Moderator verification note card */}
            <View style={styles.moderatorNoteCard}>
              <MaterialCommunityIcons name="shield-check-outline" size={17} color="#006874" />
              <Text style={styles.moderatorNoteText}>
                Báo cáo sẽ được điều phối viên xác minh trước khi cập nhật bản đồ tiếp cận chung.
              </Text>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </ScrollView>

          {/* Bottom Actions: Hủy + Gửi báo cáo */}
          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={resetAndClose} style={styles.cancelBtn} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={submitting || isEvidenceLowConfidence || isAnalyzingImage}
              onPress={() => void submit()}
              style={[styles.submitBtn, (submitting || isEvidenceLowConfidence || isAnalyzingImage) && styles.disabled]}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Gửi báo cáo</Text>
                  <MaterialCommunityIcons name="send-outline" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8FAF6',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '85%',
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006874',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  mainSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
    marginBottom: 6,
  },
  stepHint: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  reasonCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
  },
  reasonCardSelected: {
    borderColor: '#006874',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
  },
  reasonCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reasonCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  reasonCardTitleSelected: {
    color: '#006874',
    fontWeight: '800',
  },
  reasonCardSub: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  featureChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureChipSelected: {
    backgroundColor: '#006874',
  },
  featureChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  featureChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  descInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 70,
    padding: 10,
    fontSize: 12.5,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 10,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#006874',
  },
  evidenceBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  evidenceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  evidenceActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 14,
    padding: 10,
    gap: 10,
    marginBottom: 10,
  },
  attachmentThumbWrapper: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
  },
  removeAttachBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCopy: {
    flex: 1,
  },
  attachPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 3,
  },
  attachPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  attachHint: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },
  moderatorNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  moderatorNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  cancelBtn: {
    width: 72,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#006874',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.55,
  },
  aiEvidenceCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 12,
    marginBottom: 12,
  },
  aiEvidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  uploadingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0284C7',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  readyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  aiScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#5EEAD4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  aiScoreText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  aiEvidenceHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  retakeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  removeEvidenceBtn: {
    padding: 4,
  },
  aiEvidenceBody: {
    flexDirection: 'row',
    gap: 12,
  },
  aiEvidenceThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  aiEvidenceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  aiEvidenceTagTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  aiEvidenceTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  aiTagPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiTagPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F766E',
  },
  aiEmptyTagText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  aiSummarySnippet: {
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 14,
    marginTop: 2,
  },
});