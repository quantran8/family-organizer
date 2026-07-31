/**
 * Tiền — tổng quan, 05 §6.1.
 *
 * **RÀNG BUỘC #1, quan trọng nhất của cả spec: không bao giờ tổng hợp tiền theo
 * người.** Không có "Chồng giữ 210tr / Vợ giữ 40tr" ở bất cứ đâu trên màn này —
 * không biểu đồ, không tổng, không xếp hạng. Bốn dòng nhóm dưới đây gộp theo
 * `liquidity`, và đó là chiều gộp DUY NHẤT được phép. `holderMemberId` chỉ hiện
 * ở cấp TỪNG KHOẢN, trong `assets.tsx`.
 *
 * Không phải quy tắc thẩm mỹ: tổng hợp theo người là cách nhanh nhất biến sản
 * phẩm thành công cụ kiểm soát, và người đang giữ tiền sẽ rời app ngay.
 *
 * Bốn con số nhóm đọc từ view `finance_metrics` — MỘT lần fetch, không phải bốn
 * lần cộng ở client trên danh sách tài sản. Cộng ở client thì màn này và màn
 * `assets` sẽ lệch nhau mỗi khi có khoản đóng hay khoản xoá mềm, và hai con số
 * khác nhau về cùng một thứ là cách phá niềm tin nhanh nhất trong app tiền chung.
 */

