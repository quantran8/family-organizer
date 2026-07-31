/**
 * Thêm nhanh — 05 §5.1, F1.
 *
 * Sheet hỏi ĐÚNG MỘT TRƯỜNG: tên việc. Lưu xong đóng ngay, không mở màn chi
 * tiết, không hỏi thêm. Hạn, người làm, lặp lại đều sửa được sau ở chi tiết —
 * bắt điền đủ ngay lúc thêm là cách chắc chắn để người ta thôi thêm.
 *
 * Vì sao ô tên việc hiện SẴN thay vì một menu 5 lựa chọn: việc là thứ được thêm
 * nhiều nhất, và bắt chọn loại trước là thêm một chạm vào chính đường mòn hay đi
 * nhất. Các loại khác nằm ngay dưới dưới dạng một hàng nút — vẫn một chạm để
 * chuyển sang form đầy đủ của chúng.
 *
 * `[Thêm]` chỉ sáng khi đã có chữ. Ghi một việc tên rỗng không sai về kỹ thuật
 * nhưng tạo một dòng không đọc được ở danh sách, và không ai sửa nó về sau.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Sheet } from '@/design/components';
import { useCreateTask } from '@/features/task/queries/use-tasks';
import { useT } from '@/i18n';

export function QuickAddScreen() {
  const { t } = useT();
  const router = useRouter();
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');

  const trimmed = title.trim();
  const canSave = trimmed.length > 0 && !createTask.isPending;

  const save = (): void => {
    if (!canSave) return;
    createTask.mutate(
      {
        title: trimmed,
        notes: null,
        assigneeId: null,
        dueDate: null,
        dueTime: null,
        recur: null,
        remindLeadDays: 0,
        eventId: null,
      },
      // Đóng ở onSuccess chứ không đóng lạc quan: mutation KHÔNG tự retry
      // (client.ts), nên đóng trước khi biết kết quả sẽ nuốt mất lỗi ghi.
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Sheet
      title={t.quickAdd.title}
      onClose={() => router.back()}
      scroll={false}
      actions={
        <Button
          label={t.common.add}
          disabled={!canSave}
          loading={createTask.isPending}
          onPress={save}
        />
      }
    >
      <TextInput
        // Bàn phím bật sẵn: sheet này chỉ có một việc để làm.
        autoFocus
        value={title}
        onChangeText={setTitle}
        placeholder={t.task.fieldTitlePlaceholder}
        placeholderTextColor="#96968F"
        accessibilityLabel={t.task.fieldTitle}
        returnKeyType="done"
        onSubmitEditing={save}
        maxLength={120}
        className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
      />

      {createTask.isError ? (
        <Text className="mt-2 text-caption text-danger">{t.error.unknown}</Text>
      ) : null}

      {/* Đường sang các loại khác. `replace` chứ không `push`: sheet thêm nhanh
          không phải một bước người dùng muốn quay lại sau khi đã sang form đầy đủ.
          Thứ tự theo tần suất thêm, không theo thứ tự tab: việc → sự kiện →
          khoản sắp trả → khoản tiền. Giấy tờ lên ở G8. */}
      <View className="mt-6 flex-row flex-wrap gap-2">
        <QuickLink
          label={t.quickAdd.task}
          onPress={() => router.replace('/(modals)/task-form')}
        />
        <QuickLink
          label={t.quickAdd.event}
          onPress={() => router.replace('/(modals)/event-form')}
        />
        <QuickLink
          label={t.quickAdd.payment}
          onPress={() => router.replace('/(modals)/payment-form')}
        />
        <QuickLink
          label={t.quickAdd.asset}
          onPress={() => router.replace('/(modals)/asset-form')}
        />
      </View>
    </Sheet>
  );
}

/** Nút chuyển sang form đầy đủ. Phụ, nên không dùng `Button` primary. */
function QuickLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-touch justify-center rounded-full border border-line px-4 active:bg-subtle"
    >
      <Text className="text-label font-medium text-ink">{label}</Text>
    </Pressable>
  );
}
