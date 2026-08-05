/**
 * Stack bọc NGOÀI tab bar — chỗ mọi màn chi tiết được đẩy lên.
 *
 * Đây là điều khiến tab bar biến mất khi đi sâu, mà không cần ẩn nó: màn chi
 * tiết không nằm trong tab navigator nữa, nó nằm TRÊN cả tab navigator. Tab bar
 * không phải giấu đi — nó ở lại đúng chỗ, bên dưới.
 *
 * Vì sao KHÔNG ẩn bằng `tabBarStyle`: cách đó buộc phải xoá tab bar khỏi một cây
 * mà nó vẫn thuộc về, và mọi biến thể đều hỏng một kiểu — `display: 'none'` để
 * lại phần đệm ~83px vì `getTabBarHeight` chỉ đọc `height`; vá bằng `height: 0`
 * thì `onLayout` không bắn nữa nên animation hiện lại chạy sai quãng; còn đọc
 * route để đổi style thì hoặc bị `useRouteCache` chặn (`options` không được gọi
 * lại), hoặc chỉ biết sau khi transition xong (`useSegments` cập nhật trong
 * `store.onStateChange`) nên tab bar hiện lại trễ. Đổi hình dạng cây thì không
 * còn thứ nào trong số đó tồn tại.
 *
 * Đường dẫn KHÔNG đổi: `(tabs)` là route group nên nó vô hình với URL —
 * `/(app)/plan/event/1` vẫn đúng như trước khi tách.
 */

import { Stack } from 'expo-router';

import { vi } from '@/i18n';

/** Header trắng, không bóng đổ — dùng lại cho mọi màn chi tiết trong stack này. */
const HEADER = {
  headerShown: true,
  // Chỉ mũi tên, không chữ. KHÔNG dùng `headerBackTitle: ''` cho việc này —
  // chuỗi rỗng là falsy nên bị bỏ qua, và nhãn rơi về mặc định là tên route
  // trước đó ("(tabs)"). `'minimal'` mới là option ép ẩn chữ (typings:
  // "Always displays only the icon without a title").
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#101014',
  headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 },
} as const;

/** Màn chi tiết để tiêu đề TRỐNG: tên khoản đã là dòng chữ to đầu màn hình. */
const DETAIL = { ...HEADER, title: '' } as const;

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      {/* Tab bar là MỘT màn của stack này, không phải cấp bọc ngoài. */}
      <Stack.Screen name="(tabs)" />

      {/* Sự kiện — trung tâm ngữ cảnh (việc, chi phí, giấy tờ quanh một dịp).
          KHÔNG còn `plan/task/[id]`: sửa việc giờ là modal `(modals)/task-edit`
          (09 §D.4), và sửa chính sự kiện là modal `(modals)/event-form`. */}
      <Stack.Screen name="plan/event/[id]" options={DETAIL} />

      {/*
        Tiền — màn danh sách CÓ tiêu đề: người dùng tới đây bằng cách chạm một
        dòng trên màn tổng quan ("Có thể dùng ngay ›"), nên tiêu đề header là
        thứ xác nhận họ đã tới đúng chỗ.
      */}
      <Stack.Screen name="money/upcoming" options={{ ...HEADER, title: vi.upcoming.title }} />
      <Stack.Screen name="money/assets" options={{ ...HEADER, title: vi.asset.title }} />
      <Stack.Screen name="money/payments" options={{ ...HEADER, title: vi.payment.title }} />
      <Stack.Screen name="money/debts" options={{ ...HEADER, title: vi.debt.title }} />
      <Stack.Screen name="money/attention" options={{ ...HEADER, title: vi.attention.title }} />
      <Stack.Screen name="money/history" options={{ ...HEADER, title: vi.money.historyTitle }} />
      <Stack.Screen name="money/changes" options={{ ...HEADER, title: vi.money.changesTitle }} />
      <Stack.Screen name="money/goals" options={{ ...HEADER, title: vi.goal.title }} />
      <Stack.Screen name="money/fund" options={{ ...HEADER, title: vi.fund.title }} />
      <Stack.Screen name="money/asset/[id]" options={DETAIL} />
      <Stack.Screen name="money/payment/[id]" options={DETAIL} />
      <Stack.Screen name="money/debt/[id]" options={DETAIL} />
      <Stack.Screen name="money/goal/[id]" options={DETAIL} />
      <Stack.Screen name="money/fund/[id]" options={DETAIL} />

      {/* Giấy tờ */}
      <Stack.Screen name="docs/[id]" options={DETAIL} />

      {/*
        Ba nhóm không chiếm tab (05 §2). Trước đây chúng phải khai `href: null`
        để expo-router khỏi mọc thêm mục thứ năm trên tab bar; giờ chúng nằm
        ngoài Tabs nên chuyện đó không còn đặt ra nữa.

        Sổ mừng vào qua tab Tiền; Hồ sơ con vào qua tab Giấy tờ hoặc từ dòng mũi
        tiêm sắp tới trên Nhà mình (07 §4.5). Cài đặt vào qua avatar ở header.
      */}
      <Stack.Screen name="settings/index" options={{ ...HEADER, title: vi.settings.title }} />
      <Stack.Screen name="settings/household" options={{ ...HEADER, title: vi.settings.household }} />
      <Stack.Screen name="settings/invite" options={{ ...HEADER, title: vi.settings.inviteTitle }} />

      <Stack.Screen name="gifts/index" options={{ ...HEADER, title: vi.gift.title }} />
      <Stack.Screen name="gifts/bulk" options={{ ...HEADER, title: vi.gift.bulkTitle }} />
      <Stack.Screen name="gifts/[contactId]" options={DETAIL} />

      <Stack.Screen name="child/index" options={{ ...HEADER, title: vi.child.listTitle }} />
      <Stack.Screen name="child/[memberId]/index" options={DETAIL} />
      <Stack.Screen name="child/[memberId]/growth" options={{ ...HEADER, title: vi.child.growthTitle }} />
    </Stack>
  );
}
