/**
 * Sửa việc — modal fill sẵn, THAY màn chi tiết cũ (09 §D.4).
 *
 * Chạm một dòng việc ở tab Việc & Sự kiện mở thẳng form này với dữ liệu đã điền.
 *
 * ── Đổi mô hình so với bản trước, và vì sao ──
 *
 * Màn chi tiết cũ sửa **tại chỗ**: mỗi trường tự lưu khi rời khỏi nó, không có
 * nút «Lưu». Lập luận khi ấy là "bản ghi đã tồn tại nên huỷ không có nghĩa".
 *
 * Modal thì buộc phải khác: một tấm sheet vuốt xuống được là một tấm sheet có
 * thể bị đóng giữa chừng — bằng cử chỉ, không phải bằng một nút ta kiểm soát.
 * Nếu mỗi trường đã tự lưu thì cú vuốt ấy không huỷ được gì, và người dùng vừa
 * đổi bốn trường rồi vuốt xuống sẽ tưởng mình vừa thoát mà không lưu. Nên ở đây:
 * **gom vào một nút «Lưu», và đóng giữa chừng thì hỏi lại nếu có thay đổi.**
 *
 * Hệ quả phải chấp nhận: `dirty` so sánh THỦ CÔNG từng trường với bản gốc. Không
 * có cách nào rẻ hơn — thiếu nó thì hộp thoại "bỏ thay đổi?" hiện cả khi người
 * dùng chỉ mở ra xem rồi đóng, và một câu hỏi luôn hiện là một câu hỏi không ai
 * đọc nữa.
 *
 * ── Hai thao tác KHÔNG đi qua nút Lưu ──
 *
 * Ô tròn đánh dấu xong và nút Xoá ghi NGAY, không chờ «Lưu». Chúng không phải
 * "thay đổi một trường của bản ghi" mà là hành động trên chính bản ghi đó — và
 * ô tròn còn phải giữ đúng lời hứa một-chạm-là-xong của F3 (04 §6). Bắt người
 * dùng tick rồi bấm Lưu là thêm một nhịp vào thao tác được dùng nhiều nhất app.
 */

