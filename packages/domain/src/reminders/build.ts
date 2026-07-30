/**
 * Nhắc nhở — 03 §5.
 *
 * Ngày bắn = ngày đến hạn − remindLeadDays. Giờ mặc định 08:00 giờ địa phương.
 *
 * GỘP TRƯỚC KHI BẮN. Nhiều nhắc nhở cùng ngày → MỘT thông báo. Nếu không gộp,
 * người dùng sẽ tắt thông báo trong tuần đầu và mất luôn kênh giữ chân duy nhất.
 *
 * Không bắn quá 2 thông báo mỗi ngày cho mỗi người.
 */

import { addDays, compareISODate } from '../date/civil.ts';
import type { DocType, EntityType, ISODate, UUID } from '../types/base.ts';
import type {
  FamilyDocument,
  FamilyEvent,
  TaskInstance,
  UpcomingPayment,
} from '../types/entities.ts';

/** Giờ bắn mặc định, giờ địa phương. */
export const DEFAULT_REMIND_HOUR = 8;

/** Tối đa thông báo mỗi ngày cho mỗi người — 03 §5. */
export const MAX_REMINDERS_PER_DAY = 2;

/** Lead mặc định theo loại — 03 §5. */
export const DEFAULT_LEAD_DAYS = {
  document: 30,
  /** Hộ chiếu gia hạn lâu, cần báo sớm hơn hẳn. */
  documentPassport: 180,
  event: 3,
  payment: 3,
  task: 0,
} as const;

export function defaultLeadDaysForDocument(type: DocType): number {
  return type === 'passport' ? DEFAULT_LEAD_DAYS.documentPassport : DEFAULT_LEAD_DAYS.document;
}

/** Một mục cần nhắc, trước khi gộp. */
export interface ReminderSource {
  entityType: EntityType;
  entityId: UUID;
  title: string;
  /** Ngày đến hạn thật của mục. */
  dueOn: ISODate;
}

/**
 * Bản nháp một thông báo. `items` có nhiều hơn một phần tử nghĩa là đã gộp —
 * UI dựng câu "Hôm nay nhà mình có 3 việc cần chú ý." từ độ dài mảng.
 *
 * Không chứa chuỗi hiển thị: domain không biết gì về UI (xem finance/status.ts).
 */
export interface ReminderDraft {
  /** Ngày bắn, không phải ngày đến hạn. */
  fireOn: ISODate;
  fireHour: number;
  items: ReminderSource[];
}

export interface BuildRemindersInput {
  events: FamilyEvent[];
  documents: FamilyDocument[];
  payments: UpcomingPayment[];
  tasks: TaskInstance[];
  /** Tra tên việc cho TaskInstance — instance không mang title. */
  taskTitles?: Record<UUID, string>;
}

/**
 * Sinh danh sách thông báo đã gộp cho khoảng [today, today + horizonDays].
 *
 * Thứ tự ưu tiên khi phải cắt bớt vì trần 2 thông báo/ngày: mục đến hạn sớm
 * nhất được giữ. Cắt theo ngày đến hạn chứ không theo loại — người dùng quan
 * tâm cái gì sắp tới, không quan tâm nó là loại gì.
 */
export function buildReminders(
  input: BuildRemindersInput,
  today: ISODate,
  horizonDays: number,
): ReminderDraft[] {
  const horizonEnd = addDays(today, horizonDays);
  const byFireDate = new Map<ISODate, ReminderSource[]>();

  const add = (fireOn: ISODate, item: ReminderSource): void => {
    // Ngày bắn đã qua thì bỏ — không nhắc về quá khứ.
    if (compareISODate(fireOn, today) < 0) return;
    if (compareISODate(fireOn, horizonEnd) > 0) return;
    const bucket = byFireDate.get(fireOn);
    if (bucket) bucket.push(item);
    else byFireDate.set(fireOn, [item]);
  };

  for (const e of input.events) {
    if (e.nextOccurrenceDate === null) continue;
    add(addDays(e.nextOccurrenceDate, -e.remindLeadDays), {
      entityType: 'event',
      entityId: e.id,
      title: e.title,
      dueOn: e.nextOccurrenceDate,
    });
  }

  for (const d of input.documents) {
    if (d.expiryDate === null) continue;
    add(addDays(d.expiryDate, -d.remindLeadDays), {
      entityType: 'document',
      entityId: d.id,
      title: d.title,
      dueOn: d.expiryDate,
    });
  }

  for (const p of input.payments) {
    if (p.state === 'paid') continue;
    const due = p.dueDate ?? p.dueMonth;
    if (due === null) continue;
    add(addDays(due, -DEFAULT_LEAD_DAYS.payment), {
      entityType: 'upcoming_payment',
      entityId: p.id,
      title: p.name,
      dueOn: due,
    });
  }

  for (const t of input.tasks) {
    if (t.status === 'done' || t.skipped) continue;
    add(addDays(t.dueDate, -DEFAULT_LEAD_DAYS.task), {
      entityType: 'task',
      entityId: t.id,
      title: input.taskTitles?.[t.taskId] ?? '',
      dueOn: t.dueDate,
    });
  }

  const drafts: ReminderDraft[] = [];
  for (const [fireOn, items] of byFireDate) {
    items.sort((a, b) => compareISODate(a.dueOn, b.dueOn));
    drafts.push({ fireOn, fireHour: DEFAULT_REMIND_HOUR, items });
  }
  drafts.sort((a, b) => compareISODate(a.fireOn, b.fireOn));
  return drafts;
}

/**
 * Áp trần MAX_REMINDERS_PER_DAY.
 *
 * Vì buildReminders() đã gộp mọi mục cùng ngày thành MỘT draft, kết quả bình
 * thường luôn là 1 thông báo/ngày — dưới trần. Hàm này là lưới an toàn cho
 * trường hợp người gọi tự thêm draft (ví dụ nhắc cập nhật tình hình tuần), và
 * là chỗ duy nhất định nghĩa "trần" để không rải rác trong client.
 */
export function capPerDay(
  drafts: ReminderDraft[],
  maxPerDay: number = MAX_REMINDERS_PER_DAY,
): ReminderDraft[] {
  const count = new Map<ISODate, number>();
  const out: ReminderDraft[] = [];
  for (const d of drafts) {
    const n = count.get(d.fireOn) ?? 0;
    if (n >= maxPerDay) continue;
    count.set(d.fireOn, n + 1);
    out.push(d);
  }
  return out;
}
