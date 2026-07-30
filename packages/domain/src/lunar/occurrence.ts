/**
 * Lần xảy ra kế tiếp của một ngày âm — 03 §3.
 *
 * `nextOccurrenceDate` trong DB là BẢN CACHE của phép tính này. Chỉ một nơi
 * được ghi nó: Edge Function `refresh-lunar-dates`. Không được có hai đường
 * code cùng tính lịch âm.
 */

import { compareISODate } from '../date/civil.js';
import type { ISODate } from '../types/base.js';
import { lunarToSolarClamped, solarToLunar, type LunarDate } from './convert.js';

/** Ngày âm lặp hằng năm — không có `year` vì năm chính là thứ ta đi tìm. */
export interface LunarAnniversary {
  day: number;
  /** 1..12 */
  month: number;
  /**
   * Sự kiện có ĐÁNH DẤU tháng nhuận hay không.
   *
   * Quy tắc 03 §3: nếu năm đó có tháng nhuận trùng `month` mà sự kiện KHÔNG
   * đánh dấu, dùng THÁNG THƯỜNG. Phần lớn giỗ rơi vào trường hợp này — người ta
   * nhớ "giỗ ông mười lăm tháng tám", không nhớ nhuận hay không.
   */
  isLeapMonth?: boolean;
}

/**
 * Ngày dương của lần xảy ra kế tiếp, tính từ (và bao gồm) ngày `after`.
 *
 * Trả về ngày trong năm âm hiện tại nếu chưa qua; nếu qua rồi thì năm âm kế.
 */
export function nextLunarOccurrence(l: LunarAnniversary, after: ISODate): ISODate {
  const isLeapMonth = l.isLeapMonth ?? false;
  const startLunarYear = solarToLunar(after).year;

  // Duyệt tối đa 3 năm âm: đủ để vượt qua cả trường hợp ngày âm đã qua trong
  // năm nay và trường hợp tháng nhuận đẩy ngày lùi lại.
  for (let i = 0; i <= 3; i += 1) {
    const candidate: LunarDate = {
      day: l.day,
      month: l.month,
      year: startLunarYear + i,
      isLeapMonth,
    };
    const solar = lunarToSolarClamped(candidate);
    if (compareISODate(solar, after) >= 0) {
      return solar;
    }
  }

  // Không thể xảy ra với dữ liệu hợp lệ, nhưng thà ném còn hơn trả ngày sai:
  // một ngày giỗ sai không báo lỗi, nó chỉ đơn giản không nhắc.
  throw new RangeError(
    `Không tìm được lần xảy ra kế tiếp của ${l.day}/${l.month} âm sau ${after}`,
  );
}

/** Lần xảy ra GẦN NHẤT ĐÃ QUA — dùng cho dòng "Năm ngoái: 3/10/2025" (05 §5.4). */
export function previousLunarOccurrence(l: LunarAnniversary, before: ISODate): ISODate | null {
  const isLeapMonth = l.isLeapMonth ?? false;
  const startLunarYear = solarToLunar(before).year;

  for (let i = 0; i <= 3; i += 1) {
    const candidate: LunarDate = {
      day: l.day,
      month: l.month,
      year: startLunarYear - i,
      isLeapMonth,
    };
    const solar = lunarToSolarClamped(candidate);
    if (compareISODate(solar, before) < 0) {
      return solar;
    }
  }
  return null;
}
