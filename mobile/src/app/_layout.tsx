import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/features/auth';
import { AccessibilityProvider } from '@/features/accessibility';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AccessibilityProvider>
          <SafeAreaProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 240,
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="map" options={{ animation: 'none' }} />
              <Stack.Screen name="community" options={{ animation: 'none' }} />
              <Stack.Screen name="profile" options={{ animation: 'none' }} />
              <Stack.Screen name="contribute" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="reports" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
            <StatusBar style="auto" />
          </SafeAreaProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
