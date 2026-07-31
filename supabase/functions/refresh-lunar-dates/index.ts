/**
 * `refresh-lunar-dates` — **NƠI DUY NHẤT** được ghi `events.next_occurrence_date`.
 *
 * Đây là ràng buộc #2 của cả dự án, và nó không phải quy ước phong cách:
 * `next_occurrence_date` là CACHE của một phép tính lịch âm phức tạp (03 §3).
 * Nếu có đường code thứ hai cùng tính rồi ghi xuống, hai đường sẽ lệch nhau ở
 * đúng những ca khó — tháng nhuận, ngày 30 ở tháng thiếu, giao thừa — và
 * **không có cách nào biết đường nào đúng**. Một ngày giỗ tính sai không ném
 * exception; nó chỉ đơn giản là không nhắc, và không ai biết cho tới khi đã muộn.
 *
 * Client CÓ tính lịch âm — dòng xem trước ở form sự kiện (05 §5.5) — nhưng chỉ
 * để HIỂN THỊ, không có đường nào từ đó xuống DB. Đó là lý do `EventInput` và
 * `eventSchema` cố ý không có trường này.
 *
 * Hai cách gọi:
 *   - `{ eventId }` — repository gọi ngay sau khi tạo/sửa một sự kiện, để ngày
 *     dương có mặt trong vài giây thay vì chờ tới cron đêm.
 *   - không body — cron mỗi ngày, quét mọi sự kiện âm lịch. Cần thiết vì ngày
 *     dương của một ngày âm ĐỔI mỗi năm: sau khi giỗ năm nay qua đi, bản ghi
 *     phải trỏ sang năm sau, và không có thao tác nào của người dùng kích hoạt
 *     việc đó.
 *
 * Sự kiện DƯƠNG lịch cũng được xử lý: `next_occurrence_date = solar_date`. Giữ
 * một cột duy nhất để sắp xếp là lý do view `home_feed` và tab Sự kiện không
 * phải biết sự kiện thuộc loại lịch nào.
 */

import { nextLunarOccurrence, type ISODate } from '@nhaminh/domain';

import { jsonResponse, serviceClient, todayInVN } from '../_shared/client.ts';

interface EventRow {
  id: string;
  calendar: 'solar' | 'lunar';
  solar_date: ISODate | null;
  lunar_day: number | null;
  lunar_month: number | null;
  lunar_leap_month: boolean;
  next_occurrence_date: ISODate | null;
}

/**
 * Ngày dương của lần xảy ra kế tiếp, hoặc `null` nếu không tính được.
 *
 * Sự kiện dương lịch MỘT LẦN đã qua vẫn giữ nguyên `solar_date`: nó là ngày
 * thật của sự kiện đó, không phải một dự đoán. Tab Sự kiện tự lọc ngày đã qua
 * (`groupEventsByMonth`), nên không cần xoá ở đây — và xoá thì màn chi tiết sẽ
 * mất luôn ngày.
 */
function computeNextOccurrence(row: EventRow, today: ISODate): ISODate | null {
  if (row.calendar === 'solar') return row.solar_date;

  if (row.lunar_day === null || row.lunar_month === null) return null;
  try {
    return nextLunarOccurrence(
      { day: row.lunar_day, month: row.lunar_month, isLeapMonth: row.lunar_leap_month },
      today,
    );
  } catch {
    // `nextLunarOccurrence` ném khi không tìm được lần kế tiếp trong 3 năm âm.
    // Trả null và ĐI TIẾP: một sự kiện hỏng không được làm cả cron dừng lại,
    // vì như vậy mọi sự kiện đứng sau nó cũng mất ngày.
    return null;
  }
}

Deno.serve(async (req) => {
  const supabase = serviceClient();
  const today = todayInVN();

  // Body rỗng là hợp lệ (cron gọi không body) — `req.json()` ném với body rỗng
  // nên phải bọc, nếu không cron chết ngay ở dòng đầu.
  let eventId: string | null = null;
  try {
    const body = (await req.json()) as { eventId?: string } | null;
    eventId = body?.eventId ?? null;
  } catch {
    eventId = null;
  }

  let query = supabase
    .from('events')
    .select('id, calendar, solar_date, lunar_day, lunar_month, lunar_leap_month, next_occurrence_date')
    .is('deleted_at', null);

  if (eventId !== null) {
    query = query.eq('id', eventId);
  }

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);

  const rows = (data ?? []) as EventRow[];
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const row of rows) {
    const next = computeNextOccurrence(row, today);
    if (next === null) {
      failed += 1;
      continue;
    }
    // Chỉ ghi khi GIÁ TRỊ ĐỔI. Ghi lại cùng một giá trị vẫn chạm trigger
    // `touch_updated_at`, và `updated_at` nhảy mỗi đêm cho mọi sự kiện sẽ làm
    // hỏng mọi thứ dựa vào nó để biết "có gì mới" — kể cả cache phía client.
    if (row.next_occurrence_date === next) {
      unchanged += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({ next_occurrence_date: next })
      .eq('id', row.id);

    if (updateError) {
      failed += 1;
      continue;
    }
    updated += 1;
  }

  return jsonResponse({ scanned: rows.length, updated, unchanged, failed, today });
});
