/**
 * Nợ phải trả.
 *
 * Nợ KHÔNG phải "một con số 180tr". Nó có gốc, dư nợ, lịch trả, kỳ hạn, và
 * quan trọng nhất: nó TỰ SINH RA upcoming_payments hằng kỳ (schema §5.2).
 *
 * Khoản MÌNH cho người khác vay nằm ở assets (asset_kind='receivable'), không
 * phải ở đây.
 */

import type { Debt, ISODate, Recurrence, UUID } from '@family-organizer/domain';

export interface DebtInput {
  name: string;
  lender: string | null;
  borrowerMemberId: UUID | null;
  principalAmount: number | null;
  /** CHỈ khi tạo. Sau đó chỉ RPC settle_payment được giảm (02 §7). */
  remainingAmount: number;
  interestRatePct: number | null;
  installmentAmount: number | null;
  installmentRecur: Recurrence | null;
  nextDueDate: ISODate | null;
  finalDueDate: ISODate | null;
  asOfDate: ISODate;
}

/** Patch KHÔNG có remainingAmount — ép ở tầng type, không chỉ ở runtime. */
export type DebtPatch = Partial<Omit<DebtInput, 'remainingAmount'>>;

export interface DebtRepository {
  list(hh: UUID): Promise<Debt[]>;
  get(hh: UUID, id: UUID): Promise<Debt | null>;
  create(hh: UUID, input: DebtInput): Promise<Debt>;
  update(hh: UUID, id: UUID, patch: DebtPatch): Promise<Debt>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
