/**
 * Chi tiết một khoản nợ — 05 §6.5.
 *
 * Gốc · dư nợ · lãi suất · tiền mỗi kỳ · ngày tất toán dự kiến · thanh tiến độ
 * đã trả · lịch sử các kỳ đã trả.
 *
 * ── KHÔNG có nút "Đã trả" ở màn này ──
 *
 * Dư nợ chỉ giảm qua RPC `settle_payment`, và RPC đó chốt **một kỳ trả cụ thể**
 * (`upcoming_payments`) trong cùng transaction. Nghĩa là chỗ đúng để bấm "Đã
 * trả" là màn chi tiết KỲ TRẢ, nơi đã có sẵn số tiền và ngày đến hạn của kỳ đó
 * — và nơi G7 đã đặt dòng xác nhận *"Dư nợ sẽ còn 172.000.000 ₫"* hiện ra
 * trước khi bấm.
 *
 * Một nút "Đã trả" ở đây sẽ phải hỏi lại "trả kỳ nào", tức là bắt người dùng
 * chọn một thứ họ vừa đi qua. Thay vào đó, mục các kỳ ở dưới dẫn thẳng sang
 * từng kỳ.
 *
 * ── Thanh tiến độ ẩn khi chưa nhập gốc ──
 *
 * `debtPaidAmount` trả `null` lúc đó, và một thanh 0% sẽ nói rằng người dùng
 * chưa trả đồng nào cho khoản họ đã trả hai năm.
 *
 * ── "Thay đổi gần nhất" — món nợ G7b để lại ──
 *
 * G7b ghi: *"`debt/[id]` · `goal/[id]` lên cùng G9 — hai màn đó chưa tồn tại,
 * và mục này dùng chung `useEntityMoneyEvents` nên chỉ là một khối JSX."* Đúng
 * như vậy: khối dưới cùng giống hệt `asset/[id]`.
 */

import {
  debtPaidAmount,
  describeMoneyEvent,
  formatDueLabel,
  progressPct,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import {
  Button,
  Divider,
  ErrorState,
  ListSkeleton,
  MoneyText,
  Screen,
  SectionHeader,
  Toast,
} from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useFlagAttention } from '@/features/attention/queries/use-attention';
import { useDebt, useDeleteDebt } from '@/features/debt/queries/use-debts';
import { useEntityMoneyEvents } from '@/features/money-history/queries/use-money-events';
import { useMembers } from '@/features/member/queries/use-members';
import { usePaymentsByDebt } from '@/features/payment/queries/use-payments';
import {
  deltaText,
  dueLabelText,
  fullSolarDate,
  moneyEventText,
  moneyText,
  useT,
} from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

