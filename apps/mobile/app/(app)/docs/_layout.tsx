/**
 * Stack cho tab Giấy tờ.
 *
 * Cùng lý do với `money/_layout.tsx` và `plan/_layout.tsx`: thêm `docs/[id]`
 * mà không có Stack thì expo-router coi mỗi file trong thư mục là một tab con,
 * và tab bar mọc thêm một mục. 05 §2 chốt đúng bốn tab.
 *
 * Màn chi tiết để tiêu đề TRỐNG: tên giấy tờ đã là dòng chữ to đầu màn hình, và
 * lặp lại nó trên header là nói cùng một điều hai lần trong một tầm mắt
 * (design.md §19 — "no fact is repeated across title, subtitle, and badge").
 */

import { Stack } from 'expo-router';

const HEADER = {
  headerShown: true,
  headerBackTitle: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#101014',
  headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 },
} as const;

export default function DocsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ ...HEADER, title: '' }} />
    </Stack>
  );
}
