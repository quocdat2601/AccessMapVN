import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { CaptureMode } from '../types';
import { styles } from './CaptureControls.styles';

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
      {/* Segment Mode Switch */}
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

      {/* Subtle Hint */}
      <Text style={styles.hint} numberOfLines={1}>
        {isRecording
          ? recordingSeconds < 5
            ? `🔴 Đang quay 00:0${recordingSeconds} / 00:10 (Tối thiểu 5s)`
            : `🟢 Đã đạt chuẩn: ${formatDuration(recordingSeconds)} / 00:10 (Chạm để lưu)`
          : isVideo
            ? 'Quay 5–10 giây, giữ máy ổn định'
            : 'Chụp rõ ram dốc và lối vào'}
      </Text>

      {/* Shutter & Actions Row */}
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
          <View
            style={[
              styles.captureInner,
              isVideo && styles.captureInnerVideo,
              isRecording && styles.stopInner,
            ]}
          />
        </Pressable>

        <View style={styles.sideAction}>
          <Pressable
            style={({ pressed }) => [
              styles.flipButton,
              pressed && styles.pressed,
              isRecording && styles.disabled,
            ]}
            onPress={onFlip}
            disabled={isRecording}
            accessibilityRole="button"
            accessibilityLabel="Đổi camera"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="camera-flip-outline" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
