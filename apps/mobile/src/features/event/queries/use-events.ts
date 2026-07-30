/**
 * Hook đọc/ghi Sự kiện gia đình.
 */

import type { UUID } from '@nhaminh/domain';
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

export function useEvent(id: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.events.detail(hh, id),
    queryFn: () => eventRepository.get(hh, id),
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
