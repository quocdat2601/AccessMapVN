import { useState } from 'react';
import {
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

// UI prototype only. Authentication controls intentionally have no validation or network behavior.
export default function LoginScreen() {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const continueToMap = () => {
    // TODO(auth): Replace prototype navigation with real authentication state when backend auth is integrated.
    router.replace('/map');
  };

  const handleFutureAuthAction = () => {
    // TODO(auth): Connect registration, password recovery, and Google OAuth in the real auth flow.
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
                <Text style={styles.label}>Email hoặc số điện thoại</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="person-outline" size={20} color={branding.colors.mutedText} />
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Nhập email hoặc số điện thoại"
                    placeholderTextColor="#8A9695"
                    selectionColor={branding.colors.primary}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed-outline" size={20} color={branding.colors.mutedText} />
                  <TextInput
                    autoCapitalize="none"
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#8A9695"
                    secureTextEntry={!isPasswordVisible}
                    selectionColor={branding.colors.primary}
                    style={styles.input}
                    textContentType="password"
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
                onPress={handleFutureAuthAction}
                style={styles.forgotButton}
              >
                <Text style={styles.linkText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityHint="Mở bản đồ AccessMapVN trong bản mẫu"
                accessibilityRole="button"
                activeOpacity={0.84}
                onPress={continueToMap}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Đăng nhập</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>hoặc</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.76}
                onPress={handleFutureAuthAction}
                style={styles.googleButton}
              >
                <Ionicons name="logo-google" size={20} color={branding.colors.text} />
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.7}
                onPress={handleFutureAuthAction}
                style={styles.registrationButton}
              >
                <Text style={styles.registrationText}>
                  Chưa có tài khoản? <Text style={styles.linkText}>Đăng ký</Text>
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
