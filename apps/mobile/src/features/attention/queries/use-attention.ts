/**
 * Hook Cờ "cần trao đổi".
 *
 * Gắn/gỡ cờ là optimistic BẮT BUỘC (01 §3). Đây là thao tác mang cảm xúc: người
 * dùng vừa quyết định hỏi bạn đời một câu khó. Một spinner ở đúng khoảnh khắc
 * đó biến cử chỉ thành thủ tục.
 */

import type { AttentionItem, EntityType, UUID } from '@nhaminh/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHomeFeed } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import { attentionRepository } from '@/features/attention/repository';
import { useHouseholdId } from '@/stores/session';

export function useOpenAttention() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.attention.open(hh),
    queryFn: () => attentionRepository.listOpen(hh),
  });
}

/**
 * Gắn cờ. Trùng → DB trả `conflict` (partial unique index
 * `attention_one_open_per_entity`); UI hiện cờ đang có thay vì báo lỗi — hai
 * người cùng thấy một khoản lạ và cùng gắn cờ là chuyện bình thường, không phải
 * sự cố.
 */
export function useFlagAttention() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { entityType: EntityType; entityId: UUID; note?: string }) =>
      attentionRepository.flag(hh, v.entityType, v.entityId, v.note),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.attention.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}

/**
 * `[Đã rõ]` — OPTIMISTIC. Gỡ dòng khỏi danh sách ngay.
 *
 * KHÔNG có luồng bình luận (schema §5.6): app không thay thế việc hai người nói
 * chuyện. `resolutionNote` là một dòng kết luận ngắn, không phải một cuộc trao
 * đổi.
 */
export function useResolveAttention() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: UUID; resolutionNote?: string }) =>
      attentionRepository.resolve(hh, v.id, v.resolutionNote),

    onMutate: async ({ id }) => {
      const key = queryKeys.attention.open(hh);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttentionItem[]>(key);
      if (prev) qc.setQueryData<AttentionItem[]>(key, prev.filter((a) => a.id !== id));
      return { prev, key };
    },

    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.attention.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}
