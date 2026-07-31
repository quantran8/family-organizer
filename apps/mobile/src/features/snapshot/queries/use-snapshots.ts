/**
 * Hook Ảnh chụp tổng — vòng lặp thói quen của app.
 */

import type { MoneySnapshot } from '@family-organizer/domain';
import { withDiffs } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateFinance } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import { snapshotRepository, type SnapshotInput } from '@/features/snapshot/repository';
import { useHouseholdId } from '@/stores/session';

/** Điền sẵn 4 ô của nghi thức cập nhật bằng giá trị lần trước (05 §6.2). */
export function useLatestSnapshot() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.snapshots.latest(hh),
    queryFn: () => snapshotRepository.latest(hh),
  });
}

/**
 * Lịch sử cho `money/history.tsx`.
 *
 * Chênh lệch tính Ở ĐÂY bằng hàm thuần `withDiffs`, không phải view mới và
 * không phải cột mới. Mốc đầu tiên có `diff === null` — "chưa biết" khác
 * "không đổi", nên màn hình phải bỏ trống cột chênh lệch chứ không hiện `+0`.
 */
export function useSnapshotHistory(limit = 24) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.snapshots.history(hh),
    queryFn: () => snapshotRepository.history(hh, limit),
    // `history()` trả mới → cũ; `withDiffs` so mỗi mốc với mốc LIỀN TRƯỚC nó.
    select: (rows: MoneySnapshot[]) => withDiffs(rows),
  });
}

/**
 * Ghi một mốc mới.
 *
 * KHÔNG optimistic: đây là 4 con số người dùng vừa gõ tay và sẽ nhìn lại ngay
 * để kiểm. Hiện trước rồi rollback là cách chắc chắn nhất để họ nghi ngờ mình
 * gõ sai.
 *
 * Ghi `money_snapshots`, KHÔNG ghi đè từng `assets` (05 §6.2) — đây là ảnh chụp
 * cả nhà tại một thời điểm, không phải lệnh sửa từng khoản.
 */
export function useCreateSnapshot() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SnapshotInput) => snapshotRepository.create(hh, input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}
