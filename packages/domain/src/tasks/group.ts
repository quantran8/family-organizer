/**
 * Gom việc theo hạn — 05 §5.1.
 *
 * Sáu nhóm cố định: Quá hạn · Hôm nay · Ngày mai · Tuần này · Sau đó · Không có hạn.
 *
 * Vì sao ở domain chứ không ở component: ranh giới "tuần này" là một quyết định
 * sản phẩm có ca biên thật (việc hạn Chủ nhật nhìn từ thứ Bảy thuộc nhóm nào),
 * và ca biên trong JSX là ca biên không có test. Hàm thuần ở đây nằm sau cổng
 * G1; cùng một hàm còn dùng lại được ở màn Nhà mình.
 *
 * "Tuần này" = từ ngày kia tới hết Chủ nhật của tuần đang chứa `today`. Tuần
 * bắt đầu Thứ Hai theo thói quen Việt Nam, không phải Chủ nhật như `weekdayOf`
 * trả về — hai thứ khác nhau và trộn chúng là cách tạo lỗi lệch một ngày.
 *
 * Nhóm rỗng KHÔNG bị loại ở đây: `groupTasksByDue` trả đủ sáu nhóm theo đúng
 * thứ tự hiển thị, còn ẩn nhóm rỗng là việc của UI (05 §4). Trả về mảng thưa
 * thì mỗi chỗ gọi lại phải tự nhớ thứ tự.
 */

import { addDays, compareISODate, daysBetween, weekdayOf } from '../date/civil.ts';
import type { ISODate } from '../types/base.ts';
import type { Task } from '../types/entities.ts';

export type TaskGroupKey = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_due';

/** Thứ tự hiển thị, cố định. Gần nhất lên trước; không có hạn xuống cuối. */
export const TASK_GROUP_ORDER: readonly TaskGroupKey[] = [
  'overdue',
  'today',
  'tomorrow',
  'this_week',
  'later',
  'no_due',
] as const;

export interface TaskGroup {
  key: TaskGroupKey;
  tasks: Task[];
}

/**
 * Chủ nhật cuối tuần đang chứa `d`, với tuần bắt đầu từ Thứ Hai.
 *
 * `weekdayOf` trả 0 = Chủ nhật. Với tuần bắt đầu Thứ Hai thì chính Chủ nhật là
 * ngày CUỐI tuần đó, nên nó trả về chính nó — không phải cộng thêm 6 ngày.
 */
export function endOfWeek(d: ISODate): ISODate {
  const wd = weekdayOf(d);
  return wd === 0 ? d : addDays(d, 7 - wd);
}

/** Nhóm của một ngày đến hạn. `null` (không có hạn) → `no_due`. */
export function taskGroupOf(dueDate: ISODate | null, today: ISODate): TaskGroupKey {
  if (dueDate === null) return 'no_due';

  const diff = daysBetween(today, dueDate);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';

  // Từ ngày kia trở đi mới xét tới ranh giới tuần — nếu không, việc hạn ngày mai
  // nhìn từ thứ Bảy sẽ rơi vào "Sau đó" chỉ vì nó đã sang tuần sau.
  return compareISODate(dueDate, endOfWeek(today)) <= 0 ? 'this_week' : 'later';
}

/**
 * Gom việc `todo` thành sáu nhóm.
 *
 * Việc đã xong bị LOẠI: danh sách Việc trả lời "còn gì phải làm", và giữ lại
 * việc đã xong biến nó thành nhật ký. Lịch sử việc lặp có chỗ riêng ở màn chi
 * tiết ("5 lần gần nhất đã xong", 05 §5.2).
 *
 * Trong mỗi nhóm: sắp theo ngày tăng dần, việc không có hạn giữ nguyên thứ tự
 * đầu vào (repository đã sắp theo ngày tạo).
 */
export function groupTasksByDue(tasks: Task[], today: ISODate): TaskGroup[] {
  const buckets = new Map<TaskGroupKey, Task[]>(TASK_GROUP_ORDER.map((k) => [k, []]));

  for (const task of tasks) {
    if (task.status === 'done') continue;
    buckets.get(taskGroupOf(task.dueDate, today))?.push(task);
  }

  for (const [key, list] of buckets) {
    if (key === 'no_due') continue;
    list.sort((a, b) => compareISODate(a.dueDate ?? '', b.dueDate ?? ''));
  }

  return TASK_GROUP_ORDER.map((key) => ({ key, tasks: buckets.get(key) ?? [] }));
}

/**
 * Chia hai danh sách — 03 §4b.
 *
 * Hai loại việc khác bản chất, ép chung một mô hình thì hỏng cả hai: danh sách
 * định kỳ bị lấp bởi việc vặt không hạn, còn việc vặt mang một cái hạn giả mà
 * không ai định đặt.
 *
 * Chia theo `list`, KHÔNG suy từ `recur`. Người dùng đổi được phân loại này, và
 * một việc `flexible` lỡ có `recur` vẫn phải nằm ở nơi người dùng đặt nó.
 */
export function splitTaskLists(tasks: Task[]): { recurring: Task[]; flexible: Task[] } {
  const recurring: Task[] = [];
  const flexible: Task[] = [];
  for (const t of tasks) {
    if (t.list === 'recurring') recurring.push(t);
    else flexible.push(t);
  }
  return { recurring, flexible };
}

/**
 * Sắp danh sách việc linh hoạt: chưa xong trước, rồi giữ nguyên thứ tự đầu vào
 * (repository đã sắp theo ngày tạo).
 *
 * KHÔNG BAO GIỜ SẮP HAY NHÓM THEO NGƯỜI. Một danh sách tồn đọng xếp theo tên là
 * hai cột trong đó một cột dài hơn — và đó là bảng điểm giữa hai vợ chồng.
 * Test `orderFlexibleTasks` khẳng định kết quả không đổi khi hoán vị assigneeId
 * của đầu vào; nếu ai đó thêm một tiêu chí sắp có dính tới người, test sẽ đỏ.
 *
 * Khác groupTasksByDue: việc đã xong KHÔNG bị loại. Danh sách linh hoạt tự dọn
 * chậm — người ta cần thấy thứ mình vừa tick, và nó mờ đi chứ không biến mất.
 */
export function orderFlexibleTasks(tasks: Task[]): Task[] {
  const todo: Task[] = [];
  const done: Task[] = [];
  for (const t of tasks) {
    if (t.status === 'done') done.push(t);
    else todo.push(t);
  }
  return [...todo, ...done];
}
