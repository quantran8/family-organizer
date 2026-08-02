/**
 * Góp thêm vào mục tiêu — 05 §6.7, sheet một mục đích.
 *
 * Ba ô: số tiền · ngày · ghi chú tuỳ chọn. Cùng hình dạng với "Cập nhật giá
 * trị" của tài sản, và vì đúng một lý do: cả hai đều đổi một SỐ KHAI, nên cả
 * hai đều phải ghi kèm ngày khai và người khai trong cùng một transaction.
 *
 * Đi qua RPC `contribute_to_goal`, KHÔNG qua `update()`: ba lệnh ghi
 * (`goals.current_amount` + `as_of_date`/`updated_by_member_id` + một dòng
 * `money_events`) phải nguyên tử. Ghép từ client mà mất mạng giữa chừng để lại
 * lịch sử sai VĨNH VIỄN — `money_events` append-only, DB có trigger chặn
 * update/delete.
 *
 * Ô nhập là SỐ GÓP THÊM, không phải tổng mới. Khác với tài sản (ở đó người dùng
 * đọc số dư trên app ngân hàng rồi gõ lại cả con số), ở đây người ta biết mình
 * vừa bỏ vào bao nhiêu chứ không nhẩm tổng — bắt gõ tổng mới là bắt họ làm một
 * phép cộng mà app làm được.
 *
 * Ngày mặc định hôm nay nhưng SỬA ĐƯỢC: khoản góp thường xảy ra trước lúc ngồi
 * mở app ghi lại.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { AmountInput, Button, DatePicker, Field, MoneyText, Sheet } from '@/design/components';
import { useContributeToGoal, useGoal } from '@/features/goal/queries/use-goals';
import { useRecordThresholdHint } from '@/features/household/queries/use-record-threshold';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

export function ContributeScreen() {
  const { t } = useT();
  const thresholdHint = useRecordThresholdHint();
  const router = useRouter();
  const today = useToday();

  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = (id ?? null) as UUID | null;

  const { data: goal } = useGoal(goalId as UUID);
  const contribute = useContributeToGoal();

  const [amount, setAmount] = useState<number | null>(null);
  const [on, setOn] = useState<ISODate>(today);
  const [note, setNote] = useState('');

  const save = (): void => {
    if (goalId === null || amount === null || amount <= 0 || contribute.isPending) return;

    contribute.mutate(
      {
        id: goalId,
        amount,
        on,
        note: note.trim() === '' ? undefined : note.trim(),
      },
      {
        onSuccess: () => {
          showToast(t.goal.contributeSaved);
          router.back();
        },
      },
    );
  };

  return (
    <Sheet
      title={t.goal.contributeTitle}
      onClose={() => router.back()}
      actions={
        <Button
          label={t.goal.contribute}
          loading={contribute.isPending}
          disabled={amount === null || amount <= 0}
          onPress={save}
        />
      }
    >
      {/* Ngữ cảnh: đang góp vào mục tiêu nào, và hiện đã có bao nhiêu. Không có
          dòng này thì sheet mở ra từ một danh sách trông giống nhau ở mọi mục. */}
      {goal ? (
        <View className="mb-4 flex-row items-baseline gap-2">
          <Text className="text-body text-muted">{goal.name}</Text>
          <MoneyText amount={goal.currentAmount} size="body" tone="muted" />
        </View>
      ) : null}

      <Field label={t.goal.contributeField} hint={thresholdHint ?? undefined}>
        <AmountInput
          value={amount}
          onChangeValue={setAmount}
          autoFocus
          accessibilityLabel={t.goal.contributeField}
        />
      </Field>

      <Field label={t.asset.fieldAsOf}>
        {/* `null` quay về hôm nay: một dòng lịch sử không có mốc thời gian thì
            không xếp được vào đâu. Cùng lý do ở `update-asset-value`. */}
        <DatePicker value={on} onChange={(d) => setOn(d ?? today)} today={today} />
      </Field>

      <Field label={t.common.note}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.common.note}
          multiline
          numberOfLines={2}
          maxLength={200}
          className="min-h-touch rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {contribute.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
