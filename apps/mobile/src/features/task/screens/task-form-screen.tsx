/**
 * Form Việc — MỘT màn cho cả thêm mới lẫn sửa (`?id=`).
 *
 * ── Vì sao gộp ──
 *
 * Trước đây là hai màn: một composer nhập nhanh (`task-form`) và một form đầy đủ
 * (`task-edit`). Hai màn cùng ghi một bảng, cùng bốn trường, nhưng khác nhau về
 * bố cục, về cách hỏi ngày, và về việc trường nào có mặt — nên "thêm việc rồi
 * mở lại ra sửa" là đi qua hai giao diện không liên quan gì nhau. Người dùng
 * học cách dùng form hai lần, và mỗi lần sửa một quy tắc nghiệp vụ là sửa hai
 * chỗ (đúng kiểu chỗ mà lần thứ hai bị quên).
 *
 * Gộp lại thì `taskId === null` là khác biệt DUY NHẤT, và nó chỉ đổi ba thứ:
 * tiêu đề sheet, có nút Xoá hay không, và có ô tròn đánh dấu xong hay không.
 *
 * Cái mất: composer cũ thêm việc bằng đúng một chạm rồi gõ. Bản gộp bắt thêm
 * một chạm vào nút Lưu. Đổi lại bằng cách giữ autofocus ở ô tên khi thêm mới —
 * sheet mở ra là bàn phím đã sẵn, và `submitBehavior` cho phép gõ xong bấm
 * Enter là lưu, không cần với tới nút.
 *
 * ── Bố cục: hai thẻ, mỗi thẻ một câu hỏi ──
 *
 * «Nội dung» (tên + ghi chú) là thứ người dùng gõ; «Thiết lập» (hạn · người làm
 * · lặp lại · nhắc trước) là thứ người dùng chọn. Tách hai thẻ để phần phải gõ
 * không bị bốn dòng chọn đẩy xuống dưới màn hình.
 *
 * Bốn dòng thiết lập đều mở `PickerSheet` thay vì trải chip tại chỗ: mỗi dòng
 * chiếm một chiều cao cố định nên cả form đọc thành một danh sách đều nhịp, và
 * chiều cao form không nhảy theo số lựa chọn của từng trường.
 *
 * ── Hai thao tác KHÔNG đi qua nút Lưu ──
 *
 * Ô tròn đánh dấu xong và nút Xoá ghi NGAY. Chúng không phải "sửa một trường của
 * bản ghi" mà là hành động trên chính bản ghi đó — và ô tròn còn phải giữ đúng
 * lời hứa một-chạm-là-xong của F3 (04 §6). Bắt người dùng tick rồi bấm Lưu là
 * thêm một nhịp vào thao tác được dùng nhiều nhất app.
 *
 * ── Vì sao đóng giữa chừng phải hỏi lại ──
 *
 * Sheet vuốt xuống được là sheet có thể bị đóng bằng cử chỉ, không phải bằng
 * một nút ta kiểm soát. Nên `dirty` so sánh THỦ CÔNG từng trường với bản gốc:
 * thiếu nó thì hộp thoại "bỏ thay đổi?" hiện cả khi người dùng chỉ mở ra xem rồi
 * đóng, và một câu hỏi luôn hiện là một câu hỏi không ai đọc nữa.
 */

