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
import { getPoiAnchorCoords } from '../../testing/mocks/mockPoiAnchor';
import { TestGalleryPickerButton } from '../../testing/components/TestGalleryPickerButton';
import { LocationSelectionModal, type SelectedLocationData } from '../components/location/LocationSelectionModal';

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
    flow?: string | string[];
  }>();
  const locationId = firstParam(params.locationId, 'saigon-centre');
  const locationName = firstParam(params.locationName, 'Địa điểm mới gần bạn');
  const flow = firstParam(params.flow, 'contribute');
  const paramLat = parseFloat(firstParam(params.latitude, ''));
  const paramLng = parseFloat(firstParam(params.longitude, ''));
  const cameraRef = useRef<any>(null);
  const requestedInitialPermissions = useRef(false);
  const recordingStartedAt = useRef<number | null>(null);
  const mounted = useRef(true);

  // Target Location State (shared across Camera, TagReview, and FinalScorecard)
  const [targetLocationId, setTargetLocationId] = useState(locationId);
  const [targetLocationName, setTargetLocationName] = useState(locationName);
  const [targetAddress, setTargetAddress] = useState<string | null>(null);
  const [targetCoords, setTargetCoords] = useState<{ latitude: number; longitude: number } | null>(
    !isNaN(paramLat) && !isNaN(paramLng) ? { latitude: paramLat, longitude: paramLng } : null
  );
  const [showLocationModal, setShowLocationModal] = useState(false);

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
              const fullAddr = parts.join(', ');
              setCurrentAddress(fullAddr);
              setTargetAddress((prev) => prev || fullAddr);
              setTargetLocationName((prev) =>
                !prev || prev === 'Địa điểm mới gần bạn' || prev === 'S9.01' ? parts[0] || 'Vị trí hiện tại' : prev
              );
              return;
            }
          }
        } catch {
          // ignore native geocode error
        }
        try {
          const fallback = await reverseGeocode(current.coords.latitude, current.coords.longitude);
          if (fallback && mounted.current) {
            setCurrentAddress(fallback);
            setTargetAddress((prev) => prev || fallback);
            setTargetLocationName((prev) =>
              !prev || prev === 'Địa điểm mới gần bạn' || prev === 'S9.01' ? fallback.split(',')[0]?.trim() || 'Vị trí hiện tại' : prev
            );
          }
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

  const handleSelectLocation = useCallback(
    (data: SelectedLocationData) => {
      setTargetLocationId(data.id);
      setTargetLocationName(data.name);
      setTargetAddress(data.address || null);
      setTargetCoords({ latitude: data.latitude, longitude: data.longitude });
      setGps({
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 5.0,
        timestamp: Date.now(),
      });
      if (capturedMedia) {
        setCapturedMedia((prev) =>
          prev
            ? {
                ...prev,
                locationId: data.id,
                locationName: data.name,
                gps: {
                  latitude: data.latitude,
                  longitude: data.longitude,
                  accuracy: 5.0,
                  timestamp: Date.now(),
                },
              }
            : null
        );
      }
    },
    [capturedMedia]
  );

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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.55, skipProcessing: true, base64: true });
      if (!mounted.current) return;
      const media: CapturedContributionMedia = {
        id: createMediaId(),
        type: 'photo',
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        base64: photo.base64,
        capturedAt: Date.now(),
        locationId: targetLocationId,
        locationName: targetLocationName,
        gps: targetCoords ? { latitude: targetCoords.latitude, longitude: targetCoords.longitude, accuracy: 5.0, timestamp: Date.now() } : gps,
      };
      startPreScanForPhoto(media);
    } catch {
      setMessage('Không thể chụp ảnh. Hãy giữ thiết bị ổn định và thử lại.');
    } finally {
      if (mounted.current) setIsCapturing(false);
    }
  }, [cameraReady, gps, isCapturing, startPreScanForPhoto, targetCoords, targetLocationId, targetLocationName]);

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
          locationId: targetLocationId,
          locationName: targetLocationName,
          gps: targetCoords ? { latitude: targetCoords.latitude, longitude: targetCoords.longitude, accuracy: 5.0, timestamp: Date.now() } : gps,
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
  }, [cameraReady, gps, isCapturing, targetCoords, targetLocationId, targetLocationName]);

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

      // Map QCVN sub-features to their pre-scan parent detection keys
      const PARENT_MAP: Record<string, string> = {
        ramp_slope_comfortable: 'exterior_ramp_present',
        ramp_handrails_present: 'exterior_ramp_present',
        door_width_wide: 'door_width_ok',
        door_threshold_flat: 'door_width_ok',
        door_handle_lever: 'door_width_ok',
        door_lever_handle: 'door_width_ok',
        elevator_accessible: 'elevator_present',
        restroom_accessible_stall: 'accessible_restroom_sign',
        restroom_grab_bars: 'accessible_restroom_sign',
        tactile_paving_guiding: 'tactile_paving_present',
        tactile_paving_warning: 'tactile_paving_present',
      };

      const detectedPreScan = preScanTags.filter((t) => t.detected && t.confidence > 0);
      const detectedMap = new Map(detectedPreScan.map((t) => [t.key, t.confidence]));

      // Determine CV confidence strictly based on actual detections verified in the photo
      let cvConfidence = 0.0;
      let matchedCount = 0;
      if (selectedKeys.length > 0 && detectedMap.size > 0) {
        let totalConfidence = 0;

        for (const key of selectedKeys) {
          const directConf = detectedMap.get(key);
          if (directConf !== undefined) {
            matchedCount++;
            totalConfidence += directConf;
          } else {
            const parentKey = PARENT_MAP[key];
            if (parentKey && detectedMap.has(parentKey)) {
              matchedCount++;
              totalConfidence += detectedMap.get(parentKey)!;
            }
          }
        }

        if (matchedCount > 0) {
          // Proportionate CV confidence across all claimed tags
          cvConfidence = totalConfidence / selectedKeys.length;
        }
      }

      const verifiedTagCount = matchedCount;
      const unverifiedTagCount = Math.max(0, selectedKeys.length - matchedCount);

      const contributorCoords = capturedMedia.gps
        ? {
            latitude: capturedMedia.gps.latitude,
            longitude: capturedMedia.gps.longitude,
            accuracy: capturedMedia.gps.accuracy,
          }
        : null;

      const poiCoords =
        targetCoords
          ? targetCoords
          : !isNaN(paramLat) && !isNaN(paramLng)
          ? { latitude: paramLat, longitude: paramLng }
          : getPoiAnchorCoords(targetLocationId, targetLocationName, contributorCoords);

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
    [capturedMedia, paramLat, paramLng, preScanTags, targetCoords, targetLocationId, targetLocationName]
  );

  // Workflow 1: Final Scorecard Screen
  if (workflowStep === 'final_scorecard' && capturedMedia && matrixResult) {
    return (
      <>
        <FinalScorecardScreen
          media={capturedMedia}
          matrixResult={matrixResult}
          selectedTagKeys={confirmedTagKeys}
          notes={fieldNotes}
          locationName={targetLocationName}
          locationAddress={targetAddress}
          onChangeLocation={() => setShowLocationModal(true)}
          onRetakeOrReset={handleRetake}
          onEditTags={() => setWorkflowStep('tag_review')}
          flow={flow}
          onFinish={() => router.back()}
        />
        <LocationSelectionModal
          visible={showLocationModal}
          currentLocationName={targetLocationName}
          currentLatitude={targetCoords?.latitude ?? gps?.latitude ?? null}
          currentLongitude={targetCoords?.longitude ?? gps?.longitude ?? null}
          currentAddress={targetAddress ?? currentAddress}
          onSelectLocation={handleSelectLocation}
          onClose={() => setShowLocationModal(false)}
        />
      </>
    );
  }

  // Workflow 1: Step 2.5 Human-in-the-Loop Review Screen
  if (workflowStep === 'tag_review' && capturedMedia) {
    return (
      <>
        <TagReviewScreen
          media={capturedMedia}
          availableTags={preScanTags}
          aiSummary={aiSummary}
          isPreScanning={isPreScanning}
          locationName={targetLocationName}
          locationAddress={targetAddress}
          onChangeLocation={() => setShowLocationModal(true)}
          onProceedToVerification={handleProceedToVerification}
          onRetake={handleRetake}
          onBack={handleRetake}
        />
        <LocationSelectionModal
          visible={showLocationModal}
          currentLocationName={targetLocationName}
          currentLatitude={targetCoords?.latitude ?? gps?.latitude ?? null}
          currentLongitude={targetCoords?.longitude ?? gps?.longitude ?? null}
          currentAddress={targetAddress ?? currentAddress}
          onSelectLocation={handleSelectLocation}
          onClose={() => setShowLocationModal(false)}
        />
      </>
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
            locationId: targetLocationId,
            locationName: customName || targetLocationName,
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
          locationName={targetLocationName}
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
          locationName={targetLocationName}
          onBack={handleBack}
          disabled={isCapturing}
          gpsAccuracy={gps?.accuracy ?? null}
          gpsState={gpsState}
          onGpsPress={() => void handleGpsPress()}
          onLocationPress={() => setShowLocationModal(true)}
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
        {__DEV__ && (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <TestGalleryPickerButton
              locationId={targetLocationId}
              locationName={targetLocationName}
              onMediaPicked={(media) => {
                startPreScanForPhoto(media);
              }}
            />
          </View>
        )}
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
        />
      </View>
      <LocationSelectionModal
        visible={showLocationModal}
        currentLocationName={targetLocationName}
        currentLatitude={targetCoords?.latitude ?? gps?.latitude ?? null}
        currentLongitude={targetCoords?.longitude ?? gps?.longitude ?? null}
        currentAddress={targetAddress ?? currentAddress}
        onSelectLocation={handleSelectLocation}
        onClose={() => setShowLocationModal(false)}
      />
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
