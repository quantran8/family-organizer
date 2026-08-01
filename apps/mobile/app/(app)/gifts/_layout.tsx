/**
 * Stack cho Sổ mừng.
 *
 * Cùng lý do với `docs/_layout.tsx`: không có Stack thì mỗi file trong thư mục
 * thành một tab con. 05 §2 chốt đúng bốn tab.
 */

import { Stack } from 'expo-router';

import { vi } from '@/i18n';

const HEADER = {
  headerShown: true,
  headerBackTitle: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#101014',
  headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 },
} as const;

export default function GiftsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" options={{ ...HEADER, title: vi.gift.title }} />
      <Stack.Screen name="bulk" options={{ ...HEADER, title: vi.gift.bulkTitle }} />
      {/* Tiêu đề TRỐNG: tên nhà đã là dòng chữ to đầu màn hình. */}
      <Stack.Screen name="[contactId]" options={{ ...HEADER, title: '' }} />
    </Stack>
  );
}
