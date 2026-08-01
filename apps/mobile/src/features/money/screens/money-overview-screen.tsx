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

import {
  computeFinanceStatus,
  explainFinanceStatus,
  formatDeclaredAt,
  formatDueLabel,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  EmptyState,
  ListSkeleton,
  MoneyText,
  NavRow,
  ProgressBar,
  progressPct,
  SectionHeader,
  StatusPill,
  Toast,
} from '@/design/components';
import { useOpenAttention } from '@/features/attention/queries/use-attention';
import { useGoals } from '@/features/goal/queries/use-goals';
import { AddFab } from '@/features/home/components';
import { useFinanceMetrics, useUpcomingNeeds } from '@/features/household/queries/use-household';
import { usePayments } from '@/features/payment/queries/use-payments';
import { declaredAtText, dueLabelText, financeReasonText, useT } from '@/i18n';
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

  // `needs` gộp ba nguồn tiền — đầu vào bắt buộc của computeFinanceStatus từ v2.
  const { data: needs } = useUpcomingNeeds(today);
  const needsList = needs ?? [];

  const status = metrics ? computeFinanceStatus(metrics, needsList, today) : null;

  return (
    // Tab gốc, `headerShown: false` — không có header nào che notch. Cạnh dưới
    // để tab bar lo, xem chú thích cùng chỗ ở `home-screen`.
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
                Nhãn + MỘT CÂU lý do + nhãn thời gian của số khai.
                ĐÃ BỎ nút "Cập nhật tình hình" (06 §1): nghi thức cập nhật định
                kỳ là một nghi thức kế toán, và chỉ người dùng mới quyết được
                khoản nào đáng ghi. Đường cập nhật giờ nằm ở đúng chỗ có ngữ
                cảnh — nút "Cập nhật giá trị" trong chi tiết từng khoản. */}
            <View className="mt-3">
              <Card emphasis={status === 'ok' ? 'none' : 'brand'}>
                <StatusPill status={status} />
                <Text className="mt-2 text-body text-ink">
                  {financeReasonText(explainFinanceStatus(metrics, needsList, today).reason)}
                </Text>
                {/* Nhãn thời gian BẮT BUỘC ở mọi chỗ hiện số tổng (03 §8). */}
                <Text className="mt-1 text-caption text-subtle">
                  {declaredAtText(formatDeclaredAt(metrics.lastUsableUpdatedOn, null, today))}
                </Text>
              </Card>
            </View>

            {/* ── ĐƯỜNG VÀO MÀN "SẮP TỚI" ──
                Đặt TRÊN bốn dòng nhóm, không phải dưới: theo v2 đây mới là màn
                chính của module tiền ("sắp tới nhà mình cần bao nhiêu"), còn bốn
                con số nhóm trả lời câu cũ ("nhà mình đang có bao nhiêu"). Thứ tự
                trên màn hình phải nói ra thứ tự đó. */}
            <View className="mt-4">
              <Button
                label={t.upcoming.title}
                onPress={() => router.push('/(app)/money/upcoming')}
              />
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
            P0 từ `08 §2` (đảo ngược quyết định hạ xuống P2 ở `06 §8`): mục tiêu
            NHÌN VỀ PHÍA TRƯỚC, cùng hướng với trái tim sản phẩm.

            Đặt DƯỚI tài sản và khoản sắp trả vì nó là nguyện vọng, không phải
            nghĩa vụ — và vì lý do đó nó cũng không chảy vào con số ở màn "Sắp
            tới". Ba con số và chỉ ba: đã có, cần đạt, còn thiếu. */}
        {(goals ?? []).length > 0 ? (
          <>
            <SectionHeader
              title={t.money.sectionGoals}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.common.see}
                  hitSlop={8}
                  onPress={() => router.push('/(app)/money/goals')}
                >
                  <Text className="text-label font-medium text-brand">{t.common.see}</Text>
                </Pressable>
              }
            />
            {(goals ?? []).map((g) => (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityLabel={g.name}
                onPress={() => router.push(`/(app)/money/goal/${g.id}`)}
                className="py-3 active:bg-soft"
              >
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
                {/* `currentAmount` là SỐ KHAI y hệt `assets.current_value`, nên
                    chịu cùng ràng buộc nhãn thời gian (08 §2.2).

                    Không truyền tên người khai ở đây (dùng biến thể ẩn danh
                    "Cập nhật 5 tuần trước"): màn này mở nhiều nhất trong app, và
                    bắt nó chờ thêm một truy vấn `members` chỉ để thêm một cái
                    tên vào dòng tóm tắt là đánh đổi sai — cùng lý do đã ghi ở
                    mục CẦN TRAO ĐỔI. Tên đầy đủ có ở màn chi tiết mục tiêu.
                    Phần BẮT BUỘC của nhãn là thời gian, không phải tên (03 §8). */}
                <Text className="mt-1 text-caption text-subtle">
                  {declaredAtText(formatDeclaredAt(g.asOfDate, null, today))}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {/* ── SỔ MỪNG (G15) ──
            Vào từ tab Tiền vì tiền mừng là tiền thật chảy vào nhà, nhưng KHÔNG
            gộp vào bốn con số ở trên: một khoản mừng đã nhận không phải là tài
            sản đang có, và một khoản sắp đi không phải là khoản sắp phải trả.
            Trộn chúng vào `finance_metrics` sẽ làm trạng thái tài chính đổi mỗi
            lần ghi một cái phong bì.

            Dòng này LUÔN hiện, kể cả khi sổ trống — khác các nhóm ở trên. Đây là
            đường vào duy nhất của module, và một đường vào chỉ xuất hiện sau khi
            đã có dữ liệu thì không ai tìm được nó để tạo dữ liệu đầu tiên. */}
        <View className="mt-6">
          <NavRow
            label={t.gift.title}
            onPress={() => router.push('/(app)/gifts')}
            last
          />
        </View>

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
      <AddFab />
    </SafeAreaView>
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

