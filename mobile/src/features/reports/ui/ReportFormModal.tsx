import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ApiError } from '@/shared/api/client';
import { createReport } from '../api/reportsApi';
import type { ReportReason, ReportSummary } from '../model/types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'IncorrectFeature', label: 'Tiện ích không đúng' },
  { value: 'MissingFeature', label: 'Thiếu tiện ích' },
  { value: 'OutdatedInformation', label: 'Thông tin đã cũ' },
  { value: 'WrongAddressOrPin', label: 'Sai địa chỉ hoặc ghim' },
  { value: 'Other', label: 'Vấn đề khác' },
];

interface ReportFormModalProps {
  visible: boolean;
  locationId: string;
  locationName: string;
  features: CommunityFeatureInput[];
  onClose(): void;
  onCreated?(report: ReportSummary): void;
}

export function ReportFormModal({
  visible,
  locationId,
  locationName,
  features,
  onClose,
  onCreated,
}: ReportFormModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('IncorrectFeature');
  const [featureType, setFeatureType] = useState<AccessibilityFeatureType | null>(null);
  const [featureStates, setFeatureStates] = useState<Partial<Record<AccessibilityFeatureType, CommunityFeatureState>>>({});
  const [description, setDescription] = useState('');
  const [proposedAddress, setProposedAddress] = useState('');
  const [proposedLatitude, setProposedLatitude] = useState('');
  const [proposedLongitude, setProposedLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFeatureReason = reason !== 'WrongAddressOrPin' && reason !== 'Other';

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

  const resetAndClose = () => {
    setReason('IncorrectFeature');
    setFeatureType(null);
    setDescription('');
    setProposedAddress('');
    setProposedLatitude('');
    setProposedLongitude('');
    setErrorMessage(null);
    onClose();
  };

  const parseCoordinate = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const submit = async () => {
    if (!user) {
      setErrorMessage('Bạn cần đăng nhập để gửi báo cáo.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMessage('Mô tả cần ít nhất 10 ký tự để nhóm kiểm duyệt có đủ thông tin.');
      return;
    }
    if (isFeatureReason && !featureType) {
      setErrorMessage('Chọn tiện ích liên quan đến báo cáo.');
      return;
    }
    if (reason === 'WrongAddressOrPin' && !proposedAddress.trim() && (!proposedLatitude || !proposedLongitude)) {
      setErrorMessage('Nhập địa chỉ đúng hoặc tọa độ ghim đề xuất.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const state = featureType ? featureStates[featureType] : undefined;
      const report = await createReport(
        locationId,
        {
          reason,
          description: description.trim(),
          featureType: isFeatureReason ? featureType ?? undefined : undefined,
          observedFeatureVersion: isFeatureReason ? state?.featureVersion : undefined,
          proposedAddress: reason === 'WrongAddressOrPin' ? proposedAddress.trim() || undefined : undefined,
          proposedPosition:
            reason === 'WrongAddressOrPin' &&
            parseCoordinate(proposedLatitude) !== undefined &&
            parseCoordinate(proposedLongitude) !== undefined
              ? {
                  latitude: parseCoordinate(proposedLatitude)!,
                  longitude: parseCoordinate(proposedLongitude)!,
                }
              : undefined,
        },
        user.id
      );
      onCreated?.(report);
      resetAndClose();
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Báo thông tin chưa chính xác</Text>
              <Text numberOfLines={1} style={styles.locationName}>{locationName}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Đóng báo cáo" onPress={resetAndClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Loại vấn đề</Text>
            <View style={styles.chips}>
              {REASONS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    setReason(item.value);
                    setErrorMessage(null);
                  }}
                  style={[styles.chip, reason === item.value && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, reason === item.value && styles.chipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isFeatureReason ? (
              <>
                <Text style={styles.label}>Tiện ích liên quan</Text>
                <View style={styles.chips}>
                  {features.map((feature) => (
                    <TouchableOpacity
                      key={feature.featureType}
                      onPress={() => setFeatureType(feature.featureType)}
                      style={[styles.chip, featureType === feature.featureType && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, featureType === feature.featureType && styles.chipTextSelected]}>{feature.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {reason === 'WrongAddressOrPin' ? (
              <View>
                <Text style={styles.label}>Địa chỉ đúng đề xuất</Text>
                <TextInput onChangeText={setProposedAddress} placeholder="Số nhà, đường, phường/xã..." style={styles.input} value={proposedAddress} />
                <View style={styles.coordinateRow}>
                  <TextInput keyboardType="decimal-pad" onChangeText={setProposedLatitude} placeholder="Vĩ độ" style={[styles.input, styles.coordinate]} value={proposedLatitude} />
                  <TextInput keyboardType="decimal-pad" onChangeText={setProposedLongitude} placeholder="Kinh độ" style={[styles.input, styles.coordinate]} value={proposedLongitude} />
                </View>
              </View>
            ) : null}

            <Text style={styles.label}>Mô tả quan sát</Text>
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder="Mô tả điều bạn thấy; báo cáo này không tự thay đổi dữ liệu công bố."
              style={[styles.input, styles.descriptionInput]}
              textAlignVertical="top"
              value={description}
            />
            <Text style={styles.privacyNote}>Nội dung báo cáo và bằng chứng chỉ dành cho người báo cáo và nhóm kiểm duyệt.</Text>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </ScrollView>

          <TouchableOpacity disabled={submitting} onPress={() => void submit()} style={[styles.submitButton, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Gửi báo cáo</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.45)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '91%', padding: 18, paddingBottom: 28 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  headerText: { flex: 1 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  locationName: { color: '#64748B', fontSize: 12.5, marginTop: 3 },
  closeButton: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  chipSelected: { backgroundColor: '#ECFEFF', borderColor: '#0891B2' },
  chipText: { color: '#475569', fontSize: 12 },
  chipTextSelected: { color: '#0E7490', fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 11, borderWidth: 1, color: '#0F172A', minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
  descriptionInput: { minHeight: 105 },
  coordinateRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  coordinate: { flex: 1 },
  privacyNote: { color: '#64748B', fontSize: 11.5, lineHeight: 17, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 12, lineHeight: 17, marginTop: 9 },
  submitButton: { alignItems: 'center', backgroundColor: '#006874', borderRadius: 13, justifyContent: 'center', marginTop: 14, minHeight: 50 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
