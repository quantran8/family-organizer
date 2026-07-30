/**
 * Lịch âm Việt Nam — 03 §3.
 *
 * Thuật toán Hồ Ngọc Đức (dựa trên tính toán thiên văn của Jean Meeus), port
 * sang TypeScript thuần. Múi giờ CỐ ĐỊNH UTC+7 — lịch âm Việt Nam khác lịch âm
 * Trung Quốc đúng ở chỗ này, và một số ngày Tết lệch nhau một ngày vì nó.
 *
 * NGÀY ÂM LÀ DỮ LIỆU GỐC. Với giỗ và sinh nhật âm, lưu lunarDay/lunarMonth/
 * lunarLeapMonth; ngày dương được TÍNH RA mỗi năm. Lưu ngày dương rồi cộng 365
 * sẽ sai ngay năm nhuận âm.
 *
 * Đây là chỗ lỗi im lặng nguy hiểm nhất trong cả app: một ngày giỗ sai không
 * báo lỗi, nó chỉ đơn giản không nhắc.
 */

import {
  fromJulianDayNumber,
  isoOfJdn,
  jdnOf,
  toJulianDayNumber,
  type CivilDate,
} from '../date/civil.ts';
import type { ISODate } from '../types/base.ts';

/** Múi giờ Việt Nam, tính bằng phần của ngày. UTC+7 = 7/24. */
const TIMEZONE = 7 / 24;

export interface LunarDate {
  day: number;
  /** 1..12 */
  month: number;
  year: number;
  /** true nếu đây là tháng nhuận của năm âm đó */
  isLeapMonth: boolean;
}

/**
 * Julian Day của kỳ Sóc (New Moon) thứ k tính từ 1900-01-01.
 * Meeus, "Astronomical Algorithms" ch.49.
 */
function newMoonJd(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;

  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  // Mean anomaly của Mặt Trời, của Mặt Trăng, và argument of latitude
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(dr * 2 * Mpr) -
    0.0004 * Math.sin(dr * 3 * Mpr) +
    0.0104 * Math.sin(dr * 2 * F) -
    0.0051 * Math.sin(dr * (M + Mpr)) -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M)) -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr)) +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));

  let deltat: number;
  if (T < -11) {
    deltat =
      0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }

  return Jd1 + C1 - deltat;
}

/**
 * Kinh độ Mặt Trời tại thời điểm jdn (00:00 UTC), trả về số trong [0,11]:
 * 0 = Xuân phân, 1 = 15°, … Mỗi đơn vị là 30 độ.
 */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;

  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

  let DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);

  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
}

/** Ngày Sóc (đầu tháng âm) thứ k, quy về ngày địa phương UTC+7. */
function getNewMoonDay(k: number): number {
  return Math.floor(newMoonJd(k) + 0.5 + TIMEZONE);
}

/** Ngày bắt đầu tháng 11 âm của năm dương `year` (tháng chứa Đông chí). */
function getLunarMonth11(year: number): number {
  const off = toJulianDayNumber({ year, month: 12, day: 31 }) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k);
  const sunLong = getSunLongitudeLocal(nm);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1);
  }
  return nm;
}

function getSunLongitudeLocal(dayNumber: number): number {
  return sunLongitude(dayNumber - 0.5 - TIMEZONE);
}

/** Xác định tháng nhuận: offset (tính từ tháng 11) của tháng nhuận trong năm âm. */
function getLeapMonthOffset(a11: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitudeLocal(getNewMoonDay(k + i));
  do {
    last = arc;
    i += 1;
    arc = getSunLongitudeLocal(getNewMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Chuyển ngày dương sang ngày âm. */
export function solarToLunar(d: ISODate): LunarDate {
  const dayNumber = jdnOf(d);
  const civil: CivilDate = fromJulianDayNumber(dayNumber);

  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k);
  }

  let a11 = getLunarMonth11(civil.year);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = civil.year;
    a11 = getLunarMonth11(civil.year - 1);
  } else {
    lunarYear = civil.year + 1;
    b11 = getLunarMonth11(civil.year + 1);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeapMonth: lunarLeap };
}

/**
 * Chuyển ngày âm sang ngày dương.
 *
 * Ném RangeError nếu ngày âm không tồn tại (ví dụ ngày 30 của một tháng thiếu).
 * Người gọi muốn hành vi "lùi về ngày cuối tháng" thì dùng
 * lunarToSolarClamped().
 */
export function lunarToSolar(l: LunarDate): ISODate {
  let a11: number;
  let b11: number;
  if (l.month < 11) {
    a11 = getLunarMonth11(l.year - 1);
    b11 = getLunarMonth11(l.year);
  } else {
    a11 = getLunarMonth11(l.year);
    b11 = getLunarMonth11(l.year + 1);
  }

  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = l.month - 11;
  if (off < 0) {
    off += 12;
  }

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (l.isLeapMonth && l.month !== leapMonth) {
      throw new RangeError(`Năm ${l.year} không có tháng nhuận ${l.month}`);
    }
    if (l.isLeapMonth || off >= leapOff) {
      off += 1;
    }
  } else if (l.isLeapMonth) {
    throw new RangeError(`Năm âm ${l.year} không có tháng nhuận`);
  }

  const monthStart = getNewMoonDay(k + off);
  const monthLength = getNewMoonDay(k + off + 1) - monthStart;
  if (l.day < 1 || l.day > monthLength) {
    throw new RangeError(
      `Tháng ${l.month}${l.isLeapMonth ? ' nhuận' : ''} năm ${l.year} chỉ có ${monthLength} ngày`,
    );
  }

  return isoOfJdn(monthStart + l.day - 1);
}

/**
 * Như lunarToSolar nhưng ngày 30 rơi vào tháng thiếu (29 ngày) thì LÙI VỀ 29 —
 * 03 §3.
 *
 * Cũng xử lý tháng nhuận theo quy tắc ở 03 §3: nếu năm đó có tháng nhuận trùng
 * `month` mà sự kiện KHÔNG đánh dấu isLeapMonth, dùng tháng thường.
 */
export function lunarToSolarClamped(l: LunarDate): ISODate {
  try {
    return lunarToSolar(l);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    // Ngày 30 ở tháng thiếu → lùi 29. Tháng nhuận không tồn tại → dùng tháng thường.
    if (l.isLeapMonth) {
      return lunarToSolarClamped({ ...l, isLeapMonth: false });
    }
    if (l.day > 29) {
      return lunarToSolarClamped({ ...l, day: 29 });
    }
    throw e;
  }
}

/** Số ngày của một tháng âm. Dùng để biết tháng đủ (30) hay thiếu (29). */
export function lunarMonthLength(year: number, month: number, isLeapMonth: boolean): number {
  const probe: LunarDate = { day: 1, month, year, isLeapMonth };
  const start = jdnOf(lunarToSolar(probe));
  // Thử ngày 30; nếu ném thì tháng này thiếu.
  try {
    const end = jdnOf(lunarToSolar({ ...probe, day: 30 }));
    return end - start + 1;
  } catch {
    return 29;
  }
}
