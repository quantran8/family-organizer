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

import type { ISODate, RecurFreq, Recurrence, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button, ChipSelect, DatePicker, Field, Sheet } from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import { useCreateTask } from '@/features/task/queries/use-tasks';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

/** Tần suất hiện trên form. `none` là một lựa chọn thật, không phải trạng thái ẩn. */
const FREQS: readonly (RecurFreq | 'none')[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

/** Nhắc trước — chỉ vài mốc có ý nghĩa, không phải ô nhập số tự do. */
const LEAD_DAYS = [0, 1, 3, 7] as const;

export function TaskFormScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
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

  return (
    <Sheet
      title={t.task.formTitle}
      onClose={close}
      actions={
        <Button label={t.common.save} loading={createTask.isPending} onPress={save} />
      }
    >
      <Field
        label={t.task.fieldTitle}
        error={titleError}
        value={title}
        onChangeText={setTitle}
        placeholder={t.task.fieldTitlePlaceholder}
        autoFocus
        maxLength={120}
      />

      <Field label={t.task.fieldDueDate}>
        <DatePicker value={dueDate} onChange={setDueDate} today={today} />
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

      {/* Lặp lại chỉ hiện khi đã có ngày — xem chú thích ở `save`. */}
      {dueDate !== null ? (
        <Field label={t.task.fieldRecur}>
          <ChipSelect
            scroll
            value={freq}
            onChange={setFreq}
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
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {createTask.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
