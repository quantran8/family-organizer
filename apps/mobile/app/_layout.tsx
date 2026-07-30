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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { createQueryClient, persistOptions } from '@/data/queries/client';
import { authRepository } from '@/features/auth/repository';
import { useMyHouseholds } from '@/features/auth/queries/use-auth';
import { useSessionStore } from '@/stores/session';

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.warn('[bootstrap] Không thể giữ splash screen:', error);
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
  });
  const queryClient = useMemo(() => createQueryClient(), []);

  useEffect(() => {
    if (fontError) {
      // Font tuỳ biến không được phép chặn toàn bộ ứng dụng. React Native sẽ
      // dùng system font cho tới khi cấu hình asset được sửa.
      console.warn('[bootstrap] Không tải được Be Vietnam Pro:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // GestureHandlerRootView phải bọc NGOÀI CÙNG: thiếu nó thì `Swipeable` trên
    // từng dòng việc (vuốt để hoãn / xoá) im lặng không phản ứng trên Android —
    // không lỗi, không cảnh báo, chỉ là cử chỉ không bao giờ chạy.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <StatusBar style="dark" />
          <AuthGate />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
    void authRepository
      .getSession()
      .then((s) => {
        if (active) setSession(s);
      })
      .catch((error: unknown) => {
        // AsyncStorage/session hỏng không được giữ người dùng ở splash mãi.
        // Xem như chưa đăng nhập; màn sign-in vẫn cho họ phục hồi bình thường.
        console.warn('[bootstrap] Không thể khôi phục phiên đăng nhập:', error);
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setRestored();
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

  const firstHousehold = households?.[0];
  const effectiveHouseholdId = householdId ?? firstHousehold?.householdId ?? null;
  const isReady = !isRestoring && (!session || !householdsPending);

  useEffect(() => {
    if (!isReady) return;
    // Chờ biết có nhà hay không rồi mới điều hướng — điều hướng sớm sẽ đẩy
    // người đã có nhà sang màn setup rồi mới giật ngược lại.

    const path: string[] = segments;
    const inAuth = path[0] === '(auth)';
    const atRoot = path.length === 0;

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }
    if (!effectiveHouseholdId) {
      // Trừ join/[code]: người nhận lời mời đi thẳng vào đó, không qua setup —
      // route đó tự đổi mã lấy nhà, đẩy về setup sẽ làm mất mã trong deep link.
      if (path[1] !== 'join') router.replace('/(auth)/setup');
      return;
    }
    if (inAuth || atRoot) router.replace('/(app)/home');
  }, [isReady, session, effectiveHouseholdId, segments, router]);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.warn('[bootstrap] Không thể ẩn splash screen:', error);
      });
    }
  }, [isReady]);

  return <Slot />;
}
