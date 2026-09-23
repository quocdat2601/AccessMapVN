import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branding } from '@/shared/config/branding';

// Placeholder destination only. It makes the intro route testable while login UI is still prototyped.
export default function LoginScreen() {
  // TODO(auth): Build the real sign-in choices and connect the approved authentication provider.
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome to {branding.appName}</Text>
      <Text style={styles.description}>Sign-in will be available in a future prototype.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: branding.colors.background, flex: 1, justifyContent: 'center', padding: 32 },
  title: { color: branding.colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  description: { color: branding.colors.mutedText, fontSize: 16, lineHeight: 24, marginTop: 10, textAlign: 'center' },
});
