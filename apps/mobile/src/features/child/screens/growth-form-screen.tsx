/**
 * Thêm một số đo — 07 §4.3.
 *
 * Ba trường: ngày · chiều cao · cân nặng. Cả hai số đều để trống được — lần
 * khám chỉ cân mà không đo chiều cao là chuyện thường.
 *
 * KHÔNG có validation kiểu "chiều cao phải trong khoảng hợp lý". Một khoảng
 * "hợp lý" là một chuẩn, và app không có chuẩn nào về cơ thể một đứa trẻ. Nếu
 * bố mẹ gõ nhầm thì họ sửa; nếu app từ chối một con số thật thì nó đang nói với
 * họ rằng con họ bất thường.
 */

import type { UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button, DatePicker, Field, Sheet } from '@/design/components';
import { useAddGrowthRecord } from '@/features/child/queries/use-child';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

/** Chấp nhận cả dấu phẩy — bàn phím số tiếng Việt cho dấu phẩy thập phân. */
function parseDecimal(s: string): number | null {
  const v = Number(s.replace(',', '.'));
  return s.trim() === '' || Number.isNaN(v) ? null : v;
}

export function GrowthFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = (params.memberId ?? '') as UUID;

  const add = useAddGrowthRecord();

  // `DatePicker` cho phép bỏ chọn về null (chạm lại ngày đang chọn), nên state
  // phải nhận null dù một phép đo luôn cần ngày. Nút Lưu tắt khi chưa có ngày.
  const [measuredOn, setMeasuredOn] = useState<string | null>(today);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const heightCm = parseDecimal(height);
  const weightKg = parseDecimal(weight);
  const canSave = measuredOn !== null && (heightCm !== null || weightKg !== null);

  const save = (): void => {
    if (!canSave || measuredOn === null || add.isPending) return;
    add.mutate(
      { memberId, input: { measuredOn, heightCm, weightKg } },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Sheet
      title={t.child.addGrowth}
      onClose={() => router.back()}
      actions={
        <Button
          label={t.common.save}
          loading={add.isPending}
          disabled={!canSave}
          onPress={save}
        />
      }
    >
      <Field label={t.child.fieldMeasuredOn}>
        <DatePicker value={measuredOn} onChange={setMeasuredOn} today={today} />
      </Field>

      <Field label={t.child.fieldHeight}>
        <TextInput
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
          accessibilityLabel={t.child.fieldHeight}
          maxLength={6}
          className="min-h-touch rounded-control border border-line bg-white px-4 text-body text-ink"
        />
      </Field>

      <Field label={t.child.fieldWeight}>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          accessibilityLabel={t.child.fieldWeight}
          maxLength={6}
          className="min-h-touch rounded-control border border-line bg-white px-4 text-body text-ink"
        />
      </Field>

      {add.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}
    </Sheet>
  );
}
