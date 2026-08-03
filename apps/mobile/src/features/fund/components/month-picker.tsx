/**
 * Bộ chọn tháng của màn quỹ — 09 §E.9.
 *
 * `‹  THÁNG 9, 2026  ›`
 *
 * Vai trò của nó KHÔNG chỉ là điều hướng: nó là thứ làm khối «Người bỏ vào» bên
 * dưới hợp lệ. Ngoại lệ 03 §9 chỉ đúng khi tháng đang xem hiện rõ ngay phía
 * trên con số — người đọc phải thấy "tháng 9" cùng lúc với "Anh 10tr, Em 10tr",
 * nếu không con số đó trôi thành một tổng không có biên.
 *
 * Mũi tên đi được sang tháng chưa có bản ghi: danh sách khi đó hiện "Tháng này
 * chưa ghi khoản nào". Chặn mũi tên ở tháng cuối cùng có dữ liệu sẽ làm người
 * dùng tưởng app hỏng.
 */

import type { ISODate } from '@family-organizer/domain';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/design/components';
import { useT } from '@/i18n';

export interface MonthPickerProps {
  /** Ngày đầu tháng đang xem. */
  month: ISODate;
  onChange: (next: ISODate) => void;
}

/** Ngày đầu tháng, dịch `delta` tháng. Tự cuộn năm. */
function shiftMonth(month: ISODate, delta: number): ISODate {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const total = year * 12 + (m - 1) + delta;
  const y2 = Math.floor(total / 12);
  const m2 = (total % 12) + 1;
  return `${y2}-${String(m2).padStart(2, '0')}-01`;
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const { t, f } = useT();
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));

  return (
    <View className="min-h-touch flex-row items-center justify-between">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.previousMonth}
        className="min-h-touch min-w-touch items-center justify-center"
        onPress={() => onChange(shiftMonth(month, -1))}
      >
        <Icon name="previous" />
      </Pressable>

      <Text className="text-label font-semibold uppercase text-muted">
        {f(t.money.monthLabelWithYear, { month: m, year })}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.nextMonth}
        className="min-h-touch min-w-touch items-center justify-center"
        onPress={() => onChange(shiftMonth(month, 1))}
      >
        <Icon name="chevron" />
      </Pressable>
    </View>
  );
}
