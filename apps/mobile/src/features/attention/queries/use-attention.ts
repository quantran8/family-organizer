/**
 * Hook Cờ "cần trao đổi".
 *
 * Gắn/gỡ cờ là optimistic BẮT BUỘC (01 §3). Đây là thao tác mang cảm xúc: người
 * dùng vừa quyết định hỏi bạn đời một câu khó. Một spinner ở đúng khoảnh khắc
 * đó biến cử chỉ thành thủ tục.
 */

import type { AttentionItem, EntityType, UUID } from '@family-organizer/domain';
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
 * Cờ đang mở KÈM tên khoản — cho màn danh sách đầy đủ (G9).
 *
 * Key riêng chứ không dùng chung với `useOpenAttention`: hai hook trả về hai
 * hình dạng khác nhau cho cùng một key sẽ để màn Tiền đọc trúng cache của màn
 * Cần trao đổi (hoặc ngược lại), và bên thiếu `entityName` render ra dòng trống.
 *
 * Màn Tiền cố ý KHÔNG đổi sang hook này: nó chỉ hiện một dòng tóm tắt, và bắt
 * nó chờ thêm sáu câu truy vấn tên là làm chậm màn hình mở nhiều nhất trong app.
 */
export function useOpenAttentionWithEntities() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.attention.openWithEntities(hh),
    queryFn: () => attentionRepository.listOpenWithEntities(hh),
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

    /**
     * Gỡ khỏi CẢ HAI danh sách.
     *
     * `open` (màn Tiền) và `openWithEntities` (màn Cần trao đổi) là hai key
     * riêng cho cùng một tập cờ. Chỉ patch một cái thì người dùng bấm "Đã rõ" ở
     * màn này, quay sang màn kia và thấy cờ vẫn nằm đó — thao tác trông như
     * không ăn, và họ sẽ bấm lại.
     */
    onMutate: async ({ id }) => {
      const keys = [
        queryKeys.attention.open(hh),
        queryKeys.attention.openWithEntities(hh),
      ] as const;

      const snapshots: { key: readonly unknown[]; prev: AttentionItem[] | undefined }[] = [];
      for (const key of keys) {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData<AttentionItem[]>(key);
        snapshots.push({ key, prev });
        if (prev) qc.setQueryData<AttentionItem[]>(key, prev.filter((a) => a.id !== id));
      }
      return { snapshots };
    },

    onError: (_e, _vars, ctx) => {
      for (const s of ctx?.snapshots ?? []) {
        if (s.prev) qc.setQueryData(s.key, s.prev);
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.attention.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}
