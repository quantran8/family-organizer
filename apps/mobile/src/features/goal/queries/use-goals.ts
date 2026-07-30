/**
 * Hook đọc/ghi Mục tiêu tài chính chung.
 */

import type { ISODate, UUID } from '@nhaminh/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateFinance } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import { goalRepository, type GoalInput } from '@/features/goal/repository';
import { useHouseholdId } from '@/stores/session';

export function useGoals() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.goals.list(hh),
    queryFn: () => goalRepository.list(hh),
  });
}

export function useGoal(id: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.goals.detail(hh, id),
    queryFn: () => goalRepository.get(hh, id),
  });
}

export function useCreateGoal() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GoalInput) => goalRepository.create(hh, input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useUpdateGoal() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<GoalInput> }) =>
      goalRepository.update(hh, id, patch),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

/** Góp thêm — qua RPC, cùng transaction với việc ghi `money_events`. */
export function useContributeToGoal() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: UUID; amount: number; on: ISODate }) =>
      goalRepository.contribute(hh, v.id, v.amount, v.on),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useDeleteGoal() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => goalRepository.softDelete(hh, id),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}
