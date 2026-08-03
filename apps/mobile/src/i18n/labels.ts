/**
 * Cầu nối: shape từ @family-organizer/domain → câu tiếng Việt.
 *
 * Domain trả về NGUYÊN LIỆU có tham số (mã lý do, kiểu nhãn), không trả chuỗi
 * hiển thị — nó là hàm thuần chạy ở cả Hermes lẫn Deno và không biết gì về UI.
 * Đây là chỗ duy nhất ghép nguyên liệu đó thành câu.
 */

import {
  formatMoney,
  formatMoneyShort,
  type ContactSide,
  type DeclaredLabel,
  type DoseLabel,
  type DueLabel,
  type FinanceReason,
  type FinanceStatus,
  type GiftDirection,
  type GiftOccasion,
  type LunarLabel,
  type MoneyEventShape,
} from '@family-organizer/domain';

import { interpolate, vi } from './vi';

/** Nhãn một từ cho trạng thái tài chính. Luôn đi kèm câu giải thích. */
export function financeStatusLabel(s: FinanceStatus): string {
  return vi.financeStatus[s];
}

/**
 * "Anh cập nhật 6 tuần trước" · "Chưa có số liệu" — 03 §8.
 *
 * BẮT BUỘC ở mọi chỗ hiển thị số tổng. Không có ngoại lệ. Một con số tiền
 * không kèm nhãn thời gian sẽ được đọc là sự thật hiện tại, trong khi nó là
 * điều một người đã nói ra sáu tuần trước.
 */
export function declaredAtText(d: DeclaredLabel): string {
  const m = vi.declaredAt;
  switch (d.kind) {
    case 'never':
      return m.never;
    case 'today':
      return d.by ? interpolate(m.today, { by: d.by }) : m.todayAnon;
    case 'yesterday':
      return d.by ? interpolate(m.yesterday, { by: d.by }) : m.yesterdayAnon;
    case 'days_ago':
      return d.by
        ? interpolate(m.daysAgo, { by: d.by, days: d.days })
        : interpolate(m.daysAgoAnon, { days: d.days });
    case 'weeks_ago':
      return d.by
        ? interpolate(m.weeksAgo, { by: d.by, weeks: d.weeks })
        : interpolate(m.weeksAgoAnon, { weeks: d.weeks });
    case 'months_ago':
      return d.by
        ? interpolate(m.monthsAgo, { by: d.by, months: d.months })
        : interpolate(m.monthsAgoAnon, { months: d.months });
  }
}

/**
 * "Ghi lần cuối 5 ngày trước" — nhãn thời gian của SỐ DƯ QUỸ.
 *
 * Tách khỏi `declaredAtText` có chủ ý, dù cùng nhận `DeclaredLabel`:
 *
 *   `assets.currentValue` là SỐ KHAI — một người nói ra một con số tại một thời
 *   điểm, và nó có thể đã sai ngay lúc nói. Chữ "cập nhật" đúng ở đó.
 *
 *   `funds.currentAmount` là SỐ DẪN XUẤT — tổng của những khoản đã ghi. Nó
 *   không "cũ" theo kiểu sai đi; nó chỉ nói lần cuối có ai ghi vào là bao giờ.
 *
 * Dùng chung một câu cho hai loại số là nói sai bản chất một trong hai.
 *
 * `by` bị BỎ QUA: ai bấm nút ghi không phải thông tin có ích ở đây, và một cái
 * tên cạnh số dư chung dễ bị đọc thành "tiền của người đó".
 */
export function fundRecordedAtText(d: DeclaredLabel): string {
  const m = vi.fund;
  switch (d.kind) {
    case 'never':
      return m.recordedNever;
    case 'today':
      return m.recordedToday;
    case 'yesterday':
      return m.recordedYesterday;
    case 'days_ago':
      return interpolate(m.recordedDaysAgo, { days: d.days });
    case 'weeks_ago':
      return interpolate(m.recordedWeeksAgo, { weeks: d.weeks });
    case 'months_ago':
      return interpolate(m.recordedMonthsAgo, { months: d.months });
  }
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
    // KHÔNG còn nhánh 'stale': độ mới của số liệu không đổi trạng thái nữa
    // (03 §1). Nó là một nhãn riêng — xem declaredAtText bên dưới.
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
  return interpolate(vi.financeStatus.lastUpdated, { label: agoLabelText(d) });
}

