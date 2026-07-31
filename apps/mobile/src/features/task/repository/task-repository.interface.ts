/**
 * Hợp đồng đọc/ghi của Việc nhà — 02 §4.
 *
 * Đúng HAI trạng thái: todo / done (schema §0). Không "đang làm", không "chờ
 * xác nhận" — phê duyệt núp bóng, theo nguyên tắc "không biến gia đình thành
 * dự án".
 */

import type { ISODate, Recurrence, Task, TaskInstance, UUID } from '@family-organizer/domain';

export interface TaskInput {
  title: string;
  notes: string | null;
  assigneeId: UUID | null;
  dueDate: ISODate | null;
  dueTime: string | null;
  recur: Recurrence | null;
  remindLeadDays: number;
  /** Ngữ cảnh: việc này chuẩn bị cho sự kiện nào. Sự kiện là HUB (05 §5.4). */
  eventId: UUID | null;
}

export interface TaskRepository {
  list(hh: UUID): Promise<Task[]>;
  get(hh: UUID, id: UUID): Promise<Task | null>;
  create(hh: UUID, input: TaskInput): Promise<Task>;
  update(hh: UUID, id: UUID, patch: Partial<TaskInput>): Promise<Task>;
  /** Đánh dấu xong. Việc lặp tác động lên instance, không lên task gốc. */
  setDone(hh: UUID, id: UUID, done: boolean, memberId: UUID | null): Promise<void>;
  setInstanceDone(
    hh: UUID,
    instanceId: UUID,
    done: boolean,
    memberId: UUID | null,
  ): Promise<void>;
  /** Hoãn = đổi due_date, trung thực hơn một state riêng (schema §0). */
  reschedule(hh: UUID, id: UUID, dueDate: ISODate): Promise<void>;
  listInstances(hh: UUID, from: ISODate, to: ISODate): Promise<TaskInstance[]>;
  /** 5 lần gần nhất đã xong — trả lời "tuần trước có đổ rác không" (05 §5.2). */
  recentDoneInstances(hh: UUID, taskId: UUID, limit: number): Promise<TaskInstance[]>;
  listByEvent(hh: UUID, eventId: UUID): Promise<Task[]>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
