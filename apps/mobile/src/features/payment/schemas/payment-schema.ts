/**
 * zod schema cho form Khoản sắp phải trả.
 */

import { z } from 'zod';

import {
  isoDate,
  optionalText,
  positiveMoney,
  recurrence,
  requiredText,
  uuid,
} from '@/data/schemas/common';
import { t } from '@/i18n';

export const paymentSchema = z
  .object({
    name: requiredText(t.validation.paymentName, 120),
    amount: positiveMoney,
    /** Ngày cụ thể, HOẶC chỉ tháng khi chưa biết ngày ("học phí tháng 9"). */
    dueDate: isoDate.nullable().default(null),
    dueMonth: isoDate.nullable().default(null),
    recur: recurrence,
    sourceDebtId: uuid.nullable().default(null),
    eventId: uuid.nullable().default(null),
    notes: optionalText(),
  })
  .refine((v) => v.dueDate !== null || v.dueMonth !== null, {
    path: ['dueDate'],
    // Không có hạn nào thì khoản này không bao giờ hiện ở "SẮP PHẢI TRẢ", và
    // trạng thái tài chính cũng không đếm nó — nó tồn tại mà vô hình.
    message: t.validation.eventDate,
  });
export type PaymentValues = z.infer<typeof paymentSchema>;

/** Modal `[Đã trả]` → RPC `settle_payment`. */
export const settlePaymentSchema = z.object({
  paidOn: isoDate,
  note: optionalText(200),
});
export type SettlePaymentValues = z.infer<typeof settlePaymentSchema>;
