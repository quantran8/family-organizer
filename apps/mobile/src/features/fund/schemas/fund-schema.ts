/**
 * zod schema cho form Quỹ chung — v3 §7.6.
 *
 * CỐ Ý THIẾU TRƯỜNG ở `fundSchema`: không mục tiêu số dư, không hạn mức, không
 * phân loại. Quỹ chung trả lời "còn bao nhiêu", không phải "đáng lẽ phải còn
 * bao nhiêu" — thêm một mức chuẩn là mở đường cho câu "chưa đạt".
 */

import { z } from 'zod';

import { isoDate, optionalText, positiveMoney, requiredText } from '@/data/schemas/common';
import { t } from '@/i18n';

export const fundSchema = z.object({
  name: requiredText(t.validation.fundName, 120),
});
export type FundValues = z.infer<typeof fundSchema>;

export const fundEntrySchema = z
  .object({
    kind: z.enum(['deposit', 'withdrawal']),
    amount: positiveMoney,
    occurredOn: isoDate,
    purpose: optionalText(200),
    /**
     * CHỮ TỰ DO, giới hạn 60 ký tự. Không phải uuid: người bỏ tiền vào quỹ có
     * thể không phải thành viên household (bố mẹ đưa, em ruột góp). Ép chọn từ
     * danh sách member là ép người dùng tạo một member giả cho mỗi người từng
     * đưa tiền.
     */
    contributorName: z.string().trim().max(60).nullable().default(null),
    note: optionalText(500),
  })
  .superRefine((v, ctx) => {
    // Bắt buộc mục đích khi RÚT, không bắt khi nạp. RPC chặn lần nữa ở server —
    // đây chỉ để nói sớm và nói rõ, không phải để làm cổng duy nhất.
    if (v.kind === 'withdrawal' && (v.purpose === null || v.purpose.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['purpose'],
        message: t.validation.fundPurpose,
      });
    }
  });
export type FundEntryValues = z.infer<typeof fundEntrySchema>;
