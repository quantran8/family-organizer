/**
 * Kiểm output của AI trước khi cho nó chạm vào form — 02 §5, 06 §6.
 *
 * ── Đây là chỗ ràng buộc "AI không được tin" được thi hành ──
 *
 * `ingest_drafts.parsed` là jsonb: nó chứa đúng thứ model trả về, chưa qua bất
 * kỳ phép kiểm nào. Đổ thẳng nó vào form nghĩa là một `estimatedCost` bằng
 * chuỗi `"hai triệu"` hay một `lunarMonth` bằng 13 sẽ lọt vào state của màn
 * hình, và lỗi chỉ lộ ra lúc bấm Lưu — nếu lộ ra.
 *
 * Nguyên tắc ở đây: **thiếu trường thì bỏ trống, KHÔNG đoán.** Một ô trống là
 * một câu hỏi mà người dùng sẽ trả lời; một ô sai là một lời khẳng định mà họ
 * có thể bấm Lưu mà không đọc kỹ. Vì vậy mọi trường đều `catch(undefined)`
 * thay vì để cả object hỏng — một trường sai không được kéo theo cả bản nháp.
 *
 * KHÔNG dùng lại `eventSchema` của form: schema đó bắt buộc `title` và bắt
 * buộc có ngày (`superRefine`), đúng cho lúc BẤM LƯU và sai cho lúc điền sẵn.
 * Một bản nháp thiếu ngày vẫn có ích — nó điền hộ cái tên, phần còn lại người
 * dùng gõ. Ép nó qua schema của form sẽ vứt cả bản nháp vì đúng thứ nó không
 * hứa sẽ có.
 */

import { EVENT_KINDS } from '@family-organizer/domain';
import { z } from 'zod';

/** ISO date thô — chỉ kiểm hình dạng, không kiểm ngày có thật. */
const looseIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .catch(undefined as never)
  .optional();

/**
 * Số tiền model trả về có thể là chuỗi ("2000000", "2.000.000").
 *
 * Chấp nhận chuỗi CHỈ khi nó là số nguyên thuần sau khi bỏ dấu phân cách —
 * "hai triệu" bị loại, và đó là chủ ý: đoán ra 2.000.000 từ chữ là việc của
 * model, không phải của hàm này. Đoán ở hai chỗ nghĩa là hai chỗ có thể đoán
 * khác nhau.
 */
const looseMoney = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === 'number') return v;
    const digits = v.replace(/[.,\s]/g, '');
    return /^\d+$/.test(digits) ? Number(digits) : undefined;
  })
  .pipe(z.number().int().positive().max(1_000_000_000_000))
  .catch(undefined as never)
  .optional();

const looseText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .catch(undefined as never)
    .optional();

/**
 * Sự kiện — hình dạng model được yêu cầu trả về.
 *
 * `lunarDay`/`lunarMonth` giữ nguyên là ngày ÂM, không quy đổi. Chuyển đổi là
 * việc của Edge `refresh-lunar-dates` — đúng MỘT nơi ghi `next_occurrence_date`
 * (ràng buộc #2). Một hàm quy đổi ở đây là đường code thứ hai.
 */
export const parsedEventSchema = z.object({
  title: looseText(120),
  kind: z.enum(EVENT_KINDS).catch(undefined as never).optional(),
  calendar: z.enum(['solar', 'lunar']).catch(undefined as never).optional(),
  solarDate: looseIsoDate,
  lunarDay: z.number().int().min(1).max(30).catch(undefined as never).optional(),
  lunarMonth: z.number().int().min(1).max(12).catch(undefined as never).optional(),
  estimatedCost: looseMoney,
});

export const parsedTaskSchema = z.object({
  title: looseText(120),
  dueDate: looseIsoDate,
});

export const parsedPaymentSchema = z.object({
  title: looseText(120),
  amount: looseMoney,
  dueDate: looseIsoDate,
});

export const parsedDocumentSchema = z.object({
  title: looseText(120),
  expiryDate: looseIsoDate,
});

export type ParsedEvent = z.infer<typeof parsedEventSchema>;
export type ParsedTask = z.infer<typeof parsedTaskSchema>;
export type ParsedPayment = z.infer<typeof parsedPaymentSchema>;
export type ParsedDocument = z.infer<typeof parsedDocumentSchema>;

/** Loại bản ghi mà capture dựng được form. */
export type CaptureEntity = 'event' | 'task' | 'upcoming_payment' | 'document';

export type ValidatedDraft =
  | { entity: 'event'; value: ParsedEvent }
  | { entity: 'task'; value: ParsedTask }
  | { entity: 'upcoming_payment'; value: ParsedPayment }
  | { entity: 'document'; value: ParsedDocument };

/**
 * Chạy `parsed` qua đúng schema của entity tương ứng.
 *
 * Trả `null` khi không có gì dùng được — chỗ gọi hiện câu "chưa đọc được gì,
 * nhập tay giúp mình" chứ KHÔNG hiện một form trống có vẻ như AI đã điền.
 */
export function validateParsed(
  suggestedEntityType: string | null,
  parsed: Record<string, unknown> | null,
): ValidatedDraft | null {
  if (!parsed) return null;

  switch (suggestedEntityType) {
    case 'event': {
      const value = parsedEventSchema.safeParse(parsed);
      return value.success && hasAnyField(value.data) ? { entity: 'event', value: value.data } : null;
    }
    case 'task': {
      const value = parsedTaskSchema.safeParse(parsed);
      return value.success && hasAnyField(value.data) ? { entity: 'task', value: value.data } : null;
    }
    case 'upcoming_payment': {
      const value = parsedPaymentSchema.safeParse(parsed);
      return value.success && hasAnyField(value.data)
        ? { entity: 'upcoming_payment', value: value.data }
        : null;
    }
    case 'document': {
      const value = parsedDocumentSchema.safeParse(parsed);
      return value.success && hasAnyField(value.data)
        ? { entity: 'document', value: value.data }
        : null;
    }
    default:
      // Model không đoán được loại, hoặc trả một `entity_type` mà capture không
      // dựng form (`asset`, `debt`, `shopping_item`…). Không đoán bừa sang
      // `task` cho có: một khoản nợ bị điền vào form việc nhà là một bản ghi
      // sai loại mà người dùng phải xoá.
      return null;
  }
}

/**
 * Có trường nào dùng được không.
 *
 * Mọi trường đều optional nên `safeParse` thành công cả với một object rỗng —
 * và một form "AI đã điền" mà không điền gì trông y hệt một lỗi im lặng.
 */
function hasAnyField(v: Record<string, unknown>): boolean {
  return Object.values(v).some((x) => x !== undefined && x !== null);
}
