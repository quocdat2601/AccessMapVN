import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraHeader } from '../components/camera/CameraHeader';
import { CameraStatusOverlay } from '../components/camera/CameraStatusOverlay';
import { CaptureControls } from '../components/camera/CaptureControls';
import { MediaPreview } from '../components/camera/MediaPreview';
import { PermissionState } from '../components/camera/PermissionState';
import {
  addContributionRecord,
  setPendingContributionMedia,
  type CapturedContributionMedia,
  type CaptureMode,
  type GpsSnapshot,
} from '@/entities/contribution';
import { reverseGeocode } from '@/entities/place';

import { styles } from './CameraContributionScreen.styles';
import { TagReviewScreen } from './TagReviewScreen';
import { FinalScorecardScreen } from './FinalScorecardScreen';
import {
  verifyWithAiOrFallback,
  type VerificationMatrixResult,
  type VerificationMatrixInput,
} from '../../lib/verificationEngine';
import { runAiPreScan, type PreScanFeatureTag } from '../../api/aiPreScanService';
import { matchSelectedTagsWithCvDetections } from '../../model/tagReviewModel';
import { getPoiAnchorCoords } from '../../testing/mocks/mockPoiAnchor';
import { TestGalleryPickerButton } from '../../testing/components/TestGalleryPickerButton';
import { fetchPlaceById } from '@/entities/place';

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
  const params = useLocalSearchParams<{
    locationId?: string | string[];
    locationName?: string | string[];
    latitude?: string | string[];
    longitude?: string | string[];
  }>();
  const locationId = firstParam(params.locationId, 'saigon-centre');
  const locationName = firstParam(params.locationName, 'S9.01');
  const paramLat = parseFloat(firstParam(params.latitude, ''));
  const paramLng = parseFloat(firstParam(params.longitude, ''));

  const [poiCoordsState, setPoiCoordsState] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (!isNaN(paramLat) && !isNaN(paramLng)) {
      return { latitude: paramLat, longitude: paramLng };
    }
    return null;
  });

  useEffect(() => {
    if (!poiCoordsState && locationId) {
      void fetchPlaceById(locationId).then((place) => {
        if (place && !isNaN(place.lat) && !isNaN(place.lng) && place.lat !== 0 && place.lng !== 0) {
          setPoiCoordsState({ latitude: place.lat, longitude: place.lng });
        }
      });
    }
  }, [locationId, poiCoordsState]);

  const targetPoiCoords = poiCoordsState ?? getPoiAnchorCoords(locationId, locationName);

  const cameraRef = useRef<any>(null);
  const requestedInitialPermissions = useRef(false);
  const recordingStartedAt = useRef<number | null>(null);
  const mounted = useRef(true);

  const [cameraPermission, requestCameraPermission, getCameraPermission] = ExpoCamera.useCameraPermissions();
  const [locationPermission, requestLocationPermission, getLocationPermission] = Location.useForegroundPermissions();

  const [mode, setMode] = useState<CaptureMode>('photo');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [gps, setGps] = useState<GpsSnapshot | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<'loading' | 'available' | 'denied' | 'unavailable'>('loading');
  const [capturedMedia, setCapturedMedia] = useState<CapturedContributionMedia | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Workflow 1 Multi-step Verification State
  const [workflowStep, setWorkflowStep] = useState<'camera' | 'tag_review' | 'final_scorecard' | 'video_preview'>('camera');
  const [preScanTags, setPreScanTags] = useState<PreScanFeatureTag[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isPreScanning, setIsPreScanning] = useState(false);
  const [confirmedTagKeys, setConfirmedTagKeys] = useState<string[]>([]);
  const [fieldNotes, setFieldNotes] = useState('');
  const [matrixResult, setMatrixResult] = useState<VerificationMatrixResult | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const startLocationWatching = useCallback(async () => {
    try {
      locationSubscription.current?.remove();
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 1,
          timeInterval: 2000,
          mayShowUserSettingsDialog: true,
        },
        (current) => {
          if (!mounted.current) return;
          setGps({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            accuracy: current.coords.accuracy,
            timestamp: current.timestamp,
          });
          setGpsState('available');
        }
      );
    } catch {
      // background watch fallback ignored
    }
  }, []);

  const loadCurrentLocation = useCallback(async () => {
    setGpsState('loading');
    try {
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // ignore if already active or dismissed
        }
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });
      if (!mounted.current) return;
      setGps({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
        timestamp: current.timestamp,
      });
      setGpsState('available');

      void (async () => {
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
          if (geo && mounted.current) {
            const parts = [
              geo.street || geo.name,
              geo.subregion || geo.district,
              geo.city || geo.region,
            ].filter(Boolean);
            if (parts.length > 0) {
              setCurrentAddress(parts.join(', '));
              return;
            }
          }
        } catch {
          // ignore native geocode error
        }
        try {
          const fallback = await reverseGeocode(current.coords.latitude, current.coords.longitude);
          if (fallback && mounted.current) setCurrentAddress(fallback);
        } catch {
          // ignore fallback error
        }
      })();

      await startLocationWatching();
    } catch {
      if (!mounted.current) return;
      setGps(null);
      setGpsState('unavailable');
      setMessage('Không thể lấy vị trí hiện tại. Hãy kiểm tra GPS và thử lại.');
    }
  }, [startLocationWatching]);

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
      locationSubscription.current?.remove();
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
        ]);
        if (locationResult.granted) {
          if (!gps) await loadCurrentLocation();
          else if (!locationSubscription.current) await startLocationWatching();
        }
        if (!cameraResult.granted) setCameraReady(false);
      })();
    });
    return () => subscription.remove();
  }, [getCameraPermission, getLocationPermission, gps, loadCurrentLocation, startLocationWatching]);

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

  const handleModeChange = useCallback((nextMode: CaptureMode) => {
    if (isRecording || nextMode === mode) return;
    setMessage(null);
    setMode(nextMode);
  }, [isRecording, mode]);

  const startPreScanForPhoto = useCallback((media: CapturedContributionMedia) => {
    setCapturedMedia(media);
    setWorkflowStep('tag_review');
    setIsPreScanning(true);
    setPreScanTags([]);
    setAiSummary(null);

    void runAiPreScan(media.uri).then((result) => {
      if (!mounted.current) return;
      setPreScanTags(result.features);
      setAiSummary(result.summary);
      setIsPreScanning(false);
    });
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    setIsCapturing(true);
    setMessage(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      if (!mounted.current) return;
      const media: CapturedContributionMedia = {
        id: createMediaId(),
        type: 'photo',
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        capturedAt: Date.now(),
        locationId,
        locationName,
        gps,
      };
      startPreScanForPhoto(media);
    } catch {
      setMessage('Không thể chụp ảnh. Hãy giữ thiết bị ổn định và thử lại.');
    } finally {
      if (mounted.current) setIsCapturing(false);
    }
  }, [cameraReady, gps, isCapturing, locationId, locationName, startPreScanForPhoto]);

  const startVideoRecording = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    setMessage(null);
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingStartedAt.current = Date.now();

    const timer = setInterval(() => {
      if (!mounted.current) return;
      setRecordingSeconds((prev) => {
        if (prev >= 10) {
          cameraRef.current?.stopRecording();
          return 10;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 10,
        mute: true,
      });
      const durationSeconds = recordingStartedAt.current == null
        ? 0
        : Math.max(1, Math.round((Date.now() - recordingStartedAt.current) / 1000));

      if (durationSeconds < 5) {
        if (mounted.current) {
          setMessage('Video quá ngắn (< 5s). Vui lòng quay từ 5–10 giây để ghi nhận đủ bằng chứng tiếp cận (BR-01).');
        }
        return;
      }

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
        setWorkflowStep('video_preview');
      }
    } catch {
      if (mounted.current) setMessage('Không thể hoàn tất video. Vui lòng thử quay lại.');
    } finally {
      clearInterval(timer);
      recordingStartedAt.current = null;
      if (mounted.current) {
        setIsRecording(false);
        setRecordingSeconds(0);
      }
    }
  }, [cameraReady, gps, isCapturing, locationId, locationName]);

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
    setWorkflowStep('camera');
    setMatrixResult(null);
  }, []);

  const handleProceedToVerification = useCallback(
    async (selectedKeys: string[], notes: string) => {
      if (!capturedMedia) return;
      setConfirmedTagKeys(selectedKeys);
      setFieldNotes(notes);

      const detectedPreScan = preScanTags.filter((t) => t.detected && t.confidence > 0);
      const detectedMap = new Map(detectedPreScan.map((t) => [t.key, t.confidence]));
      const { matchedCount, cvConfidence } = matchSelectedTagsWithCvDetections(
        selectedKeys,
        detectedMap
      );

      const verifiedTagCount = matchedCount;
      const unverifiedTagCount = Math.max(0, selectedKeys.length - matchedCount);

      const contributorCoords = capturedMedia.gps
        ? {
            latitude: capturedMedia.gps.latitude,
            longitude: capturedMedia.gps.longitude,
            accuracy: capturedMedia.gps.accuracy,
          }
        : null;

      const poiCoords = targetPoiCoords;

      const evalInput: VerificationMatrixInput = {
        cvConfidence,
        textDescription: notes,
        contributorCoords,
        poiCoords,
        selectedTags: selectedKeys,
        verifiedTagCount,
        unverifiedTagCount,
      };

      const result = await verifyWithAiOrFallback(capturedMedia.uri, evalInput);
      if (!mounted.current) return;
      setMatrixResult(result);
      setWorkflowStep('final_scorecard');
    },
    [capturedMedia, targetPoiCoords, preScanTags]
  );

  // Workflow 1: Final Scorecard Screen
  if (workflowStep === 'final_scorecard' && capturedMedia && matrixResult) {
    return (
      <FinalScorecardScreen
        media={capturedMedia}
        matrixResult={matrixResult}
        selectedTagKeys={confirmedTagKeys}
        notes={fieldNotes}
        onRetakeOrReset={handleRetake}
        onEditTags={() => setWorkflowStep('tag_review')}
        onFinish={() => router.back()}
      />
    );
  }

  // Workflow 1: Step 2.5 Human-in-the-Loop Review Screen
  if (workflowStep === 'tag_review' && capturedMedia) {
    return (
      <TagReviewScreen
        media={capturedMedia}
        availableTags={preScanTags}
        aiSummary={aiSummary}
        isPreScanning={isPreScanning}
        onProceedToVerification={handleProceedToVerification}
        onRetake={handleRetake}
        onBack={handleRetake}
      />
    );
  }

  // Video fallback preview
  if (workflowStep === 'video_preview' && capturedMedia) {
    return (
      <MediaPreview
        media={capturedMedia}
        savedLocally={savedLocally}
        onBack={handleBack}
        onRetake={handleRetake}
        onUse={(confirmedTags, customName, notes) => {
          setPendingContributionMedia(capturedMedia);
          addContributionRecord({
            id: createMediaId(),
            locationId,
            locationName: customName || locationName,
            mediaUri: capturedMedia.uri,
            mediaType: capturedMedia.type,
            featureTags: confirmedTags,
            textDescription: notes,
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
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode === 'photo' ? 'picture' : 'video'}
        flash={flashMode}
        enableTorch={flashMode === 'on' && facing === 'back'}
        mute={true}
        videoQuality="720p"
        onCameraReady={() => setCameraReady(true)}
        onMountError={(error: any) => setMessage(`Không thể mở camera: ${error?.message ?? error}`)}
      />
      <View style={styles.previewScrim} pointerEvents="none" />
      <View style={[styles.hud, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]} pointerEvents="box-none">
        <CameraHeader
          locationName={locationName}
          onBack={handleBack}
          disabled={isCapturing}
          gpsAccuracy={gps?.accuracy ?? null}
          gpsState={gpsState}
          onGpsPress={() => void handleGpsPress()}
          flashMode={flashMode}
          onToggleFlash={() => setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'))}
        />
        <CameraStatusOverlay
          currentAddress={currentAddress}
          gps={gps}
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
            setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
          }}
          leftAction={
            __DEV__ ? (
              <TestGalleryPickerButton
                locationId={locationId}
                locationName={locationName}
                targetCoordinates={targetPoiCoords}
                disabled={isRecording || isCapturing}
                onMediaPicked={(media) => {
                  startPreScanForPhoto(media);
                }}
              />
            ) : null
          }
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
