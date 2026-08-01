import { describe, expect, it } from 'vitest';

import {
  describeMoneyEvent,
  diffSnapshots,
  filterByEntityType,
  groupEventsByDay,
  groupHistoryByMonth,
  withDiffs,
} from '../src/history/snapshots.js';
import type { MoneyEvent, MoneySnapshot } from '../src/types/entities.js';

const TODAY = '2026-07-30';

function snapshot(over: Partial<MoneySnapshot> = {}): MoneySnapshot {
  return {
    id: 's1',
    asOfDate: '2026-07-30',
    totalUsable: 45_000_000,
    totalSavings: 250_000_000,
    totalLongTerm: 800_000_000,
    totalDebt: 180_000_000,
    status: 'ok',
    note: null,
    createdBy: null,
    createdAt: '2026-07-30T09:00:00Z',
    ...over,
  };
}

function moneyEvent(over: Partial<MoneyEvent> = {}): MoneyEvent {
  return {
    id: 1,
    entityType: 'asset',
    entityId: 'a1',
    eventType: 'value_updated',
    valueBefore: 250_000_000,
    valueAfter: 220_000_000,
    delta: -30_000_000,
    occurredOn: TODAY,
    note: null,
    actorProfileId: null,
    createdAt: '2026-07-30T09:00:00Z',
    ...over,
  };
}

describe('diffSnapshots — mốc ĐẦU TIÊN không có chênh lệch', () => {
  it('không có mốc trước → tất cả null, KHÔNG phải 0', () => {
    // "Chưa biết" khác "không đổi". UI phải để trống, không hiện "+0".
    expect(diffSnapshots(snapshot(), null)).toEqual({
      usable: null,
      savings: null,
      longTerm: null,
      debt: null,
    });
  });

  it('có mốc trước → chênh lệch từng con số', () => {
    const cur = snapshot({ totalUsable: 45_000_000, totalDebt: 172_000_000 });
    const prev = snapshot({
      id: 's0',
      asOfDate: '2026-07-23',
      totalUsable: 33_000_000,
      totalDebt: 180_000_000,
    });
    expect(diffSnapshots(cur, prev)).toEqual({
      usable: 12_000_000,
      savings: 0,
      longTerm: 0,
      debt: -8_000_000,
    });
  });

  it('không đổi thì là 0, khác hẳn null', () => {
    const s = snapshot();
    expect(diffSnapshots(s, snapshot({ id: 's0' })).usable).toBe(0);
  });
});

describe('withDiffs — danh sách mới nhất trước', () => {
  it('mốc cuối cùng trong mảng (cũ nhất) có diff null', () => {
    const list = [
      snapshot({ id: 's3', asOfDate: '2026-07-30', totalUsable: 45_000_000 }),
      snapshot({ id: 's2', asOfDate: '2026-07-23', totalUsable: 33_000_000 }),
      snapshot({ id: 's1', asOfDate: '2026-07-16', totalUsable: 30_000_000 }),
    ];
    const out = withDiffs(list);
    expect(out[0]?.diff.usable).toBe(12_000_000);
    expect(out[1]?.diff.usable).toBe(3_000_000);
    expect(out[2]?.diff.usable).toBeNull();
  });

  it('danh sách rỗng', () => {
    expect(withDiffs([])).toEqual([]);
  });

  it('một mốc duy nhất → diff null', () => {
    expect(withDiffs([snapshot()])[0]?.diff.usable).toBeNull();
  });
});

describe('groupEventsByDay', () => {
  it('gộp đúng nhiều event cùng ngày', () => {
    const events = [
      moneyEvent({ id: 3, occurredOn: TODAY }),
      moneyEvent({ id: 2, occurredOn: TODAY }),
      moneyEvent({ id: 1, occurredOn: '2026-07-20' }),
    ];
    const groups = groupEventsByDay(events, TODAY);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.events).toHaveLength(2);
    expect(groups[1]?.events).toHaveLength(1);
  });

  it('nhãn nhóm: hôm nay / hôm qua / tuần này / tuần trước / cũ hơn', () => {
    const events = [
      moneyEvent({ id: 1, occurredOn: '2026-07-30' }),
      moneyEvent({ id: 2, occurredOn: '2026-07-29' }),
      moneyEvent({ id: 3, occurredOn: '2026-07-25' }),
      moneyEvent({ id: 4, occurredOn: '2026-07-20' }),
      moneyEvent({ id: 5, occurredOn: '2026-06-01' }),
    ];
    const kinds = groupEventsByDay(events, TODAY).map((g) => g.bucket.kind);
    expect(kinds).toEqual(['today', 'yesterday', 'this_week', 'last_week', 'older']);
  });

  it('mới nhất trước', () => {
    const events = [
      moneyEvent({ id: 1, occurredOn: '2026-06-01' }),
      moneyEvent({ id: 2, occurredOn: '2026-07-30' }),
    ];
    expect(groupEventsByDay(events, TODAY).map((g) => g.onDate)).toEqual([
      '2026-07-30',
      '2026-06-01',
    ]);
  });

  it('giữ nguyên thứ tự repository trả về trong cùng một ngày', () => {
    const events = [moneyEvent({ id: 9 }), moneyEvent({ id: 8 }), moneyEvent({ id: 7 })];
    expect(groupEventsByDay(events, TODAY)[0]?.events.map((e) => e.id)).toEqual([9, 8, 7]);
  });

  it('danh sách rỗng', () => {
    expect(groupEventsByDay([], TODAY)).toEqual([]);
  });
});

