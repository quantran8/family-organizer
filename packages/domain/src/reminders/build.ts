/**
 * Nhắc nhở — 03 §5.
 *
 * Ngày bắn = ngày đến hạn − remindLeadDays. Giờ mặc định 08:00 giờ địa phương.
 *
 * GỘP TRƯỚC KHI BẮN. Nhiều nhắc nhở cùng ngày cho cùng một người → MỘT thông
 * báo. Nếu không gộp, người dùng sẽ tắt thông báo trong tuần đầu và mất luôn
 * kênh giữ chân duy nhất.
 *
 * Không bắn quá 2 thông báo mỗi ngày cho mỗi người.
 *
 * HAI THỨ CỐ Ý KHÔNG CÓ THÔNG BÁO:
 *
 *   - Danh sách mua sắm (03 §5). Bắn push mỗi lần người kia thêm một chai nước
 *     mắm thì người dùng tắt thông báo trong tuần đầu.
 *   - Cập nhật tình hình định kỳ. Nhắc snapshot hằng tuần đã bị bỏ ở 06 §1 —
 *     nó là một nghi thức kế toán, và chỉ người dùng mới quyết được khoản nào
 *     đáng ghi.
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
  /**
   * `'preparation'` = mốc nhắc chuẩn bị của nhắc kép (03 §5b), khác với mốc
   * nhắc sự kiện thường. Tầng gọi dùng cờ này để SINH MỘT VIỆC LINH HOẠT thay
   * vì chỉ bắn thông báo — thông báo thứ hai về cùng một sự kiện là phiền, một
   * dòng việc trong danh sách thì hữu ích.
   */
  purpose?: 'preparation';
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
  /**
   * Người nhận. `null` = gửi cho CẢ NHÀ (sự kiện, giấy tờ, khoản tiền, và việc
   * không gán ai) — 03 §5.
   */
  targetMemberId: UUID | null;
  items: ReminderSource[];
}

export interface BuildRemindersInput {
  events: FamilyEvent[];
  documents: FamilyDocument[];
  payments: UpcomingPayment[];
  tasks: TaskInstance[];
  /** Tra tên việc cho TaskInstance — instance không mang title. */
  taskTitles?: Record<UUID, string>;
  /**
   * Tra người phụ trách cho TaskInstance — instance không mang assigneeId.
   * Thiếu bản ghi cho một taskId nghĩa là việc KHÔNG GÁN AI → nhắc cả nhà.
   */
  taskAssignees?: Record<UUID, UUID | null>;
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

  // Gộp theo CẶP (ngày bắn, người nhận), không chỉ theo ngày.
  //
  // Nếu gộp theo ngày thôi, một việc gán riêng cho vợ sẽ nằm chung thông báo
  // với nhắc hạn của cả nhà — và thông báo đó gửi cho cả hai. Chồng khi đó
  // nhận được một dòng nói vợ có việc chưa làm, tức là app vừa thay lời tố.
  const buckets = new Map<string, { fireOn: ISODate; target: UUID | null; items: ReminderSource[] }>();

