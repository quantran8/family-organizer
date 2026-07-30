/**
 * Hook đọc/ghi Nợ.
 */

import type { UUID } from '@nhaminh/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateFinance } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import { debtRepository, type DebtInput, type DebtPatch } from '@/features/debt/repository';
import { useHouseholdId } from '@/stores/session';

export function useDebts() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.debts.list(hh),
    queryFn: () => debtRepository.list(hh),
  });
}

export function useDebt(id: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.debts.detail(hh, id),
    queryFn: () => debtRepository.get(hh, id),
  });
}

export function useCreateDebt() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DebtInput) => debtRepository.create(hh, input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

/**
 * Sửa nợ. `DebtPatch` KHÔNG có `remainingAmount` — ép ở tầng type (02 §7).
 *
 * Dư nợ chỉ giảm qua RPC `settle_payment`, cùng transaction với việc chốt một
 * kỳ trả và ghi `money_events`. Cho sửa tay ở đây thì lịch sử và số dư sẽ lệch
 * nhau, và không có cách nào biết cái nào đúng.
 */
export function useUpdateDebt() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: DebtPatch }) =>
      debtRepository.update(hh, id, patch),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useDeleteDebt() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => debtRepository.softDelete(hh, id),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}
