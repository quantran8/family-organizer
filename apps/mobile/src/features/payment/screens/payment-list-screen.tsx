/**
 * Khoản sắp phải trả — 05 §6.4.
 *
 * Bộ lọc: 7 ngày · 30 ngày · Quá hạn · Đã trả · Tất cả.
 *
 * Lọc chạy ở REPOSITORY (`window` đi vào query key), không phải lọc mảng ở
 * client trên một danh sách "tất cả". Lý do là cửa sổ `overdue` và `paid` có
 * thể rất dài — một nhà dùng hai năm có vài trăm khoản đã trả — và tải hết về
 * để hiện bảy dòng là thứ sẽ chậm dần cho tới lúc không dùng được, đúng vào lúc
 * người dùng đã gắn bó nhất.
 *
 * "Quá hạn" ở đây là SUY RA từ `due_date`, không phải một trạng thái lưu trong
 * DB (schema §0): đúng hai trạng thái `unpaid` / `paid`. Hoãn một khoản là đổi
 * ngày đến hạn, trung thực hơn một state riêng.
 */

import { formatDueLabel, type UpcomingPayment } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  MoneyText,
  Segmented,
  Toast,
} from '@/design/components';
import { usePayments } from '@/features/payment/queries/use-payments';
import type { PaymentWindow } from '@/features/payment/repository';
import { dueLabelText, shortSolarDate, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function PaymentListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  // Mặc định 30 ngày, không phải 7: câu hỏi người ta mang tới màn này là "tháng
  // này nhà mình phải trả những gì", và 7 ngày trả lời hụt câu đó.
  const [window, setWindow] = useState<PaymentWindow>('30d');

  const { data: payments, isPending, isError, refetch } = usePayments(window, today);

  const rows = payments ?? [];

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-3">
        <Segmented
          value={window}
          onChange={setWindow}
          options={[
            { value: '7d', label: t.payment.filter7d },
            { value: '30d', label: t.payment.filter30d },
            { value: 'overdue', label: t.payment.filterOverdue },
            { value: 'paid', label: t.payment.filterPaid },
          ]}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {isPending ? <ListSkeleton rows={4} /> : null}

        {isError ? (
          <ErrorState
            message={t.error.unknown}
            retryLabel={t.common.retry}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isPending && !isError && rows.length === 0 ? (
          <EmptyState
            title={t.payment.emptyTitle}
            body={t.payment.emptyBody}
            actionLabel={t.payment.formTitle}
            onAction={() => router.push('/(modals)/payment-form')}
          />
        ) : null}

        {rows.map((p) => (
          <PaymentRow
            key={p.id}
            payment={p}
            today={today}
            onPress={() => router.push(`/(app)/money/payment/${p.id}`)}
          />
        ))}

        {rows.length > 0 ? (
          <View className="mt-8">
            <Button
              label={t.payment.formTitle}
              variant="secondary"
              onPress={() => router.push('/(modals)/payment-form')}
            />
          </View>
        ) : null}
      </ScrollView>

      <Toast />
    </View>
  );
}

/**
 * Một khoản sắp trả.
 *
 * Khoản đã qua hạn KHÔNG tô đỏ cả dòng. Nhãn "Quá hạn 3 ngày" đã nói đủ, và một
 * danh sách đỏ rực mỗi khi có hai khoản chậm là cách nhanh nhất để người ta
 * thôi mở tab Tiền (04 §7 — không "quá hạn nghiêm trọng", không doạ). Chỉ riêng
 * chữ nhãn mang màu cảnh báo.
 */
function PaymentRow({
  payment,
  today,
  onPress,
}: {
  payment: UpcomingPayment;
  today: string;
  onPress: () => void;
}) {
  const { t } = useT();

  const due = payment.dueDate ? formatDueLabel(payment.dueDate, today) : null;
  const isOverdue = due?.kind === 'overdue_days' && payment.state === 'unpaid';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={payment.name}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line py-3 active:bg-soft"
    >
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className={`text-body ${payment.state === 'paid' ? 'text-subtle' : 'text-ink'}`}
        >
          {payment.name}
        </Text>
        <Text className={`mt-0.5 text-caption ${isOverdue ? 'text-critical' : 'text-subtle'}`}>
          {due
            ? dueLabelText(due)
            : // Khoản chỉ biết tháng ("học phí tháng 9") — hiện tháng, không bịa ra ngày.
              payment.dueMonth
              ? shortSolarDate(payment.dueMonth)
              : t.event.noneYet}
        </Text>
      </View>

      <MoneyText
        amount={payment.amount}
        size="body"
        tone={payment.state === 'paid' ? 'muted' : 'default'}
      />
      <Text className="text-body text-subtle">›</Text>
    </Pressable>
  );
}
