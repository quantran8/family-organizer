/**
 * Form Mục tiêu — 05 §6.7.
 *
 * Bốn trường, hai bắt buộc: tên · cần đạt. "Đã có" mặc định 0, "muốn xong
 * trước" tuỳ chọn.
 *
 * **"Đã có" chỉ hỏi khi TẠO MỚI.** Lúc sửa thì trường đó biến mất, và đó không
 * phải thiếu sót: `currentAmount` là SỐ KHAI, chỉ có nghĩa khi đi kèm ngày khai
 * và người khai. Đường ghi duy nhất giữ được cả ba là RPC `contribute_to_goal`
 * (nút "Góp thêm" ở màn chi tiết). Cho sửa số đó ở đây sẽ để nhãn thời gian
 * đứng yên trong khi con số vừa đổi — màn hình khi đó nói "Em cập nhật 5 tuần
 * trước" ngay cạnh một con số của hôm nay, và không có lỗi nào ném ra.
 *
 * Cùng mô hình với `assets.current_value` / `update_asset_value`: sửa tên và
 * nơi giữ là một form, cập nhật giá trị là một thao tác riêng có ngữ cảnh.
 *
 * KHÔNG có phân loại, KHÔNG có mức ưu tiên (schema §5.4) — hai thứ đó không đổi
 * hành vi nào, chỉ thêm việc phải điền.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AmountInput, Button, DatePicker, Field, Sheet } from '@/design/components';
import { useCreateGoal, useGoal, useUpdateGoal } from '@/features/goal/queries/use-goals';
import { useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

export function GoalFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string }>();
  const goalId = (params.id ?? null) as UUID | null;
  const isEdit = goalId !== null;
  const nameRef = useSheetAutoFocus(!isEdit);

  const { data: existing } = useGoal(goalId as UUID);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [currentAmount, setCurrentAmount] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState<ISODate | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setName(existing.name);
    setTargetAmount(existing.targetAmount);
    setTargetDate(existing.targetDate);
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  const trimmed = name.trim();
  const dirty = trimmed !== '' || targetAmount !== null || currentAmount !== null;

  const close = (): void => {
    if (!dirty || isEdit) {
      router.back();
      return;
    }
    Alert.alert(t.goal.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pending = createGoal.isPending || updateGoal.isPending;

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || targetAmount === null || targetAmount <= 0 || pending) return;

    if (isEdit && goalId) {
      // `currentAmount` KHÔNG nằm trong patch — xem chú thích đầu file. Tầng
      // type (`GoalPatch`) cũng đã loại nó, nên đây là hai lớp chặn cùng chiều.
      updateGoal.mutate(
        { id: goalId, patch: { name: trimmed, targetAmount, targetDate } },
        { onSuccess: () => router.back() },
      );
      return;
    }

    createGoal.mutate(
      { name: trimmed, targetAmount, currentAmount: currentAmount ?? 0, targetDate },
      { onSuccess: () => router.back() },
    );
  };

  const nameError = submitted && trimmed === '' ? t.validation.goalName : undefined;
  const targetError =
    submitted && (targetAmount === null || targetAmount <= 0)
      ? t.validation.amountPositive
      : undefined;

  return (
    <Sheet
      title={isEdit ? t.goal.formEditTitle : t.goal.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field
        label={t.goal.fieldName}
        error={nameError}
        value={name}
        onChangeText={setName}
        placeholder={t.goal.fieldNamePlaceholder}
        ref={nameRef}
        maxLength={120}
      />

      <Field label={t.goal.fieldTarget} error={targetError}>
        <AmountInput
          value={targetAmount}
          onChangeValue={setTargetAmount}
          hasError={targetError !== undefined}
          accessibilityLabel={t.goal.fieldTarget}
        />
      </Field>

      {/* Chỉ khi tạo mới — xem chú thích đầu file. */}
      {!isEdit ? (
        <Field label={t.goal.fieldCurrent}>
          <AmountInput
            value={currentAmount}
            onChangeValue={setCurrentAmount}
            accessibilityLabel={t.goal.fieldCurrent}
          />
        </Field>
      ) : null}

      <Field label={t.goal.fieldTargetDate}>
        <DatePicker value={targetDate} onChange={setTargetDate} today={today} />
      </Field>

      {createGoal.isError || updateGoal.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
