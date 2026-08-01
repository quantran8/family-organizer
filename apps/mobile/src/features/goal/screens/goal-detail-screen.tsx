/**
 * Chi tiết mục tiêu — 05 §6.7.
 *
 * ── BA CON SỐ, VÀ CHỈ BA ──
 *
 * Đã có · Cần đạt · Còn thiếu. Màn này CỐ Ý không có:
 *
 *   - "mỗi tháng cần góp bao nhiêu"
 *   - "còn bao lâu theo tốc độ hiện tại"
 *   - "bạn đang chậm so với kế hoạch"
 *   - ai góp bao nhiêu
 *
 * Ba cái đầu cần biết thu nhập và hoàn cảnh, mà app không biết cả hai; một dòng
 * kiểu đó với cặp vợ chồng đang chật vật là sự tàn nhẫn được tự động hoá. Cái
 * cuối là bảng điểm ở dạng dễ chấp nhận nhất — và cũng nguy hiểm nhất, vì nó
 * trông như minh bạch (08 §2.3, ràng buộc #1).
 *
 * Lịch sử các lần góp hiện TỪNG DÒNG có tên người ("Anh cập nhật") — đó là ngữ
 * cảnh ở cấp một bản ghi, trả lời "ai khai con số này". Nó không bao giờ được
 * gộp lại thành tổng theo người.
 *
 * Nút "Góp thêm" đi qua RPC `contribute_to_goal`, KHÔNG qua `update()`: ba lệnh
 * ghi (goals.current_amount + as_of_date/updated_by + money_events) phải nằm
 * trong một transaction. Xem chú thích `GoalPatch` ở repository.
 */

import { describeMoneyEvent, formatDeclaredAt, type UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Text, View } from 'react-native';

import {
  Button,
  Divider,
  ErrorState,
  ListSkeleton,
  MoneyText,
  ProgressBar,
  Screen,
  SectionHeader,
  Toast,
} from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useDeleteGoal, useGoal } from '@/features/goal/queries/use-goals';
import { useMembers } from '@/features/member/queries/use-members';
import { useEntityMoneyEvents } from '@/features/money-history/queries/use-money-events';
import { declaredAtText, deltaText, fullSolarDate, moneyEventText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function GoalDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const currency = useCurrency();

  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = id as UUID;

  const { data: goal, isPending, isError, refetch } = useGoal(goalId);
  const { data: members } = useMembers();
  const { data: events } = useEntityMoneyEvents('goal', goalId);
  const remove = useDeleteGoal();

  const updatedBy = useMemo(() => {
    if (!goal?.updatedByMemberId) return null;
    return (members ?? []).find((m) => m.id === goal.updatedByMemberId)?.displayName ?? null;
  }, [goal?.updatedByMemberId, members]);

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }

  if (isError || !goal) {
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

  // Còn thiếu — kẹp ở 0. Góp vượt mục tiêu là chuyện tốt, và một con số âm ở
  // dòng "Còn thiếu" đọc như một lỗi.
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const confirmDelete = (): void => {
    Alert.alert(goal.name, t.goal.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(goalId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text className="pt-2 text-title1 font-semibold text-ink">{goal.name}</Text>

      <View className="mt-3">
        <ProgressBar value={goal.currentAmount} total={goal.targetAmount} />
      </View>

      {/* ── BA CON SỐ ── xem chú thích đầu file trước khi thêm dòng thứ tư. */}
      <View className="mt-4 rounded-status border border-line">
        <NumberRow label={t.goal.labelHave} amount={goal.currentAmount} />
        <Divider />
        <NumberRow label={t.goal.labelTarget} amount={goal.targetAmount} muted />
        <Divider />
        {remaining === 0 ? (
          <View className="min-h-touch flex-row items-center px-4 py-3">
            <Text className="flex-1 text-body text-ink">{t.goal.labelRemaining}</Text>
            <Text className="text-body font-medium text-positive">{t.goal.reached}</Text>
          </View>
        ) : (
          <NumberRow label={t.goal.labelRemaining} amount={remaining} />
        )}
      </View>

      {/* Nhãn số khai — BẮT BUỘC (08 §2.2). Ở màn chi tiết thì có tên người,
          khác dòng tóm tắt trên tab Tiền vốn dùng biến thể ẩn danh. */}
      <Text className="mt-2 text-caption text-subtle">
        {declaredAtText(formatDeclaredAt(goal.asOfDate, updatedBy, today))}
      </Text>

      <View className="mt-6">
        <Button
          label={t.goal.contribute}
          onPress={() => router.push(`/(modals)/contribute?id=${goalId}`)}
        />
      </View>

      <View className="mt-3">
        <Button
          label={t.common.edit}
          variant="secondary"
          onPress={() => router.push(`/(modals)/goal-form?id=${goalId}`)}
        />
      </View>

      {/* ── CÁC LẦN GÓP ──
          Chỉ đọc. `money_events` append-only — không nút nào ở đây sửa hay xoá
          một lần góp; ghi sai thì góp bù bằng thao tác bình thường. */}
      <View className="mt-8">
        <SectionHeader title={t.goal.history} />
        {(events ?? []).length === 0 ? (
          <Text className="py-3 text-body text-subtle">{t.event.noneYet}</Text>
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
                        // Ngữ cảnh cấp DÒNG: "ai khai con số này". Không bao giờ
                        // được gộp thành "anh góp X, em góp Y" (08 §2.3).
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
      </View>

      <View className="mt-8">
        <Button label={t.goal.delete} variant="secondary" onPress={confirmDelete} />
      </View>

      <Toast />
    </Screen>
  );
}

/** Một trong ba con số. Số ĐẦY ĐỦ — đây là màn chi tiết, từng đồng có nghĩa. */
function NumberRow({
  label,
  amount,
  muted = false,
}: {
  label: string;
  amount: number;
  muted?: boolean;
}) {
  return (
    <View className="min-h-touch flex-row items-center gap-3 px-4 py-3">
      <Text className="flex-1 text-body text-ink">{label}</Text>
      <MoneyText amount={amount} size="heading" tone={muted ? 'muted' : 'default'} />
    </View>
  );
}
