/**
 * Hook đọc dữ liệu Nhà mình.
 *
 * Tầng này là biên giới: UI KHÔNG gọi repository trực tiếp, repository KHÔNG
 * biết TanStack Query (01 §2).
 */

import { addDays, RUNWAY_HORIZON_DAYS, type ISODate } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { householdRepository, type HouseholdPatch } from '@/features/household/repository';
import { useHouseholdId, useSessionStore } from '@/stores/session';

export function useHousehold() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.household.detail(hh),
    queryFn: () => householdRepository.get(hh),
  });
}

/**
 * Đổi tên nhà / ngưỡng ghi.
 *
 * KHÔNG optimistic: đây là thao tác hiếm và không nằm trên đường đi hằng ngày,
 * nên một vòng round-trip ở đây không ai thấy phiền — trong khi hiện tên mới rồi
 * lại giật về tên cũ thì có.
 *
 * Đồng bộ lại `stores/session` vì tên nhà hiện ở header màn Nhà mình, đọc từ
 * store chứ không từ query. Quên bước này thì đổi tên xong header vẫn tên cũ
 * cho tới lần mở app sau.
 */
export function useUpdateHousehold() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: HouseholdPatch) => householdRepository.update(hh, patch),
    onSuccess: (household) => {
      qc.setQueryData(queryKeys.household.detail(hh), household);
      void qc.invalidateQueries({ queryKey: ['my-households'] });
      const { memberId, currency } = useSessionStore.getState();
      useSessionStore.getState().setHousehold({
        id: hh,
        name: household.name,
        memberId,
        ...(currency ? { currency } : {}),
      });
    },
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

/**
 * Ba nguồn tiền sắp phải chuẩn bị, gộp làm một (06 §3).
 *
 * Đi CẶP với `useFinanceMetrics`: `computeFinanceStatus` cần cả hai, vì con số
 * "cần chuẩn bị trong 30 ngày" phải gồm chi phí sự kiện và phí gia hạn giấy tờ
 * chứ không chỉ khoản sắp trả (06 §0.2 — lỗi đã có từ 0001).
 *
 * Cửa sổ mặc định 90 ngày = `RUNWAY_HORIZON_DAYS`, để màn hình "Sắp tới" và
 * trạng thái trên Nhà mình đọc cùng một cache thay vì bắn hai truy vấn lệch
 * nhau vài ngày.
 */
export function useUpcomingNeeds(today: ISODate, horizonDays = RUNWAY_HORIZON_DAYS) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.household.upcomingNeeds(hh, today, horizonDays),
    queryFn: () => householdRepository.upcomingNeeds(hh, today, horizonDays),
  });
}
