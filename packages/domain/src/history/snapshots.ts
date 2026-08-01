/**
 * Lịch sử tiền — hàm thuần cho hai màn hình ở G7b.
 *
 * money_snapshots = tổng của CẢ NHÀ theo mốc thời gian.
 * money_events    = thay đổi của TỪNG KHOẢN.
 * Hai tầng lịch sử khác nhau, cần cả hai — schema.sql §5.5 / §5.7.
 */

import { compareISODate, daysBetween } from '../date/civil.ts';
import type { ISODate, MoneyEntityType } from '../types/base.ts';
import type { MoneyEvent, MoneySnapshot } from '../types/entities.ts';

/**
 * Chênh lệch giữa một snapshot và mốc liền trước.
 *
 * `null` cho từng trường nghĩa là KHÔNG CÓ mốc trước để so — UI phải để trống,
 * không hiện "+0". Mốc đầu tiên không phải là "không đổi", nó là "chưa biết".
 */
export interface SnapshotDiff {
  usable: number | null;
  savings: number | null;
  longTerm: number | null;
  debt: number | null;
}

export function diffSnapshots(cur: MoneySnapshot, prev: MoneySnapshot | null): SnapshotDiff {
  if (prev === null) {
    return { usable: null, savings: null, longTerm: null, debt: null };
  }
  return {
    usable: cur.totalUsable - prev.totalUsable,
    savings: cur.totalSavings - prev.totalSavings,
    longTerm: cur.totalLongTerm - prev.totalLongTerm,
    debt: cur.totalDebt - prev.totalDebt,
  };
}

/**
 * Ghép mỗi snapshot với chênh lệch so với mốc liền trước.
 * Nhận danh sách theo thứ tự MỚI NHẤT TRƯỚC (như repository trả về).
 */
export function withDiffs(
  snapshots: MoneySnapshot[],
): Array<{ snapshot: MoneySnapshot; diff: SnapshotDiff }> {
  return snapshots.map((s, i) => ({
    snapshot: s,
    diff: diffSnapshots(s, snapshots[i + 1] ?? null),
  }));
}

/** Nhãn nhóm ngày cho timeline. UI dịch sang chữ; domain chỉ phân loại. */
export type DayBucket =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'this_week' }
  | { kind: 'last_week' }
  | { kind: 'older'; onDate: ISODate };

export interface EventDayGroup {
  onDate: ISODate;
  bucket: DayBucket;
  events: MoneyEvent[];
}

function bucketFor(onDate: ISODate, today: ISODate): DayBucket {
  const ago = daysBetween(onDate, today);
  if (ago <= 0) return { kind: 'today' };
  if (ago === 1) return { kind: 'yesterday' };
  if (ago <= 7) return { kind: 'this_week' };
  if (ago <= 14) return { kind: 'last_week' };
  return { kind: 'older', onDate };
}

/**
 * Gộp money_events theo ngày, mới nhất trước.
 *
 * Trong cùng một ngày giữ nguyên thứ tự repository trả về (đã sắp theo
 * created_at desc) — hai thay đổi cùng ngày thì cái ghi sau đứng trước.
 */
export function groupEventsByDay(events: MoneyEvent[], today: ISODate): EventDayGroup[] {
  const byDate = new Map<ISODate, MoneyEvent[]>();
  for (const e of events) {
    const bucket = byDate.get(e.occurredOn);
    if (bucket) bucket.push(e);
    else byDate.set(e.occurredOn, [e]);
  }

  const groups: EventDayGroup[] = [];
  for (const [onDate, evts] of byDate) {
    groups.push({ onDate, bucket: bucketFor(onDate, today), events: evts });
  }
  groups.sort((a, b) => compareISODate(b.onDate, a.onDate));
  return groups;
}

/**
 * Mô tả một thay đổi bằng nguyên liệu, không phải câu chữ.
 *
 * `valueBefore` là null với event 'created' (chưa có giá trị trước) — UI hiện
 * một vế thay vì "null → 220 triệu".
 */
export type MoneyEventShape =
  | { kind: 'transition'; before: number; after: number; delta: number | null }
  | { kind: 'initial'; after: number }
  | { kind: 'settled'; amount: number }
  | { kind: 'bare' };

