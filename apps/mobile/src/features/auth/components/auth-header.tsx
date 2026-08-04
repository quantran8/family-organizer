/**
 * Đầu màn Đăng nhập / Đăng ký — dòng nhỏ + tiêu đề + một câu giải thích.
 *
 * Nằm ở `features/auth/components/` chứ không phải `design/components/`: nó
 * chỉ có hai chỗ dùng và cả hai đều trong auth (ranh giới ở `design/components/
 * index.ts` — *feature thứ hai có dùng nó không?*).
 *
 * Eyebrow phân cấp bằng CỠ CHỮ và màu `muted`, không bằng màu nhấn: accent là
 * màu nền (§5.3), không dùng được làm chữ trên nền trắng. Cả màn không có mảng
 * màu nào — nút chính vẫn đen, ô nhập vẫn viền `line` — và đó là chủ ý: đây là
 * màn hình người dùng chỉ đi qua một lần, thứ cần nổi là tiêu đề.
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
      <Text className="mb-2 text-label font-semibold text-muted">{eyebrow}</Text>
      <Text className="text-display font-semibold text-ink">{title}</Text>
      <Text className="mt-3 text-body text-muted">{body}</Text>
    </View>
  );
}
