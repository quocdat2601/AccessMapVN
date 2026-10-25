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
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signIn');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace('/map');
  }, [router, session]);

  const continueToMap = () => {
    router.replace('/map');
  };

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    if (!normalizedEmail || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }

    if (mode === 'signUp') {
      if (!trimmedName) {
        setErrorMessage('Vui lòng nhập Họ và tên của bạn.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (mode === 'signIn') {
        await signIn(normalizedEmail, password);
        router.replace('/map');
      } else {
        const signedIn = await signUp(normalizedEmail, password, trimmedName);
        if (signedIn) {
          router.replace('/map');
        } else {
          setMode('signIn');
          Alert.alert(
            'Đăng ký thành công',
            'Tài khoản đã được tạo. Hãy kiểm tra hộp thư email (nếu cần xác nhận) rồi đăng nhập.'
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
      {/* Background Map Decoration */}
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

      {/* Top Header Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/map');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Quay lại bản đồ"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={branding.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {mode === 'signIn' ? 'Đăng nhập AccessMap' : 'Tạo tài khoản mới'}
        </Text>
        <View style={{ width: 38 }} />
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
            {/* Branding Logo & Header */}
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
                {mode === 'signIn'
                  ? 'Đăng nhập để lưu điểm EXP và vinh danh đóng góp'
                  : 'Tham gia cộng đồng xây dựng bản đồ tiếp cận Việt Nam'}
              </Text>
            </View>

            {/* Segmented Tab Switch */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'signIn' && styles.tabButtonActive]}
                onPress={() => {
                  setMode('signIn');
                  setErrorMessage(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signIn' && styles.tabTextActive]}>
                  Đăng nhập
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'signUp' && styles.tabButtonActive]}
                onPress={() => {
                  setMode('signUp');
                  setErrorMessage(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signUp' && styles.tabTextActive]}>
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              {mode === 'signUp' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Họ và tên</Text>
                  <View style={styles.inputShell}>
                    <Ionicons name="person-outline" size={20} color={branding.colors.mutedText} />
                    <TextInput
                      autoCapitalize="words"
                      autoComplete="name"
                      onChangeText={setFullName}
                      placeholder="Nhập họ và tên đầy đủ"
                      placeholderTextColor="#8A9695"
                      selectionColor={branding.colors.primary}
                      style={styles.input}
                      value={fullName}
                    />
                  </View>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="mail-outline" size={20} color={branding.colors.mutedText} />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="Nhập địa chỉ email"
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
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
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
                      size={20}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {mode === 'signUp' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu</Text>
                  <View style={styles.inputShell}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={branding.colors.mutedText} />
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setConfirmPassword}
                      placeholder="Nhập lại mật khẩu"
                      placeholderTextColor="#8A9695"
                      secureTextEntry={!isConfirmPasswordVisible}
                      selectionColor={branding.colors.primary}
                      style={styles.input}
                      textContentType="password"
                      value={confirmPassword}
                    />
                    <TouchableOpacity
                      accessibilityLabel={isConfirmPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      hitSlop={8}
                      onPress={() => setIsConfirmPasswordVisible((visible) => !visible)}
                      style={styles.visibilityButton}
                    >
                      <Ionicons
                        color={branding.colors.mutedText}
                        name={isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {mode === 'signIn' && (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                  onPress={() => void handlePasswordReset()}
                  style={styles.forgotButton}
                >
                  <Text style={styles.linkText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              )}

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
                    {mode === 'signIn' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
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
            </View>

            {/* Guest Action Button */}
            <TouchableOpacity
              accessibilityHint="Bỏ qua đăng nhập và mở bản đồ"
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={continueToMap}
              style={styles.guestButton}
            >
              <Text style={styles.guestButtonText}>Vào trải nghiệm chế độ Khách</Text>
              <Ionicons name="arrow-forward" size={17} color={branding.colors.primary} />
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
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 440,
    width: '100%',
  },
  mapDecoration: {
    ...StyleSheet.absoluteFill,
  },
  mapRoad: {
    backgroundColor: '#E5EEED',
    position: 'absolute',
  },
  mapRoadHorizontal: {
    height: 18,
    left: 0,
    right: 0,
    top: '32%',
  },
  mapRoadVertical: {
    bottom: 0,
    left: '28%',
    top: 0,
    width: 18,
  },
  mapBlock: {
    backgroundColor: '#EFF6F5',
    borderRadius: 24,
    opacity: 0.85,
    position: 'absolute',
  },
  mapBlockLeft: {
    bottom: 40,
    height: 140,
    left: -20,
    width: 160,
  },
  mapBlockRight: {
    height: 180,
    right: -30,
    top: 40,
    width: 170,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoFrame: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 3,
    height: 72,
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#004E58',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    width: 72,
  },
  logo: {
    height: 48,
    resizeMode: 'contain',
    width: 48,
  },
  appName: {
    color: '#004E58',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  supportingText: {
    color: '#596264',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: branding.colors.primary,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    paddingLeft: 10,
    paddingVertical: 10,
  },
  visibilityButton: {
    padding: 6,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  linkText: {
    color: branding.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: branding.colors.primary,
    borderRadius: 14,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    shadowColor: branding.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#E11D48',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  guestButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guestButtonText: {
    color: branding.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