import {
  formatDueLabel,
  type ISODate,
  type RecurFreq,
  type Recurrence,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import {
  Button,
  Checkbox,
  ChipSelect,
  DatePicker,
  Divider,
  ErrorState,
  Field,
  ListSkeleton,
  SectionHeader,
  Sheet,
} from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import {
  useDeleteTask,
  useRecentDoneInstances,
  useSetTaskDone,
  useTask,
  useUpdateTask,
} from '@/features/task/queries/use-tasks';
import { dueLabelText, fullSolarDate, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

const FREQS: readonly (RecurFreq | 'none')[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
const LEAD_DAYS = [0, 1, 3, 7] as const;

export function TaskEditScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = id as UUID;

  const { data: task, isPending, isError, refetch } = useTask(taskId);
  const { data: members } = useMembers();
  const update = useUpdateTask();
  const setDone = useSetTaskDone();
  const remove = useDeleteTask();

  // Một lệnh back duy nhất: nút Lưu và cử chỉ vuốt có thể cùng phát trong một
  // frame, và lần thứ hai sẽ chạy sau khi sheet đã rời navigation tree.
  const navigatingBackRef = useRef(false);
  const goBackOnce = (): void => {
    if (navigatingBackRef.current) return;
    navigatingBackRef.current = true;
    router.back();
  };

  /**
   * TOÀN BỘ form là state cục bộ, kể cả các trường chọn-một-lựa-chọn.
   *
   * Khác màn chi tiết cũ, nơi chip ghi thẳng xuống DB vì không có nút Lưu. Ở đây
   * một chip ghi thẳng sẽ là một thay đổi không huỷ được nằm lẫn giữa những thay
   * đổi huỷ được — người dùng bấm «Bỏ thay đổi» mà cái chip vẫn đổi.
   */
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<ISODate | null>(null);
  const [assigneeId, setAssigneeId] = useState<UUID | null>(null);
  const [recur, setRecur] = useState<Recurrence | null>(null);
  const [remindLeadDays, setRemindLeadDays] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Nạp một lần khi dữ liệu về. Phụ thuộc `task` chứ không `task.id` là có chủ
  // ý: một lần refetch trả về bản ghi người kia vừa sửa sẽ nạp lại form. Đánh
  // đổi này chấp nhận được vì cửa sổ thời gian mở một sheet là ngắn, và thà
  // thấy dữ liệu mới còn hơn lưu đè lên thứ mình chưa từng thấy.
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setDueDate(task.dueDate);
    setAssigneeId(task.assigneeId);
    setRecur(task.recur);
    setRemindLeadDays(task.remindLeadDays);
  }, [task]);

  if (isPending) {
    return (
      <Sheet title={t.task.formEditTitle} onClose={goBackOnce}>
        <ListSkeleton rows={4} />
      </Sheet>
    );
  }

  if (isError || !task) {
    return (
      <Sheet title={t.task.formEditTitle} onClose={goBackOnce}>
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

  // So sánh từng trường với bản gốc — xem chú thích đầu file. `recur` so bằng
  // `freq`/`intervalN` chứ không bằng tham chiếu: `setRecur` dựng object mới mỗi
  // lần chạm chip, nên `!==` sẽ luôn đúng và form luôn "dirty".
  const dirty =
    trimmed !== task.title ||
    trimmedNotes !== task.notes ||
    dueDate !== task.dueDate ||
    assigneeId !== task.assigneeId ||
    remindLeadDays !== task.remindLeadDays ||
    (recur?.freq ?? null) !== (task.recur?.freq ?? null) ||
    (recur?.intervalN ?? null) !== (task.recur?.intervalN ?? null);

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
    if (trimmed === '' || update.isPending) return;
    if (!dirty) {
      goBackOnce();
      return;
    }

    update.mutate(
      {
        id: taskId,
        patch: {
          title: trimmed,
          notes: trimmedNotes,
          dueDate,
          assigneeId,
          recur,
          remindLeadDays,
          /**
           * `list` đi kèm `recur` trong CÙNG một patch — 03 §4b.
           *
           * Đặt lặp lại chuyển việc sang danh sách định kỳ, bỏ lặp thì chuyển
           * ngược lại. Tách thành hai lệnh thì một lần mạng hỏng giữa chừng để
           * lại việc có `recur` nhưng vẫn nằm ở tab Linh hoạt — một dòng kẹt
           * không có đường nào sửa từ UI.
           */
          list: recur === null ? 'flexible' : 'recurring',
        },
      },
      { onSuccess: goBackOnce },
    );
  };

  const confirmDelete = (): void => {
    // CÓ hỏi lại, khác vuốt-để-xoá ở danh sách: sheet này đóng luôn khi xoá nên
    // không có chỗ đặt thanh hoàn tác.
    Alert.alert(task.title, t.common.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(taskId, { onSuccess: goBackOnce }),
      },
    ]);
  };

  return (
    <Sheet
      title={t.task.formEditTitle}
      onClose={close}
      actions={
        <Button
          label={t.common.save}
          onPress={save}
          disabled={trimmed === '' || update.isPending}
          loading={update.isPending}
        />
      }
    >
      {/* Ô tròn + tên trên cùng một hàng, như ở danh sách. Ô tròn ghi NGAY,
          không chờ Lưu — xem chú thích đầu file. */}
      <View className="flex-row items-start gap-3 pt-2">
        <View className="pt-2">
          <Checkbox
            checked={task.status === 'done'}
            onToggle={(next) => setDone.mutate({ id: taskId, done: next })}
          />
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          accessibilityLabel={t.task.fieldTitle}
          multiline
          maxLength={120}
          className="flex-1 text-title2 font-semibold text-ink"
        />
      </View>

      {titleError ? (
        <Text className="ml-9 mt-1 text-caption text-critical">{t.validation.taskTitle}</Text>
      ) : dueDate ? (
        <Text className="ml-9 mt-1 text-caption text-subtle">
          {dueLabelText(formatDueLabel(dueDate, today))}
        </Text>
      ) : null}

      <View className="mt-6" />

      <Field label={t.task.fieldDueDate}>
        <DatePicker
          value={dueDate}
          today={today}
          onChange={(next: ISODate | null) => {
            setDueDate(next);
            // Bỏ ngày thì bỏ luôn lặp lại: lặp không có mốc neo thì
            // `expandRecurrence` không tính ra được lần nào.
            if (next === null) setRecur(null);
          }}
        />
      </Field>

      <Field label={t.task.fieldAssignee}>
        <ChipSelect
          scroll
          value={assigneeId}
          onChange={setAssigneeId}
          options={[
            { value: null, label: t.task.fieldAssigneeNone },
            ...(members ?? []).map((m) => ({ value: m.id as UUID | null, label: m.displayName })),
          ]}
        />
      </Field>

      {/* Ba khối dưới đây biến mất CÙNG LÚC khi bỏ ngày đến hạn (09 §D.4). */}
      {dueDate !== null ? (
        <Field label={t.task.fieldRecur}>
          <ChipSelect
            scroll
            value={recur?.freq ?? 'none'}
            onChange={(next) => setRecur(next === 'none' ? null : { freq: next, intervalN: 1 })}
            options={FREQS.map((v) => ({ value: v, label: t.recur[v] }))}
          />
        </Field>
      ) : null}

      {dueDate !== null ? (
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
      ) : null}

      <Field label={t.task.fieldNotes}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.task.fieldNotes}
          multiline
          numberOfLines={3}
          maxLength={2000}
          className="min-h-touch rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {/* Lịch sử đọc theo `task.recur` (đã lưu), KHÔNG theo `recur` đang sửa:
          khối này là dữ liệu có thật của bản ghi, và cho nó hiện ra lúc người
          dùng vừa chạm chip "hằng tuần" là hứa một lịch sử chưa tồn tại. */}
      {task.recur !== null ? <RecentDone taskId={taskId} /> : null}

      {update.isError ? (
        <Text className="mt-4 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="mt-8">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>
    </Sheet>
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
        <Text className="text-body text-subtle">{t.task.noRecentDone}</Text>
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
