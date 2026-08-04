/**
 * Tab bar — 4 tab (05 §2).
 *
 * `design.md §10` vẽ 5 mục (Nhà mình · Lịch · [+] · Giấy tờ · Tài khoản) nhưng
 * đó là mô tả một bản demo HTML tĩnh; `05 §2` là spec chức năng nên nó thắng.
 * `[+]` là FAB nổi trên nội dung, KHÔNG phải một tab — nó không dẫn tới màn hình
 * nào, nó mở sheet. Cài đặt vào qua avatar ở header, không chiếm một tab.
 *
 * Badge: CHỈ trên tab Tiền, CHỈ khi trạng thái `tight`, và không đếm số. Một
 * con số đỏ trên tab Việc biến việc nhà thành danh sách nợ phải trả.
 *
 * Icon dùng `TabIcon` (Ionicons) chứ không phải `Icon` (Feather) như phần còn
 * lại của app: tab đang mở phải đổi HÌNH sang nét đặc, không chỉ đổi màu
 * (design.md §11.2, và §15 cấm dùng màu một mình) — mà Feather không có bản đặc.
 * Xem chú thích ở `design/components/icon.tsx`.
 */

import { Tabs } from 'expo-router';

import { ICON_COLOR, TabIcon } from '@/design/components';
import { useT } from '@/i18n';

export default function AppLayout() {
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Tab đang mở màu ĐEN, không phải accent (design.md §11.2): accent là
        // màu nền, một nhãn 11px tô chanh trên nền trắng thì không đọc được.
        // Việc phân biệt vẫn không dựa vào màu một mình — `TabIcon` đổi sang
        // nét ĐẶC khi focused (§11.2, §15).
        tabBarActiveTintColor: ICON_COLOR.ink,
        tabBarInactiveTintColor: ICON_COLOR.subtle,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#ECECEE' },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'BeVietnamPro_500Medium' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t.tabs.plan,
          tabBarIcon: ({ color, focused }) => <TabIcon name="plan" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: t.tabs.money,
          tabBarIcon: ({ color, focused }) => <TabIcon name="money" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="docs"
        options={{
          title: t.tabs.docs,
          tabBarIcon: ({ color, focused }) => <TabIcon name="docs" color={color} focused={focused} />,
        }}
      />
      {/*
        Không còn `href: null` cho `settings` / `gifts` / `child`: ba nhóm đó đã
        ra khỏi thư mục này (lên Stack ở `(app)/_layout.tsx`), nên expo-router
        không còn thấy chúng cạnh bốn tab để mà mọc thêm mục thứ năm.
      */}
    </Tabs>
  );
}
