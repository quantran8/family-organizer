/**
 * Nhà mình qua từng mốc — G7b, thêm ngoài `05 §1`.
 *
 * Lý do sản phẩm: *niềm tin của người không giữ tiền đến từ việc **thấy được
 * thay đổi**, không phải từ con số hiện tại.* `money_snapshots` đã ghi từ G2 và
 * `delta` đã tính được từ G1, nhưng không có màn hình đọc thì cả hai chỉ nằm
 * trong DB.
 *
 * Ba ràng buộc của màn này, mỗi cái sửa một cách hỏng cụ thể:
 *
 * 1. **Danh sách mốc thời gian, KHÔNG biểu đồ.** Biểu đồ chi tiêu nằm trong
 *    danh sách "không làm ở MVP" (04 §9), và không phải vì tốn công: một đường
 *    đi xuống trên biểu đồ là một lời phán xét mà không ai đọc được lý do, còn
 *    một dòng "−8 triệu · sửa xe" thì tự giải thích.
 *
 * 2. **`status` đọc NGUYÊN từ DB, không tính lại trên số cũ.** `MoneySnapshot`
 *    lưu trạng thái tại thời điểm đó. Tính lại bằng `computeFinanceStatus` trên
 *    bốn con số cũ sẽ cho kết quả khác — các ngưỡng dùng cả khoản đến hạn và cờ
 *    đang mở, hai thứ của HÔM NAY. Kết quả là lịch sử đổi nghĩa mỗi lần mình
 *    sửa ngưỡng, và một mốc từng ghi "Ổn" bỗng hiện "Căng" sau một lần cập nhật
 *    app.
 *
 * 3. **Mốc đầu tiên KHÔNG hiện cột chênh lệch.** `null ≠ 0`. Mốc đầu tiên không
 *    phải "không đổi", nó là "chưa biết", và `withDiffs` đã trả về `null` đúng
 *    cho ca đó — việc của màn hình là đừng biến nó thành "+0".
 *
 * **Chỉ đọc.** Không nút nào sửa hay xoá một mốc.
 */

import { formatMoneyShort } from '@nhaminh/domain';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Divider, EmptyState, ErrorState, ListSkeleton, StatusPill } from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useSnapshotHistory } from '@/features/snapshot/queries/use-snapshots';
import { deltaText, fullSolarDate, useT } from '@/i18n';

export function SnapshotHistoryScreen() {
  const { t } = useT();
  const router = useRouter();
  const currency = useCurrency();

  const { data: rows, isPending, isError, refetch } = useSnapshotHistory();

  if (isPending) {
    return (
      <View className="flex-1 bg-white px-4">
        <ListSkeleton rows={5} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white px-4">
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  if ((rows ?? []).length === 0) {
    return (
      <View className="flex-1 bg-white px-4">
        <EmptyState
          title={t.money.historyEmptyTitle}
          body={t.money.historyEmptyBody}
          actionLabel={t.money.updateSituation}
          onAction={() => router.push('/(modals)/snapshot-update')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-4 pb-12"
      showsVerticalScrollIndicator={false}
    >
      {(rows ?? []).map(({ snapshot, diff }, i) => (
        <View key={snapshot.id}>
          {i > 0 ? <Divider /> : null}

          <View className="py-4">
            <View className="flex-row items-center gap-3">
              <Text className="flex-1 text-body font-medium text-ink">
                {fullSolarDate(snapshot.asOfDate)}
              </Text>
              {/* Trạng thái ĐÃ LƯU, không tính lại — xem chú thích #2 đầu file. */}
              <StatusPill status={snapshot.status} size="sm" />
              {/* Mốc do cron cuối tháng tự chốt, không phải ai nhập. Nói rõ để
                  người dùng không đi tìm xem "hôm đó mình có mở app không". */}
              {!snapshot.isManual ? (
                <Text className="text-micro text-tertiary">{t.money.historyAuto}</Text>
              ) : null}
            </View>

            <View className="mt-3">
              <TotalRow
                label={t.money.usable}
                value={snapshot.totalUsable}
                delta={diff.usable}
                currency={currency}
              />
              <TotalRow
                label={t.money.savings}
                value={snapshot.totalSavings}
                delta={diff.savings}
                currency={currency}
              />
              <TotalRow
                label={t.money.longTerm}
                value={snapshot.totalLongTerm}
                delta={diff.longTerm}
                currency={currency}
              />
              <TotalRow
                label={t.money.debt}
                value={snapshot.totalDebt}
                delta={diff.debt}
                currency={currency}
              />
            </View>

            {snapshot.note ? (
              <Text className="mt-2 text-caption text-muted">{snapshot.note}</Text>
            ) : null}
          </View>
        </View>
      ))}

      <View className="h-4" />
    </ScrollView>
  );
}

/**
 * Một trong bốn con số của mốc, kèm chênh lệch so với mốc LIỀN TRƯỚC.
 *
 * `delta === null` → cột chênh lệch để TRỐNG. Không "+0", và cũng không dấu
 * gạch ngang: gạch ngang cũng là một khẳng định ("không đổi"), mà ở mốc đầu
 * tiên mình không biết gì cả.
 *
 * Ngôn ngữ trung tính, và số dương KHÔNG tự động xanh / số âm KHÔNG tự động đỏ.
 * Nợ giảm là một số âm ở dòng "Đang nợ" và đó là tin tốt — tô đỏ theo dấu là
 * app hiểu ngược hẳn chuyện đang xảy ra.
 */
function TotalRow({
  label,
  value,
  delta,
  currency,
}: {
  label: string;
  value: number;
  delta: number | null;
  currency: string;
}) {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <Text className="flex-1 text-caption text-muted">{label}</Text>
      {/* Rút gọn: bốn con số × nhiều mốc trên một màn, dạng đầy đủ sẽ thành một
          bức tường chữ số mà không ai quét được theo cột (design.md §4). */}
      <Text className="text-body text-ink" style={{ fontVariant: ['tabular-nums'] }}>
        {formatMoneyShort(value, currency)}
      </Text>
      <View className="w-24 items-end">
        {delta === null ? null : (
          <Text className="text-caption text-muted" style={{ fontVariant: ['tabular-nums'] }}>
            {deltaText(delta, currency)}
          </Text>
        )}
      </View>
    </View>
  );
}
