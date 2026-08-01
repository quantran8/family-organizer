/**
 * Stack cho Hồ sơ con.
 *
 * Cùng lý do với `docs/_layout.tsx`: không có Stack thì expo-router coi mỗi file
 * trong thư mục là một tab con và tab bar mọc thêm mục. 05 §2 chốt đúng bốn tab.
 *
 * Màn hồ sơ để tiêu đề TRỐNG: tên bé đã là dòng chữ to đầu màn hình, lặp lại nó
 * trên header là nói cùng một điều hai lần trong một tầm mắt.
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

export default function ChildLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" options={{ ...HEADER, title: vi.child.listTitle }} />
      <Stack.Screen name="[memberId]/index" options={{ ...HEADER, title: '' }} />
      <Stack.Screen
        name="[memberId]/growth"
        options={{ ...HEADER, title: vi.child.growthTitle }}
      />
    </Stack>
  );
}
