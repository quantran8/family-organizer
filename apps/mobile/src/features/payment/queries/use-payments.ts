/**
 * Hook đọc/ghi Khoản sắp phải trả.
 */

import type { ISODate, UpcomingPayment, UUID } from '@nhaminh/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateFinance } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import {
  paymentRepository,
  type PaymentInput,
  type PaymentWindow,
} from '@/features/payment/repository';
import { useHouseholdId } from '@/stores/session';

export function usePayments(window: PaymentWindow, today: ISODate) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.payments.list(hh, window),
    queryFn: () => paymentRepository.list(hh, window, today),
  });
}

export function usePayment(id: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.payments.detail(hh, id),
    queryFn: () => paymentRepository.get(hh, id),
  });
}

export function usePaymentsByEvent(eventId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.payments.byEvent(hh, eventId),
    queryFn: () => paymentRepository.listByEvent(hh, eventId),
  });
}

export function usePaymentsByDebt(debtId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.payments.byDebt(hh, debtId),
    queryFn: () => paymentRepository.listByDebt(hh, debtId),
  });
}

export function useCreatePayment() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => paymentRepository.create(hh, input),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

export function useUpdatePayment() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<PaymentInput> }) =>
      paymentRepository.update(hh, id, patch),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}

/**
 * `[Đã trả]` — OPTIMISTIC (01 §3).
 *
 * Ngoại lệ có chủ ý so với các thao tác tiền khác: đây là một hành động dứt
 * khoát người dùng vừa làm ngoài đời (bấm chuyển khoản xong mới mở app), không
 * phải nhập một con số mới. Chờ round-trip ở đây làm họ tưởng app chưa nhận.
 *
 * Chỉ lật trạng thái dòng đó trong cache. Dư nợ mới thì KHÔNG đoán — nó do RPC
 * `settle_payment` tính, và đoán sai một con số nợ tệ hơn nhiều so với đợi nó.
 */
export function useSettlePayment() {
  const hh = useHouseholdId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (v: { id: UUID; paidOn: ISODate; note?: string }) =>
      paymentRepository.settle(hh, v.id, v.paidOn, v.note),

    onMutate: async ({ id }) => {
      const detailKey = queryKeys.payments.detail(hh, id);
      await qc.cancelQueries({ queryKey: queryKeys.payments.all(hh) });

      const prevDetail = qc.getQueryData<UpcomingPayment | null>(detailKey);
      if (prevDetail) {
        const settled: UpcomingPayment = { ...prevDetail, state: 'paid' };
        qc.setQueryData<UpcomingPayment | null>(detailKey, settled);
      }

      // Danh sách: gỡ dòng khỏi mọi cửa sổ đang cache. Không lật trạng thái tại
      // chỗ — cửa sổ '7d'/'overdue' theo định nghĩa chỉ chứa khoản CHƯA trả, để
      // lại một dòng 'paid' trong đó là hiện sai bộ lọc.
      const listSnapshots: [readonly unknown[], UpcomingPayment[]][] = [];
      for (const w of ['7d', '30d', 'overdue', 'all'] as const) {
        const key = queryKeys.payments.list(hh, w);
        const prev = qc.getQueryData<UpcomingPayment[]>(key);
        if (!prev) continue;
        listSnapshots.push([key, prev]);
        qc.setQueryData<UpcomingPayment[]>(
          key,
          w === 'all'
            ? prev.map((p) => (p.id === id ? { ...p, state: 'paid' } : p))
            : prev.filter((p) => p.id !== id),
        );
      }

      return { prevDetail, detailKey, listSnapshots };
    },

    onError: (_e, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevDetail) qc.setQueryData(ctx.detailKey, ctx.prevDetail);
      for (const [key, prev] of ctx.listSnapshots) qc.setQueryData(key, prev);
    },

    onSettled: () => invalidateFinance(qc, hh),
  });
}

export function useDeletePayment() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => paymentRepository.softDelete(hh, id),
    onSuccess: () => invalidateFinance(qc, hh),
  });
}
