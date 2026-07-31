/**
 * Hook Lịch sử từng khoản — CHỈ ĐỌC.
 *
 * Không có mutation nào ở đây, và đó là điều cố ý: `money_events` append-only,
 * DB có trigger chặn update/delete. Sửa sai bằng cách ghi event bù qua thao tác
 * bình thường (cập nhật lại giá trị), không phải bằng cách xoá lịch sử.
 *
 * RÀNG BUỘC #1 áp ở đây rõ hơn bất cứ chỗ nào khác trong app: KHÔNG có bộ lọc
 * theo người, không có hàm đếm theo người, không có key nào chứa
 * `actorProfileId`. `money_events.actor_profile_id` chỉ hiện ở cấp TỪNG DÒNG
 * như một mẩu ngữ cảnh ("Chồng cập nhật"), không bao giờ là một chiều để gộp.
 */

import type { ISODate, MoneyEntityType, MoneyEvent, UUID } from '@family-organizer/domain';
import { groupEventsByDay } from '@family-organizer/domain';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { moneyEventRepository } from '@/features/money-history/repository';
import { useHouseholdId } from '@/stores/session';

const PAGE_SIZE = 30;

/**
 * Timeline chung cho `money/changes.tsx`.
 *
 * Phân trang theo `occurred_on desc` bằng con trỏ ngày (index
 * `money_events_timeline_idx`), không phải offset — offset trượt khi có event
 * mới ghi vào giữa lúc đang cuộn.
 */
export function useMoneyEventTimeline(entityType: MoneyEntityType | undefined, today: ISODate) {
  const hh = useHouseholdId();
  return useInfiniteQuery({
    queryKey: queryKeys.moneyEvents.timeline(hh, entityType),
    initialPageParam: undefined as ISODate | undefined,
    queryFn: ({ pageParam }) =>
      moneyEventRepository.timeline(hh, { entityType, limit: PAGE_SIZE, before: pageParam }),
    getNextPageParam: (lastPage: MoneyEvent[]) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.occurredOn,
    // Gộp theo ngày Ở ĐÂY bằng hàm thuần có test, không phải trong component.
    select: (data) => groupEventsByDay(data.pages.flat(), today),
  });
}

/**
 * Mục "Thay đổi gần nhất" ở cuối màn chi tiết một khoản.
 *
 * Đây là chỗ trả lời câu "sổ tiết kiệm tháng trước bao nhiêu" ngay tại nơi
 * người dùng đang đứng, không bắt họ đi tìm.
 */
export function useEntityMoneyEvents(entityType: MoneyEntityType, entityId: UUID, limit = 5) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.moneyEvents.forEntity(hh, entityType, entityId),
    queryFn: () => moneyEventRepository.forEntity(hh, entityType, entityId, limit),
  });
}