import { computeFinanceStatus, explainFinanceStatus, formatDueLabel } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  FAB,
  ListSkeleton,
  MoneyText,
  SectionHeader,
  StatusPill,
  Toast,
} from '@/design/components';
import { useOpenAttention } from '@/features/attention/queries/use-attention';
import { useGoals } from '@/features/goal/queries/use-goals';
import { useFinanceMetrics } from '@/features/household/queries/use-household';
import { usePayments } from '@/features/payment/queries/use-payments';
import { dueLabelText, financeReasonText, lastUpdatedText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function MoneyOverviewScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: metrics, isPending, refetch, isRefetching } = useFinanceMetrics();
  // Cửa sổ 30 ngày cho mục SẮP PHẢI TRẢ: 7 ngày quá hẹp để kịp chuẩn bị tiền,
  // còn 'all' thì biến một mục tóm tắt thành danh sách thứ hai của cùng màn.
  const { data: payments } = usePayments('30d', today);
  const { data: attention } = useOpenAttention();
  const { data: goals } = useGoals();

  const status = metrics ? computeFinanceStatus(metrics, today) : null;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <Text className="pb-1 pt-2 text-title1 font-semibold text-ink">{t.money.title}</Text>

        {isPending ? <ListSkeleton rows={5} /> : null}

        {metrics && status ? (
          <>
            {/* ── THẺ TRẠNG THÁI ──
                Nhãn + MỘT CÂU lý do + nút mở nghi thức cập nhật. Nút nằm TRONG
                thẻ chứ không nổi riêng: nó là câu trả lời cho tình hình vừa đọc
                được, không phải một hành động độc lập ai đó phải đi tìm. */}
            <View className="mt-3">
              <Card emphasis={status === 'ok' ? 'none' : 'brand'}>
                <StatusPill status={status} />
                <Text className="mt-2 text-body text-ink">
                  {financeReasonText(explainFinanceStatus(metrics, today).reason)}
                </Text>
                <Text className="mt-1 text-caption text-subtle">
                  {metrics.lastUpdatedOn
                    ? lastUpdatedText(formatDueLabel(metrics.lastUpdatedOn, today))
                    : t.financeStatus.neverUpdated}
                </Text>
                <View className="mt-4">
                  <Button
                    label={t.money.updateSituation}
                    onPress={() => router.push('/(modals)/snapshot-update')}
                  />
                </View>
              </Card>
            </View>

            {/* ── BỐN DÒNG NHÓM ── gộp theo `liquidity`, chiều gộp duy nhất được phép. */}
            <View className="mt-6 overflow-hidden rounded-status border border-line">
              <GroupRow
                label={t.money.usable}
                amount={metrics.totalUsable}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/money/assets',
                    params: { group: 'usable_now' },
                  })
                }
              />
              <GroupRow
                label={t.money.savings}
                amount={metrics.totalSavings}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/money/assets',
                    params: { group: 'not_immediate' },
                  })
                }
              />
              <GroupRow
                label={t.money.longTerm}
                amount={metrics.totalLongTerm}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/money/assets',
                    params: { group: 'long_term' },
                  })
                }
              />
              {/* G9 nối đích cho dòng này. Đúng như ghi chú cũ dự kiến: chỉ đổi
                  ĐÍCH, không đổi hình dạng — `GroupRow` vốn đã vẽ mũi tên khi có
                  `onPress`, nên bốn dòng vẫn là bốn dòng giống nhau. */}
              <GroupRow
                label={t.money.debt}
                amount={metrics.totalDebt}
                onPress={() => router.push('/(app)/money/debts')}
                last
              />
            </View>

            {/* ── LỊCH SỬ (G7b) ──
                Hai đường vào đặt NGAY dưới bốn con số, không giấu trong cài đặt:
                niềm tin của người không giữ tiền đến từ việc THẤY ĐƯỢC THAY ĐỔI,
                không phải từ con số hiện tại. Con số ở trên, đường xem nó đã đi
                tới đó thế nào ở ngay đây. */}
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Button
                  label={t.money.historyTitle}
                  variant="secondary"
                  onPress={() => router.push('/(app)/money/history')}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t.money.changesTitle}
                  variant="secondary"
                  onPress={() => router.push('/(app)/money/changes')}
                />
              </View>
            </View>
          </>
        ) : null}

        {/* ── SẮP PHẢI TRẢ ──
            Nhóm rỗng ẩn HẲN, như trên Nhà mình: một dòng "chưa có gì" là một
            lần nhắc người dùng rằng họ chưa làm gì. */}
        {(payments ?? []).length > 0 ? (
          <>
            <SectionHeader
              title={t.money.sectionUpcoming}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.common.see}
                  hitSlop={8}
                  onPress={() => router.push('/(app)/money/payments')}
                >
                  <Text className="text-label font-medium text-brand">{t.common.see}</Text>
                </Pressable>
              }
            />
            {(payments ?? []).slice(0, 3).map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                onPress={() => router.push(`/(app)/money/payment/${p.id}`)}
                className="min-h-touch flex-row items-center gap-3 border-b border-line py-3 active:bg-soft"
              >
                <Text numberOfLines={1} className="flex-1 text-body text-ink">
                  {p.name}
                </Text>
                <MoneyText amount={p.amount} short withSymbol size="body" />
                {p.dueDate ? (
                  <Text className="w-24 text-right text-caption text-subtle">
                    {dueLabelText(formatDueLabel(p.dueDate, today))}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </>
        ) : null}

        {/* ── CẦN TRAO ĐỔI ──
            KHÔNG có luồng bình luận (05 §6.7). Mục này là dòng TÓM TẮT: nút
            "Đã rõ" và ngữ cảnh đầy đủ nằm ở `money/attention` (G9). Cố ý không
            đặt nút đóng cờ ở đây — đóng một cờ mà không thấy nó thuộc khoản nào
            là đóng một thứ mình chưa đọc.

            Vẫn dùng `useOpenAttention` (không kèm tên khoản): màn này mở nhiều
            nhất trong app, và bắt nó chờ thêm sáu câu truy vấn tên cho một dòng
            tóm tắt là đánh đổi sai. */}
        {(attention ?? []).length > 0 ? (
          <>
            <SectionHeader
              title={t.money.sectionAttention}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.common.see}
                  hitSlop={8}
                  onPress={() => router.push('/(app)/money/attention')}
                >
                  <Text className="text-label font-medium text-brand">{t.common.see}</Text>
                </Pressable>
              }
            />
            {(attention ?? []).map((a) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={a.note ?? t.attention.title}
                onPress={() => router.push('/(app)/money/attention')}
                className="min-h-touch flex-row items-center gap-2 border-b border-line py-3 active:bg-soft"
              >
                <Text className="text-body text-attention">▸</Text>
                <Text numberOfLines={2} className="flex-1 text-body text-ink">
                  {a.note ?? t.attention.title}
                </Text>
                <Text className="text-body text-subtle">›</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {/* ── MỤC TIÊU ──
            `P1` trong spec. Hiện được vì repository và thanh tiến độ đã có sẵn;
            form tạo mục tiêu lên ở G9, nên mục này chỉ xuất hiện khi đã có dữ liệu. */}
        {(goals ?? []).length > 0 ? (
          <>
            <SectionHeader title={t.money.sectionGoals} />
            {(goals ?? []).map((g) => (
              <View key={g.id} className="py-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text numberOfLines={1} className="flex-1 text-body text-ink">
                    {g.name}
                  </Text>
                  <Text
                    className="text-caption text-muted"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {`${progressPct(g.currentAmount, g.targetAmount)}%`}
                  </Text>
                </View>
                <ProgressBar value={g.currentAmount} total={g.targetAmount} />
              </View>
            ))}
          </>
        ) : null}

        {status === 'no_data' ? (
          <View className="mt-6">
            <EmptyState
              title={t.money.emptyTitle}
              body={t.money.emptyBody}
              actionLabel={t.asset.formTitle}
              onAction={() => router.push('/(modals)/asset-form')}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Xác nhận từ modal vừa đóng — "Đã cập nhật" sau nghi thức. */}
      <Toast />
      <FAB onPress={() => router.push('/(modals)/quick-add')} />
    </View>
  );
}

/**
 * Một trong bốn dòng nhóm.
 *
 * Số dùng dạng RÚT GỌN ("45 triệu"): trên màn tổng quan con số đầy đủ không
 * giúp quyết định gì mà lại bắt đếm số 0 (design.md §4). Từng đồng nằm ở màn
 * danh sách phía sau, đúng chỗ nó có ý nghĩa.
 */
function GroupRow({
  label,
  amount,
  onPress,
  last = false,
}: {
  label: string;
  amount: number;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <>
      <Text className="flex-1 text-body text-ink">{label}</Text>
      <MoneyText amount={amount} short withSymbol size="heading" />
      {onPress ? <Text className="text-body text-subtle">›</Text> : null}
    </>
  );

  const box = `min-h-touch flex-row items-center gap-3 px-4 py-3.5 ${
    last ? '' : 'border-b border-line'
  }`;

  if (!onPress) return <View className={box}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`${box} active:bg-soft`}
    >
      {body}
    </Pressable>
  );
}

/** Phần trăm đã đạt, kẹp 0–100. Mục tiêu vượt 100% vẫn vẽ đầy thanh, không tràn. */
function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/**
 * Thanh tiến độ mục tiêu.
 *
 * Iris nhạt, KHÔNG phải xanh "đạt chỉ tiêu": một mục tiêu chưa xong không phải
 * lỗi cần cảnh báo, và tô màu trạng thái vào đây làm nó đọc thành điểm số.
 */
function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = progressPct(value, total);
  return (
    <View className="mt-2 h-2 overflow-hidden rounded-full bg-soft">
      <View className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </View>
  );
}