/**
 * Độ mới của một con số: "Hôm nay" · "Hôm qua" · "40 ngày trước".
 *
 * KHÁC `dueLabelText` ở đúng một nhánh, và nhánh đó quan trọng: `overdue_days`
 * ở đây đọc thành *"40 ngày trước"*, không phải *"Quá hạn 40 ngày"*.
 *
 * Một sổ tiết kiệm chưa cập nhật 40 ngày không lỡ hẹn với ai — người dùng chưa
 * bao giờ hứa sẽ cập nhật nó. Gọi đó là "quá hạn" là app tự đặt ra một deadline
 * rồi trách người dùng vì không giữ (04 §7 — chữ ấm, không phán xét).
 *
 * Nhánh `in_days`/`tomorrow` không xảy ra với một mốc trong quá khứ, nhưng vẫn
 * xử lý để hàm tổng quát và không có nhánh nào ném.
 */
export function agoLabelText(d: DueLabel): string {
  if (d.kind === 'overdue_days') {
    return interpolate(vi.dueLabel.daysAgo, { days: d.days });
  }
  return dueLabelText(d);
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
 * "Tháng 9" · "Tháng 12/2025" — nhãn nhóm tháng.
 *
 * Chỉ thêm năm khi KHÁC năm hiện tại. Người đọc mặc định hiểu "Tháng 9" là năm
 * nay, nên in năm ở mọi dòng là nhiễu; nhưng bỏ năm ở nhóm của năm khác thì
 * tháng 12 năm ngoái và tháng 12 năm nay trông y hệt nhau — và ở màn lịch sử
 * thì hai nhóm đó nằm cạnh nhau thật.
 *
 * `month` nhận ISO date đầu tháng ('2025-09-01'), đúng thứ `groupHistoryByMonth`
 * và `projectRunway().byMonth` trả về.
 */
export function monthLabelText(month: string, today: string): string {
  const [year, m] = month.split('-');
  const [thisYear] = today.split('-');
  return year === thisYear
    ? interpolate(vi.money.monthLabel, { month: Number(m) })
    : interpolate(vi.money.monthLabelWithYear, { month: Number(m), year: year ?? '' });
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

/**
 * Dòng xem trước trong form sự kiện — không có nó, người dùng không tin app
 * hiểu lịch âm (05 §5.5).
 *
 * `fullSolarDate` chứ KHÔNG phải `shortSolarDate`: ngày âm đã qua trong năm nay
 * thì lần kế tiếp rơi vào năm sau, và một dòng "rơi vào Thứ Bảy 6/2" không có
 * năm sẽ bị đọc là năm nay. Đây đúng là chỗ không được để người dùng đoán.
 */
export function lunarPreviewText(solarDate: string, weekday: number): string {
  return interpolate(vi.event.lunarPreview, {
    weekday: weekdayName(weekday),
    date: fullSolarDate(solarDate),
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

// --- Sổ hiếu hỉ (07 §3) ---

export function giftDirectionLabel(d: GiftDirection): string {
  return vi.giftDirection[d];
}

export function giftOccasionLabel(o: GiftOccasion): string {
  return vi.giftOccasion[o];
}

export function contactSideLabel(s: ContactSide): string {
  return vi.contactSide[s];
}

/**
 * Dòng gợi ý — TOÀN BỘ lý do module sổ hiếu hỉ tồn tại (07 §3.3):
 *
 *     Chú Ba đã mừng nhà mình
 *     2.000.000 ₫ — cưới, 3/2023
 *
 * Ngày rút về "3/2023": người dùng cần biết *khoảng bao lâu rồi*, không cần
 * biết ngày nào. Một ngày đầy đủ ở đây chỉ làm dòng dài ra mà không thêm gì
 * cho quyết định đang phải ra.
 *
 * KHÔNG có câu nào so sánh, khuyên, hay điều chỉnh con số. App đưa ra một DỮ
 * KIỆN; đi bao nhiêu là chuyện của hai vợ chồng.
 */
export function giftSuggestionText(
  name: string,
  amount: number,
  occasion: GiftOccasion,
  occurredOn: string,
  currency: string,
): { line: string; basis: string } {
  const [year, month] = occurredOn.split('-');
  return {
    line: interpolate(vi.gift.suggestLine, { name }),
    basis: interpolate(vi.gift.suggestBasis, {
      amount: formatMoney(amount, currency),
      occasion: giftOccasionLabel(occasion).toLocaleLowerCase('vi'),
      date: `${Number(month)}/${year}`,
    }),
  };
}

/**
 * Tổng của một đám — LUÔN kèm số lượng bản ghi (ràng buộc #5).
 *
 * Một tổng đứng một mình sẽ được đọc là đầy đủ, trong khi nó chỉ là tổng của
 * những gì đã kịp ghi.
 */
export function occasionTotalText(
  s: { count: number; total: number },
  currency: string,
): string {
  return interpolate(vi.gift.occasionTotal, {
    total: formatMoney(s.total, currency),
    count: s.count,
  });
}

// --- Hồ sơ con (07 §4) ---

/**
 * Nhãn một mũi tiêm: "còn 9 ngày" · "quá lịch 12 ngày" · "đã tiêm 5/10/2025".
 *
 * KHÔNG DÙNG CHỮ TRÁCH MÓC. Không "bạn đã bỏ lỡ", không "chưa hoàn thành",
 * không "trễ hẹn". Mũi quá lịch đọc là một SỰ VIỆC, và màn hình kèm theo một
 * việc làm được (`vi.child.overdueHint`) — 07 §4.2.
 *
 * `planned_no_date` là mũi ngoài lịch chưa hẹn ngày. Nó KHÔNG được đọc thành
 * "chưa tiêm": app không biết mũi đó đã tiêm hay chưa, chỉ biết chưa có ngày.
 */
export function doseLabelText(d: DoseLabel): string {
  const m = vi.child;
  switch (d.kind) {
    case 'planned':
      return d.inDays === 0 ? m.doseToday : interpolate(m.doseIn, { days: d.inDays });
    case 'planned_no_date':
      return m.doseNoDate;
    case 'overdue':
      return interpolate(m.doseOverdue, { days: d.days });
    case 'done':
      return interpolate(m.doseDone, { date: fullSolarDate(d.on) });
  }
}

/**
 * Tuổi của con: "14 tháng" dưới 2 tuổi, "3 tuổi" từ đó trở lên.
 *
 * Mốc 24 tháng không tuỳ tiện — nó là cách bố mẹ Việt thật sự nói. Dưới hai
 * tuổi thì tháng là đơn vị có nghĩa (và cũng là đơn vị của lịch tiêm); trên
 * hai tuổi thì "38 tháng" nghe như một biểu mẫu bệnh viện.
 */
export function childAgeText(birthday: string, today: string): string {
  const months = monthsBetweenISO(birthday, today);
  if (months < 24) return interpolate(vi.child.ageMonths, { count: Math.max(0, months) });
  return interpolate(vi.child.ageYears, { count: Math.floor(months / 12) });
}

function monthsBetweenISO(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  if (
    fy === undefined ||
    fm === undefined ||
    fd === undefined ||
    ty === undefined ||
    tm === undefined ||
    td === undefined
  ) {
    return 0;
  }
  // Chưa qua ngày trong tháng thì chưa tròn tháng: sinh 20/3 thì đến 19/4 vẫn
  // là "0 tháng". Bố mẹ đếm tuổi con theo đúng cách đó.
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}
