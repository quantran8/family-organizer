/**
 * Chi tiết sự kiện — 05 §5.4. **Trung tâm ngữ cảnh của cả app.**
 *
 * Gom bốn thứ quanh một dịp: việc cần chuẩn bị · chi phí · giấy tờ · ba nút tạo
 * bản ghi mới ĐÃ GẮN SẴN `eventId`.
 *
 * Ba nút đó là cách nguyên tắc *"mọi thông tin phải có ngữ cảnh"* được thực thi
 * mà **không bắt người dùng hiểu khái niệm liên kết**. Họ không chọn "gắn việc
 * này vào sự kiện kia" từ một danh sách thả xuống — họ đang đứng trong ngày giỗ
 * và bấm "Thêm việc", thế là xong. Nếu ba nút này mở form trống không mang
 * `eventId`, cả màn hình mất lý do tồn tại.
 *
 * ## Khối NĂM NGOÁI — 06 §5, G14
 *
 * Đây là **lý do người dùng không hủy gói vào năm thứ hai**: một dữ kiện không
 * ai khác giữ hộ được. Trước G14 dòng này được TÍNH ra bằng
 * `previousLunarOccurrence` — nó chỉ nói được *ngày*, và ngày thì cuốn lịch nào
 * cũng có. Giờ nó ĐỌC từ `event_occurrences`, nên nói được cả số tiền.
 *
 * Không hiện gì khi chưa có lần diễn ra nào: `lastYearFor` trả `null` và cả
 * khối biến mất. Một khối trống kèm "chưa có dữ liệu" nói với người dùng năm
 * đầu rằng họ đang thiếu thứ gì đó, trong khi họ không thiếu gì cả.
 */

