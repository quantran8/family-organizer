/**
 * Hook đọc/ghi Việc nhà.
 *
 * `setDone` là thao tác được dùng nhiều nhất trong cả app (F3) và là chỗ
 * optimistic BẮT BUỘC: chạm ô tròn phải xong ngay, không spinner, không màn
 * trung gian, không hộp xác nhận. Chờ round-trip ở đây biến một cử chỉ một chạm
 * thành một thao tác phải đợi — và người ta sẽ thôi dùng nó.
 */

import type { ISODate, Task, UUID } from '@nhaminh/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { taskRepository, type TaskInput } from '@/features/task/repository';
import { useHouseholdId, useSessionStore } from '@/stores/session';

export function useTasks() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.tasks.list(hh),
    queryFn: () => taskRepository.list(hh),
  });
}

export function useTask(id: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.tasks.detail(hh, id),
    queryFn: () => taskRepository.get(hh, id),
  });
}

/** 5 lần gần nhất đã xong — trả lời "tuần trước có đổ rác không" (05 §5.2). */
export function useRecentDoneInstances(taskId: UUID, limit = 5) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.tasks.recentDone(hh, taskId),
    queryFn: () => taskRepository.recentDoneInstances(hh, taskId, limit),
  });
}

export function useTasksByEvent(eventId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.tasks.byEvent(hh, eventId),
    queryFn: () => taskRepository.listByEvent(hh, eventId),
  });
}

export function useCreateTask() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => taskRepository.create(hh, input),
    onSuccess: (task) => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
      if (task.eventId) {
        void qc.invalidateQueries({ queryKey: queryKeys.events.detail(hh, task.eventId) });
      }
    },
  });
}

export function useUpdateTask() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<TaskInput> }) =>
      taskRepository.update(hh, id, patch),
    onSuccess: (task) => {
      qc.setQueryData(queryKeys.tasks.detail(hh, task.id), task);
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.list(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

/**
 * Đánh dấu xong — OPTIMISTIC.
 *
 * `onMutate` sửa cache ngay, `onError` trả lại đúng cache đã chụp. Chụp cả
 * `list` lẫn `detail` vì cùng một việc xuất hiện ở hai chỗ, và khôi phục thiếu
 * một chỗ sẽ để lại hai màn hình nói hai điều khác nhau về cùng một ô tròn.
 */
export function useSetTaskDone() {
  const hh = useHouseholdId();
  const memberId = useSessionStore((s) => s.memberId);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, done }: { id: UUID; done: boolean }) =>
      taskRepository.setDone(hh, id, done, memberId),

    onMutate: async ({ id, done }) => {
      const listKey = queryKeys.tasks.list(hh);
      const detailKey = queryKeys.tasks.detail(hh, id);
      // Huỷ refetch đang bay: nó trả về dữ liệu CŨ sau khi ta đã sửa cache và
      // sẽ ghi đè ngược, làm ô tròn nhấp nháy về trạng thái trước.
      await qc.cancelQueries({ queryKey: listKey });
      await qc.cancelQueries({ queryKey: detailKey });

      const prevList = qc.getQueryData<Task[]>(listKey);
      const prevDetail = qc.getQueryData<Task | null>(detailKey);
      // Đúng HAI trạng thái (schema §0). Ai làm / lúc nào có ở DB nhưng không
      // có trong domain Task — vì không màn hình nào hiển thị nó. Ghi công là
      // một bước tới bảng xếp hạng giữa hai người, và đó là thứ không làm (04 §9).
      const patch = (t: Task): Task => ({ ...t, status: done ? 'done' : 'todo' });

      if (prevList) qc.setQueryData<Task[]>(listKey, prevList.map((t) => (t.id === id ? patch(t) : t)));
      if (prevDetail) qc.setQueryData<Task | null>(detailKey, patch(prevDetail));

      return { prevList, prevDetail, detailKey, listKey };
    },

    onError: (_e, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevList) qc.setQueryData(ctx.listKey, ctx.prevList);
      if (ctx.prevDetail) qc.setQueryData(ctx.detailKey, ctx.prevDetail);
    },

    // Đồng bộ lại dù thành công hay lỗi: Nhà mình đếm việc còn lại theo ngày.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

/** Việc lặp: đánh dấu trên INSTANCE, không trên task gốc. Cũng optimistic. */
export function useSetInstanceDone() {
  const hh = useHouseholdId();
  const memberId = useSessionStore((s) => s.memberId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, done }: { instanceId: UUID; done: boolean }) =>
      taskRepository.setInstanceDone(hh, instanceId, done, memberId),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

/** Hoãn = đổi due_date. Trung thực hơn một state riêng (schema §0). */
export function useRescheduleTask() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dueDate }: { id: UUID; dueDate: ISODate }) =>
      taskRepository.reschedule(hh, id, dueDate),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

/** Xoá mềm. UI cho hoàn tác 5 giây trước khi gọi (05 §5.2). */
export function useDeleteTask() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => taskRepository.softDelete(hh, id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}
