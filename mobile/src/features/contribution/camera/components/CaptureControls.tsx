import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaptureMode } from '../types';

interface CaptureControlsProps {
  mode: CaptureMode;
  isRecording: boolean;
  recordingSeconds: number;
  disabled: boolean;
  onModeChange: (mode: CaptureMode) => void;
  onCapture: () => void;
  onFlip: () => void;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function CaptureControls({
  mode,
  isRecording,
  recordingSeconds,
  disabled,
  onModeChange,
  onCapture,
  onFlip,
}: CaptureControlsProps) {
  const isVideo = mode === 'video';
  return (
    <View style={styles.container}>
      <View style={styles.modeSwitch}>
        {(['photo', 'video'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.modeOption, mode === option && styles.modeOptionActive]}
            onPress={() => onModeChange(option)}
            disabled={isRecording}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === option, disabled: isRecording }}
          >
            <Text style={[styles.modeText, mode === option && styles.modeTextActive]}>
              {option === 'photo' ? 'ẢNH' : 'VIDEO'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        {isRecording
          ? `Đang quay ${formatDuration(recordingSeconds)} · Chạm để dừng`
          : isVideo
            ? 'Quay video 5–10 giây, rõ nét và ổn định.'
            : 'Chụp ảnh rõ nét tại lối vào hoặc điểm tiếp cận.'}
      </Text>

      <View style={styles.actionRow}>
        <View style={styles.sideSpacer} />
        <Pressable
          style={({ pressed }) => [
            styles.captureOuter,
            isVideo && styles.captureOuterVideo,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
          onPress={onCapture}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Dừng quay' : isVideo ? 'Bắt đầu quay video' : 'Chụp ảnh'}
        >
          <View style={[
            styles.captureInner,
            isVideo && styles.captureInnerVideo,
            isRecording && styles.stopInner,
          ]} />
        </Pressable>
        <View style={styles.sideAction}>
          <Pressable
            style={({ pressed }) => [styles.flipButton, pressed && styles.pressed, isRecording && styles.disabled]}
            onPress={onFlip}
            disabled={isRecording}
            accessibilityRole="button"
            accessibilityLabel="Đổi camera"
          >
            <MaterialCommunityIcons name="camera-flip-outline" size={29} color="#fff" />
          </Pressable>
          <Text style={styles.flipLabel}>Đổi camera</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 15, alignItems: 'center' },
  modeSwitch: {
    width: 250,
    height: 52,
    borderRadius: 26,
    padding: 5,
    flexDirection: 'row',
    backgroundColor: 'rgba(10,12,12,0.84)',
  },
  modeOption: { flex: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modeOptionActive: { backgroundColor: '#8ee9dc' },
  modeText: { color: '#eee', fontSize: 15, fontWeight: '700' },
  modeTextActive: { color: '#112424' },
  hint: {
    minHeight: 42,
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 5,
  },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideSpacer: { width: 78 },
  captureOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    borderColor: '#fff',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  captureOuterVideo: { borderColor: '#fff' },
  captureInner: { width: '100%', height: '100%', borderRadius: 36, backgroundColor: '#fff' },
  captureInnerVideo: { backgroundColor: '#f24747' },
  stopInner: { width: 34, height: 34, borderRadius: 7 },
  sideAction: { width: 78, alignItems: 'center', gap: 5 },
  flipButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(55,57,57,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipLabel: { color: '#fff', fontSize: 11.5, fontWeight: '600' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
});