import {
  formatLunarLabel,
  lastYearFor,
  parseISODate,
  weekdayOf,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import {
  Button,
  Checkbox,
  Divider,
  ErrorState,
  ListSkeleton,
  MoneyText,
  Screen,
  SectionHeader,
} from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useDocumentsByEvent } from '@/features/document/queries/use-documents';
import {
  useDeleteEvent,
  useEvent,
  useEventOccurrences,
} from '@/features/event/queries/use-events';
import { usePaymentsByEvent } from '@/features/payment/queries/use-payments';
import { useSetTaskDone, useTasksByEvent } from '@/features/task/queries/use-tasks';
import { fullSolarDate, moneyText, useT, weekdayName } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function EventDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as UUID;

  const currency = useCurrency();
  const { data: event, isPending, isError, refetch } = useEvent(eventId);
  const { data: occurrences } = useEventOccurrences(eventId);
  const { data: tasks } = useTasksByEvent(eventId);
  const { data: payments } = usePaymentsByEvent(eventId);
  const { data: eventDocs } = useDocumentsByEvent(eventId);
  const setDone = useSetTaskDone();
  const remove = useDeleteEvent();

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (isError || !event) {
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

  const lunar = formatLunarLabel(event);
  const solar = event.nextOccurrenceDate;

  // Lần diễn ra gần nhất TRƯỚC hôm nay — `null` thì cả khối không hiện.
  const lastYear = lastYearFor(event, occurrences ?? [], today);

  const confirmDelete = (): void => {
    Alert.alert(event.title, t.common.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(eventId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text className="pt-2 text-title1 font-semibold text-ink">{event.title}</Text>

      {/* Ngày: dương trước (ngày người ta thật sự đến), âm ngay sau và mang màu
          riêng. Cả hai luôn đi cùng nhau — 05 §5.3. */}
      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        {solar ? (
          <Text className="text-body text-ink">
            {`${weekdayName(weekdayOf(solar))} ${parseISODate(solar).day}/${parseISODate(solar).month}/${parseISODate(solar).year}`}
          </Text>
        ) : (
          <Text className="text-body text-subtle">{t.event.pendingDate}</Text>
        )}
        {lunar ? (
          <Text className="text-body font-medium text-ink">
            {`${lunar.lunarDay}/${lunar.lunarMonth}${lunar.isLeapMonth ? ' nhuận' : ''} ${t.event.lunarSuffix}`}
          </Text>
        ) : null}
      </View>

      <View className="mt-1 flex-row flex-wrap items-center gap-2">
        <Text className="text-caption text-subtle">
          {[event.side ? t.familySide[event.side] : null, event.location]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {event.notes ? (
        <Text className="mt-4 text-body text-muted">{event.notes}</Text>
      ) : null}

      {/* ── NĂM NGOÁI ── Đứng TRƯỚC "việc cần chuẩn bị" có chủ ý: người mở màn
          này để chuẩn bị cho dịp sắp tới, và câu hỏi đầu tiên trong đầu họ là
          "lần trước hết bao nhiêu". Đặt nó dưới danh sách việc là chôn đúng
          thứ khiến màn hình này đáng nhớ. */}
      {lastYear ? (
        <View>
          <SectionHeader title={t.event.sectionLastYear} />
          <Text className="text-body text-ink">
            {lastYear.actualCost === null
              ? f(t.event.lastYearNoCost, { date: fullSolarDate(lastYear.occurredOn) })
              : f(t.event.lastYearWithCost, {
                  date: fullSolarDate(lastYear.occurredOn),
                  amount: moneyText(lastYear.actualCost, currency),
                })}
          </Text>
        </View>
      ) : null}

      {/* ── VIỆC CẦN CHUẨN BỊ ── */}
      <SectionHeader title={t.event.sectionTasks} />
      {(tasks ?? []).length === 0 ? (
        <Text className="text-body text-subtle">{t.event.noneYet}</Text>
      ) : (
        (tasks ?? []).map((task, i) => (
          <View key={task.id}>
            {i > 0 ? <Divider /> : null}
            <View className="min-h-touch flex-row items-center gap-3 py-3">
              <Checkbox
                checked={task.status === 'done'}
                onToggle={(next) => setDone.mutate({ id: task.id, done: next })}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={task.title}
                onPress={() => router.push(`/(app)/plan/task/${task.id}`)}
                className="flex-1"
              >
                <Text
                  className={`text-body ${task.status === 'done' ? 'text-subtle line-through' : 'text-ink'}`}
                >
                  {task.title}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      {/* ── CHI PHÍ ── */}
      <SectionHeader title={t.event.sectionCosts} />
      {(payments ?? []).length === 0 ? (
        <Text className="text-body text-subtle">{t.event.noneYet}</Text>
      ) : (
        (payments ?? []).map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Divider /> : null}
            <View className="min-h-touch flex-row items-center justify-between gap-3 py-3">
              <Text className="flex-1 text-body text-ink">{p.name}</Text>
              <MoneyText amount={p.amount} size="body" />
            </View>
          </View>
        ))
      )}

      {/* ── GIẤY TỜ ── Mục này có mặt từ G6 (khi đó còn rỗng) để cấu trúc màn
          hình ổn định; G8 điền nội dung thật vào. */}
      <SectionHeader title={t.event.sectionDocs} />
      {(eventDocs ?? []).length === 0 ? (
        <Text className="text-body text-subtle">{t.event.noneYet}</Text>
      ) : (
        (eventDocs ?? []).map((d) => (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityLabel={d.title}
            onPress={() => router.push({ pathname: '/(app)/docs/[id]', params: { id: d.id } })}
            className="min-h-touch flex-row items-center gap-3 border-b border-line py-3 active:bg-soft"
          >
            <Text numberOfLines={1} className="flex-1 text-body text-ink">
              {d.title}
            </Text>
            <Text className="text-body text-subtle">›</Text>
          </Pressable>
        ))
      )}

      {/*
        Ba nút tạo bản ghi ĐÃ GẮN SẴN eventId.
        "Thêm việc" từ G6, "Thêm khoản" mở khoá ở G7 cùng form khoản sắp trả,
        "Gắn giấy tờ" mở khoá ở G8 cùng form giấy tờ.
      */}
      <View className="mt-8 gap-3">
        <Button
          label={t.event.addTask}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/(modals)/task-form', params: { eventId } })
          }
        />
        <Button
          label={t.event.addPayment}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/(modals)/payment-form', params: { eventId } })
          }
        />
        <Button
          label={t.event.attachDoc}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/(modals)/doc-form', params: { eventId } })
          }
        />
      </View>

      <View className="mt-10">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>

      <View className="h-8" />
    </Screen>
  );
}
