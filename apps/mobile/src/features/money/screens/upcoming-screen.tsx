/**
 * "Sắp tới nhà mình cần bao nhiêu" — 05 §6.1, trái tim sản phẩm theo v2 §7.2.
 *
 * Đây là thứ duy nhất mà Zalo, Calendar, Sheet và Drive cộng lại vẫn không làm
 * được, vì nó cần đồng thời ba nguồn: khoản sắp trả, chi phí sự kiện, phí gia
 * hạn giấy tờ. Người dùng không cần biết chúng đến từ ba bảng — view
 * `upcoming_needs` trộn sẵn, `projectRunway` gom theo tháng.
 *
 * ── BA RÀNG BUỘC CỦA MÀN NÀY ──
 *
 * 1. **Câu "theo những khoản nhà mình đã ghi" là bắt buộc và không được rút
 *    gọn** (06 §3). Đây là một DỰ TÍNH, không phải một báo cáo. Bỏ câu đó đi
 *    thì con số hero tự nhận là bức tranh đầy đủ, và nó sẽ sai mãi mãi vì luôn
 *    có khoản chưa ai ghi vào.
 *
 * 2. **Mục tiêu KHÔNG nằm trong con số này** (08 §2.3). Nghĩa vụ khác nguyện
 *    vọng: học phí tháng 9 là thứ PHẢI trả, góp quỹ mua nhà là thứ MUỐN làm.
 *    Ràng buộc được ép ở tầng view (`upcoming_needs` không union `goals`) —
 *    đừng cộng thêm ở đây.
 *
 * 3. **Khi thiếu thì nói thiếu, KHÔNG kèm lời khuyên.** Không "mỗi tháng nên
 *    để dành thêm", không "cân nhắc hoãn khoản này". App không biết thu nhập,
 *    không biết hoàn cảnh, và một lời khuyên với cặp vợ chồng đang chật vật là
 *    sự tàn nhẫn được tự động hoá.
 */

import {
  addDays,
  formatDeclaredAt,
  formatMoneyShort,
  projectRunway,
  shouldAskForRefresh,
  type UpcomingNeed,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, ListSkeleton, MoneyText, Toast } from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useFinanceMetrics, useUpcomingNeeds } from '@/features/household/queries/use-household';
import { declaredAtText, monthLabelText, shortSolarDate, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useUIPrefs } from '@/stores/ui-prefs';

/** Bỏ qua thì im ngần này ngày — 03 §1b. */
const SNOOZE_DAYS = 14;