  const add = (fireOn: ISODate, target: UUID | null, item: ReminderSource): void => {
    // Ngày bắn đã qua thì bỏ — không nhắc về quá khứ.
    if (compareISODate(fireOn, today) < 0) return;
    if (compareISODate(fireOn, horizonEnd) > 0) return;
    const key = `${fireOn}|${target ?? ''}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.items.push(item);
    else buckets.set(key, { fireOn, target, items: [item] });
  };

  // Sự kiện, giấy tờ, khoản tiền: nhắc CẢ HAI, vì đó là việc của nhà (03 §5).
  for (const e of input.events) {
    if (e.nextOccurrenceDate === null) continue;
    add(addDays(e.nextOccurrenceDate, -e.remindLeadDays), null, {
      entityType: 'event',
      entityId: e.id,
      title: e.title,
      dueOn: e.nextOccurrenceDate,
    });

    // NHẮC KÉP (03 §5b): mốc thứ hai, 1-3 ngày trước, để chuẩn bị.
    //
    // Phần lớn sự cố gia đình không phải quên sự kiện, mà là nhớ sự kiện nhưng
    // quên phần chuẩn bị cho nó — nhớ thứ 7 con đi sinh nhật bạn Bin, quên mua
    // quà.
    //
    // Không cần xử lý đặc biệt cho trần 2 thông báo/ngày: nếu mốc này trùng
    // ngày với mốc nhắc sự kiện thì `add` gộp chúng vào cùng bucket theo đúng
    // khoá (ngày bắn, người nhận) sẵn có.
    if (e.prepLeadDays !== null) {
      add(addDays(e.nextOccurrenceDate, -e.prepLeadDays), null, {
        entityType: 'event',
        entityId: e.id,
        title: e.title,
        dueOn: e.nextOccurrenceDate,
        purpose: 'preparation',
      });
    }
  }

  for (const d of input.documents) {
    if (d.expiryDate === null) continue;
    add(addDays(d.expiryDate, -d.remindLeadDays), null, {
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
    add(addDays(due, -DEFAULT_LEAD_DAYS.payment), null, {
      entityType: 'upcoming_payment',
      entityId: p.id,
      title: p.name,
      dueOn: due,
    });
  }

  // VIỆC NHÀ — quy tắc người nhận là BẤT BIẾN (03 §5, 06 §7):
  //
  //   việc có assigneeId  → nhắc CHỈ người đó
  //   việc không gán ai   → nhắc cả hai
  //
  // KHÔNG BAO GIỜ tồn tại thông báo dạng "X chưa làm Y". App nhắc người có tên
  // bao nhiêu lần cũng được — đó chính là giá trị: người kia khỏi phải nhắc.
  // Nhưng khoảnh khắc app báo cho người thứ hai rằng người thứ nhất chưa làm,
  // nó thôi thay việc nhắc và bắt đầu THAY LỜI TỐ.
  for (const t of input.tasks) {
    if (t.status === 'done' || t.skipped) continue;
    add(addDays(t.dueDate, -DEFAULT_LEAD_DAYS.task), input.taskAssignees?.[t.taskId] ?? null, {
      entityType: 'task',
      entityId: t.id,
      title: input.taskTitles?.[t.taskId] ?? '',
      dueOn: t.dueDate,
    });
  }

  const drafts: ReminderDraft[] = [];
  for (const { fireOn, target, items } of buckets.values()) {
    items.sort((a, b) => compareISODate(a.dueOn, b.dueOn));
    drafts.push({ fireOn, fireHour: DEFAULT_REMIND_HOUR, targetMemberId: target, items });
  }
  drafts.sort((a, b) => compareISODate(a.fireOn, b.fireOn));
  return drafts;
}

/**
 * Áp trần MAX_REMINDERS_PER_DAY — "không quá 2 thông báo mỗi ngày CHO MỖI
 * NGƯỜI" (03 §5).
 *
 * Đếm theo CẶP (ngày, người nhận). Đếm theo ngày thôi thì thông báo của một
 * người sẽ ăn mất suất của người kia: vợ có 2 việc riêng là chồng không còn
 * nhận được nhắc hạn nào của cả nhà hôm đó.
 *
 * Vì buildReminders() đã gộp mọi mục cùng ngày cùng người thành MỘT draft, kết
 * quả bình thường luôn dưới trần. Hàm này là lưới an toàn cho trường hợp người
 * gọi tự thêm draft, và là chỗ duy nhất định nghĩa "trần".
 */
export function capPerDay(
  drafts: ReminderDraft[],
  maxPerDay: number = MAX_REMINDERS_PER_DAY,
): ReminderDraft[] {
  const count = new Map<string, number>();
  const out: ReminderDraft[] = [];
  for (const d of drafts) {
    const key = `${d.fireOn}|${d.targetMemberId ?? ''}`;
    const n = count.get(key) ?? 0;
    if (n >= maxPerDay) continue;
    count.set(key, n + 1);
    out.push(d);
  }
  return out;
}
