import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TextSizeOption = 'standard' | 'large' | 'extraLarge';
export type MobilityPreset = 'wheelchair' | 'motor_impaired' | 'visually_impaired' | 'elderly' | 'none';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilitySettings {
  // Thị giác & Hiển thị
  textSize: TextSizeOption;
  highContrast: boolean;
  reduceMotion: boolean;
  colorBlindMode: ColorBlindMode;

  // Âm thanh & Phản hồi xúc giác
  screenReaderOptimized: boolean;
  hapticFeedback: boolean;
  audioGuidance: boolean;

  // Hồ sơ di chuyển mặc định
  defaultMobilityProfile: MobilityPreset;
  autoEnforceRampAndElevator: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textSize: 'standard',
  highContrast: false,
  reduceMotion: false,
  colorBlindMode: 'none',

  screenReaderOptimized: false,
  hapticFeedback: true,
  audioGuidance: false,

  defaultMobilityProfile: 'wheelchair',
  autoEnforceRampAndElevator: true,
};

const STORAGE_KEY = '@accessmap_accessibility_settings';

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  isLoading: boolean;
  textScale: number;
  updateSettings: (partial: Partial<AccessibilitySettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  triggerHaptic: (patternMs?: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved settings from AsyncStorage on startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.warn('[AccessibilityContext] Failed to load settings from storage:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const triggerHaptic = useCallback(
    (patternMs: number = 40) => {
      if (settings.hapticFeedback) {
        try {
          Vibration.vibrate(patternMs);
        } catch {
          // ignore vibration errors on unsupported environments
        }
      }
    },
    [settings.hapticFeedback]
  );

  const updateSettings = useCallback(
    async (partial: Partial<AccessibilitySettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((err) =>
          console.warn('[AccessibilityContext] Failed to persist settings:', err)
        );
        return next;
      });
      triggerHaptic(30);
    },
    [triggerHaptic]
  );

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[AccessibilityContext] Failed to reset settings storage:', err);
    }
    triggerHaptic(50);
  }, [triggerHaptic]);

  const textScale = useMemo(() => {
    switch (settings.textSize) {
      case 'large':
        return 1.18;
      case 'extraLarge':
        return 1.36;
      case 'standard':
      default:
        return 1.0;
    }
  }, [settings.textSize]);

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      textScale,
      updateSettings,
      resetSettings,
      triggerHaptic,
    }),
    [settings, isLoading, textScale, updateSettings, resetSettings, triggerHaptic]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      settings: DEFAULT_ACCESSIBILITY_SETTINGS,
      isLoading: false,
      textScale: 1.0,
      updateSettings: async () => {},
      resetSettings: async () => {},
      triggerHaptic: () => {},
    };
  }
  return ctx;
}
