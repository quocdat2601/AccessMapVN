import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  expPoints: number;
  contributionsCount: number;
  reportsCount: number;
  isGuest: boolean;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile;
  isGuest: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName?: string): Promise<boolean>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase chưa được cấu hình. Hãy kiểm tra các biến EXPO_PUBLIC_SUPABASE_* trong .env.');
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localStats, setLocalStats] = useState({ exp: 100, contributions: 2, reports: 1 });

  // Load any locally cached contributions stats
  useEffect(() => {
    async function loadStats() {
      try {
        const raw = await AsyncStorage.getItem('@accessmap_contributions');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            setLocalStats((prev) => ({
              ...prev,
              contributions: Math.max(list.length, prev.contributions),
              exp: Math.max(list.length * 50, prev.exp),
            }));
          }
        }
      } catch {}
    }
    void loadStats();
  }, [session]);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    requireConfiguration();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    requireConfiguration();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) throw error;
    return Boolean(data.session);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    requireConfiguration();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const user = session?.user ?? null;
  const isGuest = !user;

  const userProfile = useMemo<UserProfile>(() => {
    if (!user) {
      return {
        id: 'guest',
        email: '',
        fullName: 'Khách tham quan',
        avatarUrl: null,
        role: 'Khách',
        expPoints: 0,
        contributionsCount: 0,
        reportsCount: 0,
        isGuest: true,
      };
    }

    const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
    const fallbackName = user.email ? user.email.split('@')[0] : 'Thành viên';
    const fullName = metaName || fallbackName;

    return {
      id: user.id,
      email: user.email || '',
      fullName,
      avatarUrl: user.user_metadata?.avatar_url || null,
      role: (user.app_metadata?.role as string) || 'Người dùng đã xác thực',
      expPoints: localStats.exp,
      contributionsCount: localStats.contributions,
      reportsCount: localStats.reports,
      isGuest: false,
    };
  }, [user, localStats]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      userProfile,
      isGuest,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      sendPasswordReset,
      signOut,
    }),
    [isLoading, sendPasswordReset, session, signIn, signOut, signUp, user, userProfile, isGuest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
