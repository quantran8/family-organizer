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
 * Lặp hằng năm hiện dòng "Năm ngoái: 6/10/2025" — tính bằng
 * `previousLunarOccurrence`, chỉ để đọc, không ghi xuống đâu cả.
 */

import {
  formatLunarLabel,
  parseISODate,
  previousLunarOccurrence,
  weekdayOf,
  type UUID,
} from '@nhaminh/domain';
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
import { useDeleteEvent, useEvent } from '@/features/event/queries/use-events';
import { usePaymentsByEvent } from '@/features/payment/queries/use-payments';
import { useSetTaskDone, useTasksByEvent } from '@/features/task/queries/use-tasks';
import { fullSolarDate, useT, weekdayName } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function EventDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as UUID;

  const { data: event, isPending, isError, refetch } = useEvent(eventId);
  const { data: tasks } = useTasksByEvent(eventId);
  const { data: payments } = usePaymentsByEvent(eventId);
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

  // "Năm ngoái: 6/10/2025" — chỉ có nghĩa với sự kiện âm lịch lặp hằng năm.
  const lastYear =
    event.calendar === 'lunar' && event.lunarDay !== null && event.lunarMonth !== null
      ? previousLunarOccurrence(
          {
            day: event.lunarDay,
            month: event.lunarMonth,
            isLeapMonth: event.lunarLeapMonth,
          },
          today,
        )
      : null;

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
          <Text className="text-body text-tertiary">{t.event.pendingDate}</Text>
        )}
        {lunar ? (
          <Text className="text-body font-medium text-event">
            {`${lunar.lunarDay}/${lunar.lunarMonth}${lunar.isLeapMonth ? ' nhuận' : ''} ${t.event.lunarSuffix}`}
          </Text>
        ) : null}
      </View>

      <View className="mt-1 flex-row flex-wrap items-center gap-2">
        <Text className="text-caption text-tertiary">
          {[event.side ? t.familySide[event.side] : null, event.location]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {lastYear ? (
        <Text className="mt-1 text-caption text-tertiary">
          {f(t.event.lastYear, { date: fullSolarDate(lastYear) })}
        </Text>
      ) : null}

      {event.notes ? (
        <Text className="mt-4 text-body text-muted">{event.notes}</Text>
      ) : null}

      {/* ── VIỆC CẦN CHUẨN BỊ ── */}
      <SectionHeader title={t.event.sectionTasks} />
      {(tasks ?? []).length === 0 ? (
        <Text className="text-body text-tertiary">{t.event.noneYet}</Text>
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
                  className={`text-body ${task.status === 'done' ? 'text-tertiary line-through' : 'text-ink'}`}
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
        <Text className="text-body text-tertiary">{t.event.noneYet}</Text>
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

      {/* ── GIẤY TỜ ──
          Danh sách giấy tờ gắn sự kiện lên ở G8 cùng tầng upload. Mục vẫn có
          mặt để cấu trúc màn hình ổn định — người dùng học được "sự kiện gom cả
          giấy tờ" ngay từ bây giờ, không phải học lại khi G8 xong. */}
      <SectionHeader title={t.event.sectionDocs} />
      <Text className="text-body text-tertiary">{t.event.noneYet}</Text>

      {/*
        Ba nút tạo bản ghi ĐÃ GẮN SẴN eventId.
        "Thêm việc" từ G6, "Thêm khoản" mở khoá ở G7 cùng form khoản sắp trả.
        "Gắn giấy tờ" còn tắt, chờ tầng upload ở G8: giấu nó rồi thêm lại sau sẽ
        đổi hình dạng màn hình mà người dùng đã quen.
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
        <Button label={t.event.attachDoc} variant="secondary" disabled />
      </View>

      <View className="mt-10">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>

      <View className="h-8" />
    </Screen>
  );
}
