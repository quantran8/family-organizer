/**
 * Chọn ngày cho việc nhà.
 *
 * CỐ Ý không dùng `@react-native-community/datetimepicker`: nó là native module,
 * cần build lại app, và G3 mới kiểm được bundle hiện tại. Quan trọng hơn — với
 * việc nhà, gần như mọi ngày cần chọn là "hôm nay / mai / cuối tuần", và một
 * bánh xe lịch bắt cuộn qua 30 ngày để chọn "ngày mai" là chậm hơn một chạm.
 *
 * Ba chip nhanh + một hàng ngày kế tiếp. Ngày xa hơn hai tuần thì gõ thẳng —
 * ô nhập `YYYY-MM-DD` nằm sau nút cuối, hiếm dùng nhưng không được thiếu.
 *
 * Số học ngày đi qua `addDays` của domain, KHÔNG qua `new Date()`: cả app neo
 * vào UTC+7 và `new Date()` phân giải theo múi giờ máy (xem date/civil.ts).
 */

import { addDays, compareISODate, parseISODate, weekdayOf, type ISODate } from '@family-organizer/domain';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useT, weekdayShort } from '@/i18n';

export interface DatePickerProps {
  value: ISODate | null;
  onChange: (next: ISODate | null) => void;
  /** Hôm nay, truyền vào tường minh — component không đọc đồng hồ. */
  today: ISODate;
}

/** Chủ nhật gần nhất tính từ `d`; nếu `d` đã là Chủ nhật thì lấy chính nó. */
function nextWeekend(d: ISODate): ISODate {
  const wd = weekdayOf(d);
  return wd === 0 ? d : addDays(d, 7 - wd);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DatePicker({ value, onChange, today }: DatePickerProps) {
  const { t } = useT();
  const [typed, setTyped] = useState(false);

  const quick: { label: string; date: ISODate }[] = [
    { label: t.dueLabel.today, date: today },
    { label: t.dueLabel.tomorrow, date: addDays(today, 1) },
    { label: t.home.sectionWeekend, date: nextWeekend(today) },
  ];

  // Bảy ngày kế tiếp, bỏ những ngày đã có mặt trong chip nhanh để không hiện
  // cùng một ngày hai lần với hai cái tên khác nhau.
  const upcoming: ISODate[] = [];
  for (let i = 0; i < 14 && upcoming.length < 7; i += 1) {
    const d = addDays(today, i + 2);
    if (!quick.some((q) => q.date === d)) upcoming.push(d);
  }

  const select = (d: ISODate): void => {
    // Chạm lại chính ngày đang chọn = bỏ chọn. Việc không có hạn là trạng thái
    // hợp lệ ("Không có hạn" là một nhóm thật), nên phải quay về được.
    onChange(value === d ? null : d);
  };

  const isCustom =
    value !== null && !quick.some((q) => q.date === value) && !upcoming.includes(value);

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {quick.map((q) => (
          <Chip key={q.date} label={q.label} active={value === q.date} onPress={() => select(q.date)} />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {upcoming.map((d) => {
          const c = parseISODate(d);
          return (
            <Chip
              key={d}
              label={`${weekdayShort(weekdayOf(d))} ${c.day}/${c.month}`}
              active={value === d}
              onPress={() => select(d)}
            />
          );
        })}
        <Chip
          label={t.common.add}
          active={isCustom}
          onPress={() => setTyped((s) => !s)}
        />
      </View>

      {typed || isCustom ? (
        <TextInput
          value={value ?? ''}
          onChangeText={(raw) => {
            if (raw === '') {
              onChange(null);
              return;
            }
            // Chỉ nhận khi đã đủ hình dạng VÀ parse được — `parseISODate` ném
            // với ngày như 2026-02-30, và một ngày không tồn tại đi xuống DB sẽ
            // hỏng ở tận nơi ghi.
            if (!ISO_RE.test(raw)) return;
            try {
              parseISODate(raw);
              onChange(raw);
            } catch {
              /* chưa hợp lệ — giữ nguyên giá trị cũ, không báo lỗi khi đang gõ */
            }
          }}
          placeholder="2026-12-31"
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.task.fieldDueDate}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
        />
      ) : null}

      {/* Nhãn xác nhận: chip đang sáng đã nói "cái nào", dòng này nói "ngày mấy". */}
      {value !== null ? (
        <Text className="text-caption text-subtle">
          {`${weekdayShort(weekdayOf(value))} ${parseISODate(value).day}/${parseISODate(value).month}/${parseISODate(value).year}`}
        </Text>
      ) : null}

      {value !== null && compareISODate(value, today) < 0 ? (
        <Text className="text-caption text-attention">{t.task.groupOverdue}</Text>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-touch justify-center rounded-full border px-4 ${
        active ? 'border-brand bg-brand-soft' : 'border-line bg-white active:bg-soft'
      }`}
    >
      <Text className={`text-label font-medium ${active ? 'text-brand-deep' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
