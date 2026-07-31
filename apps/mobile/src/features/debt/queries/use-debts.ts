/**
 * Hook đọc/ghi Nợ.
 */

import type { UUID } from '@family-organizer/domain';
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

/**
 * Một khoản nợ.
 *
 * `id` nhận `null` được: `money/payment/[id].tsx` gọi nó với `sourceDebtId`, và
 * phần lớn khoản sắp trả KHÔNG sinh từ nợ nên giá trị đó là null. Không có
 * `enabled` thì mỗi lần mở một khoản chi thường (học phí, tiền nhà) sẽ bắn một
 * câu query với id rỗng và nhận về lỗi cho thứ không tồn tại.
 */
export function useDebt(id: UUID | null) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.debts.detail(hh, id ?? ('' as UUID)),
    queryFn: () => debtRepository.get(hh, id as UUID),
    enabled: id !== null,
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
