/**
 * zod schema cho form Giấy tờ.
 *
 * Hỏi ĐÚNG BA TRƯỜNG trước: tên · ngày hết hạn · bản giấy để đâu (05 §7.3).
 * Mọi thứ còn lại tuỳ chọn, và file là bước làm sau — KHÔNG chặn lưu.
 */

import { DOC_TYPES } from '@nhaminh/domain';
import { z } from 'zod';

import {
  isoDate,
  optionalText,
  positiveMoney,
  remindLeadDays,
  requiredText,
  uuid,
} from '@/data/schemas/common';
import { t } from '@/i18n';

export const documentSchema = z.object({
  title: requiredText(t.validation.docTitle, 120),
  type: z.enum(DOC_TYPES).default('other'),
  ownerMemberId: uuid.nullable().default(null),
  issuedDate: isoDate.nullable().default(null),
  /**
   * Tuỳ chọn: nhiều giấy tờ không có hạn (giấy khai sinh, đăng ký kết hôn), và
   * bắt điền sẽ khiến người dùng gõ bừa một ngày để qua form.
   */
  expiryDate: isoDate.nullable().default(null),
  /** Hộ chiếu mặc định nhắc trước 180 ngày (03 §5); còn lại 30. */
  remindLeadDays: remindLeadDays.default(30),
  /**
   * Trường quan trọng nhất trên màn chi tiết (05 §7.2), nhưng KHÔNG bắt buộc:
   * "chưa biết để đâu" là một câu trả lời thật, và chặn lưu vì nó thì người
   * dùng sẽ không lưu gì cả.
   */
  physicalLocation: optionalText(200),
  externalLink: z.string().trim().url().or(z.literal('')).transform((s) => s || null).nullable().default(null),
  notes: optionalText(),
  renewalCost: positiveMoney.nullable().default(null),
  eventId: uuid.nullable().default(null),
  debtId: uuid.nullable().default(null),
  /** Metadata riêng theo loại (số hợp đồng, biển số xe) — jsonb, tự do. */
  extra: z.record(z.unknown()).default({}),
});
export type DocumentValues = z.infer<typeof documentSchema>;
