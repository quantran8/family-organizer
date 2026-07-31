/**
 * Gốc của app — nạp font và dựng các provider bọc ngoài toàn bộ cây.
 *
 * CHỈ có vậy. Logic điều hướng (ba nhánh onboarding, mã mời chờ, ẩn splash) nằm
 * ở `AuthGate` trong `features/auth/components/` — nó là nghiệp vụ, không phải
 * khai báo route. File này trả lời đúng một câu: *app có những provider nào và
 * theo thứ tự nào.*
 */

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { createQueryClient, persistOptions } from '@/data/queries/client';
import { AuthGate } from '@/features/auth/components/auth-gate';

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