export function DebtDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const currency = useCurrency();

  const { id } = useLocalSearchParams<{ id: string }>();
  const debtId = id as UUID;

  const { data: debt, isPending, isError, refetch } = useDebt(debtId);
  const { data: members } = useMembers();
  const { data: payments } = usePaymentsByDebt(debtId);
  const { data: events } = useEntityMoneyEvents('debt', debtId);
  const remove = useDeleteDebt();
  const flag = useFlagAttention();

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }

  if (isError || !debt) {
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

  const paid = debtPaidAmount(debt.principalAmount, debt.remainingAmount);
  const borrower = debt.borrowerMemberId
    ? ((members ?? []).find((m) => m.id === debt.borrowerMemberId)?.displayName ?? null)
    : null;
  const nextDue = debt.nextDueDate ? formatDueLabel(debt.nextDueDate, today) : null;

  const confirmDelete = (): void => {
    Alert.alert(debt.name, t.debt.deleteConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(debtId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text className="pt-2 text-title1 font-semibold text-ink">{debt.name}</Text>

      <View className="mt-2">
        <MoneyText amount={debt.remainingAmount} size="display" />
        <Text className="mt-1 text-caption text-subtle">
          {debt.isSettled ? t.debt.settled : t.debt.remainingLabel}
        </Text>
      </View>

      {/* Thanh tiến độ — ẩn hẳn khi chưa nhập gốc (xem đầu file).
          Màu `ink`, KHÔNG phải xanh "đạt chỉ tiêu": một khoản nợ đang trả dở
          không phải một thất bại cần cảnh báo, và cũng không phải một thành
          tích cần thưởng. Cũng không dùng accent: một dải cao 8px là mảng nhỏ
          nhất trên màn, và chanh trên nền `soft` gần như không thấy ranh giới
          — cùng lý do với `ProgressBar` ở `design/components`. */}
      {paid !== null && debt.principalAmount !== null ? (
        <View className="mt-5">
          <View className="h-2 overflow-hidden rounded-full bg-soft">
            <View
              className="h-full rounded-full bg-ink"
              style={{ width: `${progressPct(paid, debt.principalAmount)}%` }}
            />
          </View>
          <Text className="mt-2 text-caption text-muted">
            {f(t.debt.progress, {
              paid: moneyText(paid, currency),
              total: moneyText(debt.principalAmount, currency),
            })}
          </Text>
        </View>
      ) : null}

      <View className="mt-6 rounded-status border border-line">
        {debt.lender ? <InfoRow label={t.debt.fieldLender} value={debt.lender} /> : null}
        {debt.principalAmount !== null ? (
          <InfoRow
            label={t.debt.fieldPrincipal}
            value={moneyText(debt.principalAmount, currency)}
          />
        ) : null}
        {debt.interestRatePct !== null ? (
          <InfoRow label={t.debt.fieldInterest} value={String(debt.interestRatePct)} />
        ) : null}
        {debt.installmentAmount !== null ? (
          <InfoRow
            label={t.debt.fieldInstallment}
            value={moneyText(debt.installmentAmount, currency)}
          />
        ) : null}
        <InfoRow
          label={t.debt.fieldNextDue}
          value={nextDue ? dueLabelText(nextDue) : t.debt.noNextDue}
        />
        {debt.finalDueDate ? (
          <InfoRow label={t.debt.fieldFinalDue} value={fullSolarDate(debt.finalDueDate)} />
        ) : null}
        {/* Người vay — NGỮ CẢNH ở cấp từng khoản, đúng như `holderMemberId` của
            tài sản (ràng buộc #1). Không có ở màn danh sách, không có tổng nào
            theo người. */}
        {borrower ? <InfoRow label={t.debt.fieldBorrower} value={borrower} last /> : null}
      </View>

      <View className="mt-6 gap-3">
        <Button
          label={t.common.edit}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/(modals)/debt-form', params: { id: debtId } })
          }
        />
        <Button
          label={t.attention.flag}
          variant="secondary"
          loading={flag.isPending}
          onPress={() =>
            flag.mutate(
              { entityType: 'debt', entityId: debtId },
              { onSuccess: () => showToast(t.attention.flagSaved) },
            )
          }
        />
      </View>

      {/* ── CÁC KỲ TRẢ ──
          Dẫn sang chi tiết từng kỳ, nơi có nút [Đã trả] thật (xem đầu file). */}
      <SectionHeader title={t.debt.sectionHistory} />
      {(payments ?? []).length === 0 ? (
        <Text className="text-body text-subtle">{t.event.noneYet}</Text>
      ) : (
        (payments ?? []).map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={p.name}
              onPress={() =>
                router.push({ pathname: '/(app)/money/payment/[id]', params: { id: p.id } })
              }
              className="min-h-touch flex-row items-center gap-3 py-3 active:bg-soft"
            >
              <View className="flex-1">
                <Text numberOfLines={1} className="text-body text-ink">
                  {p.name}
                </Text>
                <Text className="mt-0.5 text-caption text-subtle">
                  {[
                    p.dueDate ? dueLabelText(formatDueLabel(p.dueDate, today)) : null,
                    p.state === 'paid' ? t.payment.filterPaid : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <MoneyText amount={p.amount} size="body" />
              <Text className="text-body text-subtle">›</Text>
            </Pressable>
          </View>
        ))
      )}

      {/* ── THAY ĐỔI GẦN NHẤT (món nợ G7b để lại) ──
          CHỈ ĐỌC. `money_events` append-only và DB có trigger chặn update/delete. */}
      <SectionHeader title={t.money.recentChanges} />
      {(events ?? []).length === 0 ? (
        <Text className="text-body text-subtle">{t.event.noneYet}</Text>
      ) : (
        (events ?? []).map((e, i) => {
          const shape = describeMoneyEvent(e);
          return (
            <View key={e.id}>
              {i > 0 ? <Divider /> : null}
              <View className="min-h-touch flex-row items-center gap-3 py-3">
                <View className="flex-1">
                  <Text className="text-body text-ink">{moneyEventText(shape, currency)}</Text>
                  <Text className="mt-0.5 text-caption text-subtle">
                    {[
                      fullSolarDate(e.occurredOn),
                      e.actorDisplayName
                        ? f(t.money.changeBy, { name: e.actorDisplayName })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {e.note ? (
                    <Text className="mt-0.5 text-caption text-muted">{e.note}</Text>
                  ) : null}
                </View>

                {e.delta !== null ? (
                  <Text
                    className="text-body text-muted"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {deltaText(e.delta, currency)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      <View className="mt-10">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>

      <View className="h-8" />
      <Toast />
    </Screen>
  );
}

/** Một dòng thông tin tĩnh — cùng hình dạng với `asset/[id]`. */
function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={[
        'min-h-touch flex-row items-center justify-between gap-3 px-4 py-3',
        last ? '' : 'border-b border-line',
      ].join(' ')}
    >
      <Text className="text-body text-muted">{label}</Text>
      <Text numberOfLines={1} className="flex-1 text-right text-body text-ink">
        {value}
      </Text>
    </View>
  );
}
