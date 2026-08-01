/**
 * Form Sự kiện — một lịch tháng thống nhất, hiển thị cả ngày dương và âm.
 *
 * Loại sự kiện quyết định cơ sở lặp: giỗ/sinh nhật lưu theo âm lịch,
 * các loại còn lại lưu theo dương lịch. Người dùng không phải chuyển qua
 * lại hai bộ chọn ngày khác nhau.
 */

import {
  EVENT_KINDS,
  FAMILY_SIDES,
  solarToLunar,
  type CalendarType,
  type EventKind,
  type FamilySide,
  type ISODate,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import {
  AmountInput,
  Button,
  Icon,
  ICON_COLOR,
  PickerSheet,
  Sheet,
  type IconName,
} from '@/design/components';
import { EventCalendar } from '@/features/event/components';
import { useCreateEvent } from '@/features/event/queries/use-events';
import { useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

const LEAD_DAYS = [0, 1, 3, 7] as const;
const NOTES_MAX = 2000;

function calendarFor(kind: EventKind): CalendarType {
  return kind === 'death_anniversary' || kind === 'birthday' || kind === 'holiday'
    ? 'lunar'
    : 'solar';
}

export function EventFormScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const titleRef = useSheetAutoFocus();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('death_anniversary');
  // UI mẫu chọn sẵn hôm nay; giữ nó là default không làm form thành dirty.
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(today);
  const [side, setSide] = useState<FamilySide | null>(null);
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [remindLeadDays, setRemindLeadDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [picker, setPicker] = useState<null | 'kind' | 'side' | 'reminder'>(null);

  const calendar = calendarFor(kind);
  const trimmed = title.trim();
  const dirty =
    trimmed !== '' ||
    kind !== 'death_anniversary' ||
    selectedDate !== today ||
    side !== null ||
    location !== '' ||
    estimatedCost !== null ||
    remindLeadDays !== 3 ||
    notes !== '';

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
    if (trimmed === '' || selectedDate === null || createEvent.isPending) return;

    const lunar = solarToLunar(selectedDate);
    createEvent.mutate(
      {
        title: trimmed,
        kind,
        side,
        location: location.trim() === '' ? null : location.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        calendar,
        solarDate: calendar === 'solar' ? selectedDate : null,
        lunarDay: calendar === 'lunar' ? lunar.day : null,
        lunarMonth: calendar === 'lunar' ? lunar.month : null,
        lunarLeapMonth: calendar === 'lunar' ? lunar.isLeapMonth : false,
        startTime: null,
        isAllDay: true,
        recur: null,
        remindLeadDays,
        estimatedCost,
      },
      { onSuccess: () => router.back() },
    );
  };

  const titleError = submitted && trimmed === '' ? t.validation.eventTitle : undefined;
  const dateError = submitted && selectedDate === null ? t.validation.eventDate : undefined;
  const sideName =
    side === null ? t.common.all : t.familySide[side];
  const reminderName =
    remindLeadDays === 0
      ? t.dueLabel.today
      : f(t.dueLabel.inDays, { days: remindLeadDays });

  return (
    <Sheet
      title={t.event.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={createEvent.isPending} onPress={save} />}
    >
      <View className="pt-5">
        <View className="flex-row items-end justify-between gap-4">
          <Text className="text-caption font-semibold text-muted">{t.event.fieldTitle}</Text>
          <Text className="text-caption font-medium tabular-nums text-subtle">
            {`${title.length}/120`}
          </Text>
        </View>
        <TextInput
          ref={titleRef}
          value={title}
          onChangeText={setTitle}
          placeholder={t.event.fieldTitlePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.event.fieldTitle}
          maxLength={120}
          className={`min-h-[52px] border-b bg-transparent p-0 text-title2 font-semibold text-ink ${
            titleError ? 'border-critical' : 'border-line'
          }`}
        />
        {titleError ? (
          <Text className="mt-2 text-caption font-medium text-critical">{titleError}</Text>
        ) : null}

        <EventSelectRow
          icon="event"
          label={t.event.fieldKind}
          value={t.eventKind[kind]}
          onPress={() => setPicker('kind')}
          className="mt-4"
        />
      </View>

      <View className="mt-8">
        <EventCalendar
          value={selectedDate}
          onChange={setSelectedDate}
          today={today}
          calendar={calendar}
          error={dateError}
        />
      </View>

      <View className="mt-8">
        <Text className="text-caption font-semibold text-muted">{t.event.sectionFamily}</Text>
        <EventSelectRow
          icon="assignee"
          label={t.event.fieldSide}
          value={sideName}
          onPress={() => setPicker('side')}
          className="mt-1"
        />
        <EventSelectRow
          icon="bell"
          label={t.task.fieldRemindLead}
          value={reminderName}
          onPress={() => setPicker('reminder')}
        />
      </View>

      <View className="mt-8">
        <Text className="text-caption font-semibold text-muted">{t.event.sectionDetails}</Text>

        <View className="mt-1 min-h-[58px] flex-row items-center gap-3 border-b border-line">
          <Icon name="location" color={ICON_COLOR.muted} />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder={t.event.fieldLocation}
            placeholderTextColor="#A4A4AD"
            accessibilityLabel={t.event.fieldLocation}
            maxLength={200}
            className="min-h-[56px] min-w-0 flex-1 p-0 text-heading font-medium text-ink"
          />
        </View>

        <View className="min-h-[58px] flex-row items-center gap-3 border-b border-line">
          <Icon name="money" color={ICON_COLOR.muted} />
          <AmountInput
            variant="row"
            value={estimatedCost}
            onChangeValue={setEstimatedCost}
            placeholder={t.event.fieldEstimatedCost}
            accessibilityLabel={t.event.fieldEstimatedCost}
            className="min-w-0 flex-1"
          />
        </View>

        <View className="mt-5">
          <View className="flex-row items-end justify-between gap-4">
            <Text className="text-caption font-semibold text-muted">{t.common.note}</Text>
            <Text className="text-caption font-medium tabular-nums text-subtle">
              {`${notes.length}/${NOTES_MAX.toLocaleString('vi-VN')}`}
            </Text>
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t.common.notePlaceholder}
            placeholderTextColor="#A4A4AD"
            accessibilityLabel={t.common.note}
            multiline
            numberOfLines={4}
            maxLength={NOTES_MAX}
            className="mt-2 min-h-[104px] rounded-featured bg-soft px-4 py-3 text-heading font-medium text-ink"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
      </View>

      {createEvent.isError ? (
        <View className="mt-5 border-l-4 border-critical bg-critical-soft px-4 py-3">
          <Text className="text-caption font-semibold text-critical">{t.error.unknown}</Text>
        </View>
      ) : null}

      <View className="h-4" />

      <PickerSheet
        open={picker === 'kind'}
        title={t.event.fieldKind}
        onClose={() => setPicker(null)}
      >
        <View>
          {EVENT_KINDS.map((option) => (
            <PickerOption
              key={option}
              label={t.eventKind[option]}
              selected={kind === option}
              onPress={() => {
                setKind(option);
                setPicker(null);
              }}
            />
          ))}
        </View>
      </PickerSheet>

      <PickerSheet
        open={picker === 'side'}
        title={t.event.fieldSide}
        onClose={() => setPicker(null)}
      >
        <View>
          {[
            { value: null as FamilySide | null, label: t.common.all },
            ...FAMILY_SIDES.map((option) => ({
              value: option as FamilySide | null,
              label: t.familySide[option],
            })),
          ].map((option) => (
            <PickerOption
              key={option.value ?? 'all'}
              label={option.label}
              selected={side === option.value}
              onPress={() => {
                setSide(option.value);
                setPicker(null);
              }}
            />
          ))}
        </View>
      </PickerSheet>

      <PickerSheet
        open={picker === 'reminder'}
        title={t.task.fieldRemindLead}
        onClose={() => setPicker(null)}
      >
        <View>
          {LEAD_DAYS.map((days) => {
            const label = days === 0 ? t.dueLabel.today : f(t.dueLabel.inDays, { days });
            return (
              <PickerOption
                key={days}
                label={label}
                selected={remindLeadDays === days}
                onPress={() => {
                  setRemindLeadDays(days);
                  setPicker(null);
                }}
              />
            );
          })}
        </View>
      </PickerSheet>
    </Sheet>
  );
}

function EventSelectRow({
  icon,
  label,
  value,
  onPress,
  className = '',
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      className={`relative min-h-[58px] flex-row items-center gap-3 border-b border-line active:bg-soft ${className}`}
    >
      <Icon name={icon} color={ICON_COLOR.muted} />
      <Text className="flex-1 text-heading font-semibold text-ink">{label}</Text>
      <Text numberOfLines={1} className="max-w-[44%] text-body font-medium text-muted">
        {value}
      </Text>
      <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
    </Pressable>
  );
}

function PickerOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`mb-1 min-h-[60px] flex-row items-center gap-3 rounded-featured px-3 ${
        selected ? 'bg-brand-soft' : 'active:bg-soft'
      }`}
    >
      <Text className="flex-1 text-body font-medium text-ink">{label}</Text>
      {selected ? <Icon name="check" size={20} color={ICON_COLOR.brand} /> : null}
    </Pressable>
  );
}
