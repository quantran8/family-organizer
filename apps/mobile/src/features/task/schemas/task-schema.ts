/**
 * zod schema cho form Việc nhà.
 */

import { z } from 'zod';

import {
  isoDate,
  optionalText,
  recurrence,
  remindLeadDays,
  requiredText,
  timeOfDay,
  uuid,
} from '@/data/schemas/common';
import { t } from '@/i18n';

export const taskSchema = z.object({
  title: requiredText(t.validation.taskTitle, 120),
  notes: optionalText(),
  assigneeId: uuid.nullable().default(null),
  dueDate: isoDate.nullable().default(null),
  dueTime: timeOfDay.nullable().default(null),
  recur: recurrence,
  remindLeadDays: remindLeadDays.default(0),
  /** Ngữ cảnh: việc này chuẩn bị cho sự kiện nào. Sự kiện là HUB (05 §5.4). */
  eventId: uuid.nullable().default(null),
});

export type TaskValues = z.infer<typeof taskSchema>;

/**
 * Thêm nhanh: CHỈ tên việc.
 *
 * Sheet thêm nhanh hỏi một trường và đóng lại (05 §5.1). Mọi thứ khác — hạn,
 * người làm, nhắc — sửa được ở màn chi tiết sau. Bắt điền đủ ngay lúc thêm là
 * cách chắc chắn để người ta thôi thêm.
 */
export const quickAddTaskSchema = taskSchema.pick({ title: true });
export type QuickAddTaskValues = z.infer<typeof quickAddTaskSchema>;
