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

import { TabIcon } from '@/design/components';
import { useT } from '@/i18n';

export default function AppLayout() {
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6257F6',
        tabBarInactiveTintColor: '#A4A4AD',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#ECECF0' },
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
        Cài đặt KHÔNG chiếm một tab (05 §2) — đúng bốn nhóm thông tin, không
        thêm. Nhưng thư mục `settings/` nằm cạnh bốn tab kia nên expo-router
        mặc định mọc thêm mục thứ năm; `href: null` giấu nó đi mà vẫn giữ
        route điều hướng tới được. Vào qua avatar ở header màn Nhà mình.
      */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      {/*
        Hai module bản địa (G15) — cùng lý do với `settings`: thư mục nằm cạnh
        bốn tab nên expo-router mọc thêm mục, `href: null` giấu đi mà vẫn điều
        hướng tới được.

        Sổ mừng vào qua tab Tiền; Hồ sơ con vào qua tab Giấy tờ hoặc từ dòng mũi
        tiêm sắp tới trên Nhà mình (07 §4.5). Cả hai đều KHÔNG xứng một tab: sổ
        mừng chỉ dùng vài lần một năm quanh mùa cưới, và hồ sơ con chỉ có nghĩa
        với nhà đang có con nhỏ.
      */}
      <Tabs.Screen name="gifts" options={{ href: null }} />
      <Tabs.Screen name="child" options={{ href: null }} />
    </Tabs>
  );
}