import {
  formatDueLabel,
  weekdayOf,
  type ISODate,
  type RecurFreq,
  type Recurrence,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import {
  Button,
  Checkbox,
  DatePicker,
  Divider,
  ErrorState,
  FormRow,
  Icon,
  ICON_COLOR,
  ListSkeleton,
  MemberAvatar,
  PickerSheet,
  SectionHeader,
  Sheet,
} from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import {
  useCreateTask,
  useDeleteTask,
  useRecentDoneInstances,
  useSetTaskDone,
  useTask,
  useUpdateTask,
} from '@/features/task/queries/use-tasks';
import { dueLabelText, fullSolarDate, useT, weekdayShort } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

const FREQS: readonly (RecurFreq | 'none')[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
const LEAD_DAYS = [0, 1, 3, 7] as const;

const TITLE_MAX = 120;
const NOTES_MAX = 2000;

/** Bộ chọn đang mở. `null` = không có cái nào. */
type Picker = 'date' | 'assignee' | 'recur' | 'remind' | null;

export function TaskFormScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const taskId = (params.id ?? null) as UUID | null;
  const eventId = (params.eventId ?? null) as UUID | null;
  const isEdit = taskId !== null;

  // Bàn phím bật SAU khi sheet trượt xong, và CHỈ khi thêm mới: mở một việc đã
  // có là để xem, không phải để gõ ngay — bật bàn phím lúc đó che mất nửa form
  // mà người dùng vừa mở ra để đọc.
  const titleRef = useSheetAutoFocus(!isEdit);

  const { data: task, isPending, isError, refetch } = useTask(taskId as UUID);
  const { data: members } = useMembers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const setDone = useSetTaskDone();
  const remove = useDeleteTask();

  /**
   * TOÀN BỘ form là state cục bộ, kể cả các trường chọn-một-lựa-chọn.
   *
   * Một dòng thiết lập ghi thẳng xuống DB sẽ là một thay đổi không huỷ được nằm
   * lẫn giữa những thay đổi huỷ được — người dùng bấm «Bỏ thay đổi» mà cái dòng
   * đó vẫn đổi.
   */
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  // Thêm mới thì mặc định hôm nay (việc nhà gần như luôn là việc của hôm nay);
  // sửa thì lấy đúng giá trị đã lưu, kể cả `null`.
  const [dueDate, setDueDate] = useState<ISODate | null>(isEdit ? null : today);
  const [assigneeId, setAssigneeId] = useState<UUID | null>(null);
  const [recur, setRecur] = useState<Recurrence | null>(null);
  const [remindLeadDays, setRemindLeadDays] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);

  /**
   * Nạp một lần khi dữ liệu về. Phụ thuộc `task` chứ không `task.id` là có chủ
   * ý: một lần refetch trả về bản ghi người kia vừa sửa sẽ nạp lại form. Đánh
   * đổi này chấp nhận được vì cửa sổ thời gian mở một sheet là ngắn, và thà thấy
   * dữ liệu mới còn hơn lưu đè lên thứ mình chưa từng thấy.
   */
  useEffect(() => {
    if (!isEdit || !task) return;
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setDueDate(task.dueDate);
    setAssigneeId(task.assigneeId);
    setRecur(task.recur);
    setRemindLeadDays(task.remindLeadDays);
  }, [isEdit, task]);

  // Một lệnh back duy nhất: nút Lưu và cử chỉ vuốt có thể cùng phát trong một
  // frame, và lần thứ hai sẽ chạy sau khi sheet đã rời navigation tree.
  const navigatingBackRef = useRef(false);
  const goBackOnce = (): void => {
    if (navigatingBackRef.current) return;
    navigatingBackRef.current = true;
    router.back();
  };

  // Sheet đóng khi lưu xong; `mutate` vẫn giữ tham chiếu tới callback nên phải
  // biết mình còn trong cây hay không trước khi gọi điều hướng.
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const sheetTitle = isEdit ? t.task.formEditTitle : t.task.formTitle;

  if (isEdit && isPending) {
    return (
      <Sheet title={sheetTitle} onClose={goBackOnce} background="canvas">
        <ListSkeleton rows={4} />
      </Sheet>
    );
  }

  if (isEdit && (isError || !task)) {
    return (
      <Sheet title={sheetTitle} onClose={goBackOnce} background="canvas">
        <ErrorState
          message={isError ? t.error.unknown : t.error.notFound}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </Sheet>
    );
  }

  const trimmed = title.trim();
  const trimmedNotes = notes.trim() === '' ? null : notes.trim();
  const titleError = submitted && trimmed === '';
  const pending = createTask.isPending || updateTask.isPending;

  /**
   * So sánh từng trường với bản gốc — xem chú thích đầu file.
   *
   * `recur` so bằng `freq`/`intervalN` chứ không bằng tham chiếu: `setRecur`
   * dựng object mới mỗi lần chọn, nên `!==` sẽ luôn đúng và form luôn "dirty".
   */
  const dirty = task
    ? trimmed !== task.title ||
      trimmedNotes !== task.notes ||
      dueDate !== task.dueDate ||
      assigneeId !== task.assigneeId ||
      remindLeadDays !== task.remindLeadDays ||
      (recur?.freq ?? null) !== (task.recur?.freq ?? null) ||
      (recur?.intervalN ?? null) !== (task.recur?.intervalN ?? null)
    : trimmed !== '' ||
      trimmedNotes !== null ||
      dueDate !== today ||
      assigneeId !== null ||
      recur !== null ||
      remindLeadDays !== 0;

  const close = (): void => {
    if (!dirty) {
      goBackOnce();
      return;
    }
    Alert.alert(t.common.discardTitle, t.common.discardBody, [
      { text: t.common.keepEditing, style: 'cancel' },
      { text: t.common.discardConfirm, style: 'destructive', onPress: goBackOnce },
    ]);
  };

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || pending) return;

    /**
     * `list` đi kèm `recur` trong CÙNG một patch — 03 §4b.
     *
     * Đặt lặp lại chuyển việc sang danh sách định kỳ, bỏ lặp thì chuyển ngược
     * lại. Tách thành hai lệnh thì một lần mạng hỏng giữa chừng để lại việc có
     * `recur` nhưng vẫn nằm ở tab Linh hoạt — một dòng kẹt không có đường nào
     * sửa từ UI.
     */
    const input = {
      title: trimmed,
      notes: trimmedNotes,
      list: recur === null ? ('flexible' as const) : ('recurring' as const),
      assigneeId,
      dueDate,
      dueTime: null,
      recur,
      remindLeadDays,
    };

    if (isEdit && taskId) {
      if (!dirty) {
        goBackOnce();
        return;
      }
      updateTask.mutate(
        { id: taskId, patch: input },
        {
          onSuccess: () => {
            if (mountedRef.current) goBackOnce();
          },
        },
      );
      return;
    }

    createTask.mutate(
      { ...input, eventId },
      {
        onSuccess: () => {
          if (mountedRef.current) goBackOnce();
        },
      },
    );
  };

  const confirmDelete = (): void => {
    // CÓ hỏi lại, khác vuốt-để-xoá ở danh sách: sheet này đóng luôn khi xoá nên
    // không có chỗ đặt thanh hoàn tác.
    if (!taskId || !task) return;
    Alert.alert(task.title, t.common.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () =>
          remove.mutate(taskId, {
            onSuccess: () => {
              if (mountedRef.current) goBackOnce();
            },
          }),
      },
    ]);
  };

  // ── Nhãn cho bốn dòng thiết lập ──

  const selectedMember = (members ?? []).find((m) => m.id === assigneeId);
  const assigneeLabel = selectedMember?.displayName ?? t.task.fieldAssigneeNone;

  const dateLabel =
    dueDate === null
      ? t.task.noDueDate
      : `${weekdayShort(weekdayOf(dueDate))}, ${fullSolarDate(dueDate)}`;

  // Dòng phụ dưới ngày: chỉ hiện khi nó nói thêm được điều gì. "Quá hạn 4 ngày"
  // là thông tin; lặp lại chính ngày vừa in ở trên thì không.
  const dateHint = dueDate === null ? undefined : dueLabelText(formatDueLabel(dueDate, today));

  const recurLabel = t.recur[recur?.freq ?? 'none'];
  const remindLabel =
    remindLeadDays === 0 ? t.dueLabel.today : f(t.dueLabel.inDays, { days: remindLeadDays });

  return (
    <Sheet
      title={sheetTitle}
      onClose={close}
      background="canvas"
      actions={
        // Xoá là nút vuông cạnh nút Lưu, không phải một nút full-width ở cuối
        // form: đặt nó ở cuối vùng cuộn thì nó nằm ngay dưới trường cuối cùng,
        // và một nút phá huỷ nằm ngay dưới chỗ vừa gõ là chỗ dễ chạm nhầm.
        <View className="flex-row items-center gap-3">
          {isEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.delete}
              onPress={confirmDelete}
              className="h-14 w-14 items-center justify-center rounded-full bg-critical-soft active:opacity-70"
            >
              <Icon name="trash" size={20} color={ICON_COLOR.critical} />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Button
              label={t.common.save}
              onPress={save}
              disabled={trimmed === '' || pending}
              loading={pending}
            />
          </View>
        </View>
      }
    >
      {/* ── Thẻ NỘI DUNG ── */}
      <View className="rounded-section bg-surface p-4 shadow-section">
        <View className="flex-row items-start gap-3">
          {/* Ô tròn ghi NGAY, không chờ Lưu — xem chú thích đầu file. Chỉ có khi
              sửa: một việc chưa tồn tại thì chưa có gì để đánh dấu xong. */}
          {isEdit && task ? (
            <View className="pt-1.5">
              <Checkbox
                checked={task.status === 'done'}
                onToggle={(next) => setDone.mutate({ id: taskId as UUID, done: next })}
              />
            </View>
          ) : null}

          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={save}
            placeholder={t.task.fieldTitlePlaceholder}
            placeholderTextColor="#A4A4AD"
            accessibilityLabel={t.task.fieldTitle}
            multiline
            maxLength={TITLE_MAX}
            returnKeyType="done"
            submitBehavior="submit"
            className="flex-1 text-title2 font-semibold text-ink"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {titleError ? (
          <Text className="mt-1 text-caption text-critical">{t.validation.taskTitle}</Text>
        ) : null}

        <Divider />

        <Text className="text-label font-medium text-muted">{t.task.fieldNotes}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.task.fieldNotes}
          multiline
          numberOfLines={3}
          maxLength={NOTES_MAX}
          className="mt-1 min-h-[72px] text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </View>

      {/* ── Thẻ THIẾT LẬP ── */}
      <View className="mt-4 rounded-section bg-surface px-4 shadow-section">
        <FormRow
          icon="date"
          label={t.task.fieldDueDate}
          value={dateLabel}
          hint={dateHint}
          muted={dueDate === null}
          onPress={() => setPicker('date')}
        />

        <FormRow
          icon="assignee"
          label={t.task.fieldAssignee}
          value={assigneeLabel}
          muted={assigneeId === null}
          onPress={() => setPicker('assignee')}
          last={dueDate === null}
        />

        {/* Hai dòng dưới biến mất CÙNG LÚC khi bỏ ngày đến hạn (09 §D.4): lặp
            lại không có mốc neo thì `expandRecurrence` không tính ra lần nào, và
            "nhắc trước N ngày" không có ngày để đếm ngược từ đó. */}
        {dueDate !== null ? (
          <FormRow
            icon="repeat"
            label={t.task.fieldRecur}
            value={recurLabel}
            muted={recur === null}
            onPress={() => setPicker('recur')}
          />
        ) : null}

        {dueDate !== null ? (
          <FormRow
            icon="bell"
            label={t.task.fieldRemindLead}
            value={remindLabel}
            onPress={() => setPicker('remind')}
            last
          />
        ) : null}
      </View>

      {/* Lịch sử đọc theo `task.recur` (đã lưu), KHÔNG theo `recur` đang sửa:
          khối này là dữ liệu có thật của bản ghi, và cho nó hiện ra lúc người
          dùng vừa chọn "hằng tuần" là hứa một lịch sử chưa tồn tại. */}
      {isEdit && task?.recur ? (
        <View className="mt-4 rounded-section bg-surface px-4 pb-2 shadow-section">
          <RecentDone taskId={taskId as UUID} />
        </View>
      ) : null}

      {createTask.isError || updateTask.isError ? (
        <Text className="mt-4 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />

      {/* ── Bốn bộ chọn ──
          `PickerSheet` là `Modal` của React Native, không phải route: form phía
          dưới giữ nguyên state khi bộ chọn mở. */}

      <PickerSheet
        open={picker === 'date'}
        title={t.task.pickDate}
        onClose={() => setPicker(null)}
      >
        <DatePicker
          value={dueDate}
          today={today}
          onChange={(next) => {
            setDueDate(next);
            // Bỏ ngày thì bỏ luôn lặp lại và nhắc trước — cả hai đều đếm từ ngày
            // đến hạn, nên giữ lại là giữ một thiết lập vô hình trên màn hình mà
            // vẫn nằm trong DB.
            if (next === null) {
              setRecur(null);
              setRemindLeadDays(0);
            }
          }}
        />
      </PickerSheet>

      <PickerSheet
        open={picker === 'assignee'}
        title={t.task.pickAssignee}
        onClose={() => setPicker(null)}
      >
        {/* "Chưa phân" là lựa chọn ĐẦU, không phải một nút xoá ở cuối: rất nhiều
            việc nhà không thuộc về ai, và ràng buộc #6 nói việc không gán ai thì
            nhắc cả hai — nên đó là một trạng thái bình thường, không phải trạng
            thái cần huỷ. */}
        <OptionRow
          label={t.task.fieldAssigneeNone}
          selected={assigneeId === null}
          onPress={() => {
            setAssigneeId(null);
            setPicker(null);
          }}
        />
        {(members ?? []).map((member, i) => (
          <OptionRow
            key={member.id}
            label={member.displayName}
            selected={member.id === assigneeId}
            leading={<MemberAvatar name={member.displayName} size="md" />}
            last={i === (members ?? []).length - 1}
            onPress={() => {
              setAssigneeId(member.id);
              setPicker(null);
            }}
          />
        ))}
      </PickerSheet>

      <PickerSheet
        open={picker === 'recur'}
        title={t.task.fieldRecur}
        onClose={() => setPicker(null)}
      >
        {FREQS.map((freq, i) => (
          <OptionRow
            key={freq}
            label={t.recur[freq]}
            selected={(recur?.freq ?? 'none') === freq}
            last={i === FREQS.length - 1}
            onPress={() => {
              setRecur(freq === 'none' ? null : { freq, intervalN: 1 });
              setPicker(null);
            }}
          />
        ))}
      </PickerSheet>

      <PickerSheet
        open={picker === 'remind'}
        title={t.task.fieldRemindLead}
        onClose={() => setPicker(null)}
      >
        {LEAD_DAYS.map((days, i) => (
          <OptionRow
            key={days}
            label={days === 0 ? t.dueLabel.today : f(t.dueLabel.inDays, { days })}
            selected={days === remindLeadDays}
            last={i === LEAD_DAYS.length - 1}
            onPress={() => {
              setRemindLeadDays(days);
              setPicker(null);
            }}
          />
        ))}
      </PickerSheet>
    </Sheet>
  );
}

