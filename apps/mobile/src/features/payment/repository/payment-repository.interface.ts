/**
 * Khoản sắp phải trả.
 *
 * Đúng HAI trạng thái: unpaid / paid (schema §0).
 *   'quá hạn'      = SUY RA từ due_date, không lưu.
 *   'tạm hoãn'     = đổi due_date, trung thực hơn một state riêng.
 *   'chờ xác nhận' = phê duyệt núp bóng → không làm.
 */

import type { ISODate, Recurrence, UpcomingPayment, UUID } from '@nhaminh/domain';

export type PaymentWindow = '7d' | '30d' | 'overdue' | 'paid' | 'all';

export interface PaymentInput {
  name: string;
  amount: number;
  dueDate: ISODate | null;
  dueMonth: ISODate | null;
  recur: Recurrence | null;
  sourceDebtId: UUID | null;
  eventId: UUID | null;
  notes: string | null;
}

export interface PaymentRepository {
  list(hh: UUID, window: PaymentWindow, today: ISODate): Promise<UpcomingPayment[]>;
  get(hh: UUID, id: UUID): Promise<UpcomingPayment | null>;
  create(hh: UUID, input: PaymentInput): Promise<UpcomingPayment>;
  update(hh: UUID, id: UUID, patch: Partial<PaymentInput>): Promise<UpcomingPayment>;
  /** RPC nguyên tử: đánh dấu paid + giảm dư nợ + ghi money_events. */
  settle(hh: UUID, id: UUID, paidOn: ISODate, note?: string): Promise<void>;
  listByEvent(hh: UUID, eventId: UUID): Promise<UpcomingPayment[]>;
  listByDebt(hh: UUID, debtId: UUID): Promise<UpcomingPayment[]>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
