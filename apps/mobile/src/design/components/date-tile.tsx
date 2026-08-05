/**
 * Ô ngày nhỏ — design.md §13.4.
 *
 * Thay `DateBlock` của 04: KHÔNG còn khối lịch bloc sơn mài. Đây là một ô bo góc
 * đứng đầu mỗi dòng sự kiện, và là **MỐC QUÉT** của dòng — mắt tìm ngày trước,
 * rồi mới đọc tên sự kiện. Vì thế mọi dòng trong một danh sách phải xếp ô này
 * thẳng cột; đó là lý do nó có kích thước cố định chứ không co theo nội dung.
 *
 * Với sự kiện âm lịch, ô này hiện ngày DƯƠNG (ngày người ta thật sự đến), còn
 * ngày âm nằm ở dòng phụ bên cạnh — cả hai luôn hiện cùng nhau (05 §5.3).
 *
 * **Thứ nhỏ nằm TRÊN, số ngày nằm DƯỚI** — thứ tự này ngược với bản trước (số
 * ngày trên, nhãn tháng dưới) và đó là chủ ý: trong một danh sách đã chia nhóm
 * theo tháng, tháng là thông tin đã biết còn thứ thì không. Nhãn tháng lặp lại
 * y hệt ở mọi dòng của một nhóm là một mẩu chữ không mang tin nào.
 */

import { Text, View } from 'react-native';

export interface DateTileProps {
  /** Số ngày, ví dụ `5`. Hiện hai chữ số (`05`) để các dòng thẳng cột. */
  day: number;
  /** Thứ viết tắt đã dựng sẵn ở i18n, ví dụ `"T6"` / `"CN"`. */
  weekdayLabel: string;
  tone?: 'default' | 'event' | 'soft';
}

const TONE = {
  default: { box: 'bg-soft', day: 'text-ink', weekday: 'text-muted' },
  // Ngày là MỐC QUÉT của một dòng sự kiện (§13.4), nên nó được mang accent —
  // đây đúng là chỗ §5.3 dành cho màu này: một ô nhỏ, có nghĩa, không phải nền
  // của cả module. Chữ trên ô là `accent-ink` vì nền sáng.
  //
  // CHỈ dùng cho MỘT dòng trong cả danh sách (sự kiện gần nhất). Tô accent cho
  // mọi dòng thì không dòng nào nổi, và một danh sách mười ô chanh đã vượt
  // ngưỡng 8–10% một viewport của §5.3.
  event: { box: 'bg-accent', day: 'text-accent-ink', weekday: 'text-accent-ink' },
  // Bản nhạt hơn cho chỗ đã có accent ở gần — hai mảng accent cạnh nhau trong
  // một viewport là quá ngưỡng của §5.3.
  soft: { box: 'bg-accent-soft', day: 'text-ink', weekday: 'text-muted' },
} as const;

export function DateTile({ day, weekdayLabel, tone = 'default' }: DateTileProps) {
  const c = TONE[tone];
  return (
    // 56×64, bo 16 (§8: ô ngày 16–18px). Kích thước CỐ ĐỊNH, không co theo nội
    // dung: đây là cột neo của danh sách, và một ô rộng 52px cạnh một ô rộng
    // 58px làm cả cột lệch.
    <View className={`h-16 w-14 items-center justify-center rounded-weekday ${c.box}`}>
      <Text className={`text-micro font-semibold ${c.weekday}`}>{weekdayLabel}</Text>
      <Text
        className={`mt-1 text-title2 font-semibold tracking-[-0.8px] ${c.day}`}
        // `tabular-nums`: "11" và "30" phải rộng bằng nhau, nếu không số ngày
        // nhảy trái-phải giữa các dòng và cột neo mất tác dụng.
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {day < 10 ? `0${day}` : day}
      </Text>
    </View>
  );
}
