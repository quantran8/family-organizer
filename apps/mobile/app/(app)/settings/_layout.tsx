/**
 * Stack Cài đặt.
 *
 * Cài đặt KHÔNG chiếm một tab (05 §2) — đúng bốn nhóm thông tin trên tab bar,
 * không thêm. Vào qua avatar ở header màn Nhà mình.
 *
 * Nằm trong `(app)/` chứ không thành nhóm riêng: mọi màn ở đây đọc dữ liệu của
 * nhà, nên chúng phải nằm sau cùng một cổng household mà `(app)/_layout.tsx`
 * đảm bảo. Đặt ngoài thì `useHouseholdId()` sẽ ném.
 *
 * `href: null` ở tab: thư mục này nằm cạnh bốn tab thật nên expo-router mặc
 * định mọc thêm một mục — khai ở `(app)/_layout.tsx` để giấu nó đi.
 */

import { Stack } from 'expo-router';

import { vi } from '@/i18n';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#101014',
        headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 },
        headerBackTitle: '',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" options={{ title: vi.settings.title }} />
      <Stack.Screen name="household" options={{ title: vi.settings.household }} />
      <Stack.Screen name="invite" options={{ title: vi.settings.inviteTitle }} />
    </Stack>
  );
}
