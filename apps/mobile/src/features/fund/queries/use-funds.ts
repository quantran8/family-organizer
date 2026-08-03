/**
 * Hook đọc/ghi Quỹ chung — v3 §7.6.
 *
 * MỌI hook đọc theo người đều nhận `month` bắt buộc. Không có hook nào đọc
 * nhiều tháng, và không được thêm — xem `fund-repository.interface.ts` cho ba
 * tầng ép ranh giới, và 03 §9 ngoại lệ 2 cho lý do.
 */

import type { ISODate, UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateFinance } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import {
  fundRepository,
  type FundEntryInput,
  type FundInput,
  type FundPatch,
} from '@/features/fund/repository';
import { useHouseholdId } from '@/stores/session';

export function useFunds() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.funds.list(hh),
    queryFn: () => fundRepository.list(hh),
  });
}

export function useFund(id: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.funds.detail(hh, id),
    queryFn: () => fundRepository.get(hh, id),
  });
}

/** Tổng + khối người bỏ vào của ĐÚNG một tháng. */
export function useFundMonth(fundId: UUID, month: ISODate) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.funds.monthSummary(hh, fundId, month),
    queryFn: () => fundRepository.monthSummary(hh, fundId, month),
  });
}

/** Các khoản của ĐÚNG một tháng. */
export function useFundEntries(fundId: UUID, month: ISODate) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.funds.entries(hh, fundId, month),
    queryFn: () => fundRepository.entriesForMonth(hh, fundId, month),
  });
}

/** Những tháng có bản ghi — chỉ để dựng bộ chọn tháng. */
export function useFundMonths(fundId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.funds.monthsPresent(hh, fundId),
    queryFn: () => fundRepository.monthsPresent(hh, fundId),
  });
}

export function useCreateFund() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FundInput) => fundRepository.create(hh, input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useUpdateFund() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: FundPatch }) =>
      fundRepository.update(hh, id, patch),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

/**
 * Ghi một khoản nạp/rút — qua RPC, cùng transaction với `money_events`.
 *
 * KHÔNG optimistic: đây là thao tác có form, chờ được, và một con số tiền hiện
 * ra rồi biến mất làm người dùng nghi ngờ mọi con số còn lại (01 §3). Cùng lý
 * do với tài sản và snapshot.
 */
export function useRecordFundEntry() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { fundId: UUID; input: FundEntryInput }) =>
      fundRepository.recordEntry(hh, v.fundId, v.input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useDeleteFundEntry() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: UUID) => fundRepository.deleteEntry(hh, entryId),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useDeleteFund() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => fundRepository.softDelete(hh, id),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}
