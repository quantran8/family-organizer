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
 */

import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useT } from '@/i18n';

const ICON = { home: '⌂', plan: '☰', money: '₫', docs: '⧉' } as const;

export default function AppLayout() {
  const { t } = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7457E8',
        tabBarInactiveTintColor: '#96968F',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#EAEAE5' },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'BeVietnamPro_500Medium' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t.tabs.home, tabBarIcon: ({ color }) => <TabIcon glyph={ICON.home} color={color} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: t.tabs.plan, tabBarIcon: ({ color }) => <TabIcon glyph={ICON.plan} color={color} /> }}
      />
      <Tabs.Screen
        name="money"
        options={{ title: t.tabs.money, tabBarIcon: ({ color }) => <TabIcon glyph={ICON.money} color={color} /> }}
      />
      <Tabs.Screen
        name="docs"
        options={{ title: t.tabs.docs, tabBarIcon: ({ color }) => <TabIcon glyph={ICON.docs} color={color} /> }}
      />
    </Tabs>
  );
}

/**
 * Icon tạm bằng ký tự.
 *
 * Bộ icon thật (SVG qua react-native-svg) làm ở cuối G3 — dựng luồng trước, tô
 * sau: một tab bar có icon đẹp mà không đi tới đâu thì không kiểm được gì.
 */
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}
