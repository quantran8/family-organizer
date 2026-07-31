/**
 * Cần trao đổi — 05 §6.7.
 *
 * Danh sách cờ đang mở, mỗi mục dẫn tới khoản liên quan.
 *
 * ── **KHÔNG có luồng bình luận** ──
 *
 * Đây là lõi cảm xúc của cả sản phẩm, và cũng là chỗ dễ trượt nhất. Cờ này tồn
 * tại để **hỏi mà không buộc tội**: nó nói *"khoản này cần hai người cùng xem"*,
 * không nói *"anh giải thích đi"*. Thêm một ô trả lời vào đây là biến nó thành
 * một cuộc tra hỏi bất đối xứng có lưu vết — người bị hỏi phải viết ra lý do,
 * còn người hỏi thì không. App không thay thế việc hai người nói chuyện; nó chỉ
 * đưa được câu hỏi ra bàn.
 *
 * Đóng cờ bằng `[Đã rõ]`, kèm một dòng kết luận **tuỳ chọn**. Một dòng, không
 * phải một cuộc trao đổi.
 *
 * ── Cờ tự hết hiệu lực sau 14 ngày ──
 *
 * Không có nút nào cần bấm để điều đó xảy ra: `expires_at` do DB đặt lúc gắn cờ,
 * `listOpen` lọc theo nó, và cron `expire-attention-items` đóng hẳn. Nếu cờ nằm
 * mãi thì trạng thái tài chính mắc kẹt ở "Cần chú ý" vĩnh viễn, và một cảnh báo
 * không bao giờ tắt là một cảnh báo không ai đọc nữa.
 *
 * Dòng "Tự hết hiệu lực sau N ngày" nói ra điều đó ngay trên mỗi cờ — người
 * gắn cờ cần biết mình không tạo ra một món nợ tinh thần vĩnh viễn cho người kia.
 */

import { daysBetween } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import {
  Button,
  Divider,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Screen,
  Toast,
} from '@/design/components';
import {
  useOpenAttentionWithEntities,
  useResolveAttention,
} from '@/features/attention/queries/use-attention';
import type { AttentionItemWithEntity } from '@/features/attention/repository';
import { fullSolarDate, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

export function AttentionListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: items, isPending, isError, refetch } = useOpenAttentionWithEntities();
  const resolve = useResolveAttention();

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={3} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const rows = items ?? [];

  if (rows.length === 0) {
    return (
      <Screen>
        <EmptyState title={t.attention.emptyTitle} body={t.attention.emptyBody} />
      </Screen>
    );
  }

  /**
   * `[Đã rõ]` — hỏi xác nhận, KHÔNG hỏi kết luận.
   *
   * `resolutionNote` là tuỳ chọn ở tầng dữ liệu và nó ở lại tuỳ chọn ở đây: bắt
   * gõ một câu trước khi đóng cờ là dựng lại đúng thứ "không có luồng bình
   * luận" vừa tránh. Hai người đã nói chuyện xong rồi mới bấm nút này.
   */
  const confirmResolve = (item: AttentionItemWithEntity): void => {
    Alert.alert(item.entityName ?? t.attention.title, t.attention.resolveTitle, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.attention.resolve,
        onPress: () =>
          resolve.mutate(
            { id: item.id },
            { onSuccess: () => showToast(t.attention.resolved) },
          ),
      },
    ]);
  };

  /** Khoản đã bị xoá thì không dẫn đi đâu — nhưng cờ vẫn đóng được. */
  const openEntity = (item: AttentionItemWithEntity): void => {
    if (item.entityName === null) return;
    switch (item.entityType) {
      case 'asset':
        router.push({ pathname: '/(app)/money/asset/[id]', params: { id: item.entityId } });
        return;
      case 'debt':
        router.push({ pathname: '/(app)/money/debt/[id]', params: { id: item.entityId } });
        return;
      case 'upcoming_payment':
        router.push({ pathname: '/(app)/money/payment/[id]', params: { id: item.entityId } });
        return;
      case 'task':
        router.push({ pathname: '/(app)/plan/task/[id]', params: { id: item.entityId } });
        return;
      case 'event':
        router.push({ pathname: '/(app)/plan/event/[id]', params: { id: item.entityId } });
        return;
      case 'document':
        router.push({ pathname: '/(app)/docs/[id]', params: { id: item.entityId } });
        return;
      // `goal` chưa có màn chi tiết (05 §6.6 là P1). Không điều hướng còn hơn
      // đẩy sang một route không tồn tại.
      case 'goal':
        return;
    }
  };

  return (
    <Screen scroll>
      {rows.map((item, i) => (
        <View key={item.id}>
          {i > 0 ? <Divider /> : null}
          <AttentionRow
            item={item}
            daysLeft={Math.max(0, daysBetween(today, item.expiresAt.slice(0, 10)))}
            onOpen={() => openEntity(item)}
            onResolve={() => confirmResolve(item)}
            resolving={resolve.isPending}
          />
        </View>
      ))}

      <View className="h-8" />
      <Toast />
    </Screen>
  );
}

/**
 * Một cờ.
 *
 * Ghi chú của người gắn là dòng CHÍNH, không phải dòng phụ: đó là câu họ muốn
 * hỏi, và tên khoản chỉ là ngữ cảnh. Không có ghi chú thì tên khoản lên làm
 * dòng chính — gắn cờ không kèm chữ là một hành động hợp lệ và rất hay gặp.
 */
function AttentionRow({
  item,
  daysLeft,
  onOpen,
  onResolve,
  resolving,
}: {
  item: AttentionItemWithEntity;
  daysLeft: number;
  onOpen: () => void;
  onResolve: () => void;
  resolving: boolean;
}) {
  const { t, f } = useT();

  const gone = item.entityName === null;
  const headline = item.note ?? item.entityName ?? t.attention.title;

  return (
    <View className="py-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={headline}
        onPress={onOpen}
        disabled={gone}
        className="min-h-touch flex-row items-start gap-3 active:bg-soft"
      >
        {/* Dấu ▸ màu `attention` — nhận diện nhanh khi lướt. Trạng thái vẫn nói
            bằng CHỮ ở dòng dưới (design.md §19: không dùng riêng màu). */}
        <Text className="mt-0.5 text-body text-attention">▸</Text>

        <View className="flex-1">
          <Text className="text-body text-ink">{headline}</Text>

          <Text className="mt-0.5 text-caption text-subtle">
            {gone
              ? t.attention.entityGone
              : item.note
                ? `${item.entityName} · ${f(t.attention.flaggedOn, { date: fullSolarDate(item.createdAt.slice(0, 10)) })}`
                : f(t.attention.flaggedOn, {
                    date: fullSolarDate(item.createdAt.slice(0, 10)),
                  })}
          </Text>

          <Text className="mt-0.5 text-micro text-subtle">
            {f(t.attention.expiresIn, { days: daysLeft })}
          </Text>
        </View>

        {!gone ? <Text className="text-body text-subtle">›</Text> : null}
      </Pressable>

      <View className="mt-3">
        <Button
          label={t.attention.resolve}
          variant="secondary"
          fullWidth={false}
          loading={resolving}
          onPress={onResolve}
        />
      </View>
    </View>
  );
}
