/**
 * Stack cho tab Việc & Sự kiện.
 *
 * Cần một Stack vì tab này có màn con (`task/[id]`, và `event/[id]` ở G6). Không
 * có nó, expo-router coi mọi file trong thư mục là một tab con và tab bar mọc
 * thêm mục — 05 §2 chốt đúng bốn tab.
 *
 * `headerShown` chỉ bật ở màn chi tiết: danh sách có tiêu đề của riêng nó, còn
 * màn chi tiết cần nút quay lại của hệ thống ("quay lại đúng chỗ đã đi tới",
 * 05 §Quy ước điều hướng).
 */

import { Stack } from 'expo-router';

export default function PlanLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="task/[id]"
        options={{
          headerShown: true,
          // Tiêu đề để trống: tên việc đã là dòng chữ to đầu tiên của màn hình,
          // và lặp lại nó trên header chỉ chiếm chỗ.
          title: '',
          headerBackTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#101014',
        }}
      />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#101014',
        }}
      />
    </Stack>
  );
}
