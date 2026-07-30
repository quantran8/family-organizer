/**
 * Mảnh dùng chung cho zod schema — 02 §5.
 *
 * Thông báo lỗi lấy từ `i18n/vi.ts`, KHÔNG viết thẳng ở đây. Schema là chỗ dễ
 * lọt chuỗi tiếng Việt nhất vì nó không phải JSX nên eslint không bắt được —
 * quy ước bù lại: mọi `message` ở tầng schema đều là `t.validation.*` hoặc
 * `t.error.*`.
 *
 * Vì sao zod ở `apps/mobile` chứ không ở `packages/domain`: domain KHÔNG có
 * dependency runtime nào, kể cả zod (01 §1). Validate form là việc của UI;
 * domain nhận dữ liệu đã đúng hình dạng.
 */

import { z } from 'zod';

import { t } from '@/i18n';

export const uuid = z.string().uuid();

/** Ngày dạng `YYYY-MM-DD` — cùng hình dạng với `ISODate` của domain. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Giờ dạng `HH:MM`. */
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * Số tiền VND.
 *
 * `int()` là có chủ ý: VND không có phần lẻ. Cho phép số thập phân ở đây thì
 * `formatMoney` sẽ phải quyết định làm tròn thế nào, và hai màn hình sẽ làm
 * tròn khác nhau.
 */
export const money = z
  .number({ invalid_type_error: t.validation.amountPositive })
  .int()
  .nonnegative();

/** Số tiền phải > 0 — dùng cho khoản phải trả, mục tiêu, khoản góp. */
export const positiveMoney = money.positive({ message: t.validation.amountPositive });

/** Chuỗi bắt buộc, cắt khoảng trắng thừa. */
export const requiredText = (message: string, max = 200) =>
  z.string().trim().min(1, { message }).max(max);

/** Chuỗi tuỳ chọn: rỗng → null, để DB nhận `null` chứ không phải `''`. */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .default(null);

/** Lặp lại — hình dạng khớp `Recurrence` của domain. */
export const recurrence = z
  .object({
    freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().positive().default(1),
    byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
    byMonthDay: z.number().int().min(1).max(31).optional(),
    until: isoDate.optional(),
  })
  .nullable()
  .default(null);

/** Số ngày nhắc trước. 0 = nhắc đúng hôm đó. */
export const remindLeadDays = z.number().int().min(0).max(365);