/**
 * Một lựa chọn trong `PickerSheet`.
 *
 * Dấu tick nằm bên PHẢI trong một vòng tròn accent, không phải một dấu ✓ trần:
 * vòng tròn giữ chỗ ở cả hai trạng thái nên danh sách không nhảy ngang khi đổi
 * lựa chọn, và nó dùng đúng quy tắc "đang chọn = nền accent" của `Checkbox`.
 */
function OptionRow({
  label,
  selected,
  onPress,
  leading,
  last = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-[60px] flex-row items-center gap-3 py-3 active:bg-soft ${
        last ? '' : 'border-b border-line'
      }`}
    >
      {leading}
      <Text className="flex-1 text-body font-medium text-ink">{label}</Text>
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${
          selected ? 'bg-accent' : 'bg-soft'
        }`}
      >
        {selected ? <Icon name="check" size={16} color={ICON_COLOR.accentInk} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * 5 lần gần nhất đã xong — 05 §5.2.
 *
 * Chỉ ngày, KHÔNG hiện ai làm. Cột "ai" ở đây là một bảng đối chiếu giữa hai
 * người dưới dạng khác, và bảng xếp hạng giữa hai người là thứ không làm (04 §9).
 */
function RecentDone({ taskId }: { taskId: UUID }) {
  const { t } = useT();
  const { data: instances, isPending } = useRecentDoneInstances(taskId);

  return (
    <View>
      <SectionHeader title={t.task.recentDone} />
      {isPending ? (
        <ListSkeleton rows={2} />
      ) : (instances ?? []).length === 0 ? (
        <Text className="pb-3 text-body text-subtle">{t.task.noRecentDone}</Text>
      ) : (
        (instances ?? []).map((inst, i) => (
          <View key={inst.id}>
            {i > 0 ? <Divider /> : null}
            <View className="min-h-touch flex-row items-center gap-3 py-3">
              <Text className="text-caption text-positive">✓</Text>
              <Text className="text-body text-ink">{fullSolarDate(inst.dueDate)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
