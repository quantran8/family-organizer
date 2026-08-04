/**
 * Chọn ngày ÂM — thành phần cẩn thận nhất của cả app (05 §5.5).
 *
 * Dòng xem trước là lý do tồn tại của component này, không phải một chi tiết
 * thêm vào: *"Không có dòng xem trước đó, người dùng sẽ không tin app hiểu lịch
 * âm — và mất niềm tin ở đúng tính năng khác biệt nhất."*
 *
 * Xem trước tính Ở CLIENT bằng `nextLunarOccurrence`. Điều này KHÔNG mâu thuẫn
 * với ràng buộc "chỉ một nơi ghi `next_occurrence_date`" (03 §3): ở đây chỉ
 * HIỂN THỊ, không có đường nào từ dòng chữ này xuống DB. Chính vì vậy chú thích
 * dưới đây phải còn nguyên — ai đó sẽ nghĩ "đã tính rồi thì lưu luôn cho nhanh".
 *
 * Ngày âm 1–30: tháng âm thiếu chỉ có 29 ngày, và `lunarToSolarClamped` kẹp về
 * ngày cuối tháng. Cho chọn 30 là ĐÚNG — người ta nhớ "ba mươi tháng chạp", và
 * năm nào tháng chạp thiếu thì rơi về 29. Chặn ở đây sẽ bắt họ nhớ sai đi.
 */

import { nextLunarOccurrence, weekdayOf } from '@family-organizer/domain';
import { Pressable, Text, View } from 'react-native';

import { lunarPreviewText, useT } from '@/i18n';
import { ChipSelect } from '@/design/components';

export interface LunarDatePickerProps {
  day: number | null;
  month: number | null;
  isLeapMonth: boolean;
  onChange: (v: { day: number | null; month: number | null; isLeapMonth: boolean }) => void;
  /** Hôm nay, truyền vào tường minh — component không đọc đồng hồ. */
  today: string;
}

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function LunarDatePicker({
  day,
  month,
  isLeapMonth,
  onChange,
  today,
}: LunarDatePickerProps) {
  const { t } = useT();

  return (
    <View className="gap-3">
      <View>
        <Text className="mb-1.5 text-label font-medium text-muted">{t.event.fieldLunarDay}</Text>
        <ChipSelect
          scroll
          value={day}
          onChange={(next) => onChange({ day: next, month, isLeapMonth })}
          options={DAYS.map((d) => ({ value: d as number | null, label: String(d) }))}
        />
      </View>

      <View>
        <Text className="mb-1.5 text-label font-medium text-muted">{t.event.fieldLunarMonth}</Text>
        <ChipSelect
          scroll
          value={month}
          onChange={(next) => onChange({ day, month: next, isLeapMonth })}
          options={MONTHS.map((m) => ({ value: m as number | null, label: String(m) }))}
        />
      </View>

      {/*
        Ô tháng nhuận nằm SAU ngày và tháng, và mặc định tắt. Quy tắc 03 §3:
        năm có tháng nhuận trùng mà sự kiện không đánh dấu thì dùng THÁNG
        THƯỜNG — phần lớn giỗ rơi vào trường hợp này, vì người ta nhớ "giỗ ông
        mười lăm tháng tám", không nhớ nhuận hay không.
      */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isLeapMonth }}
        accessibilityLabel={t.event.fieldLeapMonth}
        onPress={() => onChange({ day, month, isLeapMonth: !isLeapMonth })}
        className="min-h-touch flex-row items-center gap-3"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-[6px] border-2 ${
            isLeapMonth ? 'border-accent bg-accent' : 'border-subtle bg-surface'
          }`}
        >
          {isLeapMonth ? (
            <Text className="text-caption font-semibold text-accent-ink">✓</Text>
          ) : null}
        </View>
        <Text className="text-body text-ink">{t.event.fieldLeapMonth}</Text>
      </Pressable>

      <LunarPreview day={day} month={month} isLeapMonth={isLeapMonth} today={today} />
    </View>
  );
}

/**
 * *"Năm nay rơi vào Chủ nhật 5/10"* — 05 §5.5.
 *
 * Hiện NGAY khi đủ ngày và tháng, không chờ bấm gì. Đây là khoảnh khắc người
 * dùng quyết định có tin app hay không.
 */
function LunarPreview({
  day,
  month,
  isLeapMonth,
  today,
}: {
  day: number | null;
  month: number | null;
  isLeapMonth: boolean;
  today: string;
}) {
  if (day === null || month === null) return null;

  let solar: string;
  try {
    solar = nextLunarOccurrence({ day, month, isLeapMonth }, today);
  } catch {
    // `nextLunarOccurrence` ném khi không tìm được lần kế tiếp trong 3 năm âm —
    // gần như chỉ xảy ra với tháng nhuận được đánh dấu ở một tháng không bao
    // giờ nhuận. Im lặng bỏ dòng xem trước còn hơn làm sập cả form.
    return null;
  }

  return (
    // Ngày là một trong bốn thứ §5.3 giao cho accent, nên ô xem trước này dùng
    // `accent-soft` — bản nhạt, vì nó là một khối thông tin đứng yên chứ không
    // phải một trạng thái đang chọn. Trước đây dùng một "màu module sự kiện"
    // riêng, thứ §5.4 nói thẳng là không được làm: một bảng màu-theo-module
    // chạy song song với bảng ngữ nghĩa làm không màu nào còn nghĩa cố định.
    <View className="rounded-control bg-accent-soft px-4 py-3">
      <Text className="text-body text-ink">
        {lunarPreviewText(solar, weekdayOf(solar))}
      </Text>
    </View>
  );
}
