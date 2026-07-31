/**
 * Gom sự kiện theo tháng — 05 §5.3.
 *
 * "Danh sách theo thời gian, sắp theo `nextOccurrenceDate`. Chia mốc theo tháng."
 *
 * Vì sao ở domain: hai ca biên thật mà JSX không test được.
 *
 *   1. **`nextOccurrenceDate === null`.** Sự kiện âm lịch vừa tạo chưa được Edge
 *      `refresh-lunar-dates` tính, nên cache còn rỗng (02 §7). Chúng KHÔNG được
 *      biến mất khỏi danh sách — người dùng vừa bấm Lưu và phải thấy nó ở đâu
 *      đó, nếu không họ tưởng thao tác hỏng. Chúng dồn xuống một nhóm cuối.
 *   2. **Sự kiện đã qua.** `next_occurrence_date` của sự kiện âm lịch luôn trỏ
 *      tương lai, nhưng sự kiện dương lịch một lần thì không. Lọc chúng ở đây
 *      thay vì ở mỗi màn hình.
 */

import { compareISODate, parseISODate } from '../date/civil.ts';
import type { ISODate } from '../types/base.ts';
import type { FamilyEvent } from '../types/entities.ts';

export interface EventMonthGroup {
  /** `YYYY-MM`. `null` = nhóm "chưa tính được ngày". */
  month: string | null;
  year: number | null;
  /** 1..12. `null` khi `month` là null. */
  monthNumber: number | null;
  events: FamilyEvent[];
}

/**
 * Gom sự kiện SẮP TỚI theo tháng dương lịch.
 *
 * Sắp theo `nextOccurrenceDate` tăng dần. Sự kiện chưa có ngày xuống nhóm cuối
 * (`month: null`) thay vì bị loại — xem chú thích đầu file.
 *
 * `from` thường là hôm nay. Sự kiện có ngày trước `from` bị loại: danh sách này
 * trả lời "sắp tới có gì", không phải "đã có gì".
 */
export function groupEventsByMonth(events: FamilyEvent[], from: ISODate): EventMonthGroup[] {
  const dated: FamilyEvent[] = [];
  const undated: FamilyEvent[] = [];

  for (const e of events) {
    if (e.nextOccurrenceDate === null) {
      undated.push(e);
      continue;
    }
    if (compareISODate(e.nextOccurrenceDate, from) < 0) continue;
    dated.push(e);
  }

  dated.sort((a, b) =>
    compareISODate(a.nextOccurrenceDate ?? '', b.nextOccurrenceDate ?? ''),
  );

  const groups: EventMonthGroup[] = [];
  for (const e of dated) {
    // `nextOccurrenceDate` chắc chắn khác null ở đây — `dated` đã lọc.
    const iso = e.nextOccurrenceDate as ISODate;
    const c = parseISODate(iso);
    const key = iso.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === key) {
      last.events.push(e);
    } else {
      groups.push({ month: key, year: c.year, monthNumber: c.month, events: [e] });
    }
  }

  if (undated.length > 0) {
    groups.push({ month: null, year: null, monthNumber: null, events: undated });
  }

  return groups;
}
