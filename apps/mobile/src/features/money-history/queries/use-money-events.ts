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
import { groupHistoryByMonth } from '@family-organizer/domain';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { moneyEventRepository } from '@/features/money-history/repository';
import { useHouseholdId } from '@/stores/session';

const PAGE_SIZE = 30;

/**
 * Timeline chung cho `money/changes.tsx` — màn "Lịch sử biến động".
 *
 * Phân trang theo `occurred_on desc` bằng con trỏ ngày (index
 * `money_events_timeline_idx`), không phải offset — offset trượt khi có event
 * mới ghi vào giữa lúc đang cuộn.
 *
 * **Gộp theo THÁNG, không theo ngày** (05 §6.8). Đổi từ `groupEventsByDay` ở
 * G13: nhóm ngày trả lời "hôm nay có gì mới", nhóm tháng trả lời "tháng trước
 * nhà mình đã ghi những gì" — và câu thứ hai mới là thứ khiến người không giữ
 * tiền cảm thấy nắm tình hình.
 *
 * `MonthlyHistoryGroup` mang theo `count`, và `count` là thứ khiến `total` được
 * phép hiện: "5 khoản nhà mình đã ghi: −12 triệu" trung thực kể cả khi còn mười
 * khoản chưa ghi, còn "tháng 9 chi 12 triệu" thì không (08 §1.3).
 */
export function useMoneyEventTimeline(entityType: MoneyEntityType | undefined) {
  const hh = useHouseholdId();
  return useInfiniteQuery({
    queryKey: queryKeys.moneyEvents.timeline(hh, entityType),
    initialPageParam: undefined as ISODate | undefined,
    queryFn: ({ pageParam }) =>
      moneyEventRepository.timeline(hh, { entityType, limit: PAGE_SIZE, before: pageParam }),
    getNextPageParam: (lastPage: MoneyEvent[]) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.occurredOn,
    // Gộp Ở ĐÂY bằng hàm thuần có test, không phải trong component.
    select: (data) => groupHistoryByMonth(data.pages.flat()),
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
