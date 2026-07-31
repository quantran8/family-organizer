/**
 * Nợ — 05 §6.5.
 *
 * Mỗi dòng: tên · bên cho vay · dư nợ · kỳ trả tiếp theo.
 *
 * ── Ràng buộc #1 ở màn này ──
 *
 * `borrowerMemberId` KHÔNG hiện ở đây. Nó chỉ có mặt ở cấp từng khoản, trong
 * màn chi tiết — cùng lối với `holderMemberId` ở tài sản. Một danh sách nợ có
 * cột "ai vay" là một bảng đối chiếu hai người, và đó chính là thứ biến sản
 * phẩm thành công cụ kiểm soát.
 *
 * Khoản MÌNH cho người khác vay không nằm ở đây — nó là `assets` với
 * `asset_kind = 'receivable'`. Hai thứ ngược chiều nhau, gộp một danh sách thì
 * tổng không còn nghĩa gì.
 *
 * ── Nợ đã tất toán vẫn xem lại được, nhưng không nằm cùng nợ đang trả ──
 *
 * Trộn chung thì "còn bao nhiêu phải trả" phải đọc từng dòng mới biết. Tách bằng
 * một nút lọc, mặc định là **Đang trả** — thứ người dùng mở màn này để xem.
 */

import { formatDueLabel, type Debt } from '@family-organizer/domain';
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
import { useDebts } from '@/features/debt/queries/use-debts';
import { dueLabelText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

type DebtFilter = 'open' | 'settled';

export function DebtListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  // Cục bộ, KHÔNG persist như `docFilter`: người dùng mở màn Nợ để xem nợ đang
  // trả. Nhớ lựa chọn "Đã tất toán" từ lần trước sẽ làm lần mở sau thấy một
  // danh sách trông như trống.
  const [filter, setFilter] = useState<DebtFilter>('open');

  const { data: debts, isPending, isError, refetch } = useDebts();

  const filterOptions: { value: DebtFilter; label: string }[] = [
    { value: 'open', label: t.debt.filterOpen },
    { value: 'settled', label: t.debt.filterSettled },
  ];

  const header = (
    <View className="px-4 pb-2 pt-4">
      <Segmented options={filterOptions} value={filter} onChange={setFilter} />
    </View>
  );

  if (isPending) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="px-4">
          <ListSkeleton rows={4} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="px-4">
          <ErrorState
            message={t.error.unknown}
            retryLabel={t.common.retry}
            onRetry={() => void refetch()}
          />
        </View>
      </View>
    );
  }

  const rows = (debts ?? []).filter((d) =>
    filter === 'open' ? !d.isSettled : d.isSettled,
  );

  return (
    <View className="flex-1 bg-white">
      {header}

      {rows.length === 0 ? (
        <EmptyState
          title={t.debt.emptyTitle}
          body={t.debt.emptyBody}
          actionLabel={t.debt.formTitle}
          onAction={() => router.push('/(modals)/debt-form')}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-12"
          showsVerticalScrollIndicator={false}
        >
          {rows.map((d) => (
            <DebtRow
              key={d.id}
              debt={d}
              today={today}
              onPress={() =>
                router.push({ pathname: '/(app)/money/debt/[id]', params: { id: d.id } })
              }
            />
          ))}

          <View className="mt-8">
            <Button
              label={t.debt.formTitle}
              variant="secondary"
              onPress={() => router.push('/(modals)/debt-form')}
            />
          </View>
        </ScrollView>
      )}

      <Toast />
    </View>
  );
}

/**
 * Một khoản nợ.
 *
 * Số ĐẦY ĐỦ, không rút gọn: đây là màn danh sách, chỗ người dùng tới để đối
 * chiếu với app ngân hàng, và ở đó từng đồng mới có nghĩa (design.md §4 chỉ cho
 * rút gọn ở màn tổng quan).
 */
function DebtRow({
  debt,
  today,
  onPress,
}: {
  debt: Debt;
  today: string;
  onPress: () => void;
}) {
  const { t, f } = useT();

  const dueLabel = debt.nextDueDate ? formatDueLabel(debt.nextDueDate, today) : null;
  const sub = [
    debt.lender,
    debt.isSettled
      ? t.debt.settled
      : dueLabel
        ? f(t.debt.nextDueLabel, { date: dueLabelText(dueLabel) })
        : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={debt.name}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line py-3 active:bg-soft"
    >
      <View className="flex-1">
        <Text numberOfLines={1} className="text-body text-ink">
          {debt.name}
        </Text>
        {sub !== '' ? (
          <Text numberOfLines={1} className="mt-0.5 text-caption text-subtle">
            {sub}
          </Text>
        ) : null}
      </View>

      {/* Dư nợ KHÔNG tô đỏ. Một khoản nợ không phải một lỗi lầm — design.md
          §5.4 để `critical` cho lỗi và hậu quả không hoàn tác được, và
          `04 §7` cấm ngôn ngữ phán xét quanh tiền. */}
      <MoneyText amount={debt.remainingAmount} size="body" />

      <Text className="text-body text-subtle">›</Text>
    </Pressable>
  );
}
