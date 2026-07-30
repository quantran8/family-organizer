/**
 * zod schema cho form Mục tiêu tài chính chung.
 *
 * KHÔNG phân loại, KHÔNG mức ưu tiên (schema §5.4) — hai thứ đó không đổi hành
 * vi nào, chỉ thêm việc phải điền.
 */

import { z } from 'zod';

import { isoDate, money, positiveMoney, requiredText } from '@/data/schemas/common';
import { t } from '@/i18n';

export const goalSchema = z.object({
  name: requiredText(t.validation.goalName, 120),
  targetAmount: positiveMoney,
  currentAmount: money.default(0),
  targetDate: isoDate.nullable().default(null),
});
export type GoalValues = z.infer<typeof goalSchema>;

export const contributeSchema = z.object({
  amount: positiveMoney,
  on: isoDate,
});
export type ContributeValues = z.infer<typeof contributeSchema>;
