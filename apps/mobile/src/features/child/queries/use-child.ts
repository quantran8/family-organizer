/**
 * Hook cho Hồ sơ con — 07 §4.
 *
 * KHÔNG optimistic ở `useMarkDoseDone`, dù nó là thao tác một chạm và ngoại lệ
 * ở 01 §3 nói thao tác một chạm thì phải optimistic.
 *
 * Lý do đủ mạnh để đi ngược quy ước: đây là dữ liệu tiêm chủng. Một ô tích hiện
 * ra rồi lặng lẽ biến mất khi lệnh ghi hỏng sẽ để lại một mũi mà bố mẹ TIN LÀ
 * đã ghi. Với một món đồ trong danh sách mua sắm thì đó là phiền; với một mũi
 * tiêm thì đó là đúng thứ module này tồn tại để ngăn. Chờ round-trip và hiện
 * lỗi khi hỏng là hành vi đúng ở đây.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { DOSE_REMIND_LEAD_DAYS } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import {
  childRepository,
  type ChildInfoInput,
  type DoseInput,
  type GrowthInput,
} from '@/features/child/repository';
import { useHouseholdId } from '@/stores/session';

/**
 * Bảng tham chiếu. RỖNG khi chưa seed — màn hình phải hiện trạng thái rỗng
 * THÀNH THẬT chứ không dựng tạm một lịch nào (07 §4.2).
 *
 * `staleTime` dài: đây là dữ liệu tham chiếu chỉ đổi khi có người seed lại bằng
 * service role, không phải thứ hai người dùng sửa cho nhau.
 */
export function useVaccineSchedule() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.child.schedule(hh),
    queryFn: () => childRepository.listScheduleItems(hh),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useChildDoses(memberId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.child.doses(hh, memberId),
    queryFn: () => childRepository.listDoses(hh, memberId),
  });
}

/** Mũi sắp tới + mũi quá lịch của MỌI con — dòng trên Nhà mình (07 §4.5). */
export function useUpcomingDoses(today: ISODate) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.child.upcomingDoses(hh),
    queryFn: () => childRepository.listUpcomingDoses(hh, today, DOSE_REMIND_LEAD_DAYS),
  });
}

export function useChildGrowth(memberId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.child.growth(hh, memberId),
    queryFn: () => childRepository.listGrowth(hh, memberId),
  });
}

/**
 * Ghi lịch sinh từ `buildVaccineSchedule()` xuống DB.
 *
 * Màn hình gọi hàm này với kết quả của hàm thuần đó; không có đường nào để hook
 * tự dựng mốc tiêm — toàn bộ tri thức y tế nằm trong `vaccine_schedule_items`.
 */
export function useSeedVaccineSchedule() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, doses }: { memberId: UUID; doses: DoseInput[] }) =>
      childRepository.seedSchedule(hh, memberId, doses),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

export function useAddDose() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: UUID; input: DoseInput }) =>
      childRepository.addDose(hh, memberId, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

/** Đánh dấu đã tiêm. KHÔNG optimistic — xem ghi chú đầu file. */
export function useMarkDoseDone() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      administeredOn,
      facility,
    }: {
      id: UUID;
      administeredOn: ISODate;
      facility?: string | null;
    }) => childRepository.markDoseDone(hh, id, administeredOn, facility),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
      // Mũi sắp tới cũng hiện ở CẦN CHÚ Ý trên Nhà mình → phải đồng bộ theo.
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

export function useUndoDose() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => childRepository.undoDose(hh, id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.household.all(hh) });
    },
  });
}

export function useAddGrowthRecord() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: UUID; input: GrowthInput }) =>
      childRepository.addGrowth(hh, memberId, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
    },
  });
}

export function useDeleteGrowthRecord() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => childRepository.softDeleteGrowth(hh, id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
    },
  });
}

export function useUpdateChildInfo() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, input }: { memberId: UUID; input: ChildInfoInput }) =>
      childRepository.updateChildInfo(hh, memberId, input),
    onSettled: () => {
      // Ngày sinh nằm ở `members` và là ĐẦU VÀO của lịch tiêm — đổi nó thì cả
      // hai nhóm key phải tải lại.
      void qc.invalidateQueries({ queryKey: queryKeys.members.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.child.all(hh) });
    },
  });
}
