/**
 * Chi tiết một khoản sắp phải trả — 05 §6.4, luồng F8.
 *
 * Nút chính là **[Đã trả]**. Nó mở một sheet nhỏ chọn ngày (mặc định hôm nay)
 * rồi gọi RPC `settle_payment` — ba lệnh ghi trong MỘT transaction: chốt khoản,
 * giảm dư nợ, ghi `money_events`. PostgREST không cho mở transaction nhiều
 * lệnh, nên ghép từ client là đường chắc chắn dẫn tới dư nợ sai vĩnh viễn khi
 * mất mạng giữa chừng (schema §7).
 *
 * **Dòng xác nhận dư nợ mới** khi khoản này sinh từ một khoản nợ:
 * *"Dư nợ Vay mua nhà BIDV sẽ còn 172.000.000 ₫."* Đây là chỗ 05 §6.4 nói rõ,
 * và nó quan trọng hơn vẻ ngoài: một thao tác làm đổi một con số ở màn hình
 * KHÁC phải nói trước con số đó sẽ thành bao nhiêu. Không nói thì người dùng
 * bấm xong phải đi kiểm, và lần thứ ba phải đi kiểm là lần cuối họ tin app.
 *
 * Con số trong câu đó tính ở client CHỈ để hiện trước. Giá trị thật do RPC
 * tính, và hook `useSettlePayment` cố ý KHÔNG đoán dư nợ mới trong optimistic
 * update — đoán sai một con số nợ tệ hơn nhiều so với đợi nó.
 */

import { formatDueLabel, type ISODate, type UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import {
  Button,
  DatePicker,
  ErrorState,
  Field,
  ListSkeleton,
  MoneyText,
  Screen,
  Toast,
} from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useFlagAttention } from '@/features/attention/queries/use-attention';
import { useDebt } from '@/features/debt/queries/use-debts';
import {
  useDeletePayment,
  usePayment,
  useSettlePayment,
} from '@/features/payment/queries/use-payments';
import { dueLabelText, fullSolarDate, moneyText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

export function PaymentDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const currency = useCurrency();

  const { id } = useLocalSearchParams<{ id: string }>();
  const paymentId = id as UUID;

  const { data: payment, isPending, isError, refetch } = usePayment(paymentId);
  const { data: debt } = useDebt(payment?.sourceDebtId ?? null);
  const settle = useSettlePayment();
  const remove = useDeletePayment();
  const flag = useFlagAttention();

  const [settling, setSettling] = useState(false);
  const [paidOn, setPaidOn] = useState<ISODate>(today);

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }

  if (isError || !payment) {
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

  const due = payment.dueDate ? formatDueLabel(payment.dueDate, today) : null;
  const isPaid = payment.state === 'paid';

  // Dư nợ SAU khi trả — chỉ để hiện trước, không bao giờ ghi xuống. Kẹp ở 0:
  // một kỳ trả cuối lớn hơn dư nợ còn lại (do lãi đã tính sẵn trong kỳ) không
  // được hiện thành số âm, vì "dư nợ −2.000.000 ₫" đọc như một lỗi.
  const debtAfter = debt ? Math.max(0, debt.remainingAmount - payment.amount) : null;

  const confirmDelete = (): void => {
    Alert.alert(payment.name, t.common.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(paymentId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const doSettle = (): void => {
    if (settle.isPending) return;
    settle.mutate(
      { id: paymentId, paidOn },
      {
        onSuccess: () => {
          setSettling(false);
          showToast(t.payment.markPaidSaved);
        },
      },
    );
  };

  return (
    <Screen scroll>
      <Text className="pt-2 text-title1 font-semibold text-ink">{payment.name}</Text>

      <View className="mt-2">
        <MoneyText amount={payment.amount} size="display" tone={isPaid ? 'muted' : 'default'} />
        <Text
          className={`mt-1 text-caption ${
            due?.kind === 'overdue_days' && !isPaid ? 'text-critical' : 'text-subtle'
          }`}
        >
          {isPaid
            ? t.payment.filterPaid
            : due
              ? dueLabelText(due)
              : payment.dueMonth
                ? fullSolarDate(payment.dueMonth)
                : t.event.noneYet}
        </Text>
      </View>

      {/* Khoản sinh từ nợ: nói TRƯỚC dư nợ sẽ còn bao nhiêu. Hiện cả khi chưa
          bấm gì — người dùng cần biết điều này lúc đang cân nhắc, không phải
          lúc đã ở trong hộp thoại xác nhận. */}
      {debt && debtAfter !== null && !isPaid ? (
        <View className="mt-4 rounded-status border border-brand-soft bg-white p-4">
          <Text className="text-body text-ink">
            {f(t.payment.debtAfter, {
              name: debt.name,
              amount: moneyText(debtAfter, currency),
            })}
          </Text>
        </View>
      ) : null}

      {payment.notes ? (
        <Text className="mt-4 text-body text-muted">{payment.notes}</Text>
      ) : null}

      <View className="mt-8 gap-3">
        {/* Khoản đã trả KHÔNG có nút "Bỏ đánh dấu". Mở lại một khoản đã chốt
            nghĩa là cộng ngược dư nợ và ghi một `money_events` bù — thao tác
            hiếm, dễ sai, và có đường vòng an toàn hơn: tạo một khoản mới. */}
        {!isPaid && !settling ? (
          <Button label={t.payment.markPaid} onPress={() => setSettling(true)} />
        ) : null}

        {/* Chọn ngày trả — mở TẠI CHỖ, thay vào đúng vị trí nút vừa bấm, không
            phải một route modal riêng. `[Đã trả]` là thao tác dứt khoát người
            dùng vừa làm ngoài đời (bấm chuyển khoản xong mới mở app), nên đường
            từ ý định tới xong phải ngắn nhất có thể. Một route riêng còn phải
            tải lại `payment` và `debt` chỉ để hiện một dòng xác nhận đã có sẵn. */}
        {settling ? (
          <View className="rounded-status border border-line p-4">
            <Field label={t.payment.markPaidDate}>
              <DatePicker value={paidOn} onChange={(d) => setPaidOn(d ?? today)} today={today} />
            </Field>

            {debt && debtAfter !== null ? (
              <Text className="mb-4 text-body text-muted">
                {f(t.payment.debtAfter, {
                  name: debt.name,
                  amount: moneyText(debtAfter, currency),
                })}
              </Text>
            ) : null}

            {settle.isError ? (
              <Text className="mb-3 text-caption text-critical">{t.error.unknown}</Text>
            ) : null}

            <View className="gap-3">
              <Button label={t.payment.markPaid} loading={settle.isPending} onPress={doSettle} />
              <Button
                label={t.common.cancel}
                variant="ghost"
                onPress={() => setSettling(false)}
              />
            </View>
          </View>
        ) : null}

        <Button
          label={t.common.edit}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/(modals)/payment-form', params: { id: paymentId } })
          }
        />

        <Button
          label={t.attention.flag}
          variant="secondary"
          loading={flag.isPending}
          onPress={() =>
            flag.mutate(
              { entityType: 'upcoming_payment', entityId: paymentId },
              { onSuccess: () => showToast(t.attention.flagSaved) },
            )
          }
        />
      </View>

      <View className="mt-10">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>

      <View className="h-8" />

      <Toast />
    </Screen>
  );
}
