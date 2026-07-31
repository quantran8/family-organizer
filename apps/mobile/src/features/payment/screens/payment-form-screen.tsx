/**
 * Form Khoản sắp phải trả — 05 §6.4.
 *
 * Ba trường bắt buộc thật sự: tên · số tiền · hạn. Hạn có HAI dạng và cả hai
 * đều hợp lệ:
 *
 *   - `dueDate` — ngày cụ thể ("nộp trước 15/9").
 *   - `dueMonth` — chỉ tháng, khi chưa biết ngày ("học phí tháng 9").
 *
 * Dạng thứ hai tồn tại vì phần lớn khoản chi của một gia đình đúng là như thế,
 * và bắt chọn một ngày cụ thể sẽ khiến người dùng bịa ra một ngày. Một ngày bịa
 * ra thì tệ hơn không có ngày: nó sinh ra một thông báo nhắc sai, và vài lần
 * nhắc sai là đủ để người ta tắt thông báo.
 *
 * KHÔNG có hạn nào thì khoản này không bao giờ hiện ở "SẮP PHẢI TRẢ" và trạng
 * thái tài chính cũng không đếm nó — nó tồn tại mà vô hình. Vì thế đây là
 * trường duy nhất ngoài tên và số tiền được validate.
 *
 * `sourceDebtId` KHÔNG hỏi ở đây: kỳ trả nợ do Edge `spawn_debt_installments`
 * sinh ra (G9), không phải do người dùng tự nối tay. Nối tay được nghĩa là có
 * đường tạo một kỳ trả trỏ vào nhầm khoản nợ, và RPC `settle_payment` sẽ trừ dư
 * nợ của một khoản nợ không liên quan.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { AmountInput, Button, DatePicker, Field, Sheet } from '@/design/components';
import {
  useCreatePayment,
  usePayment,
  useUpdatePayment,
} from '@/features/payment/queries/use-payments';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function PaymentFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const paymentId = (params.id ?? null) as UUID | null;
  const isEdit = paymentId !== null;

  /**
   * Ngữ cảnh sự kiện — form mở từ "Thêm khoản" trên màn chi tiết sự kiện
   * (05 §5.4). Người dùng KHÔNG thấy trường này và không chọn gì: họ đang đứng
   * trong ngày giỗ và bấm "Thêm khoản". Cùng cơ chế với `task-form`, và đây là
   * nút thứ hai trong ba nút của màn sự kiện — G6 để nó `disabled` chờ đúng
   * form này.
   */
  const eventId = (params.eventId ?? null) as UUID | null;

  const { data: existing } = usePayment(paymentId);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<ISODate | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setName(existing.name);
    setAmount(existing.amount);
    setDueDate(existing.dueDate);
    setNotes(existing.notes ?? '');
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  const trimmed = name.trim();
  const dirty = trimmed !== '' || amount !== null || dueDate !== null || notes !== '';

  const close = (): void => {
    if (!dirty || isEdit) {
      router.back();
      return;
    }
    Alert.alert(t.payment.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pending = createPayment.isPending || updatePayment.isPending;

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || amount === null || amount <= 0 || dueDate === null || pending) return;

    const input = {
      name: trimmed,
      amount,
      dueDate,
      dueMonth: null,
      recur: null,
      // Giữ nguyên nguồn nợ khi sửa; không bao giờ đặt nó từ form. Xem đầu file.
      sourceDebtId: existing?.sourceDebtId ?? null,
      eventId: existing?.eventId ?? eventId,
      notes: notes.trim() === '' ? null : notes.trim(),
    };

    if (isEdit && paymentId) {
      updatePayment.mutate({ id: paymentId, patch: input }, { onSuccess: () => router.back() });
      return;
    }
    createPayment.mutate(input, { onSuccess: () => router.back() });
  };

  const nameError = submitted && trimmed === '' ? t.validation.paymentName : undefined;
  const amountError =
    submitted && (amount === null || amount <= 0) ? t.validation.amountPositive : undefined;
  const dueError = submitted && dueDate === null ? t.validation.eventDate : undefined;

  return (
    <Sheet
      title={t.payment.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field
        label={t.payment.fieldName}
        error={nameError}
        value={name}
        onChangeText={setName}
        placeholder={t.payment.fieldNamePlaceholder}
        autoFocus={!isEdit}
        maxLength={120}
      />

      <Field label={t.payment.fieldAmount} error={amountError}>
        <AmountInput
          value={amount}
          onChangeValue={setAmount}
          hasError={amountError !== undefined}
          accessibilityLabel={t.payment.fieldAmount}
        />
      </Field>

      <Field label={t.payment.fieldDueDate} error={dueError}>
        <DatePicker value={dueDate} onChange={setDueDate} today={today} />
      </Field>

      <Field label={t.common.note}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.common.note}
          multiline
          numberOfLines={2}
          maxLength={2000}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {createPayment.isError || updatePayment.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