export function describeMoneyEvent(e: MoneyEvent): MoneyEventShape {
  if (e.eventType === 'settled') {
    const amount = e.delta !== null ? Math.abs(e.delta) : (e.valueBefore ?? 0);
    return { kind: 'settled', amount };
  }
  if (e.valueBefore !== null && e.valueAfter !== null) {
    return { kind: 'transition', before: e.valueBefore, after: e.valueAfter, delta: e.delta };
  }
  if (e.valueBefore === null && e.valueAfter !== null) {
    return { kind: 'initial', after: e.valueAfter };
  }
  return { kind: 'bare' };
}

/** Lọc timeline theo loại khoản — dùng cho bộ lọc ở money/changes.tsx. */
export function filterByEntityType(
  events: MoneyEvent[],
  entityType: MoneyEntityType | null,
): MoneyEvent[] {
  if (entityType === null) return events;
  return events.filter((e) => e.entityType === entityType);
}

/**
 * Một tháng trong màn hình lịch sử biến động — 03 §12.
 *
 * `count` là BẮT BUỘC TRONG KIỂU, không phải tuỳ chọn. UI không được hiển thị
 * `total` mà thiếu `count` và thiếu chữ "đã ghi":
 *
 *     Tháng 9 · 5 khoản nhà mình đã ghi
 *     −12.000.000 ₫
 *
 * Câu đó đúng theo ĐÚNG NGHĨA ĐEN của nó. Câu "Tháng 9 chi 12 triệu" thì tự
 * nhận là đầy đủ, và sẽ sai 30–40% mãi mãi.
 */
export interface MonthlyHistoryGroup {
  /** 'YYYY-MM-01' */
  month: ISODate;
  count: number;
  total: number;
  items: MoneyEvent[];
}

/**
 * Gom money_events theo tháng, mới nhất trước — 03 §12.
 *
 * ĐƯỜNG PHÂN GIỚI: LIỆT KÊ thì trung thực khi dữ liệu thiếu, CỘNG TỔNG thì
 * không. Một danh sách "Sửa xe −2.000.000 ₫ · 15/9" vẫn đúng dù nhà mình còn
 * mười khoản khác chưa ghi — nó không tự nhận là đầy đủ.
 *
 * Vì thế `total` ở đây CHỈ được hiện kèm `count` và chữ "đã ghi", và
 * TUYỆT ĐỐI KHÔNG BAO GIỜ được vẽ thành đường xu hướng. Khi vẽ tổng theo tháng
 * thành một đường, KHOẢNG TRỐNG TRONG VIỆC GHI CHÉP TRÔNG Y HỆT THAY ĐỔI TRONG
 * CHI TIÊU: tháng nào hai người bận và quên ghi sẽ hiện ra như một tháng tiết
 * kiệm, và app vừa nói dối một cách rất thuyết phục. Đây là chỗ cấm sắc nhất
 * của cả tài liệu — xem 08 §1.4.
 *
 * Tháng không có bản ghi thì KHÔNG XUẤT HIỆN, không phải trả về một nhóm với
 * total = 0. Một tháng trống trong danh sách nói "nhà mình không ghi gì tháng
 * đó"; một dòng "0 ₫" nói "nhà mình không tiêu gì tháng đó" — hai điều rất
 * khác nhau, và điều thứ hai gần như luôn sai.
 */
export function groupHistoryByMonth(events: MoneyEvent[]): MonthlyHistoryGroup[] {
  const byMonth = new Map<string, MoneyEvent[]>();
  for (const e of events) {
    // Gom theo 'YYYY-MM', không theo số tháng: cùng số tháng khác năm phải là
    // HAI nhóm. Cùng ca biên đã bắt được ở groupEventsByMonth (G6).
    const key = e.occurredOn.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(e);
    else byMonth.set(key, [e]);
  }

  const groups: MonthlyHistoryGroup[] = [];
  for (const [key, items] of byMonth) {
    groups.push({
      month: `${key}-01`,
      count: items.length,
      // delta null (event 'created' chưa có giá trị trước) không cộng vào tổng:
      // nó không phải một thay đổi 0 đồng, nó là một thay đổi chưa đo được.
      total: items.reduce((s, e) => s + (e.delta ?? 0), 0),
      items,
    });
  }
  groups.sort((a, b) => compareISODate(b.month, a.month));
  return groups;
}
