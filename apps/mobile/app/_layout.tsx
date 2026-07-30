/**
 * Gốc của app — nạp font, dựng QueryClient, và GATE điều hướng.
 *
 * Gate quyết định đúng ba nhánh:
 *   chưa đăng nhập          → (auth)/sign-in
 *   đã đăng nhập, chưa có nhà → (auth)/setup
 *   đã có nhà                → (app)
 *
 * Thứ tự đó quan trọng: người đã đăng nhập bằng Google nhưng chưa tạo nhà mà bị
 * đẩy về sign-in sẽ đăng nhập lại vô hạn.
 */

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { createQueryClient, persistOptions } from '@/data/queries/client';
import { authRepository } from '@/features/auth/repository';
import { useMyHouseholds } from '@/features/auth/queries/use-auth';
import { useSessionStore } from '@/stores/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
  });
  const queryClient = useMemo(() => createQueryClient(), []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <StatusBar style="dark" />
        <AuthGate />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isRestoring, householdId, setSession, setRestored, setHousehold } =
    useSessionStore();

  // Khôi phục phiên + theo dõi đăng nhập/đăng xuất ở MỘT chỗ.
  useEffect(() => {
    let active = true;
    void authRepository.getSession().then((s) => {
      if (!active) return;
      setSession(s);
      setRestored();
    });
    const unsubscribe = authRepository.onAuthStateChange((s) => {
      setSession(s);
      setRestored();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSession, setRestored]);

  const { data: households, isPending: householdsPending } = useMyHouseholds();

  // Người dùng ở đúng MỘT nhà thì vào thẳng. Nhiều nhà là chuyện của bản sau
  // (05 §9 chỉ có một hộ gia đình mỗi tài khoản trong MVP) — lấy cái đầu tiên.
  useEffect(() => {
    const first = households?.[0];
    if (first) {
      setHousehold({ id: first.householdId, name: first.householdName, memberId: first.memberId });
    }
  }, [households, setHousehold]);

  useEffect(() => {
    if (isRestoring) return;
    // Chờ biết có nhà hay không rồi mới điều hướng — điều hướng sớm sẽ đẩy
    // người đã có nhà sang màn setup rồi mới giật ngược lại.
    if (session && householdsPending) return;

    const path: string[] = segments;
    const inAuth = path[0] === '(auth)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }
    if (!householdId) {
      // Trừ join/[code]: người nhận lời mời đi thẳng vào đó, không qua setup —
      // route đó tự đổi mã lấy nhà, đẩy về setup sẽ làm mất mã trong deep link.
      if (path[1] !== 'join') router.replace('/(auth)/setup');
      return;
    }
    if (inAuth) router.replace('/(app)/home');
  }, [isRestoring, session, householdId, householdsPending, segments, router]);

  useEffect(() => {
    if (!isRestoring) void SplashScreen.hideAsync();
  }, [isRestoring]);

  return <Slot />;
}
