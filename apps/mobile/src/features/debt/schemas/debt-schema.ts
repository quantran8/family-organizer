/**
 * zod schema cho form Nợ.
 */

import { z } from 'zod';

import {
  isoDate,
  money,
  positiveMoney,
  recurrence,
  requiredText,
  uuid,
} from '@/data/schemas/common';
import { optionalText } from '@/data/schemas/common';
import { t } from '@/i18n';

export const debtSchema = z.object({
  name: requiredText(t.validation.debtName, 120),
  lender: optionalText(120),
  borrowerMemberId: uuid.nullable().default(null),
  principalAmount: positiveMoney.nullable().default(null),
  remainingAmount: money,
  interestRatePct: z.number().min(0).max(100).nullable().default(null),
  installmentAmount: positiveMoney.nullable().default(null),
  installmentRecur: recurrence,
  nextDueDate: isoDate.nullable().default(null),
  finalDueDate: isoDate.nullable().default(null),
  asOfDate: isoDate,
});
export type DebtValues = z.infer<typeof debtSchema>;

/**
 * Form SỬA bỏ `remainingAmount` — trường chỉ đọc sau khi tạo (02 §7).
 *
 * Dư nợ chỉ giảm qua RPC `settle_payment`, cùng transaction với việc chốt một
 * kỳ trả và ghi `money_events`. Cho sửa tay thì lịch sử và số dư sẽ lệch nhau,
 * và không có cách nào biết cái nào đúng.
 */
export const debtPatchSchema = debtSchema.omit({ remainingAmount: true }).partial();
export type DebtPatchValues = z.infer<typeof debtPatchSchema>;
