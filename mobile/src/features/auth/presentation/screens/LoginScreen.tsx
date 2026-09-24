import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branding } from '@/shared/config/branding';

import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

// Placeholder destination only. It makes the intro route testable while login UI is still prototyped.
export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome to {branding.appName}</Text>
      <Text style={styles.description}>Sign-in will be available in a future prototype.</Text>
      
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => router.push('/map')}
        activeOpacity={0.8}
      >
        <Text style={styles.exploreButtonText}>Khám phá bản đồ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: branding.colors.background, flex: 1, justifyContent: 'center', padding: 32 },
  title: { color: branding.colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  description: { color: branding.colors.mutedText, fontSize: 16, lineHeight: 24, marginTop: 10, textAlign: 'center' },
  exploreButton: {
    marginTop: 28,
    backgroundColor: branding.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: branding.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
