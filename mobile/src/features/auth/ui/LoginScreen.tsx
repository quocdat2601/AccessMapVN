import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { branding } from '@/shared/config/branding';
import { useAuth } from '../model/AuthProvider';

type AuthMode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const router = useRouter();
  const { isConfigured, session, signIn, signUp, sendPasswordReset } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace('/map');
  }, [router, session]);

  const continueToMap = () => {
    // Auth state is supplied by Supabase; keep navigation local to this screen.
    router.replace('/map');
  };

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMessage('Vui lòng nhập email và mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (mode === 'signIn') {
        await signIn(normalizedEmail, password);
        router.replace('/map');
      } else {
        const signedIn = await signUp(normalizedEmail, password);
        if (signedIn) {
          router.replace('/map');
        } else {
          setMode('signIn');
          Alert.alert(
            'Kiểm tra email',
            'Tài khoản đã được tạo. Hãy xác nhận email rồi đăng nhập.'
          );
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xác thực tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Nhập email để nhận hướng dẫn đặt lại mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await sendPasswordReset(normalizedEmail);
      Alert.alert('Đã gửi email', 'Hãy kiểm tra hộp thư để đặt lại mật khẩu.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi email đặt lại mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.mapDecoration}
      >
        <View style={[styles.mapRoad, styles.mapRoadHorizontal]} />
        <View style={[styles.mapRoad, styles.mapRoadVertical]} />
        <View style={[styles.mapBlock, styles.mapBlockLeft]} />
        <View style={[styles.mapBlock, styles.mapBlockRight]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.brandSection}>
              <View style={styles.logoFrame}>
                <Image
                  accessibilityLabel={`${branding.appName}, ứng dụng bản đồ tiếp cận`}
                  source={branding.logo}
                  style={styles.logo}
                />
              </View>
              <Text style={styles.appName}>{branding.appName}</Text>
              <Text style={styles.supportingText}>
                Khám phá địa điểm phù hợp với nhu cầu tiếp cận của bạn
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="person-outline" size={20} color={branding.colors.mutedText} />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="Nhập email"
                    placeholderTextColor="#8A9695"
                    selectionColor={branding.colors.primary}
                    style={styles.input}
                    value={email}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed-outline" size={20} color={branding.colors.mutedText} />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    onChangeText={setPassword}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#8A9695"
                    secureTextEntry={!isPasswordVisible}
                    selectionColor={branding.colors.primary}
                    style={styles.input}
                    textContentType="password"
                    value={password}
                  />
                  <TouchableOpacity
                    accessibilityLabel={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    hitSlop={8}
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                    style={styles.visibilityButton}
                  >
                    <Ionicons
                      color={branding.colors.mutedText}
                      name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={21}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.7}
                disabled={isSubmitting}
                onPress={() => void handlePasswordReset()}
                style={styles.forgotButton}
              >
                <Text style={styles.linkText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityHint={mode === 'signIn' ? 'Đăng nhập vào AccessMapVN' : 'Tạo tài khoản AccessMapVN'}
                accessibilityRole="button"
                activeOpacity={0.84}
                disabled={isSubmitting || !isConfigured}
                onPress={() => void handleSubmit()}
                style={[styles.primaryButton, (isSubmitting || !isConfigured) && styles.disabledButton]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signIn' ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </Text>
                )}
              </TouchableOpacity>

              {!isConfigured ? (
                <Text style={styles.errorText}>
                  Chưa cấu hình Supabase. Vui lòng thêm EXPO_PUBLIC_SUPABASE_URL và
                  EXPO_PUBLIC_SUPABASE_ANON_KEY vào .env.
                </Text>
              ) : null}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.7}
                disabled={isSubmitting}
                onPress={() => {
                  setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
                  setErrorMessage(null);
                }}
                style={styles.registrationButton}
              >
                <Text style={styles.registrationText}>
                  {mode === 'signIn' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                  <Text style={styles.linkText}>
                    {mode === 'signIn' ? 'Đăng ký' : 'Đăng nhập'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              accessibilityHint="Bỏ qua đăng nhập và mở bản đồ"
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={continueToMap}
              style={styles.guestButton}
            >
              <Text style={styles.guestButtonText}>Vào thử ứng dụng</Text>
              <Ionicons name="arrow-forward" size={18} color={branding.colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: branding.colors.background,
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 440,
    width: '100%',
  },
  mapDecoration: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  mapRoad: {
    backgroundColor: '#FFFFFF',
    borderColor: branding.colors.grid,
    borderRadius: 99,
    borderWidth: 1,
    opacity: 0.48,
    position: 'absolute',
  },
  mapRoadHorizontal: {
    height: 18,
    left: -24,
    right: '26%',
    top: '17%',
  },
  mapRoadVertical: {
    bottom: '8%',
    right: '10%',
    top: -30,
    width: 18,
  },
  mapBlock: {
    backgroundColor: branding.colors.primarySoft,
    borderColor: branding.colors.grid,
    borderRadius: 24,
    borderWidth: 1,
    opacity: 0.35,
    position: 'absolute',
  },
  mapBlockLeft: {
    height: 120,
    left: -46,
    top: '24%',
    width: 140,
  },
  mapBlockRight: {
    bottom: '5%',
    height: 130,
    right: -58,
    width: 160,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoFrame: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: branding.colors.primarySoft,
    borderRadius: 26,
    borderWidth: 1,
    height: 90,
    justifyContent: 'center',
    shadowColor: branding.colors.primaryDark,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    width: 90,
    elevation: 3,
  },
  logo: {
    height: 116,
    resizeMode: 'contain',
    width: 116,
  },
  appName: {
    color: branding.colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginTop: 14,
  },
  supportingText: {
    color: branding.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    maxWidth: 340,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EBE9',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: branding.colors.primaryDark,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: branding.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderColor: '#D9E2E0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 15,
  },
  input: {
    color: branding.colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 11,
    paddingVertical: 0,
  },
  visibilityButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 38,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: -4,
    paddingVertical: 4,
  },
  linkText: {
    color: branding.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: branding.colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: branding.colors.primaryDark,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 17,
  },
  divider: {
    backgroundColor: '#E2E9E7',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: branding.colors.mutedText,
    fontSize: 13,
    marginHorizontal: 12,
  },
  googleButton: {
    alignItems: 'center',
    borderColor: '#D7E1DF',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  googleButtonText: {
    color: branding.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  registrationButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 12,
  },
  registrationText: {
    color: branding.colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
  },
  guestButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 17,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  guestButtonText: {
    color: branding.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
