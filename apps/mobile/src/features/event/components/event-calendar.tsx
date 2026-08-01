/**
 * Lịch tháng thống nhất cho form Sự kiện.
 *
 * Mỗi ô hiển thị ngày dương lớn và ngày âm nhỏ bên dưới. Người dùng
 * luôn chọn trên một tấm lịch quen thuộc; `calendar` chỉ quyết định ngày đó
 * sẽ được lưu và lặp theo dương lịch hay âm lịch.
 */

import {
  addDays,
  compareISODate,
  formatISODate,
  parseISODate,
  solarToLunar,
  weekdayOf,
  type CalendarType,
  type ISODate,
} from '@family-organizer/domain';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, ICON_COLOR } from '@/design/components';
import { useT, weekdayShort } from '@/i18n';

export interface EventCalendarProps {
  value: ISODate | null;
  onChange: (date: ISODate) => void;
  today: ISODate;
  calendar: CalendarType;
  error?: string;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function moveMonth(year: number, month: number, amount: number): { year: number; month: number } {
  const total = year * 12 + month - 1 + amount;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function EventCalendar({ value, onChange, today, calendar, error }: EventCalendarProps) {
  const { t } = useT();
  const initial = parseISODate(value ?? today);
  const [view, setView] = useState({ year: initial.year, month: initial.month });

  const first = formatISODate({ year: view.year, month: view.month, day: 1 });
  // `weekdayOf`: CN=0. Quy về lưới bắt đầu từ thứ Hai.
  const leadingDays = (weekdayOf(first) + 6) % 7;
  const gridStart = addDays(first, -leadingDays);
  const dates = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  const select = (date: ISODate): void => {
    onChange(date);
    const selected = parseISODate(date);
    if (selected.month !== view.month || selected.year !== view.year) {
      setView({ year: selected.year, month: selected.month });
    }
  };

  const selectedLunar = value === null ? null : solarToLunar(value);

  return (
    <View>
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-label font-semibold text-muted">{t.event.fieldDate}</Text>
        <Text className="text-caption font-semibold text-brand-deep">
          {calendar === 'lunar' ? t.event.calendarBasisLunar : t.event.calendarBasisSolar}
        </Text>
      </View>

      <View className="mt-3">
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.event.previousMonth}
            onPress={() => setView(moveMonth(view.year, view.month, -1))}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-soft"
          >
            <Icon name="previous" size={20} color={ICON_COLOR.muted} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.event.currentMonth}
            onPress={() => {
              const current = parseISODate(today);
              setView({ year: current.year, month: current.month });
            }}
            className="min-h-touch flex-1 items-center justify-center rounded-control active:bg-soft"
          >
            <Text className="text-heading font-semibold text-ink">
              {`${t.event.month} ${view.month}, ${view.year}`}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.event.nextMonth}
            onPress={() => setView(moveMonth(view.year, view.month, 1))}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-soft"
          >
            <Icon name="chevron" size={20} color={ICON_COLOR.muted} />
          </Pressable>
        </View>

        <View className="mt-1 flex-row">
          {WEEKDAYS.map((weekday) => (
            <Text
              key={weekday}
              className="py-2 text-center text-micro font-semibold text-subtle"
              style={{ width: `${100 / 7}%` }}
            >
              {weekday}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {dates.map((date) => {
            const civil = parseISODate(date);
            const lunar = solarToLunar(date);
            const selected = date === value;
            const isToday = date === today;
            const outside = civil.month !== view.month;

            return (
              <View key={date} className="py-0.5" style={{ width: `${100 / 7}%` }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${weekdayShort(weekdayOf(date))}, ${civil.day}/${civil.month}/${civil.year}, ${lunar.day}/${lunar.month} âm lịch`}
                  onPress={() => select(date)}
                  className={`min-h-[54px] items-center justify-center rounded-control active:opacity-70 ${
                    selected ? 'bg-brand shadow-brand' : ''
                  }`}
                >
                  <Text
                    className={`text-body font-semibold tabular-nums ${
                      selected
                        ? 'text-white'
                        : outside
                          ? 'text-subtle'
                          : isToday
                            ? 'text-brand-deep underline'
                            : 'text-ink'
                    }`}
                  >
                    {civil.day}
                  </Text>
                  <Text
                    className={`text-micro font-medium tabular-nums ${
                      selected ? 'text-white/80' : outside ? 'text-line' : 'text-subtle'
                    }`}
                  >
                    {`${lunar.day}/${lunar.month}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {value !== null && selectedLunar !== null ? (
        <View className="mt-4 flex-row items-center gap-3 rounded-featured bg-brand-soft px-4 py-3">
          <View className="h-10 w-10 items-center justify-center rounded-control bg-white">
            <Icon name="date" size={20} color={ICON_COLOR.brand} />
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-body font-semibold text-ink">
              {`${weekdayShort(weekdayOf(value))}, ${pad(parseISODate(value).day)} tháng ${parseISODate(value).month}, ${parseISODate(value).year}`}
            </Text>
            <Text className="mt-0.5 text-caption font-semibold text-brand-deep">
              {`${pad(selectedLunar.day)}/${pad(selectedLunar.month)}${selectedLunar.isLeapMonth ? ' nhuận' : ''} âm lịch`}
            </Text>
          </View>
        </View>
      ) : null}

      {value !== null && compareISODate(value, today) < 0 ? (
        <Text className="mt-2 text-caption font-medium text-attention">{t.event.pastDate}</Text>
      ) : null}
      {error ? <Text className="mt-2 text-caption font-medium text-critical">{error}</Text> : null}
    </View>
  );
}
