/**
 * Ô ngày nhỏ — design.md §13.4.
 *
 * Thay `DateBlock` của 04: KHÔNG còn khối lịch bloc sơn mài. Đây là một ô vuông
 * bo góc dùng trong các dòng sự kiện, và là MỐC QUÉT của dòng — mắt tìm ngày
 * trước, rồi mới đọc tên sự kiện.
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
  tone?: 'default' | 'event' | 'soft';
}

const TONE = {
  default: { box: 'bg-soft', day: 'text-ink', month: 'text-muted' },
  // Ngày là MỐC QUÉT của một dòng sự kiện (§13.4), nên nó được mang accent —
  // đây đúng là chỗ §5.3 dành cho màu này: một ô nhỏ, có nghĩa, không phải nền
  // của cả module. Chữ trên ô là `accent-ink` vì nền sáng.
  event: { box: 'bg-accent', day: 'text-accent-ink', month: 'text-accent-ink/70' },
  // Bản nhạt hơn cho chỗ đã có accent ở gần — hai mảng accent cạnh nhau trong
  // một viewport là quá ngưỡng 8–10% của §5.3.
  soft: { box: 'bg-accent-soft', day: 'text-ink', month: 'text-muted' },
} as const;

export function DateTile({ day, monthLabel, tone = 'default' }: DateTileProps) {
  const c = TONE[tone];
  return (
    // §8: ô ngày bo 16–18px, khác `rounded-icon` (14px) của ô icon thường.
    <View className={`h-12 w-12 items-center justify-center rounded-date ${c.box}`}>
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