describe('describeMoneyEvent', () => {
  it('có cả trước và sau → transition', () => {
    expect(describeMoneyEvent(moneyEvent())).toEqual({
      kind: 'transition',
      before: 250_000_000,
      after: 220_000_000,
      delta: -30_000_000,
    });
  });

  it('valueBefore null (event created) → initial, KHÔNG hiện "null → x"', () => {
    const e = moneyEvent({ eventType: 'created', valueBefore: null, valueAfter: 50_000_000 });
    expect(describeMoneyEvent(e)).toEqual({ kind: 'initial', after: 50_000_000 });
  });

  it('settled → chỉ số tiền đã trả', () => {
    const e = moneyEvent({
      entityType: 'upcoming_payment',
      eventType: 'settled',
      valueBefore: 25_000_000,
      valueAfter: 0,
      delta: -25_000_000,
    });
    expect(describeMoneyEvent(e)).toEqual({ kind: 'settled', amount: 25_000_000 });
  });

  it('settled không có delta thì lấy valueBefore', () => {
    const e = moneyEvent({
      eventType: 'settled',
      valueBefore: 8_000_000,
      valueAfter: null,
      delta: null,
    });
    expect(describeMoneyEvent(e)).toEqual({ kind: 'settled', amount: 8_000_000 });
  });

  it('không có giá trị nào → bare, không ném', () => {
    const e = moneyEvent({ eventType: 'closed', valueBefore: null, valueAfter: null, delta: null });
    expect(describeMoneyEvent(e)).toEqual({ kind: 'bare' });
  });
});

describe('filterByEntityType — bộ lọc ở money/changes.tsx', () => {
  const events = [
    moneyEvent({ id: 1, entityType: 'asset' }),
    moneyEvent({ id: 2, entityType: 'debt' }),
    moneyEvent({ id: 3, entityType: 'upcoming_payment' }),
    moneyEvent({ id: 4, entityType: 'goal' }),
  ];

  it('null = tất cả', () => {
    expect(filterByEntityType(events, null)).toHaveLength(4);
  });

  it('lọc theo loại khoản', () => {
    expect(filterByEntityType(events, 'asset').map((e) => e.id)).toEqual([1]);
    expect(filterByEntityType(events, 'debt').map((e) => e.id)).toEqual([2]);
  });
});

describe('groupHistoryByMonth — count là BẮT BUỘC (03 §13)', () => {
  it('luôn trả count cùng total', () => {
    // UI không được hiển thị total mà thiếu count và thiếu chữ "đã ghi":
    // "Tháng 9 · 5 khoản nhà mình đã ghi · −12.000.000 ₫" đúng theo nghĩa đen;
    // "Tháng 9 chi 12 triệu" thì không.
    const r = groupHistoryByMonth([
      moneyEvent({ id: 1, occurredOn: '2026-09-15', delta: -30_000_000 }),
      moneyEvent({ id: 2, occurredOn: '2026-09-12', delta: -4_000_000 }),
      moneyEvent({ id: 3, occurredOn: '2026-09-03', delta: 22_000_000 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]?.count).toBe(3);
    expect(r[0]?.total).toBe(-12_000_000);
    expect(r[0]?.month).toBe('2026-09-01');
  });

  it('tháng KHÔNG có bản ghi thì KHÔNG xuất hiện — không trả nhóm total 0', () => {
    // Một tháng trống trong danh sách nói "nhà mình không ghi gì tháng đó";
    // một dòng "0 ₫" nói "nhà mình không tiêu gì tháng đó" — rất khác nhau, và
    // điều thứ hai gần như luôn sai.
    const r = groupHistoryByMonth([
      moneyEvent({ id: 1, occurredOn: '2026-09-15' }),
      moneyEvent({ id: 2, occurredOn: '2026-07-15' }),
    ]);
    expect(r.map((g) => g.month)).toEqual(['2026-09-01', '2026-07-01']);
  });

  it('rỗng → mảng rỗng', () => {
    expect(groupHistoryByMonth([])).toEqual([]);
  });

  it('cùng số tháng khác NĂM phải là HAI nhóm', () => {
    // Gom theo 'YYYY-MM', không theo số tháng. Cùng ca biên đã bắt được ở
    // groupEventsByMonth (G6).
    const r = groupHistoryByMonth([
      moneyEvent({ id: 1, occurredOn: '2026-09-15' }),
      moneyEvent({ id: 2, occurredOn: '2025-09-15' }),
    ]);
    expect(r).toHaveLength(2);
    expect(r.map((g) => g.month)).toEqual(['2026-09-01', '2025-09-01']);
  });

  it('mới nhất trước', () => {
    const r = groupHistoryByMonth([
      moneyEvent({ id: 1, occurredOn: '2026-05-01' }),
      moneyEvent({ id: 2, occurredOn: '2026-09-01' }),
      moneyEvent({ id: 3, occurredOn: '2026-07-01' }),
    ]);
    expect(r.map((g) => g.month)).toEqual(['2026-09-01', '2026-07-01', '2026-05-01']);
  });

  it('delta null KHÔNG cộng vào tổng — nó là thay đổi chưa đo được, không phải 0', () => {
    const r = groupHistoryByMonth([
      moneyEvent({ id: 1, occurredOn: '2026-09-15', delta: -5_000_000 }),
      moneyEvent({ id: 2, occurredOn: '2026-09-10', eventType: 'created', delta: null }),
    ]);
    expect(r[0]?.total).toBe(-5_000_000);
    // Nhưng nó VẪN được đếm: nó là một bản ghi nhà mình đã ghi.
    expect(r[0]?.count).toBe(2);
  });

  it('giữ nguyên các bản ghi trong items để UI liệt kê', () => {
    const r = groupHistoryByMonth([
      moneyEvent({ id: 1, occurredOn: '2026-09-15' }),
      moneyEvent({ id: 2, occurredOn: '2026-09-12' }),
    ]);
    expect(r[0]?.items.map((e) => e.id)).toEqual([1, 2]);
  });
});
