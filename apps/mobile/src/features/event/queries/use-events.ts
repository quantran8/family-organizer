/**
 * Hook đọc/ghi Sự kiện gia đình.
 */

import type { UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHomeFeed } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import { eventRepository, type EventInput } from '@/features/event/repository';
import { useHouseholdId } from '@/stores/session';

export function useEvents() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.events.list(hh),
    queryFn: () => eventRepository.list(hh),
  });
}

/**
 * Một sự kiện.
 *
 * `enabled`: form Sự kiện dùng chung cho thêm-mới và sửa, và ở chế độ thêm mới
 * thì không có id. Luật hook cấm gọi có điều kiện, nên hook vẫn được gọi và
 * `enabled` là chỗ chặn — thiếu nó thì mỗi lần mở form thêm mới sẽ bắn một
 * truy vấn `id = null` chắc chắn hỏng.
 */
export function useEvent(id: UUID | null) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.events.detail(hh, id as UUID),
    queryFn: () => eventRepository.get(hh, id as UUID),
    enabled: id !== null,
  });
}

/**
 * Tạo/sửa sự kiện.
 *
 * `nextOccurrenceDate` KHÔNG có trong `EventInput` — nó là cache do Edge
 * `refresh-lunar-dates` ghi, và đó là **nơi duy nhất** (ràng buộc #2). Nghĩa là
 * ngay sau khi lưu một sự kiện âm lịch, `next_occurrence_date` còn cũ cho tới
 * khi Edge chạy. Màn hình form phải hiện dòng xem trước tính ở CLIENT bằng
 * `nextLunarOccurrence` để người dùng thấy ngay ngày dương — nhưng dòng đó chỉ
 * để xem, không bao giờ được ghi xuống DB.
 */
export function useCreateEvent() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) => eventRepository.create(hh, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.events.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}

export function useUpdateEvent() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<EventInput> }) =>
      eventRepository.update(hh, id, patch),
    onSuccess: (event) => {
      qc.setQueryData(queryKeys.events.detail(hh, event.id), event);
      void qc.invalidateQueries({ queryKey: queryKeys.events.list(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}

export function useDeleteEvent() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => eventRepository.softDelete(hh, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.events.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}

/**
 * Trí nhớ năm ngoái — 06 §5.
 *
 * `LIMIT` nhỏ có chủ ý: màn chi tiết chỉ hiện MỘT dòng (lần gần nhất), và form
 * chỉ cần một số để điền sẵn. Lấy nhiều hơn là dựng sẵn nguyên liệu cho một
 * biểu đồ chi phí theo năm — thứ `ràng buộc #5` cấm vẽ.
 */
export function useEventOccurrences(eventId: UUID, limit = 3) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.events.occurrences(hh, eventId),
    queryFn: () => eventRepository.occurrences(hh, eventId, limit),
  });
}

/**
 * Dịp đã qua còn chờ câu hỏi chi phí — nguồn của sheet ở `05 §5.7`.
 *
 * `staleTime: Infinity` + không refetch nền: dữ liệu này chỉ đổi khi cron đêm
 * chạy hoặc khi chính người dùng vừa trả lời. Một refetch giữa chừng trả về
 * một dịp khác sẽ làm sheet đang mở đổi nội dung dưới tay người dùng — họ gõ
 * số cho giỗ ông ngoại rồi bấm Lưu vào một sự kiện khác.
 */
export function usePendingCostAsk() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.events.pendingCostAsk(hh),
    queryFn: () => eventRepository.pendingCostAsk(hh),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Ghi chi phí thực tế, hoặc bỏ qua (`amount === null`).
 *
 * KHÔNG optimistic: đây là một form có nút, thuộc nhóm "chờ được" (01 §3). Bù
 * lại, cache của câu hỏi được đặt về `null` NGAY khi thành công thay vì chờ
 * refetch — nếu không, người dùng đóng sheet rồi thấy nó bật lại lần nữa.
 */
export function useRecordActualCost() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ occurrenceId, amount }: { occurrenceId: UUID; amount: number | null }) =>
      eventRepository.recordActualCost(hh, occurrenceId, amount),
    onSuccess: () => {
      qc.setQueryData(queryKeys.events.pendingCostAsk(hh), null);
      // Khối NĂM NGOÁI ở màn chi tiết vừa có số mới. Không biết eventId ở đây
      // nên quét cả nhánh `events` — rẻ, và chỉ xảy ra vài lần một năm.
      void qc.invalidateQueries({ queryKey: queryKeys.events.all(hh) });
    },
  });
}
