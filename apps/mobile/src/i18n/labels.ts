/**
 * Cầu nối: shape từ @nhaminh/domain → câu tiếng Việt.
 *
 * Domain trả về NGUYÊN LIỆU có tham số (mã lý do, kiểu nhãn), không trả chuỗi
 * hiển thị — nó là hàm thuần chạy ở cả Hermes lẫn Deno và không biết gì về UI.
 * Đây là chỗ duy nhất ghép nguyên liệu đó thành câu.
 */

import {
  formatMoney,
  formatMoneyShort,
  type DueLabel,
  type FinanceReason,
  type FinanceStatus,
  type LunarLabel,
  type MoneyEventShape,
} from '@nhaminh/domain';

import { interpolate, vi } from './vi';

/** Nhãn một từ cho trạng thái tài chính. Luôn đi kèm câu giải thích. */
export function financeStatusLabel(s: FinanceStatus): string {
  return vi.financeStatus[s];
}

/**
 * MỘT CÂU nói vì sao — 03 §1.
 * Nhãn màu không kèm lý do sẽ bị đọc là phán xét.
 */
export function financeReasonText(r: FinanceReason): string {
  const m = vi.financeStatus;
  switch (r.kind) {
    case 'no_data':
      return m.reasonNoData;
    case 'overdue':
      return interpolate(m.reasonOverdue, { count: r.count });
    case 'not_enough':
      return m.reasonNotEnough;
    case 'attention':
      return interpolate(m.reasonAttention, { count: r.count });
    case 'due_soon':
      return interpolate(m.reasonDueSoon, { count: r.count });
    case 'stale':
      return interpolate(m.reasonStale, { days: r.daysAgo });
    case 'ok':
      return m.reasonOk;
  }
}

/** "Hôm nay" · "Ngày mai" · "Còn 5 ngày" · "Quá hạn 2 ngày" */
export function dueLabelText(d: DueLabel): string {
  const m = vi.dueLabel;
  switch (d.kind) {
    case 'today':
      return m.today;
    case 'tomorrow':
      return m.tomorrow;
    case 'yesterday':
      return m.yesterday;
    case 'in_days':
      return interpolate(m.inDays, { days: d.days });
    case 'overdue_days':
      return interpolate(m.overdueDays, { days: d.days });
  }
}

/**
 * "Cập nhật hôm nay" / "Cập nhật quá hạn 3 ngày" — độ mới của số liệu tiền.
 *
 * Dùng lại `formatDueLabel` thay vì tự trừ ngày: cùng một cách nói về khoảng
 * cách thời gian ở mọi chỗ trong app. "Còn N ngày" không xuất hiện được ở đây
 * (một lần cập nhật luôn nằm trong quá khứ), nhưng vẫn xử lý để hàm tổng quát.
 */
export function lastUpdatedText(d: DueLabel): string {
  return interpolate(vi.financeStatus.lastUpdated, { label: dueLabelText(d) });
}

export function weekdayName(w: number): string {
  const names = [
    vi.weekday[0],
    vi.weekday[1],
    vi.weekday[2],
    vi.weekday[3],
    vi.weekday[4],
    vi.weekday[5],
    vi.weekday[6],
  ];
  return names[w] ?? '';
}

export function weekdayShort(w: number): string {
  const names = [
    vi.weekday.short0,
    vi.weekday.short1,
    vi.weekday.short2,
    vi.weekday.short3,
    vi.weekday.short4,
    vi.weekday.short5,
    vi.weekday.short6,
  ];
  return names[w] ?? '';
}

/** "5/10" — ngày dương gọn cho dòng danh sách. */
export function shortSolarDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(day)}/${Number(month)}`;
}

/** "5/10/2025" — đủ năm, cho dòng "Năm ngoái". */
export function fullSolarDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)}/${Number(month)}/${year}`;
}

/**
 * "15/8 âm — Chủ nhật 5/10" — 03 §8.
 * Hiện CẢ HAI ngày; đây là điểm khác biệt bản địa rõ nhất, đừng giấu (05 §5.3).
 */
export function lunarLabelText(l: LunarLabel): string {
  const lunar = `${l.lunarDay}/${l.lunarMonth}${l.isLeapMonth ? ' nhuận' : ''}`;
  if (l.solarDate === null || l.weekday === null) {
    return `${lunar} âm`;
  }
  return interpolate(vi.event.lunarBoth, {
    lunar,
    weekday: weekdayName(l.weekday),
    solar: shortSolarDate(l.solarDate),
  });
}

/** Dòng xem trước trong form sự kiện — không có nó, người dùng không tin app hiểu lịch âm. */
export function lunarPreviewText(solarDate: string, weekday: number): string {
  return interpolate(vi.event.lunarPreview, {
    weekday: weekdayName(weekday),
    date: shortSolarDate(solarDate),
  });
}

/** Mô tả một thay đổi tiền — dùng ở money/changes.tsx và mục "Thay đổi gần nhất". */
export function moneyEventText(shape: MoneyEventShape, currency: string): string {
  const m = vi.money;
  switch (shape.kind) {
    case 'transition':
      return interpolate(m.changeTransition, {
        before: formatMoneyShort(shape.before, currency),
        after: formatMoneyShort(shape.after, currency),
      });
    case 'initial':
      return interpolate(m.changeInitial, {
        after: formatMoneyShort(shape.after, currency),
      });
    case 'settled':
      return m.changeSettled;
    case 'bare':
      return '';
  }
}

/**
 * Chênh lệch có dấu: "+12 triệu" / "−8 triệu".
 *
 * Ngôn ngữ trung tính — KHÔNG "tăng trưởng", "thâm hụt", "vượt chi". Số dương
 * không tự động màu xanh, số âm không tự động màu đỏ: đây là bức tranh, không
 * phải điểm số.
 */
export function deltaText(delta: number, currency: string): string {
  if (delta === 0) return '—';
  // U+2212 minus sign, không phải dấu gạch nối — nó cân với dấu cộng.
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${formatMoneyShort(Math.abs(delta), currency)}`;
}

export function moneyText(v: number, currency: string): string {
  return formatMoney(v, currency);
}
