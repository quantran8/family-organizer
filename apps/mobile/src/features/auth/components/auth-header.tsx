/**
 * Đầu màn Đăng nhập / Đăng ký — dòng nhỏ + tiêu đề + một câu giải thích.
 *
 * Nằm ở `features/auth/components/` chứ không phải `design/components/`: nó
 * chỉ có hai chỗ dùng và cả hai đều trong auth (ranh giới ở `design/components/
 * index.ts` — *feature thứ hai có dùng nó không?*).
 *
 * Dòng eyebrow mang màu brand, và đó là mảng màu DUY NHẤT của màn (design.md
 * §5.5): nút chính vẫn đen, ô nhập vẫn viền `line`. Không thêm ô logo tô nền
 * brand như bản HTML mẫu — cộng với eyebrow là hai mảng brand trên cùng một
 * màn, mà tiêu đề mới là thứ cần đọc trước.
 */

import { Text, View } from 'react-native';

export interface AuthHeaderProps {
  eyebrow: string;
  title: string;
  body: string;
}

export function AuthHeader({ eyebrow, title, body }: AuthHeaderProps) {
  return (
    <View className="mb-8">
      <Text className="mb-2 text-label font-semibold text-brand">{eyebrow}</Text>
      <Text className="text-display font-semibold text-ink">{title}</Text>
      <Text className="mt-3 text-body text-muted">{body}</Text>
    </View>
  );
}
