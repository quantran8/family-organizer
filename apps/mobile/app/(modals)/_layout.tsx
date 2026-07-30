import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        // Sheet trượt lên, không phải màn hình đầy — thêm một việc là thao tác
        // phụ, không phải rời khỏi chỗ đang đứng (design.md §9).
        presentation: 'modal',
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    />
  );
}
