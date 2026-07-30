/**
 * Định dạng ngày — 03 §8.
 *
 * Trả về NGUYÊN LIỆU có tham số, không phải câu tiếng Việt: domain là hàm thuần
 * không biết gì về UI, và bảng từ vựng (04 §7) phải kiểm được bằng một lần grep
 * trong i18n. Xem chú thích tương tự ở finance/status.ts.
 *
 * Ngôn ngữ dùng trong nhãn phải theo 04 §7: không viết "quá hạn" thành "vi
 * phạm", không viết "cần chú ý" thành "cảnh báo".
 */

import { daysBetween, parseISODate, weekdayOf } from '../date/civil.ts';
import type { ISODate } from '../types/base.ts';
import { solarToLunar } from '../lunar/convert.ts';
import type { FamilyEvent } from '../types/entities.ts';

/**
 * Nhãn hạn: "Hôm nay" · "Ngày mai" · "Còn 5 ngày" · "Quá hạn 2 ngày".
 * i18n dựng chuỗi từ shape này.
 */
export type DueLabel =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'yesterday' }
  | { kind: 'in_days'; days: number }
  | { kind: 'overdue_days'; days: number };

export function formatDueLabel(d: ISODate, today: ISODate): DueLabel {
  const days = daysBetween(today, d);
  if (days === 0) return { kind: 'today' };
  if (days === 1) return { kind: 'tomorrow' };
  if (days === -1) return { kind: 'yesterday' };
  if (days > 0) return { kind: 'in_days', days };
  return { kind: 'overdue_days', days: -days };
}

/**
 * Nhãn lịch âm: "15/8 âm — Chủ nhật 5/10".
 *
 * Trả cả hai vế; 05 §5.3 yêu cầu hiện CẢ HAI ngày và không giấu ngày âm — đây
 * là điểm khác biệt bản địa rõ nhất.
 *
 * `null` khi sự kiện dương lịch hoặc chưa có nextOccurrenceDate.
 */
export interface LunarLabel {
  lunarDay: number;
  lunarMonth: number;
  isLeapMonth: boolean;
  /** Ngày dương tương ứng, nếu đã biết. */
  solarDate: ISODate | null;
  /** 0 = Chủ nhật … 6 = Thứ Bảy. null khi chưa có solarDate. */
  weekday: number | null;
  solarDay: number | null;
  solarMonth: number | null;
}

export function formatLunarLabel(e: FamilyEvent): LunarLabel | null {
  if (e.calendar !== 'lunar') return null;
  if (e.lunarDay === null || e.lunarMonth === null) return null;

  const solar = e.nextOccurrenceDate;
  if (solar === null) {
    return {
      lunarDay: e.lunarDay,
      lunarMonth: e.lunarMonth,
      isLeapMonth: e.lunarLeapMonth,
      solarDate: null,
      weekday: null,
      solarDay: null,
      solarMonth: null,
    };
  }

  const c = parseISODate(solar);
  return {
    lunarDay: e.lunarDay,
    lunarMonth: e.lunarMonth,
    isLeapMonth: e.lunarLeapMonth,
    solarDate: solar,
    weekday: weekdayOf(solar),
    solarDay: c.day,
    solarMonth: c.month,
  };
}

/** Nhãn âm lịch cho một ngày dương bất kỳ — dùng cho khối ngày trên Nhà mình. */
export function lunarLabelOfDate(d: ISODate): { day: number; month: number; isLeapMonth: boolean } {
  const l = solarToLunar(d);
  return { day: l.day, month: l.month, isLeapMonth: l.isLeapMonth };
}
