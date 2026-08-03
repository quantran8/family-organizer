/**
 * Mục tiêu — danh sách, 05 §6.7.
 *
 * P0 từ `08 §2`, đảo ngược quyết định hạ xuống P2 ở `06 §8`. Lý do đảo ngược:
 * mục tiêu NHÌN VỀ PHÍA TRƯỚC — *"Mua nhà: cần 800tr, đang có 320tr"* là một
 * câu về tương lai, không cần giả định đã-ghi-đủ nào. Nó thuộc về mô hình này,
 * khác hẳn phần theo dõi chi tiêu quá khứ đã bị cắt.
 *
 * **Mục tiêu KHÔNG BAO GIỜ được cộng vào con số "cần chuẩn bị"** (08 §2.3):
 * nghĩa vụ khác nguyện vọng. Học phí tháng 9 là thứ PHẢI trả; góp quỹ mua nhà
 * là thứ MUỐN làm. Trộn hai loại vào một con số làm nó mất nghĩa và làm màn hero
 * đáng sợ mà không có lý do.
 *
 * ĐỔI CƠ CHẾ Ở v3 (10 §5): mục tiêu GIỜ CÓ mặt trên màn "Sắp tới", ở một khối
 * riêng dưới nhãn «Mục tiêu — có thể hoãn», để hai người thấy tháng 9 đóng học
 * phí xong thì quỹ du lịch phải chậm lại. Nguyên tắc không đổi, chỉ chỗ ép đổi:
 * từ "view không union goals" sang "projectRunway chỉ cộng kind='mandatory'".
 * CÙNG MÀN HÌNH KHÔNG PHẢI CÙNG MỘT CON SỐ.
 *
 * Mục tiêu vẫn KHÔNG hiện trên Nhà mình: màn chính trả lời "sắp có gì và cần
 * chuẩn bị bao nhiêu", mục tiêu không trả lời câu đó.
 */

import { formatDeclaredAt, type Goal, type ISODate, type UUID } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  MoneyText,
  ProgressBar,
  Toast,
} from '@/design/components';
import { useGoals } from '@/features/goal/queries/use-goals';
import { useMembers } from '@/features/member/queries/use-members';
import { declaredAtText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

/** Dấu ngăn giữa "đã có" và "cần đạt". Không phải câu chữ nên không vào i18n. */
const SEPARATOR = '/';

export function GoalListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: goals, isPending, isError, refetch } = useGoals();
  const { data: members } = useMembers();

  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  if (isPending) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ListSkeleton rows={4} />
      </View>
    );
  }

  if (isError) {
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

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {(goals ?? []).length === 0 ? (
          <View className="mt-6">
            <EmptyState
              title={t.goal.emptyTitle}
              body={t.goal.emptyBody}
              actionLabel={t.goal.formTitle}
              onAction={() => router.push('/(modals)/goal-form')}
            />
          </View>
        ) : (
          (goals ?? []).map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              updatedByName={
                g.updatedByMemberId ? (memberName.get(g.updatedByMemberId) ?? null) : null
              }
              today={today}
              onPress={() => router.push(`/(app)/money/goal/${g.id}`)}
            />
          ))
        )}

        {(goals ?? []).length > 0 ? (
          <View className="mt-8">
            <Button
              label={t.goal.formTitle}
              variant="secondary"
              onPress={() => router.push('/(modals)/goal-form')}
            />
          </View>
        ) : null}
      </ScrollView>

      <Toast />
    </View>
  );
}

/**
 * Một thẻ mục tiêu: tên · thanh tiến độ · đã có/cần đạt · nhãn số khai.
 *
 * KHÔNG có: cần góp bao nhiêu mỗi tháng, còn bao lâu theo tốc độ hiện tại, ai
 * góp bao nhiêu, hay bất kỳ đánh giá nào về tiến độ. App không biết thu nhập và
 * không biết hoàn cảnh; một dòng "bạn đang chậm kế hoạch" với cặp vợ chồng đang
 * chật vật là sự tàn nhẫn được tự động hoá (08 §2.3).
 */
function GoalCard({
  goal,
  updatedByName,
  today,
  onPress,
}: {
  goal: Goal;
  updatedByName: string | null;
  today: ISODate;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={goal.name}
      onPress={onPress}
      className="mt-4 rounded-status border border-line p-4 active:bg-soft"
    >
      <Text numberOfLines={1} className="text-body font-medium text-ink">
        {goal.name}
      </Text>

      <ProgressBar value={goal.currentAmount} total={goal.targetAmount} />

      {/* "đã có / cần đạt" — hai con số cạnh nhau, không phải phần trăm. Phần
          trăm giấu mất quy mô: 80% của 10 triệu và 80% của 800 triệu đọc giống
          hệt nhau, trong khi hai nhà đó đang ở hai tình cảnh rất khác. */}
      <View className="mt-2 flex-row items-center gap-2">
        <MoneyText amount={goal.currentAmount} short withSymbol size="body" />
        <Text className="text-caption text-subtle">{SEPARATOR}</Text>
        <MoneyText amount={goal.targetAmount} short withSymbol size="body" tone="muted" />
      </View>

      {/* Nhãn số khai — BẮT BUỘC, cùng ràng buộc với assets.current_value
          (08 §2.2). `currentAmount` cũng là con số MỘT NGƯỜI đã nói ra. */}
      <Text className="mt-1 text-caption text-subtle">
        {declaredAtText(formatDeclaredAt(goal.asOfDate, updatedByName, today))}
      </Text>
    </Pressable>
  );
}
