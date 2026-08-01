/**
 * Form Việc — 05 §5.2.
 *
 * Dùng cho TẠO MỚI. Sửa thì làm TẠI CHỖ ở `plan/task/[id].tsx` ("Sửa trực tiếp
 * tại chỗ, không cần vào form riêng" — 05 §5.2), nên route này không nhận `id`.
 *
 * Thứ tự trường theo thứ tự người ta nghĩ: làm gì → bao giờ → ai làm → lặp
 * không → nhắc trước → ghi chú. Chỉ tên việc là bắt buộc; mọi thứ khác bỏ trống
 * được và vẫn là một bản ghi đầy đủ.
 *
 * Form có thay đổi chưa lưu → hỏi trước khi đóng; chưa gõ gì → đóng thẳng
 * (05 §Quy ước điều hướng).
 */

import {
  addDays,
  parseISODate,
  weekdayOf,
  type ISODate,
  type RecurFreq,
  type Recurrence,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import {
  Button,
  DatePicker,
  FormRow,
  Icon,
  ICON_COLOR,
  PickerSheet,
  Sheet,
} from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import { useCreateTask } from '@/features/task/queries/use-tasks';
import { useT, weekdayShort } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

/** Tần suất hiện trên form. `none` là một lựa chọn thật, không phải trạng thái ẩn. */
const FREQS: readonly (RecurFreq | 'none')[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

/** Nhắc trước — chỉ vài mốc có ý nghĩa, không phải ô nhập số tự do. */
const LEAD_DAYS = [0, 1, 3, 7] as const;

export function TaskFormScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  // Bàn phím bật SAU khi sheet trượt xong — xem `use-sheet-autofocus`.
  const titleRef = useSheetAutoFocus();
  const createTask = useCreateTask();
  const { data: members } = useMembers();

  /**
   * Ngữ cảnh sự kiện — form mở từ "Thêm việc" trên màn chi tiết sự kiện (05 §5.4).
   *
   * Người dùng KHÔNG thấy trường này và không chọn gì cả: họ đang đứng trong
   * ngày giỗ và bấm "Thêm việc". Đó chính là cách nguyên tắc "mọi thông tin
   * phải có ngữ cảnh" được thực thi mà không bắt ai hiểu khái niệm liên kết.
   */
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = (params.eventId ?? null) as UUID | null;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<ISODate | null>(null);
  const [assigneeId, setAssigneeId] = useState<UUID | null>(null);
  const [freq, setFreq] = useState<RecurFreq | 'none'>('none');
  const [remindLeadDays, setRemindLeadDays] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  /**
   * Bộ chọn nào đang mở — MỘT state, không phải một cờ cho mỗi sheet.
   *
   * Các sheet dùng chung một state để không thể chồng lên nhau. Date picker
   * nằm inline nên có state riêng, không thuộc nhóm sheet này.
   */
  const [picker, setPicker] = useState<null | 'assignee' | 'recur' | 'reminder'>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const trimmed = title.trim();
  const dirty =
    trimmed !== '' || notes !== '' || dueDate !== null || assigneeId !== null || freq !== 'none';

  const close = (): void => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(t.task.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || createTask.isPending) return;

    // Việc lặp cần một mốc neo: `expandRecurrence` tính mọi lần lặp từ ngày đến
    // hạn đầu tiên. Không có hạn thì "hằng tuần" không có nghĩa gì cả.
    const recur: Recurrence | null =
      freq === 'none' || dueDate === null ? null : { freq, intervalN: 1 };

    createTask.mutate(
      {
        title: trimmed,
        notes: notes.trim() === '' ? null : notes.trim(),
        assigneeId,
        dueDate,
        dueTime: null,
        recur,
        remindLeadDays,
        eventId,
      },
      { onSuccess: () => router.back() },
    );
  };

  const titleError = submitted && trimmed === '' ? t.validation.taskTitle : undefined;

  /**
   * Tên ngày cho dòng chọn: "Hôm nay" / "Ngày mai" / "09/08/2026".
   *
   * Hai ngày gần nhất gọi bằng tên vì đó là cách người ta thật sự nói, và nó
   * đọc nhanh hơn một con số phải đối chiếu với lịch trong đầu. Xa hơn thì tên
   * riêng không còn tồn tại nên quay về dạng số.
   */
  const dateName = (d: ISODate): string => {
    if (d === today) return t.dueLabel.today;
    if (d === addDays(today, 1)) return t.dueLabel.tomorrow;
    const c = parseISODate(d);
    return `${String(c.day).padStart(2, '0')}/${String(c.month).padStart(2, '0')}/${c.year}`;
  };

  /** Dòng phụ dưới tên ngày — thứ + ngày/tháng, để tên gọi có chỗ neo cụ thể. */
  const dateHint = (d: ISODate): string => {
    const c = parseISODate(d);
    return `${weekdayShort(weekdayOf(d))}, ${String(c.day).padStart(2, '0')}/${String(c.month).padStart(2, '0')}`;
  };

  const assigneeName =
    assigneeId === null
      ? t.task.fieldAssigneeNone
      : ((members ?? []).find((m) => m.id === assigneeId)?.displayName ?? t.task.fieldAssigneeNone);

  return (
    <Sheet
      title={t.task.formTitle}
      onClose={close}
      actions={
        <Button label={t.common.save} loading={createTask.isPending} onPress={save} />
      }
    >
      {/* Tên việc là trường DUY NHẤT gõ thẳng trên form — nó bắt buộc, và bắt
          mở một sheet chỉ để gõ một dòng chữ là thêm một chạm cho thao tác
          thường xuyên nhất. Mọi trường còn lại đều chọn, nên chúng thành dòng. */}
      <View
        className={`min-h-[72px] flex-row items-center gap-3 border-b py-3 ${
          titleError ? 'border-critical' : 'border-line'
        }`}
      >
        <View className="w-8 items-center">
          <Icon name="task" color={titleError ? ICON_COLOR.critical : ICON_COLOR.ink} />
        </View>
        <View className="flex-1">
          <Text
            className={`text-label font-medium ${titleError ? 'text-critical' : 'text-muted'}`}
          >
            {t.task.fieldTitle}
          </Text>
          {/* Không viền, không nền: ô nhập phải đọc như một DÒNG trong danh sách
              y hệt `FormRow` bên dưới, chỉ khác là gõ được thay vì chạm mở sheet.
              Một khung viền ở đây làm nó thành vật thể khác loại, và cả form gãy
              nhịp ngay ở dòng đầu. */}
          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={setTitle}
            placeholder={t.task.fieldTitlePlaceholder}
            placeholderTextColor="#A4A4AD"
            accessibilityLabel={t.task.fieldTitle}
            maxLength={120}
            className="mt-1 p-0 text-body font-medium text-ink"
          />
        </View>
      </View>
      {titleError ? (
        <Text className="ml-11 mt-1 text-caption text-critical">{titleError}</Text>
      ) : null}

      <FormRow
        icon="date"
        label={t.task.fieldDueDate}
        value={dueDate === null ? t.task.noDueDate : dateName(dueDate)}
        hint={dueDate === null ? undefined : dateHint(dueDate)}
        muted={dueDate === null}
        onPress={() => setDatePickerOpen((open) => !open)}
      />

      {datePickerOpen ? (
        <DatePicker
          nativeOnly
          value={dueDate}
          onChange={setDueDate}
          onNativeClose={() => setDatePickerOpen(false)}
          today={today}
        />
      ) : null}

      <FormRow
        icon="assignee"
        label={t.task.fieldAssignee}
        value={assigneeName}
        muted={assigneeId === null}
        onPress={() => setPicker('assignee')}
        last={dueDate === null}
      />

      {/* Lặp lại và nhắc trước chỉ có nghĩa khi đã có ngày. Chúng
          dùng cùng ngôn ngữ `FormRow` với ngày/người làm: form giữ được
          nhịp dọc đều, còn danh sách lựa chọn nằm trong sheet. */}
      {dueDate !== null ? (
        <FormRow
          icon="repeat"
          label={t.task.fieldRecur}
          value={t.recur[freq]}
          muted={freq === 'none'}
          onPress={() => setPicker('recur')}
        />
      ) : null}

      {dueDate !== null ? (
        <FormRow
          icon="bell"
          label={t.task.fieldRemindLead}
          value={
            remindLeadDays === 0
              ? t.dueLabel.today
              : f(t.dueLabel.inDays, { days: remindLeadDays })
          }
          onPress={() => setPicker('reminder')}
          last
        />
      ) : null}

      {/* Ghi chú tách hẳn khỏi nhóm trên bằng khoảng trắng lớn: nó là thứ tuỳ
          chọn, và đặt nó ngang hàng với các trường chính làm form trông dài hơn
          thực tế phải điền. */}
      <View className="mt-8">
        {/* Bộ đếm chỉ hiện khi đã gần chạm trần. Thiết kế gốc hiện "0/120" ngay
            từ đầu, nhưng trần ở đây là 2000 — một ghi chú việc nhà không bao giờ
            tới gần, nên con số đó chỉ là nhiễu cho tới lúc nó thật sự có ý
            nghĩa. */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-label font-medium text-muted">{t.task.fieldNotes}</Text>
          {notes.length > NOTES_MAX - 200 ? (
            <Text className="text-caption tabular-nums text-subtle">
              {`${notes.length}/${NOTES_MAX}`}
            </Text>
          ) : null}
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.task.fieldNotes}
          multiline
          numberOfLines={3}
          maxLength={NOTES_MAX}
          className="min-h-[108px] rounded-featured bg-soft px-4 py-3.5 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </View>

      {createTask.isError ? (
        <Text className="mt-3 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />

      <PickerSheet
        open={picker === 'assignee'}
        title={t.task.pickAssignee}
        onClose={() => setPicker(null)}
      >
        <View>
          {[
            { value: null as UUID | null, label: t.task.fieldAssigneeNone },
            ...(members ?? []).map((m) => ({ value: m.id as UUID | null, label: m.displayName })),
          ].map((opt) => (
            <PickerOption
              key={opt.value ?? 'none'}
              label={opt.label}
              selected={assigneeId === opt.value}
              onPress={() => {
                setAssigneeId(opt.value);
                setPicker(null);
              }}
            />
          ))}
        </View>
      </PickerSheet>

      <PickerSheet
        open={picker === 'recur'}
        title={t.task.fieldRecur}
        onClose={() => setPicker(null)}
      >
        <View>
          {FREQS.map((option) => (
            <PickerOption
              key={option}
              label={t.recur[option]}
              selected={freq === option}
              onPress={() => {
                setFreq(option);
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
            const label =
              days === 0 ? t.dueLabel.today : f(t.dueLabel.inDays, { days });
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

/** Giới hạn ghi chú — hiện thành bộ đếm nên phải là một hằng, không phải số rời. */
const NOTES_MAX = 2000;

/**
 * Một lựa chọn trong sheet (người làm, lặp lại, nhắc trước).
 *
 * Trạng thái chọn nói bằng HAI thứ: nền `brand-soft` và dấu ✓. Chỉ đổi màu nền
 * là vi phạm design.md §5.5 ("không dùng màu một mình để truyền trạng thái") —
 * người phân biệt màu kém sẽ thấy ba dòng như nhau.
 */
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
