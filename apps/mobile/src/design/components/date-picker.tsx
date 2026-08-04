/**
 * Chọn ngày — bộ chọn CỦA HỆ ĐIỀU HÀNH.
 *
 * Trước đây đây là một lưới chip tự dựng, với lý do: `datetimepicker` là native
 * module cần build lại app, và với việc nhà thì gần như mọi ngày cần chọn là
 * "hôm nay / mai / cuối tuần" nên một bánh xe lịch là chậm hơn một chạm.
 *
 * Vế thứ hai vẫn đúng, nên ba chip nhanh Ở LẠI. Nhưng bánh xe tự dựng thì thua
 * bánh xe hệ thống ở mọi mặt còn lại: cử chỉ, Dynamic Type, VoiceOver, định dạng
 * ngày theo vùng, và quan trọng nhất — nó là thứ người dùng đã biết dùng từ mọi
 * app khác trên máy (design.md §2.2 "familiar controls behave as expected").
 *
 * Nên: chip nhanh cho ba ngày phổ biến, native picker cho mọi ngày còn lại.
 *
 * ── Ranh giới `Date` ↔ `ISODate` ──
 *
 * `DateTimePicker` nói bằng `Date` (có giờ, có múi giờ máy); app nói bằng
 * `ISODate` (chuỗi `YYYY-MM-DD`, neo UTC+7). Chuyển đổi CHỈ xảy ra trong file
 * này, ở hai hàm dưới, và luôn đọc/ghi thành phần LỊCH ĐỊA PHƯƠNG của `Date` —
 * không bao giờ `toISOString()`, vì nó quy về UTC và làm lệch một ngày với mọi
 * người dùng ở phía đông GMT sau 17:00 giờ Việt Nam.
 */

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  addDays,
  compareISODate,
  formatISODate,
  parseISODate,
  weekdayOf,
  type ISODate,
} from '@family-organizer/domain';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useT, weekdayShort } from '@/i18n';

import { Icon, ICON_COLOR } from './icon';

export interface DatePickerProps {
  value: ISODate | null;
  onChange: (next: ISODate | null) => void;
  /** Hôm nay, truyền vào tường minh — component không đọc đồng hồ. */
  today: ISODate;
  /** Chỉ hiện native picker, không hiện chip nhanh hay dòng "Ngày khác". */
  nativeOnly?: boolean;
  /** Android tự đóng dialog sau khi chọn/huỷ; báo cha để unmount picker. */
  onNativeClose?: () => void;
}

/** Chủ nhật gần nhất tính từ `d`; nếu `d` đã là Chủ nhật thì lấy chính nó. */
function nextWeekend(d: ISODate): ISODate {
  const wd = weekdayOf(d);
  return wd === 0 ? d : addDays(d, 7 - wd);
}

/** `ISODate` → `Date` ở giữa trưa giờ địa phương. */
function toDate(d: ISODate): Date {
  const c = parseISODate(d);
  // 12:00 chứ không phải 00:00: nếu máy đang ở múi giờ có DST và ngày đó là ngày
  // đổi giờ, mốc nửa đêm có thể không tồn tại và `Date` nhảy sang ngày khác.
  // Giữa trưa cách xa mọi ranh giới đó.
  return new Date(c.year, c.month - 1, c.day, 12, 0, 0);
}

/** `Date` → `ISODate`, đọc thành phần lịch địa phương (KHÔNG qua UTC). */
function fromDate(d: Date): ISODate {
  return formatISODate({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
}

export function DatePicker({
  value,
  onChange,
  today,
  nativeOnly = false,
  onNativeClose,
}: DatePickerProps) {
  const { t } = useT();
  const [open, setOpen] = useState(nativeOnly);

  /**
   * `key` là ID của chip, KHÔNG phải ngày của nó.
   *
   * Ba chip trùng ngày nhau được: hôm nay là Chủ nhật thì `nextWeekend` trả về
   * chính hôm nay, nên "Hôm nay" và "Cuối tuần" cùng mang một ngày. Dùng ngày
   * làm key thì React thấy hai con trùng key, cảnh báo, và có quyền bỏ bớt
   * hoặc nhân đôi một chip — hỏng đúng vào ngày cuối tuần, thứ không ai gặp
   * lúc phát triển giữa tuần.
   */
  const quick: { id: string; label: string; date: ISODate }[] = [
    { id: 'today', label: t.dueLabel.today, date: today },
    { id: 'tomorrow', label: t.dueLabel.tomorrow, date: addDays(today, 1) },
    { id: 'weekend', label: t.home.sectionWeekend, date: nextWeekend(today) },
  ];

  const select = (d: ISODate): void => {
    // Chạm lại chính ngày đang chọn = bỏ chọn. Việc không có hạn là trạng thái
    // hợp lệ ("Không có hạn" là một nhóm thật), nên phải quay về được.
    onChange(value === d ? null : d);
  };

  const handleNative = (event: DateTimePickerEvent, picked?: Date): void => {
    // Android vẽ dialog riêng và tự đóng; iOS vẽ inline nên phải tự quản.
    if (Platform.OS === 'android') {
      setOpen(false);
      onNativeClose?.();
    }
    // `dismissed` = bấm huỷ. Không đụng tới giá trị đang có.
    if (event.type === 'dismissed' || !picked) return;
    onChange(fromDate(picked));
  };

  return (
    <View className={nativeOnly ? 'my-2 rounded-section bg-soft px-3 py-2' : 'gap-3'}>
      {!nativeOnly ? (
        <View className="flex-row flex-wrap gap-2">
          {quick.map((q) => (
            <Chip
              key={q.id}
              label={q.label}
              active={value === q.date}
              onPress={() => select(q.date)}
            />
          ))}
        </View>
      ) : null}

      {/* Dòng mở lịch hệ thống — cho mọi ngày không nằm trong ba chip trên. */}
      {!nativeOnly ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.task.otherDate}
          onPress={() => setOpen((s) => !s)}
          className="min-h-touch flex-row items-center gap-3 border-t border-line pt-3 active:bg-soft"
        >
          <View className="w-8 items-center">
            <Icon name="date" color={ICON_COLOR.muted} />
          </View>
          <View className="flex-1">
            <Text className="text-body font-medium text-ink">{t.task.otherDate}</Text>
            {value !== null ? (
              <Text className="mt-0.5 text-caption text-muted">
                {`${weekdayShort(weekdayOf(value))}, ${parseISODate(value).day}/${parseISODate(value).month}/${parseISODate(value).year}`}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
        </Pressable>
      ) : null}

      {open ? (
        <DateTimePicker
          value={toDate(value ?? today)}
          mode="date"
          // `inline` trên iOS: một tấm lịch tháng đầy đủ, chạm thẳng vào ngày —
          // nhanh hơn `spinner` vốn bắt cuộn ba bánh xe rời nhau.
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleNative}
          locale="vi-VN"
        />
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
      // Cùng quy tắc với `ChipSelect`: đang chọn = nền accent + chữ `accent-ink`.
      className={`min-h-touch justify-center rounded-full border px-4 ${
        active ? 'border-accent bg-accent' : 'border-line bg-surface active:bg-soft'
      }`}
    >
      <Text className={`text-label font-medium ${active ? 'text-accent-ink' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
