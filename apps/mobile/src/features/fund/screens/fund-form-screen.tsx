/**
 * Form Quỹ chung — 05 §6.9.
 *
 * MỘT trường. Đó là toàn bộ form.
 *
 * CỐ Ý KHÔNG CÓ: số dư ban đầu, mục tiêu số dư, hạn mức, phân loại, tỷ lệ góp
 * đã chốt giữa hai người.
 *
 *   - Số dư ban đầu: quỹ bắt đầu từ 0 và lớn lên bằng những khoản đã ghi. Cho
 *     khai một con số mở đầu là tạo ra một số dư không có dòng lịch sử nào giải
 *     thích được — và số dư quỹ là con số hai người nhìn vào để quyết có tiêu
 *     được không.
 *   - Hạn mức / tỷ lệ góp: mở đường thẳng cho câu "chưa đạt", "còn thiếu". App
 *     ghi, app không phán (03 §6b).
 */

import type { UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, Field, Sheet } from '@/design/components';
import { useCreateFund, useFund, useUpdateFund } from '@/features/fund/queries/use-funds';
import { useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';

export function FundFormScreen() {
  const { t } = useT();
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string }>();
  const fundId = (params.id ?? null) as UUID | null;
  const isEdit = fundId !== null;
  const nameRef = useSheetAutoFocus(!isEdit);

  const { data: existing } = useFund(fundId as UUID);
  const createFund = useCreateFund();
  const updateFund = useUpdateFund();

  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setName(existing.name);
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  const trimmed = name.trim();
  const dirty = trimmed !== '';
  const pending = createFund.isPending || updateFund.isPending;

  const close = (): void => {
    if (!dirty || isEdit) {
      router.back();
      return;
    }
    Alert.alert(t.fund.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || pending) return;

    if (isEdit && fundId) {
      updateFund.mutate({ id: fundId, patch: { name: trimmed } }, { onSuccess: () => router.back() });
      return;
    }
    createFund.mutate({ name: trimmed }, { onSuccess: () => router.back() });
  };

  const nameError = submitted && trimmed === '' ? t.validation.fundName : undefined;

  return (
    <Sheet
      title={isEdit ? t.fund.formEditTitle : t.fund.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field
        label={t.fund.fieldName}
        error={nameError}
        value={name}
        onChangeText={setName}
        placeholder={t.fund.fieldNamePlaceholder}
        ref={nameRef}
        maxLength={120}
      />
    </Sheet>
  );
}
