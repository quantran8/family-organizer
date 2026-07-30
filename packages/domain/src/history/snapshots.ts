/**
 * Lịch sử tiền — hàm thuần cho hai màn hình ở G7b.
 *
 * money_snapshots = tổng của CẢ NHÀ theo mốc thời gian.
 * money_events    = thay đổi của TỪNG KHOẢN.
 * Hai tầng lịch sử khác nhau, cần cả hai — schema.sql §5.5 / §5.7.
 */

import { compareISODate, daysBetween } from '../date/civil.js';
import type { ISODate, MoneyEntityType } from '../types/base.js';
import type { MoneyEvent, MoneySnapshot } from '../types/entities.js';

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
