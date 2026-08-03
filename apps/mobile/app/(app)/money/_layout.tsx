/**
 * Stack cho tab Tiền.
 *
 * Cùng lý do với `plan/_layout.tsx`: tab này có nhiều màn con
 * (`assets`, `asset/[id]`, `payments`, `payment/[id]`, `history`, `changes`),
 * và không có Stack thì expo-router coi mỗi file là một tab con — 05 §2 chốt
 * đúng bốn tab.
 *
 * Màn danh sách con CÓ header với tiêu đề: khác `plan/`, người dùng tới đây
 * bằng cách chạm một dòng trên màn tổng quan ("Có thể dùng ngay ›"), nên tiêu
 * đề header là thứ xác nhận họ đã tới đúng chỗ. Màn chi tiết thì để trống —
 * tên khoản đã là dòng chữ to đầu màn hình.
 */

import { Stack } from 'expo-router';

import { vi } from '@/i18n';

/** Header trắng, không bóng đổ — dùng lại cho mọi màn trong stack này. */
const HEADER = {
  headerShown: true,
  headerBackTitle: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#101014',
  headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 },
} as const;

export default function MoneyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="upcoming" options={{ ...HEADER, title: vi.upcoming.title }} />
      <Stack.Screen name="assets" options={{ ...HEADER, title: vi.asset.title }} />
      <Stack.Screen name="payments" options={{ ...HEADER, title: vi.payment.title }} />
      <Stack.Screen name="debts" options={{ ...HEADER, title: vi.debt.title }} />
      <Stack.Screen name="attention" options={{ ...HEADER, title: vi.attention.title }} />
      <Stack.Screen name="history" options={{ ...HEADER, title: vi.money.historyTitle }} />
      <Stack.Screen name="changes" options={{ ...HEADER, title: vi.money.changesTitle }} />
      <Stack.Screen name="goals" options={{ ...HEADER, title: vi.goal.title }} />
      <Stack.Screen name="fund" options={{ ...HEADER, title: vi.fund.title }} />
      <Stack.Screen name="asset/[id]" options={{ ...HEADER, title: '' }} />
      <Stack.Screen name="payment/[id]" options={{ ...HEADER, title: '' }} />
      <Stack.Screen name="debt/[id]" options={{ ...HEADER, title: '' }} />
      <Stack.Screen name="goal/[id]" options={{ ...HEADER, title: '' }} />
      <Stack.Screen name="fund/[id]" options={{ ...HEADER, title: '' }} />
    </Stack>
  );
}
