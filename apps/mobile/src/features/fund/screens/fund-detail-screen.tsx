/**
 * Quỹ chung — chi tiết một quỹ, 05 §6.9 / 09 §E.9.
 *
 * ĐÂY LÀ MÀN DUY NHẤT TRONG TOÀN APP HIỆN TỔNG TIỀN THEO NGƯỜI, và ngoại lệ đó
 * (03 §9 ngoại lệ 2) chỉ hợp lệ nhờ bố cục của chính màn này:
 *
 *   bộ chọn tháng  →  tổng tháng  →  người bỏ vào  →  các khoản
 *
 * Bộ chọn tháng phải nằm TRÊN khối người bỏ vào. Người đọc cần thấy "tháng 9"
 * cùng lúc với "Anh 10tr, Em 10tr"; nếu không, con số đó trôi thành một tổng
 * không có biên — và một tổng không có biên giữa hai vợ chồng là sổ nợ.
 *
 * PHÉP THỬ KHI SỬA MÀN NÀY: con số nào đang hiện có vắt qua nhiều hơn một tháng
 * không? Có → sai.
 */

import { formatDeclaredAt, type ISODate, type UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, ErrorState, ListSkeleton, MoneyText, Toast } from '@/design/components';
import { ContributorBlock, FundEntryRow, MonthPicker } from '@/features/fund/components';
import {
  useDeleteFundEntry,
  useFund,
  useFundEntries,
  useFundMonth,
} from '@/features/fund/queries/use-funds';
import { fundRecordedAtText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

/** Ngày đầu tháng chứa `d`. */
function monthStart(d: ISODate): ISODate {
  return `${d.slice(0, 7)}-01`;
}

export function FundDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: UUID }>();

  // Mặc định tháng hiện tại. Đây là câu hỏi người dùng mang trong đầu khi mở
  // màn này: "tháng này nhà mình bỏ vào bao nhiêu rồi".
  const [month, setMonth] = useState<ISODate>(() => monthStart(today));

  const { data: fund, isPending, isError, refetch } = useFund(id);
  const { data: summary } = useFundMonth(id, month);
  const { data: entries } = useFundEntries(id, month);
  const deleteEntry = useDeleteFundEntry();

  if (isPending) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ListSkeleton rows={5} />
      </View>
    );
  }

  if (isError || !fund) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const list = entries ?? [];

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mt-2 text-title1 font-semibold text-ink">{fund.name}</Text>

        <View className="mt-2">
          <MoneyText amount={fund.currentAmount} size="display" />
        </View>
        {/* Nhãn thời gian BẮT BUỘC — và dùng câu của QUỸ, không phải của tài
            sản: số dư quỹ là tổng của những khoản đã ghi, không phải số khai. */}
        <Text className="mt-1 text-caption text-subtle">
          {fundRecordedAtText(formatDeclaredAt(fund.asOfDate, null, today))}
        </Text>

        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <Button
              label={t.fund.deposit}
              onPress={() => router.push(`/(modals)/fund-entry?fundId=${id}&kind=deposit`)}
            />
          </View>
          <View className="flex-1">
            <Button
              label={t.fund.withdraw}
              variant="secondary"
              onPress={() => router.push(`/(modals)/fund-entry?fundId=${id}&kind=withdrawal`)}
            />
          </View>
        </View>

        {/* Bộ chọn tháng — phải đứng TRÊN khối người bỏ vào. Xem đầu file. */}
        <View className="mt-7">
          <MonthPicker month={month} onChange={setMonth} />
        </View>

        <View className="mt-4 rounded-featured border border-line p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-body text-ink">{t.fund.monthDeposits}</Text>
            <MoneyText amount={summary?.deposits ?? 0} size="body" tone="ok" />
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-body text-ink">{t.fund.monthWithdrawals}</Text>
            <MoneyText amount={-(summary?.withdrawals ?? 0)} size="body" />
          </View>
          {/* Số lượng bản ghi là BẮT BUỘC kèm mọi con số tổng — ràng buộc #5. */}
          <Text className="mt-3 border-t border-line pt-3 text-caption text-subtle">
            {f(t.fund.entryCount, { count: summary?.entryCount ?? 0 })}
          </Text>
        </View>

        {/* `month` là prop bắt buộc — tầng thứ tư ép ranh giới một-tháng. */}
        <ContributorBlock byContributor={summary?.byContributor ?? []} month={month} />

        <View className="mt-6">
          {list.length === 0 ? (
            // Trạng thái rỗng của MỘT tháng: KHÔNG có nút. Hai nút ghi đã ở
            // ngay trên, và bộ chọn tháng cũng vậy (09 §E.9).
            <Text className="py-6 text-center text-body text-subtle">{t.fund.monthEmpty}</Text>
          ) : (
            list.map((entry) => (
              <FundEntryRow
                key={entry.id}
                entry={entry}
                dateLabel={`${Number(entry.occurredOn.slice(8, 10))}/${Number(
                  entry.occurredOn.slice(5, 7),
                )}`}
                onDelete={() => deleteEntry.mutate(entry.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Toast />
    </View>
  );
}
