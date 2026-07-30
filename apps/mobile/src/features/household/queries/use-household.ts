/**
 * Hook đọc dữ liệu Nhà mình.
 *
 * Tầng này là biên giới: UI KHÔNG gọi repository trực tiếp, repository KHÔNG
 * biết TanStack Query (01 §2).
 */

import { addDays, type ISODate } from '@nhaminh/domain';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { householdRepository } from '@/features/household/repository';
import { useHouseholdId } from '@/stores/session';

export function useHousehold() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.household.detail(hh),
    queryFn: () => householdRepository.get(hh),
  });
}

/**
 * Dashboard Nhà mình — MỘT lần fetch cho toàn bộ màn (05 §4).
 *
 * Cửa sổ mặc định: hôm qua → 30 ngày tới. Lùi một ngày là có chủ ý — việc quá
 * hạn hôm qua vẫn phải hiện ở nhóm "Quá hạn", nếu cắt đúng hôm nay thì nó biến
 * mất lúc nửa đêm đúng vào lúc nó bắt đầu quan trọng.
 */
export function useHomeFeed(today: ISODate, daysAhead = 30) {
  const hh = useHouseholdId();
  const from = addDays(today, -1);
  const to = addDays(today, daysAhead);
  return useQuery({
    queryKey: queryKeys.household.homeFeed(hh, from, to),
    queryFn: () => householdRepository.homeFeed(hh, from, to),
  });
}

/**
 * Nguyên liệu thô để tính trạng thái tài chính.
 *
 * View KHÔNG trả trạng thái — `computeFinanceStatus` chạy ở client (03 §1).
 * Giữ nguyên như vậy: quy tắc 4 bậc phải có test, và test nó ở Postgres đắt hơn
 * nhiều so với một hàm thuần trong `packages/domain`.
 */
export function useFinanceMetrics() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.household.financeMetrics(hh),
    queryFn: () => householdRepository.financeMetrics(hh),
  });
}
