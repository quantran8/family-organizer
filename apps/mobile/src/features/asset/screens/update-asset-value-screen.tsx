/**
 * Cập nhật giá trị một khoản — 05 §6.3, sheet một mục đích.
 *
 * Ba ô: một số · một ngày · một ghi chú tuỳ chọn. Không có gì khác, và đó là
 * điểm của màn này — nó là thao tác lặp lại hằng tháng, nên mỗi trường thừa là
 * một khoản thuế thu mười hai lần một năm.
 *
 * Đi qua RPC `update_asset_value`, **KHÔNG** qua `update()`: hai lệnh ghi
 * (`assets.current_value` + một dòng `money_events`) phải nằm trong MỘT
 * transaction. Ghép từ client mà mất mạng giữa chừng để lại lịch sử sai VĨNH
 * VIỄN — `money_events` append-only, DB có trigger chặn update/delete, nên
 * không có đường sửa lại sau đó.
 *
 * Ngày mặc định là hôm nay nhưng SỬA ĐƯỢC: người ta hay ngồi nhập lại số dư
 * cuối tháng vào ngày mùng 3, và ghi nó vào ngày mùng 3 làm biểu đồ mốc thời
 * gian lệch một nhịp so với thực tế.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import {
  AmountInput,
  Button,
  DatePicker,
  Field,
  MoneyText,
  Sheet,
} from '@/design/components';
import { useAsset, useUpdateAssetValue } from '@/features/asset/queries/use-assets';
import { useRecordThresholdHint } from '@/features/household/queries/use-record-threshold';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

export function UpdateAssetValueScreen() {
  const { t } = useT();
  const thresholdHint = useRecordThresholdHint();
  const router = useRouter();
  const today = useToday();

  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = (id ?? null) as UUID | null;

  const { data: asset } = useAsset(assetId);
  const updateValue = useUpdateAssetValue();

  const [value, setValue] = useState<number | null>(null);
  const [asOf, setAsOf] = useState<ISODate>(today);
  const [note, setNote] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  /**
   * Điền sẵn giá trị ĐANG CÓ.
   *
   * Cùng lý do với nghi thức cập nhật: phần lớn lần cập nhật là sửa vài chữ số
   * cuối, không phải gõ lại từ đầu. Ô trống cũng làm mất mốc để so — người dùng
   * không nhớ tháng trước khai bao nhiêu thì họ sẽ gõ một con số tròn hơn thực tế.
   */
  useEffect(() => {
    if (prefilled || !asset) return;
    setValue(asset.currentValue);
    setPrefilled(true);
  }, [asset, prefilled]);

  const save = (): void => {
    if (assetId === null || value === null || updateValue.isPending) return;

    updateValue.mutate(
      {
        id: assetId,
        value,
        asOf,
        note: note.trim() === '' ? undefined : note.trim(),
      },
      {
        onSuccess: () => {
          showToast(t.asset.updateValueSaved);
          router.back();
        },
      },
    );
  };

  return (
    <Sheet
      title={t.asset.updateValue}
      onClose={() => router.back()}
      actions={
        <Button
          label={t.asset.updateValue}
          loading={updateValue.isPending}
          // Chưa nhập số thì không có gì để ghi. Ô trống ở đây KHÔNG quy về 0
          // như nghi thức cập nhật: ở đó bốn ô là một bức tranh và ô trống nghĩa
          // là "không có", còn ở đây một khoản trị giá 0 là một khoản đã đóng —
          // việc khác hẳn, có nút riêng ("Đóng khoản này").
          disabled={value === null}
          onPress={save}
        />
      }
    >
      {asset ? (
        <View className="mb-4 flex-row items-baseline gap-2">
          <Text className="text-body text-muted">{asset.name}</Text>
          <MoneyText amount={asset.currentValue} size="body" tone="muted" />
        </View>
      ) : null}

      <Field label={t.asset.fieldValue} hint={thresholdHint ?? undefined}>
        <AmountInput
          value={value}
          onChangeValue={setValue}
          autoFocus
          accessibilityLabel={t.asset.fieldValue}
        />
      </Field>

      <Field label={t.asset.fieldAsOf}>
        {/* `DatePicker` cho phép bỏ chọn (chạm lại ngày đang chọn). Ở đây ngày
            là BẮT BUỘC — một dòng lịch sử không có mốc thời gian thì không xếp
            được vào đâu — nên `null` quay về hôm nay thay vì để trống. */}
        <DatePicker value={asOf} onChange={(d) => setAsOf(d ?? today)} today={today} />
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
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {updateValue.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
