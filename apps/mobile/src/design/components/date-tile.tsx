/**
 * Ô ngày nhỏ — design.md §4 (Micro 10–11px).
 *
 * Thay `DateBlock` của 04: KHÔNG còn khối lịch bloc sơn mài. Đây là một ô vuông
 * bo góc, nền nhạt, dùng trong `FeaturedEventCard` và các dòng sự kiện.
 *
 * Với sự kiện âm lịch, ô này hiện ngày DƯƠNG (ngày người ta thật sự đến), còn
 * ngày âm nằm ở dòng phụ bên cạnh — cả hai luôn hiện cùng nhau (05 §5.3).
 */

import { Text, View } from 'react-native';

export interface DateTileProps {
  /** Số ngày, ví dụ `5`. */
  day: number;
  /** Nhãn tháng đã dựng sẵn ở i18n, ví dụ `"TH10"`. */
  monthLabel: string;
  tone?: 'default' | 'event' | 'inverted';
}

const TONE = {
  default: { box: 'bg-soft', day: 'text-ink', month: 'text-muted' },
  // Ngày của một sự kiện = ngữ cảnh thời gian → brand (design.md §5.3), không
  // phải một màu module riêng.
  event: { box: 'bg-brand-soft', day: 'text-brand-deep', month: 'text-brand-deep' },
  // Trên thẻ nổi bật nền tối (design.md §9.3).
  inverted: { box: 'bg-white/15', day: 'text-white', month: 'text-white/70' },
} as const;

export function DateTile({ day, monthLabel, tone = 'default' }: DateTileProps) {
  const c = TONE[tone];
  return (
    <View className={`h-12 w-12 items-center justify-center rounded-icon ${c.box}`}>
      <Text
        className={`text-heading font-semibold ${c.day}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {day}
      </Text>
      <Text className={`text-micro font-medium ${c.month}`}>{monthLabel}</Text>
    </View>
  );
}
