/**
 * Chi tiết việc — 05 §5.2.
 *
 * "Sửa trực tiếp tại chỗ, không cần vào form riêng." Nghĩa là mỗi trường tự lưu
 * khi rời khỏi nó, không có nút `[Lưu]` chung ở cuối màn. Đổi có chủ ý so với
 * form tạo mới: ở đây bản ghi đã tồn tại, nên "huỷ" không có nghĩa gì — thứ
 * người dùng muốn là sửa một trường rồi đi tiếp.
 *
 * Việc lặp hiện 5 lần gần nhất đã xong, để trả lời "tuần trước có đổ rác không"
 * — dữ liệu cần cho chính giả thuyết đang validate.
 */

import { formatDueLabel, type ISODate, type RecurFreq, type UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  Screen,
  SectionHeader,
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

export function TaskDetailScreen() {
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

  // Ô chữ giữ state cục bộ để gõ không giật; các trường chọn-một-lựa-chọn thì
  // ghi thẳng vì chúng không có trạng thái "đang gõ dở".
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes ?? '');
  }, [task]);

  if (isPending) return <Screen><ListSkeleton rows={4} /></Screen>;
  if (isError || !task) {
    return (
      <Screen>
        <ErrorState
          message={isError ? t.error.unknown : t.error.notFound}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const patch = (p: Parameters<typeof update.mutate>[0]['patch']): void => {
    update.mutate({ id: taskId, patch: p });
  };

  const saveTitle = (): void => {
    const trimmed = title.trim();
    // Tên rỗng không được lưu — nhưng cũng không báo lỗi đỏ: chỉ trả lại tên cũ.
    if (trimmed === '' ) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) patch({ title: trimmed });
  };

  const saveNotes = (): void => {
    const next = notes.trim() === '' ? null : notes.trim();
    if (next !== task.notes) patch({ notes: next });
  };

  const confirmDelete = (): void => {
    // Ở đây CÓ hỏi lại, khác với vuốt-để-xoá ở danh sách: màn chi tiết không có
    // chỗ đặt thanh hoàn tác vì nút xoá cũng đóng luôn màn hình.
    Alert.alert(task.title, t.common.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(taskId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <Screen scroll>
      {/* Tên việc + ô tròn: cùng một hàng, cùng một thao tác một chạm như ở danh sách. */}
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
          onBlur={saveTitle}
          accessibilityLabel={t.task.fieldTitle}
          multiline
          maxLength={120}
          className="flex-1 text-title2 font-semibold text-ink"
        />
      </View>

      {task.dueDate ? (
        <Text className="ml-9 mt-1 text-caption text-subtle">
          {dueLabelText(formatDueLabel(task.dueDate, today))}
        </Text>
      ) : null}

      <View className="mt-6" />

      <Field label={t.task.fieldDueDate}>
        <DatePicker
          value={task.dueDate}
          today={today}
          onChange={(next: ISODate | null) => {
            // Bỏ ngày thì bỏ luôn lặp lại: lặp không có mốc neo thì
            // `expandRecurrence` không tính ra được lần nào.
            patch(next === null ? { dueDate: null, recur: null } : { dueDate: next });
          }}
        />
      </Field>

      <Field label={t.task.fieldAssignee}>
        <ChipSelect
          scroll
          value={task.assigneeId}
          onChange={(next) => patch({ assigneeId: next })}
          options={[
            { value: null, label: t.task.fieldAssigneeNone },
            ...(members ?? []).map((m) => ({ value: m.id as UUID | null, label: m.displayName })),
          ]}
        />
      </Field>

      {task.dueDate !== null ? (
        <Field label={t.task.fieldRecur}>
          <ChipSelect
            scroll
            value={task.recur?.freq ?? 'none'}
            onChange={(next) =>
              patch({ recur: next === 'none' ? null : { freq: next, intervalN: 1 } })
            }
            options={FREQS.map((v) => ({ value: v, label: t.recur[v] }))}
          />
        </Field>
      ) : null}

      {task.dueDate !== null ? (
        <Field label={t.task.fieldRemindLead}>
          <ChipSelect
            value={task.remindLeadDays}
            onChange={(next) => patch({ remindLeadDays: next })}
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
          onBlur={saveNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.task.fieldNotes}
          multiline
          numberOfLines={3}
          maxLength={2000}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {task.recur !== null ? <RecentDone taskId={taskId} /> : null}

      <View className="mt-8">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>

      <View className="h-8" />
    </Screen>
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
