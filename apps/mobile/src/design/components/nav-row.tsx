/**
 * Một dòng dẫn sang màn khác — dùng ở Cài đặt.
 *
 * Tách khỏi `Row` (thuần bố cục, không bấm được) vì nó có ba thứ `Row` không
 * có: vai trò `button` cho trình đọc màn hình, mũi tên chỉ hướng, và giá trị
 * hiện tại bên phải.
 *
 * `value` là câu trả lời cho "mục này đang đặt là gì" — hiện nó ngay trên dòng
 * để người dùng không phải mở từng màn ra xem. Đây là khác biệt giữa một danh
 * sách cài đặt đọc được trong ba giây và một danh sách phải khám phá.
 */

import { Pressable, Text } from 'react-native';

export interface NavRowProps {
  label: string;
  /** Giá trị hiện tại, hiện mờ bên phải. */
  value?: string | null;
  onPress: () => void;
  /** Dòng cuối nhóm thì bỏ đường kẻ. */
  last?: boolean;
}

export function NavRow({ label, value, onPress, last = false }: NavRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      onPress={onPress}
      className={`min-h-touch flex-row items-center gap-3 py-3.5 active:bg-subtle ${
        last ? '' : 'border-b border-line'
      }`}
    >
      <Text className="flex-1 text-body text-ink">{label}</Text>
      {value ? (
        <Text numberOfLines={1} className="max-w-[55%] text-body text-tertiary">
          {value}
        </Text>
      ) : null}
      <Text className="text-body text-line-strong">›</Text>
    </Pressable>
  );
}
