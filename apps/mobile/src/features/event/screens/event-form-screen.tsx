/**
 * Form Sự kiện — 05 §5.5, màn CẦN CẨN THẬN NHẤT.
 *
 * Ba thứ quyết định người dùng có tin app hiểu lịch âm hay không:
 *
 *   1. **Dòng xem trước hiện ngay** khi chọn xong ngày–tháng âm. Không có nó,
 *      họ nhập "15/8 âm" rồi không biết app hiểu đúng chưa, và sẽ không quay lại.
 *   2. **Đổi lịch không mất dữ liệu.** Bật/tắt âm-dương giữ nguyên cả hai bộ
 *      giá trị (xem chú thích `superRefine` ở event-schema).
 *   3. **Mặc định đúng theo loại**: giỗ và sinh nhật → lịch âm, lặp hằng năm,
 *      nhắc trước 3 ngày (05 §5.5). Người thêm một ngày giỗ gần như không bao
 *      giờ phải đụng tới ba trường đó.
 *
 * `nextOccurrenceDate` KHÔNG có ở đây và không được có: nó là cache do Edge
 * `refresh-lunar-dates` ghi, nơi DUY NHẤT được ghi (ràng buộc #2). Dòng xem
 * trước chỉ hiển thị, không có đường nào từ nó xuống DB.
 */

import type { CalendarType, EventKind, FamilySide, ISODate } from '@family-organizer/domain';
import { EVENT_KINDS, FAMILY_SIDES } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import {
  AmountInput,
  Button,
  ChipSelect,
  DatePicker,
  Field,
  Sheet,
} from '@/design/components';
import { LunarDatePicker } from '@/features/event/components';
import { useCreateEvent } from '@/features/event/queries/use-events';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

const LEAD_DAYS = [0, 1, 3, 7] as const;

/**
 * Giỗ và sinh nhật mặc định lịch ÂM (05 §5.5).
 *
 * Đây là mặc định quan trọng nhất của form: hai loại này chiếm gần hết số sự
 * kiện âm lịch thật, và bắt người dùng tự bật lịch âm mỗi lần là bắt họ nhớ
 * rằng app có tính năng đó.
 */
function defaultCalendarFor(kind: EventKind): CalendarType {
  return kind === 'death_anniversary' || kind === 'birthday' ? 'lunar' : 'solar';
}

export function EventFormScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('death_anniversary');
  const [calendar, setCalendar] = useState<CalendarType>('lunar');
  const [solarDate, setSolarDate] = useState<ISODate | null>(null);
  const [lunar, setLunar] = useState<{
    day: number | null;
    month: number | null;
    isLeapMonth: boolean;
  }>({ day: null, month: null, isLeapMonth: false });
  const [side, setSide] = useState<FamilySide | null>(null);
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [remindLeadDays, setRemindLeadDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const trimmed = title.trim();
  const hasDate =
    calendar === 'solar' ? solarDate !== null : lunar.day !== null && lunar.month !== null;
  const dirty = trimmed !== '' || hasDate || side !== null || location !== '' || notes !== '';

  /** Đổi loại cũng đổi lịch mặc định — trừ khi người dùng đã tự chọn lịch. */
  const [calendarTouched, setCalendarTouched] = useState(false);
  const changeKind = (next: EventKind): void => {
    setKind(next);
    if (!calendarTouched) setCalendar(defaultCalendarFor(next));
  };

  const close = (): void => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(t.event.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || !hasDate || createEvent.isPending) return;

    createEvent.mutate(
      {
        title: trimmed,
        kind,
        side,
        location: location.trim() === '' ? null : location.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        calendar,
        // Chỉ gửi bộ giá trị của lịch ĐANG chọn. Gửi cả hai thì DB có một sự
        // kiện âm lịch kèm `solar_date` mồ côi, và không ai biết cái nào đúng.
        solarDate: calendar === 'solar' ? solarDate : null,
        lunarDay: calendar === 'lunar' ? lunar.day : null,
        lunarMonth: calendar === 'lunar' ? lunar.month : null,
        lunarLeapMonth: calendar === 'lunar' ? lunar.isLeapMonth : false,
        startTime: null,
        isAllDay: true,
        // Sự kiện âm lịch lặp hằng năm theo bản chất — `nextLunarOccurrence` tự
        // tìm năm kế tiếp, nên KHÔNG cần `recur`. Đặt `recur` ở đây sẽ tạo hai
        // cơ chế lặp chồng nhau cho cùng một sự kiện.
        recur: null,
        remindLeadDays,
        estimatedCost,
      },
      { onSuccess: () => router.back() },
    );
  };

  const titleError = submitted && trimmed === '' ? t.validation.eventTitle : undefined;
  const dateError = submitted && !hasDate ? t.validation.eventDate : undefined;

  return (
    <Sheet
      title={t.event.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={createEvent.isPending} onPress={save} />}
    >
      <Field
        label={t.event.fieldTitle}
        error={titleError}
        value={title}
        onChangeText={setTitle}
        placeholder={t.event.fieldTitlePlaceholder}
        autoFocus
        maxLength={120}
      />

      <Field label={t.event.fieldKind}>
        <ChipSelect
          scroll
          value={kind}
          onChange={changeKind}
          options={EVENT_KINDS.map((k) => ({ value: k, label: t.eventKind[k] }))}
        />
      </Field>

      <Field label={t.event.fieldCalendar}>
        <ChipSelect
          value={calendar}
          onChange={(next) => {
            setCalendar(next);
            setCalendarTouched(true);
          }}
          options={[
            { value: 'solar' as CalendarType, label: t.event.calendarSolar },
            { value: 'lunar' as CalendarType, label: t.event.calendarLunar },
          ]}
        />
      </Field>

      {calendar === 'lunar' ? (
        <Field label={t.event.fieldLunarDay} error={dateError}>
          <LunarDatePicker
            day={lunar.day}
            month={lunar.month}
            isLeapMonth={lunar.isLeapMonth}
            onChange={setLunar}
            today={today}
          />
        </Field>
      ) : (
        <Field label={t.event.fieldTitle} error={dateError}>
          <DatePicker value={solarDate} onChange={setSolarDate} today={today} />
        </Field>
      )}

      <Field label={t.event.fieldSide}>
        <ChipSelect
          scroll
          value={side}
          onChange={setSide}
          options={[
            { value: null, label: t.common.all },
            ...FAMILY_SIDES.map((s) => ({ value: s as FamilySide | null, label: t.familySide[s] })),
          ]}
        />
      </Field>

      <Field
        label={t.event.fieldLocation}
        value={location}
        onChangeText={setLocation}
        maxLength={200}
      />

      <Field label={t.event.fieldEstimatedCost}>
        <AmountInput value={estimatedCost} onChangeValue={setEstimatedCost} />
      </Field>

      <Field label={t.task.fieldRemindLead}>
        <ChipSelect
          value={remindLeadDays}
          onChange={setRemindLeadDays}
          options={LEAD_DAYS.map((d) => ({
            value: d,
            label: d === 0 ? t.dueLabel.today : f(t.dueLabel.inDays, { days: d }),
          }))}
        />
      </Field>

      <Field label={t.common.note}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.common.note}
          multiline
          numberOfLines={3}
          maxLength={2000}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {createEvent.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
