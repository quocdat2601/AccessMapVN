import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraHeader } from '../components/CameraHeader';
import { CameraStatusOverlay } from '../components/CameraStatusOverlay';
import { CaptureControls } from '../components/CaptureControls';
import { MediaPreview } from '../components/MediaPreview';
import { PermissionState } from '../components/PermissionState';
import { addContributionRecord, setPendingContributionMedia } from '../pendingContributionStore';
import { CapturedContributionMedia, CaptureMode, GpsSnapshot } from '../types';
import { styles } from './CameraContributionScreen.styles';

type CameraType = 'back' | 'front';

let ExpoCamera: any = null;
try {
  ExpoCamera = require('expo-camera');
} catch {
  ExpoCamera = null;
}

function firstParam(value: string | string[] | undefined, fallback: string) {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function createMediaId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ActiveCameraContributionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ locationId?: string | string[]; locationName?: string | string[] }>();
  const locationId = firstParam(params.locationId, 'saigon-centre');
  const locationName = firstParam(params.locationName, 'Saigon Centre (Takashimaya)');
  const cameraRef = useRef<any>(null);
  const requestedInitialPermissions = useRef(false);
  const recordingStartedAt = useRef<number | null>(null);
  const mounted = useRef(true);

  const [cameraPermission, requestCameraPermission, getCameraPermission] = ExpoCamera.useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission, getMicrophonePermission] = ExpoCamera.useMicrophonePermissions();
  const [locationPermission, requestLocationPermission, getLocationPermission] = Location.useForegroundPermissions();

  const [mode, setMode] = useState<CaptureMode>('photo');
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [gps, setGps] = useState<GpsSnapshot | null>(null);
  const [gpsState, setGpsState] = useState<'loading' | 'available' | 'denied' | 'unavailable'>('loading');
  const [capturedMedia, setCapturedMedia] = useState<CapturedContributionMedia | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCurrentLocation = useCallback(async () => {
    setGpsState('loading');
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!mounted.current) return;
      setGps({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
        timestamp: current.timestamp,
      });
      setGpsState('available');
    } catch {
      if (!mounted.current) return;
      setGps(null);
      setGpsState('unavailable');
      setMessage('Không thể lấy vị trí hiện tại. Hãy kiểm tra GPS và thử lại.');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!requestedInitialPermissions.current) {
      requestedInitialPermissions.current = true;
      void (async () => {
        try {
          await requestCameraPermission();
          const permission = await requestLocationPermission();
          if (permission.granted) await loadCurrentLocation();
          else if (mounted.current) setGpsState('denied');
        } catch {
          if (mounted.current) setMessage('Không thể yêu cầu quyền thiết bị. Vui lòng thử lại.');
        }
      })();
    }
    return () => {
      mounted.current = false;
      cameraRef.current?.stopRecording();
    };
  }, [loadCurrentLocation, requestCameraPermission, requestLocationPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        const [cameraResult, locationResult] = await Promise.all([
          getCameraPermission(),
          getLocationPermission(),
          getMicrophonePermission(),
        ]);
        if (locationResult.granted && !gps) await loadCurrentLocation();
        if (!cameraResult.granted) setCameraReady(false);
      })();
    });
    return () => subscription.remove();
  }, [getCameraPermission, getLocationPermission, getMicrophonePermission, gps, loadCurrentLocation]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      if (recordingStartedAt.current != null) {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt.current) / 1000));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleBack = useCallback(() => {
    if (isRecording) cameraRef.current?.stopRecording();
    router.back();
  }, [isRecording, router]);

  const handleGpsPress = useCallback(async () => {
    setMessage(null);
    let permission = locationPermission;
    if (!permission?.granted) {
      if (permission && !permission.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      permission = await requestLocationPermission();
    }
    if (permission.granted) await loadCurrentLocation();
    else setGpsState('denied');
  }, [loadCurrentLocation, locationPermission, requestLocationPermission]);

  const handleModeChange = useCallback(async (nextMode: CaptureMode) => {
    if (isRecording || nextMode === mode) return;
    setMessage(null);
    if (nextMode === 'video' && !microphonePermission?.granted) {
      const permission = microphonePermission?.canAskAgain === false
        ? microphonePermission
        : await requestMicrophonePermission();
      if (!permission.granted) {
        setMessage('Cần quyền micrô để quay video có âm thanh. Bạn vẫn có thể chụp ảnh.');
        return;
      }
    }
    setCameraReady(false);
    setMode(nextMode);
  }, [isRecording, microphonePermission, mode, requestMicrophonePermission]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    setIsCapturing(true);
    setMessage(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!mounted.current) return;
      setCapturedMedia({
        id: createMediaId(),
        type: 'photo',
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        capturedAt: Date.now(),
        locationId,
        locationName,
        gps,
      });
    } catch {
      setMessage('Không thể chụp ảnh. Hãy giữ thiết bị ổn định và thử lại.');
    } finally {
      if (mounted.current) setIsCapturing(false);
    }
  }, [cameraReady, gps, isCapturing, locationId, locationName]);

  const startVideoRecording = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    let permission = microphonePermission;
    if (!permission?.granted) {
      if (permission && !permission.canAskAgain) {
        setMessage('Quyền micrô đang bị tắt. Mở cài đặt để cho phép quay video có âm thanh.');
        return;
      }
      permission = await requestMicrophonePermission();
    }
    if (!permission.granted || !cameraRef.current) return;

    setMessage(null);
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingStartedAt.current = Date.now();
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 30 });
      const durationSeconds = recordingStartedAt.current == null
        ? undefined
        : Math.max(1, Math.round((Date.now() - recordingStartedAt.current) / 1000));
      if (result?.uri && mounted.current) {
        setCapturedMedia({
          id: createMediaId(),
          type: 'video',
          uri: result.uri,
          durationSeconds,
          capturedAt: Date.now(),
          locationId,
          locationName,
          gps,
        });
      }
    } catch {
      if (mounted.current) setMessage('Không thể hoàn tất video. Vui lòng thử quay lại.');
    } finally {
      recordingStartedAt.current = null;
      if (mounted.current) {
        setIsRecording(false);
        setRecordingSeconds(0);
      }
    }
  }, [cameraReady, gps, isCapturing, locationId, locationName, microphonePermission, requestMicrophonePermission]);

  const handleCapture = useCallback(() => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }
    if (mode === 'photo') void capturePhoto();
    else void startVideoRecording();
  }, [capturePhoto, isRecording, mode, startVideoRecording]);

  const handleRetake = useCallback(() => {
    setCapturedMedia(null);
    setSavedLocally(false);
    setCameraReady(false);
    setMessage(null);
  }, []);

  if (capturedMedia) {
    return (
      <MediaPreview
        media={capturedMedia}
        savedLocally={savedLocally}
        onBack={handleBack}
        onRetake={handleRetake}
        onUse={(confirmedTags) => {
          setPendingContributionMedia(capturedMedia);
          addContributionRecord({
            id: createMediaId(),
            locationId,
            locationName,
            mediaUri: capturedMedia.uri,
            mediaType: capturedMedia.type,
            featureTags: confirmedTags,
            gps: gps ? { latitude: gps.latitude, longitude: gps.longitude } : null,
            status: 'Auto-Verified',
            confidenceScore: 0.88,
            pointsAwarded: 50,
            createdAt: Date.now(),
          });
          setSavedLocally(true);
        }}
      />
    );
  }

  if (!cameraPermission) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#8ee9dc" />
        <Text style={styles.loadingText}>Đang chuẩn bị camera…</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <>
        <StatusBar style="light" />
        <PermissionState
          locationName={locationName}
          title="Cần quyền truy cập camera"
          message="AccessMapVN chỉ dùng camera trong ứng dụng để ghi nhận bằng chứng tiếp cận. Không có ảnh nào được tải lên ở bước này."
          canAskAgain={cameraPermission.canAskAgain}
          onBack={handleBack}
          onRetry={() => void requestCameraPermission()}
          onOpenSettings={() => void Linking.openSettings()}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ExpoCamera.CameraView
        key={`${facing}-${mode}`}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode === 'photo' ? 'picture' : 'video'}
        mute={false}
        videoQuality="720p"
        onCameraReady={() => setCameraReady(true)}
        onMountError={(error: any) => setMessage(`Không thể mở camera: ${error?.message ?? error}`)}
      />
      <View style={styles.previewScrim} pointerEvents="none" />
      <View style={[styles.hud, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]} pointerEvents="box-none">
        <CameraHeader locationName={locationName} onBack={handleBack} disabled={isCapturing} />
        <CameraStatusOverlay
          gpsAccuracy={gps?.accuracy ?? null}
          gpsState={gpsState}
          onGpsPress={() => void handleGpsPress()}
        />
        <View style={styles.flexSpace} />
        {message ? (
          <Pressable
            style={styles.message}
            onPress={() => {
              if (message.includes('Mở cài đặt')) void Linking.openSettings();
              else setMessage(null);
            }}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#f5ce4a" />
            <Text style={styles.messageText}>{message}</Text>
          </Pressable>
        ) : null}
        <CaptureControls
          mode={mode}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          disabled={!cameraReady || isCapturing}
          onModeChange={(nextMode) => void handleModeChange(nextMode)}
          onCapture={handleCapture}
          onFlip={() => {
            setCameraReady(false);
            setFacing((current: CameraType) => current === 'back' ? 'front' : 'back');
          }}
        />
      </View>
    </View>
  );
}

function CameraFallbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, styles.fallbackContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <MaterialCommunityIcons name="camera-off" size={64} color="#64748b" />
      <Text style={styles.fallbackTitle}>Cần cập nhật Development Build</Text>
      <Text style={styles.fallbackDesc}>
        Tính năng camera yêu cầu module native 'expo-camera'. Bản build trên thiết bị của bạn hiện tại chưa có module này. Hãy kết nối USB/ADB và chạy lệnh:
      </Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>npx expo run:android</Text>
      </View>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Quay lại Bản đồ</Text>
      </Pressable>
    </View>
  );
}

export function CameraContributionScreen() {
  if (!ExpoCamera) {
    return <CameraFallbackScreen />;
  }
  return <ActiveCameraContributionScreen />;
}

export default CameraContributionScreen;
