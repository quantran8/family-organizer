/**
 * Việc lặp lại — 03 §4.
 *
 * KHÔNG dùng RRULE đầy đủ — chỉ cần hằng ngày / thứ trong tuần / ngày trong
 * tháng / hằng năm. Cửa sổ vật hoá 90 ngày.
 */

import {
  addDays,
  addMonthsClamped,
  addYearsClamped,
  compareISODate,
  daysBetween,
  daysInMonth,
  formatISODate,
  parseISODate,
  weekdayOf,
} from '../date/civil.js';
import type { ISODate, Recurrence } from '../types/base.js';
import type { Task } from '../types/entities.js';

/** Chặn trên số lần lặp sinh ra trong một lần gọi — lưới an toàn chống vòng lặp vô hạn. */
const MAX_OCCURRENCES = 1000;

/**
 * Liệt kê các ngày đến hạn trong khoảng [from, to], theo quy tắc `r`, neo vào
 * `anchor` (ngày đến hạn đầu tiên của việc).
 *
 * Ngày 29–31 rơi vào tháng ngắn → LÙI VỀ NGÀY CUỐI THÁNG. Ví dụ "kiểm tra hoá
 * đơn điện ngày 31" thì tháng 2 rơi vào 28 hoặc 29.
 */
export function expandRecurrence(
  r: Recurrence,
  from: ISODate,
  to: ISODate,
  anchor: ISODate,
): ISODate[] {
  if (r.freq === 'none') {
    return compareISODate(anchor, from) >= 0 && compareISODate(anchor, to) <= 0 ? [anchor] : [];
  }
  if (compareISODate(from, to) > 0) return [];

  const step = Math.max(1, Math.trunc(r.intervalN));
  const until = r.untilDate ?? null;
  const hardStop = until !== null && compareISODate(until, to) < 0 ? until : to;

  const out: ISODate[] = [];
  const push = (d: ISODate): void => {
    if (compareISODate(d, from) >= 0 && compareISODate(d, hardStop) <= 0) out.push(d);
  };

  switch (r.freq) {
    case 'daily': {
      // Nhảy thẳng tới lần lặp đầu tiên >= from thay vì lặp từ anchor — với
      // anchor cũ nhiều năm, lặp từng ngày là hàng nghìn vòng vô ích.
      let cursor = anchor;
      if (compareISODate(cursor, from) < 0) {
        const gap = daysBetween(anchor, from);
        cursor = addDays(anchor, Math.ceil(gap / step) * step);
      }
      for (let i = 0; i < MAX_OCCURRENCES && compareISODate(cursor, hardStop) <= 0; i += 1) {
        push(cursor);
        cursor = addDays(cursor, step);
      }
      break;
    }

    case 'weekly': {
      // byWeekday rỗng → dùng thứ của chính anchor.
      const weekdays =
        r.byWeekday && r.byWeekday.length > 0
          ? [...new Set(r.byWeekday)].sort((a, b) => a - b)
          : [weekdayOf(anchor)];

      // Tuần neo = tuần chứa anchor, bắt đầu từ Chủ nhật.
      const anchorWeekStart = addDays(anchor, -weekdayOf(anchor));
      let weekStart = anchorWeekStart;
      if (compareISODate(weekStart, from) < 0) {
        const weeksGap = Math.floor(daysBetween(anchorWeekStart, from) / 7);
        weekStart = addDays(anchorWeekStart, Math.floor(weeksGap / step) * step * 7);
      }
      for (let i = 0; i < MAX_OCCURRENCES && compareISODate(weekStart, hardStop) <= 0; i += 1) {
        for (const wd of weekdays) {
          const d = addDays(weekStart, wd);
          if (compareISODate(d, anchor) >= 0) push(d);
        }
        weekStart = addDays(weekStart, step * 7);
      }
      break;
    }

    case 'monthly': {
      const a = parseISODate(anchor);
      // byMonthDay không đặt → dùng ngày của anchor.
      const wantDay = r.byMonthDay ?? a.day;
      let cursor = formatISODate({ year: a.year, month: a.month, day: 1 });
      for (let i = 0; i < MAX_OCCURRENCES; i += 1) {
        const c = parseISODate(cursor);
        // Kẹp về ngày cuối tháng: "ngày 31" ở tháng 2 thành 28/29.
        const d = formatISODate({
          year: c.year,
          month: c.month,
          day: Math.min(wantDay, daysInMonth(c.year, c.month)),
        });
        if (compareISODate(d, hardStop) > 0) break;
        if (compareISODate(d, anchor) >= 0) push(d);
        cursor = addMonthsClamped(cursor, step);
      }
      break;
    }

    case 'yearly': {
      let cursor = anchor;
      for (let i = 0; i < MAX_OCCURRENCES && compareISODate(cursor, hardStop) <= 0; i += 1) {
        push(cursor);
        cursor = addYearsClamped(cursor, step);
      }
      break;
    }
  }

  out.sort(compareISODate);
  return out;
}

/**
 * Ngày đến hạn kế tiếp của một việc, sau (không bao gồm) `after`.
 * Trả null nếu việc không lặp và đã qua hạn, hoặc đã hết `untilDate`.
 */
export function nextDue(t: Task, after: ISODate): ISODate | null {
  if (t.dueDate === null) return null;

  if (t.recur === null || t.recur.freq === 'none') {
    return compareISODate(t.dueDate, after) > 0 ? t.dueDate : null;
  }

  // Cửa sổ hai năm: đủ cho mọi tần suất, kể cả 'yearly' với intervalN lớn.
  const horizon = addYearsClamped(after, 2);
  const from = addDays(after, 1);
  const dates = expandRecurrence(t.recur, from, horizon, t.dueDate);
  return dates[0] ?? null;
}