export function UpcomingScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const currency = useCurrency();

  const { data: metrics, isPending, refetch, isRefetching } = useFinanceMetrics();
  // KHÔNG truyền horizonDays: mặc định RUNWAY_HORIZON_DAYS để dùng chung cache
  // với màn Nhà mình. Truyền số khác ở đây sẽ tạo một khoá cache thứ hai và hai
  // màn hình hiện hai con số khác nhau về cùng một thứ.
  const { data: needs } = useUpcomingNeeds(today);
  const needsList = needs ?? [];

  const snoozedUntil = useUIPrefs((s) => s.refreshAskSnoozedUntil);
  const snooze = useUIPrefs((s) => s.snoozeRefreshAsk);

  if (isPending) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ListSkeleton rows={5} />
      </View>
    );
  }

  if (!metrics) {
    return (
      <View className="flex-1 bg-surface px-4">
        <EmptyState
          title={t.upcoming.emptyTitle}
          body={t.upcoming.emptyBody}
          actionLabel={t.payment.formTitle}
          onAction={() => router.push('/(modals)/payment-form')}
        />
      </View>
    );
  }

  const p = projectRunway(metrics, needsList, today);

  // Hỏi lại số dư — hai điều kiện độc lập, phải đúng CẢ HAI:
  //   - shouldAskForRefresh: có khoản lớn sắp tới VÀ số dư đã cũ (03 §1b)
  //   - chưa bị bỏ qua, hoặc kỳ im lặng 14 ngày đã hết
  const isSnoozed = snoozedUntil !== null && snoozedUntil > today;
  const askRefresh = !isSnoozed && shouldAskForRefresh(metrics, needsList, today);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* ── HERO ──
            Con số + nhãn nguồn gốc của nó. Hai dòng này đi liền nhau và không
            bao giờ tách rời: con số một mình là một lời khẳng định, con số kèm
            câu "theo những khoản nhà mình đã ghi" là một dự tính trung thực. */}
        <View className="mt-4">
          <Text className="text-label font-semibold uppercase text-muted">
            {t.upcoming.heroLabel}
          </Text>
          <View className="mt-1">
            <MoneyText amount={p.total} size="display" withSymbol />
          </View>
          <Text className="mt-1 text-caption text-subtle">{t.upcoming.basisDeclared}</Text>
        </View>

        {/* ── BA NGUỒN TRỘN LÀM MỘT, GOM THEO THÁNG ──
            Không có nhãn nào nói khoản này đến từ bảng nào. Người dùng nghĩ
            "tháng 10 nhà mình cần 5 triệu", không nghĩ "upcoming_payments có
            2 dòng và events có 1 dòng". */}
        {p.byMonth.length === 0 ? (
          <View className="mt-8">
            <EmptyState title={t.upcoming.emptyTitle} body={t.upcoming.emptyBody} />
          </View>
        ) : (
          p.byMonth.map((m) => (
            <View key={m.month} className="mt-6">
              <View className="flex-row items-end justify-between gap-3">
                <Text className="text-label font-semibold uppercase text-muted">
                  {monthLabelText(m.month, today)}
                </Text>
                <MoneyText amount={m.total} size="heading" withSymbol />
              </View>

              {m.items.map((n) => (
                <NeedRow key={`${n.source}:${n.id}`} need={n} />
              ))}
            </View>
          ))
        )}

        {/* ── ĐỐI CHIẾU VỚI TIỀN ĐANG CÓ ──
            Nhãn thời gian đi kèm `totalUsable`, KHÔNG phải kèm con số hero:
            hero là tổng của những khoản sắp tới (mỗi khoản có ngày riêng), còn
            thứ có "độ mới" là số dư người ta khai. Gắn nhãn nhầm chỗ làm người
            đọc tưởng cả màn hình cũ sáu tuần. */}
        <View className="mt-8 rounded-status border border-line p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-body text-ink">{t.upcoming.usable}</Text>
            <MoneyText amount={metrics.totalUsable} size="heading" withSymbol />
          </View>
          <Text className="mt-1 text-caption text-subtle">
            {declaredAtText(formatDeclaredAt(p.usableAsOf, null, today))}
          </Text>

          {/* Thiếu thì nói thiếu — bằng CHỮ, không chỉ bằng màu (04 §10): dòng
              đổi hẳn câu chữ chứ không phải giữ nguyên "Còn lại dự kiến" rồi tô
              đỏ một số âm. Và KHÔNG có câu khuyên nào theo sau. */}
          <View className="mt-4 border-t border-line pt-4">
            {p.shortfall !== null ? (
              <Text className="text-heading font-semibold text-critical">
                {f(t.upcoming.shortfall, {
                  amount: formatMoneyShort(p.shortfall, currency),
                })}
              </Text>
            ) : (
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-body text-ink">{t.upcoming.remaining}</Text>
                <MoneyText amount={p.projectedRemaining} size="heading" withSymbol />
              </View>
            )}
          </View>
        </View>

        {/* ── MỤC TIÊU — CÓ THỂ HOÃN ──
            v3 §7.2, cơ chế ở 10 §5.

            RÀNG BUỘC QUAN TRỌNG NHẤT CỦA CẢ MÀN: con số ở khối này KHÔNG nằm
            trong bất kỳ phép cộng nào phía trên — không vào hero, không vào tổng
            tháng, không vào «Còn lại», không vào câu «Thiếu khoảng».
            `projectRunway` đã tách sẵn: `total` chỉ cộng `kind='mandatory'`, còn
            `optional` trả riêng cho đúng khối này.

            Vì sao vẫn để cùng màn hình: hai người cần thấy tháng 9 đóng học phí
            xong thì quỹ du lịch phải chậm lại. CÙNG MÀN HÌNH KHÔNG PHẢI CÙNG MỘT
            CON SỐ.

            Đặt DƯỚI khối đối chiếu, không xen vào giữa các tháng: nghĩa vụ đọc
            hết trước, nguyện vọng đọc sau. Không thanh tiến độ, không phần trăm
            — đó là ngôn ngữ của màn Mục tiêu, không phải của màn này. */}
        {p.optional.length > 0 ? (
          <View className="mt-8">
            <Text className="text-label font-semibold uppercase text-muted">
              {t.upcoming.optionalTitle}
            </Text>
            {p.optional.map((n) => (
              <NeedRow key={`${n.source}:${n.id}`} need={n} />
            ))}
          </View>
        ) : null}

        {/* ── HỎI LẠI SỐ DƯ ──
            Ngoại lệ DUY NHẤT được phép hỏi, và hỏi theo NGỮ CẢNH chứ không theo
            lịch. Không push, không badge, không chấm màu — chỉ một dòng ở đây,
            bỏ qua được, và im 14 ngày sau khi bỏ qua. */}
        {askRefresh ? (
          <View className="mt-6 rounded-status bg-soft p-4">
            <Text className="text-body text-ink">
              {f(t.upcoming.refreshAsk, {
                label: declaredAtText(formatDeclaredAt(p.usableAsOf, null, today)),
              })}
            </Text>
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Button
                  label={t.upcoming.refreshUpdate}
                  onPress={() => router.push('/(app)/money/assets')}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t.upcoming.refreshDismiss}
                  variant="secondary"
                  onPress={() => snooze(addDays(today, SNOOZE_DAYS))}
                />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Toast />
    </View>
  );
}

/**
 * Một khoản sắp phải chuẩn bị.
 *
 * `source` KHÔNG hiện thành nhãn. Ba nguồn trộn làm một là điểm chính của màn
 * này; dán nhãn "khoản trả"/"sự kiện"/"giấy tờ" lên từng dòng là kéo cấu trúc
 * bảng của mình ra cho người dùng đọc.
 */
function NeedRow({ need }: { need: UpcomingNeed }) {
  return (
    <View className="min-h-touch flex-row items-center gap-3 border-b border-line py-3">
      <View className="flex-1">
        <Text numberOfLines={1} className="text-body text-ink">
          {need.title}
        </Text>
        <Text className="mt-0.5 text-caption text-subtle">{shortSolarDate(need.onDate)}</Text>
      </View>
      <MoneyText amount={need.amount} size="body" withSymbol />
    </View>
  );
}
