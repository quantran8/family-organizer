/**
 * Vật hoá việc lặp thành `task_instances` — 03 §4.
 *
 * Vì sao cần vật hoá thay vì tính lúc đọc: một lần lặp phải NHỚ ĐƯỢC nó đã xong
 * hay chưa. "Đổ rác hằng ngày" không phải một dòng trong danh sách, nó là 30
 * dòng mỗi tháng và mỗi dòng có trạng thái riêng — không có bản ghi thì không
 * có chỗ nào ghi "hôm thứ Ba đã đổ".
 *
 * Cửa sổ 90 ngày (03 §4). Đủ xa để lịch nhắc dựng trước được, đủ gần để không
 * sinh hàng nghìn dòng cho một việc hằng ngày kéo dài vô hạn.
 *
 * CHẠY LẠI ĐƯỢC. `unique (task_id, due_date)` ở schema là ràng buộc thật, và ở
 * đây dùng `upsert ... ignoreDuplicates` để lần chạy thứ hai không đụng gì tới
 * dòng đã có — nếu ghi đè, mọi lần đã đánh dấu xong sẽ bị xoá trạng thái.
 *
 * Cron: mỗi ngày. Cũng gọi được thẳng để vật hoá ngay sau khi tạo việc lặp mới.
 */

import { expandRecurrence, type ISODate, type Recurrence } from '@family-organizer/domain';

import { jsonResponse, serviceClient, todayInVN } from '../_shared/client.ts';

/** Cửa sổ vật hoá — 03 §4. */
const HORIZON_DAYS = 90;

/** Dòng `tasks` cần cho việc sinh instance. Chỉ lấy cột dùng tới. */
interface TaskRow {
  id: string;
  household_id: string;
  due_date: ISODate | null;
  recur: {
    freq: string | null;
    interval_n: number | null;
    byweekday: number[] | null;
    bymonthday: number | null;
    until_date: ISODate | null;
  } | null;
}

/** Composite `recurrence` của Postgres → `Recurrence` của domain. */
function toRecurrence(r: TaskRow['recur']): Recurrence | null {
  if (r === null || r.freq === null || r.freq === 'none') return null;
  return {
    freq: r.freq as Recurrence['freq'],
    intervalN: r.interval_n ?? 1,
    ...(r.byweekday ? { byWeekday: r.byweekday } : {}),
    ...(r.bymonthday !== null ? { byMonthDay: r.bymonthday } : {}),
    untilDate: r.until_date,
  };
}

function addDaysISO(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split('-').map(Number);
  const t = Date.UTC(y ?? 1970, (m ?? 1) - 1, (day ?? 1) + n);
  return new Date(t).toISOString().slice(0, 10);
}

Deno.serve(async () => {
  const supabase = serviceClient();
  const today = todayInVN();
  const horizon = addDaysISO(today, HORIZON_DAYS);

  // Chỉ việc LẶP và chưa xoá. Việc một lần sống trong `tasks`, không có instance.
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, household_id, due_date, recur')
    .is('deleted_at', null)
    .not('recur', 'is', null);

  if (error) return jsonResponse({ error: error.message }, 500);

  const rows: { task_id: string; household_id: string; due_date: ISODate }[] = [];
  let skipped = 0;

  for (const task of (tasks ?? []) as TaskRow[]) {
    const recur = toRecurrence(task.recur);
    // Việc lặp không có ngày neo thì không tính được lần nào — bỏ qua chứ không
    // đoán một mốc, vì mốc đoán sai sẽ sinh 90 dòng sai.
    if (recur === null || task.due_date === null) {
      skipped += 1;
      continue;
    }

    for (const due of expandRecurrence(recur, today, horizon, task.due_date)) {
      rows.push({ task_id: task.id, household_id: task.household_id, due_date: due });
    }
  }

  if (rows.length === 0) {
    return jsonResponse({ tasks: tasks?.length ?? 0, inserted: 0, skipped });
  }

  // `ignoreDuplicates` là điểm mấu chốt: lần chạy hôm nay gặp lại mọi ngày đã
  // sinh hôm qua, và ghi đè chúng sẽ xoá sạch trạng thái "đã xong".
  const { error: upsertError, count } = await supabase
    .from('task_instances')
    .upsert(rows, { onConflict: 'task_id,due_date', ignoreDuplicates: true, count: 'exact' });

  if (upsertError) return jsonResponse({ error: upsertError.message }, 500);

  return jsonResponse({
    tasks: tasks?.length ?? 0,
    candidates: rows.length,
    inserted: count ?? 0,
    skipped,
    window: { from: today, to: horizon },
  });
});
