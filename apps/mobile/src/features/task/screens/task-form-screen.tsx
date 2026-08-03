/**
 * Quick add Việc — composer gọn theo mẫu modal v3.
 *
 * Chỉ tên việc là bắt buộc. Ngày mặc định là hôm nay; người làm và ghi chú mở
 * ngay trong composer để thao tác thường ngày không phải đi qua sheet cấp hai.
 */

import {
  addDays,
  parseISODate,
  weekdayOf,
  type ISODate,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DatePicker, Icon, ICON_COLOR, MemberAvatar, Sheet } from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import { useCreateTask } from '@/features/task/queries/use-tasks';
import { useT, weekdayShort } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';
import { useSessionStore } from '@/stores/session';

type Panel = 'assignee' | 'note' | null;

const TITLE_MAX = 100;
const NOTES_MAX = 240;

export function TaskFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();
  const titleRef = useSheetAutoFocus();
  const noteRef = useRef<TextInput>(null);
  const savingRef = useRef(false);
  const navigatingBackRef = useRef(false);
  const mountedRef = useRef(true);
  const createTask = useCreateTask();
  const { data: members } = useMembers();
  const myMemberId = useSessionStore((state) => state.memberId);

  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = (params.eventId ?? null) as UUID | null;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<ISODate>(today);
  const [assigneeId, setAssigneeId] = useState<UUID | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const trimmed = title.trim();
  const titleError = submitted && trimmed === '';
  const dirty = trimmed !== '' || notes.trim() !== '' || dueDate !== today || assigneeId !== null;
  const submitDisabled = trimmed === '' || createTask.isPending;

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  /**
   * Keyboard submit và nút tròn có thể cùng phát trong một frame. Chỉ cho phép
   * một lệnh back: lần thứ hai sẽ chạy sau khi sheet đã rời navigation tree.
   */
  const goBackOnce = (): void => {
    if (navigatingBackRef.current) return;
    navigatingBackRef.current = true;
    router.back();
  };

  const close = (): void => {
    if (!dirty) {
      goBackOnce();
      return;
    }

    Alert.alert(t.task.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: goBackOnce },
    ]);
  };

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || savingRef.current) return;
    savingRef.current = true;

    createTask.mutate(
      {
        title: trimmed,
        notes: notes.trim() === '' ? null : notes.trim(),
        // Form thêm nhanh luôn tạo việc LINH HOẠT, không hỏi thêm một câu nữa.
        //
        // Suy ra chứ không hỏi: form này cố ý chỉ có một trường bắt buộc (05
        // §5.1) — bắt chọn danh sách ngay lúc thêm là đúng cách để người ta thôi
        // thêm việc. Và một việc không có `recur` thì đúng là việc linh hoạt
        // theo định nghĩa ở 03 §4b.
        //
        // Đặt lặp lại ở màn chi tiết sẽ chuyển nó sang danh sách định kỳ.
        list: 'flexible',
        assigneeId,
        dueDate,
        dueTime: null,
        recur: null,
        remindLeadDays: 0,
        eventId,
      },
      {
        onSuccess: () => {
          if (mountedRef.current) goBackOnce();
        },
        onError: () => {
          savingRef.current = false;
        },
      },
    );
  };

  const dateLabel = (date: ISODate): string => {
    if (date === today) return t.dueLabel.today;
    if (date === addDays(today, 1)) return t.dueLabel.tomorrow;
    const civil = parseISODate(date);
    return `${weekdayShort(weekdayOf(date))} ${String(civil.day).padStart(2, '0')}/${String(civil.month).padStart(2, '0')}`;
  };

  const selectedMember = (members ?? []).find((member) => member.id === assigneeId);
  const assigneeLabel = selectedMember
    ? selectedMember.id === myMemberId
      ? t.task.assigneeMe
      : selectedMember.displayName
    : '';

  const togglePanel = (panel: Exclude<Panel, null>): void => {
    setDatePickerOpen(false);
    setActivePanel((current) => (current === panel ? null : panel));
    if (panel === 'note' && activePanel !== 'note') {
      requestAnimationFrame(() => noteRef.current?.focus());
    }
  };

  return (
    <Sheet title={t.task.formTitle} onClose={close} scroll={false} header="close">
      <View
        className={`overflow-hidden rounded-featured border bg-surface ${
          titleError ? 'border-critical' : 'border-line'
        }`}
      >
        <TextInput
          ref={titleRef}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={save}
          placeholder={t.task.fieldTitlePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.task.fieldTitle}
          multiline
          numberOfLines={2}
          maxLength={TITLE_MAX}
          returnKeyType="done"
          submitBehavior="submit"
          className="min-h-[78px] px-4 pb-3 pt-4 text-[18px] font-semibold leading-6 text-ink"
          style={{ textAlignVertical: 'top' }}
        />

        {activePanel !== null ? (
          <View className="border-t border-line bg-soft p-3">
            {activePanel === 'assignee' ? (
              <View>
                <View className="flex-row flex-wrap gap-2">
                  {(members ?? []).map((member) => {
                    const selected = member.id === assigneeId;
                    const label =
                      member.id === myMemberId ? t.task.assigneeMe : member.displayName;
                    return (
                      <Pressable
                        key={member.id}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setAssigneeId(member.id);
                          setActivePanel(null);
                          titleRef.current?.focus();
                        }}
                        className={`min-h-[52px] flex-row items-center gap-3 rounded-2xl px-3 ${
                          selected ? 'bg-brand-soft' : 'bg-surface active:bg-line'
                        }`}
                        style={{ flexBasis: '48%', flexGrow: 1 }}
                      >
                        <MemberAvatar name={member.displayName} size="md" />
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-label font-semibold text-ink"
                        >
                          {label}
                        </Text>
                        {selected ? <Icon name="check" size={18} color={ICON_COLOR.brand} /> : null}
                      </Pressable>
                    );
                  })}
                </View>

                {assigneeId !== null ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.task.fieldAssigneeNone}
                    onPress={() => {
                      setAssigneeId(null);
                      setActivePanel(null);
                    }}
                    className="mt-2 h-11 items-center justify-center rounded-2xl active:bg-line"
                  >
                    <Text className="text-label font-semibold text-muted">
                      {t.task.fieldAssigneeNone}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <TextInput
                ref={noteRef}
                value={notes}
                onChangeText={setNotes}
                placeholder={t.common.notePlaceholder}
                placeholderTextColor="#A4A4AD"
                accessibilityLabel={t.task.fieldNotes}
                multiline
                numberOfLines={3}
                maxLength={NOTES_MAX}
                className="min-h-[96px] rounded-2xl bg-surface px-3 py-3 text-body font-medium leading-6 text-ink"
                style={{ textAlignVertical: 'top' }}
              />
            )}
          </View>
        ) : null}

        <View className="flex-row items-center gap-2 border-t border-line px-2 py-2">
          <ScrollView
            horizontal
            className="flex-1"
            contentContainerClassName="items-center gap-1"
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.task.pickDate}
              accessibilityState={{ expanded: datePickerOpen }}
              onPress={() => {
                setActivePanel(null);
                setDatePickerOpen((open) => !open);
              }}
              className="h-11 flex-row items-center justify-center gap-1.5 rounded-full bg-brand-soft px-3 active:opacity-70"
            >
              <Icon name="date" size={20} color={ICON_COLOR.brand} />
              <Text
                numberOfLines={1}
                className="max-w-[124px] text-[13px] font-semibold text-brand-deep"
              >
                {dateLabel(dueDate)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.task.pickAssignee}
              accessibilityState={{ expanded: activePanel === 'assignee' }}
              onPress={() => togglePanel('assignee')}
              className={`h-11 flex-row items-center justify-center gap-1.5 rounded-full px-3 active:opacity-70 ${
                activePanel === 'assignee' || assigneeId !== null ? 'bg-brand-soft' : ''
              }`}
            >
              <Icon
                name="assignee"
                size={20}
                color={
                  activePanel === 'assignee' || assigneeId !== null
                    ? ICON_COLOR.brand
                    : ICON_COLOR.muted
                }
              />
              {assigneeLabel !== '' ? (
                <Text
                  numberOfLines={1}
                  className="max-w-[88px] text-[13px] font-semibold text-brand-deep"
                >
                  {assigneeLabel}
                </Text>
              ) : null}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.task.fieldNotes}
              accessibilityState={{ expanded: activePanel === 'note' }}
              onPress={() => togglePanel('note')}
              className={`relative h-11 w-11 items-center justify-center rounded-full active:opacity-70 ${
                activePanel === 'note' || notes.trim() !== '' ? 'bg-brand-soft' : ''
              }`}
            >
              <Icon
                name="note"
                size={20}
                color={
                  activePanel === 'note' || notes.trim() !== ''
                    ? ICON_COLOR.brand
                    : ICON_COLOR.muted
                }
              />
              {notes.trim() !== '' ? (
                <View className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface bg-brand" />
              ) : null}
            </Pressable>
          </ScrollView>

          <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel={t.task.emptyAction}
            accessibilityState={{ disabled: submitDisabled }}
            disabled={submitDisabled}
            onPress={save}
            style={({ pressed }) => [
              styles.submit,
              submitDisabled ? styles.submitDisabled : styles.submitEnabled,
              pressed && !submitDisabled ? styles.submitPressed : null,
            ]}
          >
            {createTask.isPending ? (
              <ActivityIndicator size="small" color={ICON_COLOR.white} />
            ) : (
              <Icon
                name="submit"
                size={20}
                color={trimmed === '' ? ICON_COLOR.disabled : ICON_COLOR.white}
              />
            )}
          </Pressable>
        </View>
      </View>

      {datePickerOpen ? (
        <DatePicker
          nativeOnly
          value={dueDate}
          onChange={(next) => {
            if (next !== null) setDueDate(next);
          }}
          onNativeClose={() => setDatePickerOpen(false)}
          today={today}
        />
      ) : null}

      {titleError ? (
        <Text className="mt-2 text-caption text-critical">{t.validation.taskTitle}</Text>
      ) : null}
      {createTask.isError ? (
        <Text className="mt-2 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}
    </Sheet>
  );
}

/**
 * Nút submit dùng style native thay vì NativeWind.
 *
 * Class của nút đổi từ disabled sang có `active:` + shadow ngay sau ký tự đầu
 * tiên. `react-native-css-interop` phải nâng cấp Pressable giữa hai render và ở
 * iOS/React 19 có thể làm rơi context của navigator. Đây là một control có ba
 * trạng thái nhỏ, nên style callback native vừa rõ hơn vừa không đổi cây render.
 */
const styles = StyleSheet.create({
  submit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  submitDisabled: {
    backgroundColor: '#D8D8DE',
  },
  submitEnabled: {
    backgroundColor: '#111114',
    shadowColor: '#111114',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 11,
    elevation: 6,
  },
  submitPressed: {
    backgroundColor: '#29292F',
    opacity: 0.72,
    transform: [{ scale: 0.975 }],
  },
});
