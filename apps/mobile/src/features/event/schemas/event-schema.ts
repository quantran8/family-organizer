/**
 * zod schema cho form Sự kiện — màn cần cẩn thận nhất (05 §5.5).
 */

import { EVENT_KINDS, FAMILY_SIDES } from '@nhaminh/domain';
import { z } from 'zod';

import {
  isoDate,
  optionalText,
  positiveMoney,
  recurrence,
  remindLeadDays,
  requiredText,
  timeOfDay,
} from '@/data/schemas/common';
import { t } from '@/i18n';

/**
 * CỐ Ý KHÔNG có `nextOccurrenceDate` (02 §7).
 *
 * Đó là cache do Edge `refresh-lunar-dates` ghi, và là **nơi duy nhất** ghi nó
 * (ràng buộc #2). Nếu trường này lọt vào schema thì sớm muộn cũng có form ghi
 * đè, và lúc đó sẽ có hai đường code cùng tính lịch âm — hai đường sẽ lệch nhau,
 * và không có cách nào biết đường nào đúng.
 */
const baseEventSchema = z.object({
  title: requiredText(t.validation.eventTitle, 120),
  // Lấy từ hằng của domain thay vì gõ lại: thêm một `event_kind` ở schema mà
  // quên sửa ở đây sẽ thành lỗi biên dịch, không phải một form im lặng từ chối
  // giá trị hợp lệ.
  kind: z.enum(EVENT_KINDS),
  side: z.enum(FAMILY_SIDES).nullable().default(null),
  location: optionalText(200),
  notes: optionalText(),
  calendar: z.enum(['solar', 'lunar']),
  solarDate: isoDate.nullable().default(null),
  lunarDay: z.number().int().min(1).max(30).nullable().default(null),
  lunarMonth: z.number().int().min(1).max(12).nullable().default(null),
  lunarLeapMonth: z.boolean().default(false),
  startTime: timeOfDay.nullable().default(null),
  isAllDay: z.boolean().default(true),
  recur: recurrence,
  /** Giỗ và sinh nhật mặc định nhắc trước 3 ngày (03 §5). */
  remindLeadDays: remindLeadDays.default(3),
  estimatedCost: positiveMoney.nullable().default(null),
});

/**
 * Lịch dương cần `solarDate`; lịch âm cần `lunarDay` + `lunarMonth`.
 *
 * Kiểm bằng `superRefine` chứ không phải union: form dùng MỘT bộ giá trị và
 * người dùng bật/tắt lịch âm giữa chừng — union sẽ vứt mất giá trị họ đã nhập ở
 * nhánh kia, và họ phải gõ lại chỉ vì bấm nhầm một lần.
 */
export const eventSchema = baseEventSchema.superRefine((v, ctx) => {
  if (v.calendar === 'solar' && v.solarDate === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['solarDate'],
      message: t.validation.eventDate,
    });
  }
  if (v.calendar === 'lunar' && (v.lunarDay === null || v.lunarMonth === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lunarDay'],
      message: t.validation.eventDate,
    });
  }
});

export type EventValues = z.infer<typeof eventSchema>;
