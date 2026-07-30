/**
 * Số học ngày dương lịch trên chuỗi 'YYYY-MM-DD'.
 *
 * CỐ Ý không dùng `new Date(string)`: nó phân giải theo múi giờ của máy, nên
 * cùng một chuỗi cho ra ngày khác nhau ở Hermes và ở Deno. Toàn bộ app neo vào
 * UTC+7 (03 §3), và cách duy nhất để chắc chắn là tự tính.
 *
 * Không hàm nào ở đây đọc đồng hồ — "hôm nay" luôn là tham số truyền vào.
 */

import type { ISODate } from '../types/base.ts';

export interface CivilDate {
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(d: ISODate): CivilDate {
  const m = ISO_DATE_RE.exec(d);
  if (!m) throw new RangeError(`Ngày không hợp lệ: ${d}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) throw new RangeError(`Tháng không hợp lệ: ${d}`);
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`Ngày không hợp lệ: ${d}`);
  }
  return { year, month, day };
}

export function formatISODate(c: CivilDate): ISODate {
  const y = String(c.year).padStart(4, '0');
  const m = String(c.month).padStart(2, '0');
  const d = String(c.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      throw new RangeError(`Tháng không hợp lệ: ${month}`);
  }
}

/**
 * Julian Day Number của 00:00 ngày dương lịch (lịch Gregory).
 * Thuật toán Fliegel–Van Flandern. Đây là đơn vị chung để cộng/trừ ngày và
 * cũng là đầu vào của thuật toán lịch âm.
 */
export function toJulianDayNumber(c: CivilDate): number {
  const a = Math.floor((14 - c.month) / 12);
  const y = c.year + 4800 - a;
  const m = c.month + 12 * a - 3;
  return (
    c.day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function fromJulianDayNumber(jdn: number): CivilDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: b * 100 + d - 4800 + Math.floor(m / 10),
  };
}

export function jdnOf(d: ISODate): number {
  return toJulianDayNumber(parseISODate(d));
}

export function isoOfJdn(jdn: number): ISODate {
  return formatISODate(fromJulianDayNumber(jdn));
}

/** Số ngày từ `from` tới `to`. Dương nghĩa là `to` sau `from`. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return jdnOf(to) - jdnOf(from);
}

export function addDays(d: ISODate, n: number): ISODate {
  return isoOfJdn(jdnOf(d) + n);
}

/**
 * Cộng tháng, kẹp ngày về cuối tháng khi tháng đích ngắn hơn.
 * "Ngày 31" cộng một tháng từ tháng 1 ra 28/2 (hoặc 29/2 năm nhuận) — 03 §4.
 */
export function addMonthsClamped(d: ISODate, n: number): ISODate {
  const c = parseISODate(d);
  const total = c.year * 12 + (c.month - 1) + n;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return formatISODate({ year, month, day: Math.min(c.day, daysInMonth(year, month)) });
}

/** Cộng năm, kẹp 29/2 về 28/2 ở năm không nhuận. */
export function addYearsClamped(d: ISODate, n: number): ISODate {
  const c = parseISODate(d);
  const year = c.year + n;
  return formatISODate({ year, month: c.month, day: Math.min(c.day, daysInMonth(year, c.month)) });
}

/** 0 = Chủ nhật … 6 = Thứ Bảy. Khớp `Recurrence.byWeekday`. */
export function weekdayOf(d: ISODate): number {
  return (jdnOf(d) + 1) % 7;
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minISODate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxISODate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}
