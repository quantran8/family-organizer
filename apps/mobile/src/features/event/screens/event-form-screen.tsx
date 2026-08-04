/**
 * Form thêm Sự kiện — các nhóm thông tin nằm trong card trên nền canvas.
 *
 * Lịch dương/âm dùng chung một lưới tháng. Card ngày chỉ mở lịch khi người dùng
 * yêu cầu và tự thu lại ngay sau khi chọn, để phần còn lại của form luôn gần.
 */

import {
  EVENT_KINDS,
  FAMILY_SIDES,
  parseISODate,
  solarToLunar,
  weekdayOf,
  type CalendarType,
  type UUID,
  type EventKind,
  type FamilySide,
  type ISODate,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';

import {
  AmountInput,
  Button,
  Icon,
  ICON_COLOR,
  PickerSheet,
  Segmented,
  Sheet,
  type IconName,
} from '@/design/components';
import { EventCalendar } from '@/features/event/components';
import { useCreateEvent } from '@/features/event/queries/use-events';
import { useMembers } from '@/features/member/queries/use-members';
import { useT, weekdayShort } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

const LEAD_DAYS = [0, 1, 3, 7] as const;

/**
 * Mốc nhắc chuẩn bị — 03 §5b. `null` = không có.
 *
 * Chỉ 1-3 ngày, đúng khoảng schema cho phép: xa hơn thì việc chuẩn bị sinh ra
 * quá sớm và nằm chết trong danh sách; gần hơn thì không kịp mua quà.
 */
const PREP_LEAD_DAYS = [null, 1, 2, 3] as const;
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
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(today);
  const [calendar, setCalendar] = useState<CalendarType>('lunar');
  const [repeatEnabled, setRepeatEnabled] = useState(true);
  const [side, setSide] = useState<FamilySide | null>(null);
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [remindLeadDays, setRemindLeadDays] = useState(3);
  const [prepLeadDays, setPrepLeadDays] = useState<number | null>(null);
  const { data: members } = useMembers();
  // Con trong nhà — `role='child'`. Không phải user app, chỉ là đối tượng được
  // ghi nhận (schema §1).
  const children = (members ?? []).filter((m) => m.role === 'child');
  const [childMemberId, setChildMemberId] = useState<UUID | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [picker, setPicker] = useState<null | 'kind' | 'side' | 'reminder' | 'prep' | 'child'>(
    null,
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const trimmed = title.trim();
  const dirty =
    trimmed !== '' ||
    kind !== 'death_anniversary' ||
    selectedDate !== today ||
    calendar !== 'lunar' ||
    !repeatEnabled ||
    side !== null ||
    location !== '' ||
    estimatedCost !== null ||
    remindLeadDays !== 3 ||
    prepLeadDays !== null ||
    childMemberId !== null ||
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
    // Sự kiện không lặp là đúng MỘT ngày dương đã chọn. Chỉ khi bật lặp thì
    // `calendar` mới là cơ sở để tính lần hằng năm tiếp theo.
    const storedCalendar: CalendarType = repeatEnabled ? calendar : 'solar';
    createEvent.mutate(
      {
        title: trimmed,
        kind,
        side,
        location: location.trim() === '' ? null : location.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        calendar: storedCalendar,
        solarDate: storedCalendar === 'solar' ? selectedDate : null,
        lunarDay: storedCalendar === 'lunar' ? lunar.day : null,
        lunarMonth: storedCalendar === 'lunar' ? lunar.month : null,
        lunarLeapMonth: storedCalendar === 'lunar' ? lunar.isLeapMonth : false,
        startTime: null,
        isAllDay: true,
        recur: repeatEnabled ? { freq: 'yearly', intervalN: 1 } : null,
        remindLeadDays,
        prepLeadDays,
        // Chỉ giữ khi loại sự kiện là "của con" — đổi loại rồi lưu không được
        // để lại một tham chiếu mồ côi ở dòng dữ liệu.
        childMemberId: kind === 'child' ? childMemberId : null,
        estimatedCost,
      },
      { onSuccess: () => router.back() },
    );
  };

  const titleError = submitted && trimmed === '' ? t.validation.eventTitle : undefined;
  const dateError = submitted && selectedDate === null ? t.validation.eventDate : undefined;
  const sideName = side === null ? t.common.all : t.familySide[side];
  const reminderName =
    remindLeadDays === 0
      ? t.dueLabel.today
      : f(t.dueLabel.inDays, { days: remindLeadDays });
  const prepName =
    prepLeadDays === null ? t.event.prepNone : f(t.event.prepDays, { days: prepLeadDays });
  const childName =
    children.find((c) => c.id === childMemberId)?.displayName ?? t.event.childNone;

  const selectedLunar = selectedDate === null ? null : solarToLunar(selectedDate);
  const selectedDatePrimary = (() => {
    if (selectedDate === null) return t.task.pickDate;
    if (selectedDate === today) return t.dueLabel.today;
    const date = parseISODate(selectedDate);
    return `${weekdayShort(weekdayOf(selectedDate))} · ${date.day}/${date.month}/${date.year}`;
  })();
  const selectedDateSecondary = selectedLunar
    ? `${selectedLunar.day}/${selectedLunar.month} ${t.event.lunarSuffix}${
        selectedLunar.isLeapMonth ? ` · ${t.event.fieldLeapMonth.toLowerCase()}` : ''
      }`
    : t.event.calendarLunar;

  const openPicker = (next: 'kind' | 'side' | 'reminder' | 'prep' | 'child'): void => {
    setDatePickerOpen(false);
    setPicker(next);
  };

  return (
    <Sheet
      title={t.event.formTitle}
      onClose={close}
      background="canvas"
      actions={
        <Button
          label={t.common.save}
          loading={createEvent.isPending}
          disabled={trimmed === ''}
          className="min-h-[56px]"
          onPress={save}
        />
      }
    >
      <View className="gap-3 pt-2">
        <View className="overflow-hidden rounded-section border border-line bg-surface">
          <View className="px-4 pb-3 pt-4">
            <Text className="text-[13px] font-semibold text-muted">{t.event.fieldTitle}</Text>
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder={t.event.fieldTitlePlaceholder}
              placeholderTextColor="#A4A4AD"
              accessibilityLabel={t.event.fieldTitle}
              maxLength={120}
              className="h-12 p-0 text-[19px] font-semibold leading-7 text-ink"
            />
            {titleError ? (
              <Text className="text-caption font-medium text-critical">{titleError}</Text>
            ) : null}
          </View>

          <CardSelectRow
            icon="eventKind"
            label={t.event.fieldKind}
            value={t.eventKind[kind]}
            divider
            onPress={() => openPicker('kind')}
          />
        </View>

        <View className="overflow-hidden rounded-section border border-line bg-surface">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.event.fieldDate}: ${selectedDatePrimary}, ${selectedDateSecondary}`}
            accessibilityState={{ expanded: datePickerOpen }}
            onPress={() => {
              setPicker(null);
              setDatePickerOpen((open) => !open);
            }}
            className="min-h-[76px] flex-row items-center gap-3 px-4 active:bg-soft"
          >
            <IconWell icon="date"/>
            <View className="min-w-0 flex-1">
              {/* <Text className="text-[13px] font-semibold text-muted">{t.event.fieldDate}</Text> */}
              <Text numberOfLines={1} className="mt-0.5 text-heading font-semibold text-ink">
                {selectedDatePrimary}
              </Text>
              {/* <Text numberOfLines={1} className="mt-0.5 text-caption font-medium text-muted">
                {selectedDateSecondary}
              </Text> */}
            </View>
            <View style={{ transform: [{ rotate: datePickerOpen ? '-90deg' : '90deg' }] }}>
              <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
            </View>
          </Pressable>

          {datePickerOpen ? (
            <View className="border-t border-line px-2 pb-3 pt-2">
              <EventCalendar
                embedded
                value={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setDatePickerOpen(false);
                }}
                today={today}
                calendar={calendar}
                error={dateError}
              />
            </View>
          ) : dateError ? (
            <Text className="px-4 pb-3 text-caption font-medium text-critical">{dateError}</Text>
          ) : null}

          <View className="flex-row items-center gap-3 px-4">
            <IconWell icon="repeat" />
            <View className="min-h-[68px] min-w-0 flex-1 flex-row items-center gap-3 border-t border-line">
              <View className="min-w-0 flex-1">
                <Text className="text-body font-semibold text-ink">{t.event.repeatYearly}</Text>
                {/* <Text className="mt-0.5 text-caption font-medium text-muted">
                  {repeatEnabled
                    ? calendar === 'lunar'
                      ? t.event.repeatLunar
                      : t.event.repeatSolar
                    : t.event.repeatNone}
                </Text> */}
              </View>
              <Switch
                accessibilityLabel={t.event.repeatYearly}
                accessibilityState={{ checked: repeatEnabled }}
                value={repeatEnabled}
                onValueChange={setRepeatEnabled}
                trackColor={{ false: '#D8D8DE', true: '#6257F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {repeatEnabled ? (
            <View className="px-4 pb-4">
              <Segmented
                value={calendar}
                onChange={setCalendar}
                options={[
                  { value: 'solar', label: t.event.repeatSolar },
                  { value: 'lunar', label: t.event.repeatLunar },
                ]}
              />
            </View>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-section border border-line bg-surface">
          <SectionTitle label={t.event.sectionFamily} />
          <CardSelectRow
            icon="family"
            label={t.event.fieldSide}
            value={sideName}
            onPress={() => openPicker('side')}
          />
          <CardSelectRow
            icon="bell"
            label={t.task.fieldRemindLead}
            value={reminderName}
            divider
            onPress={() => openPicker('reminder')}
          />
          {/* Nhắc kép — 03 §5b. Dòng phụ nói rõ nó SINH VIỆC chứ không bắn thêm
              một thông báo nữa: người dùng cần biết hệ quả trước khi bật. */}
          <CardSelectRow
            icon="bell"
            label={t.event.fieldPrepLead}
            value={prepName}
            divider
            onPress={() => openPicker('prep')}
          />
          {/* Chỉ hiện khi loại là "của con" — 09 §G.2. */}
          {kind === 'child' && children.length > 0 ? (
            <CardSelectRow
              icon="family"
              label={t.event.fieldChild}
              value={childName}
              divider
              onPress={() => openPicker('child')}
            />
          ) : null}
        </View>

        <View className="overflow-hidden rounded-section border border-line bg-surface">
          <SectionTitle label={t.event.sectionDetails} />
          <CardInputRow icon="location">
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder={t.event.fieldLocation}
              placeholderTextColor="#A4A4AD"
              accessibilityLabel={t.event.fieldLocation}
              maxLength={200}
              className="min-h-[56px] min-w-0 flex-1 p-0 text-heading font-semibold text-ink"
            />
          </CardInputRow>
          <CardInputRow icon="money" divider>
            <AmountInput
              variant="row"
              value={estimatedCost}
              onChangeValue={setEstimatedCost}
              placeholder={t.event.fieldEstimatedCost}
              accessibilityLabel={t.event.fieldEstimatedCost}
              className="min-w-0 flex-1"
            />
          </CardInputRow>

          <View className="border-t border-line px-4 pb-4 pt-3">
            <View className="flex-row items-end justify-between gap-4">
              <Text className="text-[13px] font-semibold text-muted">{t.common.note}</Text>
              {notes.length > NOTES_MAX - 200 ? (
                <Text className="text-caption font-medium tabular-nums text-subtle">
                  {`${notes.length}/${NOTES_MAX.toLocaleString('vi-VN')}`}
                </Text>
              ) : null}
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
              className="mt-2 min-h-[112px] rounded-[18px] bg-soft px-4 py-3 text-heading font-medium leading-6 text-ink"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        </View>

        {createEvent.isError ? (
          <View className="border-l-4 border-critical bg-critical-soft px-4 py-3">
            <Text className="text-caption font-semibold text-critical">{t.error.unknown}</Text>
          </View>
        ) : null}
      </View>

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
                setCalendar(calendarFor(option));
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

      <PickerSheet
        open={picker === 'prep'}
        title={t.event.fieldPrepLead}
        onClose={() => setPicker(null)}
      >
        <View>
          {/* Nói rõ hệ quả TRƯỚC danh sách lựa chọn: mốc này sinh một VIỆC,
              không bắn thêm một thông báo nữa (03 §5b). */}
          <Text className="px-4 pb-2 text-caption text-subtle">{t.event.prepHint}</Text>
          {PREP_LEAD_DAYS.map((days) => (
            <PickerOption
              key={days ?? 'none'}
              label={days === null ? t.event.prepNone : f(t.event.prepDays, { days })}
              selected={prepLeadDays === days}
              onPress={() => {
                setPrepLeadDays(days);
                setPicker(null);
              }}
            />
          ))}
        </View>
      </PickerSheet>

      <PickerSheet
        open={picker === 'child'}
        title={t.event.fieldChild}
        onClose={() => setPicker(null)}
      >
        <View>
          {children.map((c) => (
            <PickerOption
              key={c.id}
              label={c.displayName}
              selected={childMemberId === c.id}
              onPress={() => {
                setChildMemberId(c.id);
                setPicker(null);
              }}
            />
          ))}
        </View>
      </PickerSheet>
    </Sheet>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text className="px-4 pb-1 pt-4 text-[13px] font-semibold text-muted">{label}</Text>;
}

/**
 * Icon đứng đầu một dòng trong form.
 *
 * Hiện là icon TRẦN, không có ô nền: một cột icon mỗi cái một ô tô màu chạy dọc
 * form làm mắt đọc thành một cột trang trí thay vì một cột nhãn. Ô nền để dành
 * cho chỗ màu thật sự mang nghĩa (§5.5) — dòng form thì không.
 */
function IconWell({ icon }: { icon: IconName }) {
  return <Icon name={icon} size={20} color={ICON_COLOR.muted} />;
}

function CardSelectRow({
  icon,
  label,
  value,
  onPress,
  divider = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4">
      <IconWell icon={icon} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        className={`min-h-[68px] min-w-0 flex-1 flex-row items-center gap-3 active:bg-soft ${
          divider ? 'border-t border-line' : ''
        }`}
      >
        <Text className="flex-1 text-heading font-semibold text-ink">{label}</Text>
        <Text numberOfLines={1} className="max-w-[42%] text-body font-semibold text-muted">
          {value}
        </Text>
        <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
      </Pressable>
    </View>
  );
}

function CardInputRow({
  icon,
  divider = false,
  children,
}: {
  icon: IconName;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4">
      <IconWell icon={icon} />
      <View
        className={`min-h-[64px] min-w-0 flex-1 flex-row items-center ${
          divider ? 'border-t border-line' : ''
        }`}
      >
        {children}
      </View>
    </View>
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
      className={`mb-1 min-h-[60px] flex-row items-center gap-3 rounded-section px-3 ${
        selected ? 'bg-accent-soft' : 'active:bg-soft'
      }`}
    >
      <Text className="flex-1 text-body font-medium text-ink">{label}</Text>
      {selected ? <Icon name="check" size={20} color={ICON_COLOR.muted} /> : null}
    </Pressable>
  );
}
