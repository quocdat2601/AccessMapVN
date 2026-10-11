import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  error: string | null;
  loading: boolean;
}

const HCMC_DEFAULT: UserLocation = {
  latitude: 10.7769,
  longitude: 106.7009,
};

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Quyền truy cập vị trí bị từ chối');
          setLocation(HCMC_DEFAULT);
          return;
        }

        // On Android, ensure high-accuracy GNSS hardware provider is active
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // ignore if already active or dismissed
        }

        // 1. Initial fast fix with Highest GNSS hardware accuracy
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            mayShowUserSettingsDialog: true,
          });
          if (!cancelled) {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setLoading(false);
          }
        } catch {
          // Fallback will still be caught by watchPositionAsync below
        }

        // 2. Active satellite tracking to refine accuracy and remove cellular/Wi-Fi drift
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            distanceInterval: 1, // update every 1 meter of movement
            timeInterval: 2000,   // update every 2 seconds
            mayShowUserSettingsDialog: true,
          },
          (pos) => {
            if (!cancelled) {
              setLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
              setLoading(false);
            }
          }
        );
      } catch (e) {
        if (!cancelled) {
          setError('Không thể lấy vị trí hiện tại');
          setLocation((prev) => prev ?? HCMC_DEFAULT);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { location, error, loading };
}
