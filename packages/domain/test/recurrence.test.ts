import { describe, expect, it } from 'vitest';

import { expandRecurrence, nextDue } from '../src/recurrence/expand.js';
import type { Recurrence } from '../src/types/base.js';
import type { Task } from '../src/types/entities.js';

function recur(over: Partial<Recurrence> = {}): Recurrence {
  return { freq: 'none', intervalN: 1, ...over };
}

describe('expandRecurrence — ngày 31 qua tháng 2 (03 §9)', () => {
  it('năm thường: ngày 31 lùi về 28/2', () => {
    // 2026 không nhuận.
    const dates = expandRecurrence(
      recur({ freq: 'monthly', intervalN: 1, byMonthDay: 31 }),
      '2026-01-01',
      '2026-04-30',
      '2026-01-31',
    );
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('năm nhuận: ngày 31 lùi về 29/2', () => {
    // 2028 là năm nhuận.
    const dates = expandRecurrence(
      recur({ freq: 'monthly', intervalN: 1, byMonthDay: 31 }),
      '2028-01-01',
      '2028-03-31',
      '2028-01-31',
    );
    expect(dates).toEqual(['2028-01-31', '2028-02-29', '2028-03-31']);
  });

  it('ngày 30 lùi về 28/2 năm thường nhưng tháng 4 vẫn đúng 30', () => {
    const dates = expandRecurrence(
      recur({ freq: 'monthly', intervalN: 1, byMonthDay: 30 }),
      '2026-01-01',
      '2026-04-30',
      '2026-01-30',
    );
    expect(dates).toEqual(['2026-01-30', '2026-02-28', '2026-03-30', '2026-04-30']);
  });

  it('kẹp không "dính": sau tháng 2 quay lại đúng ngày 31, không phải 28', () => {
    const dates = expandRecurrence(
      recur({ freq: 'monthly', intervalN: 1, byMonthDay: 31 }),
      '2026-02-01',
      '2026-03-31',
      '2026-01-31',
    );
    expect(dates).toEqual(['2026-02-28', '2026-03-31']);
  });
});

describe('expandRecurrence — các tần suất', () => {
  it('freq=none trả đúng anchor nếu nằm trong khoảng', () => {
    expect(expandRecurrence(recur(), '2026-07-01', '2026-07-31', '2026-07-15')).toEqual([
      '2026-07-15',
    ]);
    expect(expandRecurrence(recur(), '2026-08-01', '2026-08-31', '2026-07-15')).toEqual([]);
  });

  it('hằng ngày', () => {
    expect(
      expandRecurrence(recur({ freq: 'daily' }), '2026-07-30', '2026-08-02', '2026-07-30'),
    ).toEqual(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']);
  });

  it('hằng ngày cách 3 ngày, anchor đã cũ nhiều năm', () => {
    const dates = expandRecurrence(
      recur({ freq: 'daily', intervalN: 3 }),
      '2026-07-30',
      '2026-08-05',
      '2020-01-01',
    );
    // Mọi ngày trả về phải cùng pha với anchor.
    for (const d of dates) {
      const diff = Math.round(
        (Date.parse(`${d}T00:00:00Z`) - Date.parse('2020-01-01T00:00:00Z')) / 86_400_000,
      );
      expect(diff % 3).toBe(0);
    }
    expect(dates.length).toBeGreaterThan(0);
  });

  it('hằng tuần theo thứ: thứ Hai và thứ Sáu', () => {
    // 2026-07-30 là thứ Năm. byWeekday 1=T2, 5=T6.
    const dates = expandRecurrence(
      recur({ freq: 'weekly', intervalN: 1, byWeekday: [1, 5] }),
      '2026-07-30',
      '2026-08-09',
      '2026-07-30',
    );
    expect(dates).toEqual(['2026-07-31', '2026-08-03', '2026-08-07']);
  });

  it('hằng tuần không đặt byWeekday thì dùng thứ của anchor', () => {
    const dates = expandRecurrence(
      recur({ freq: 'weekly', intervalN: 1 }),
      '2026-07-30',
      '2026-08-20',
      '2026-07-30',
    );
    expect(dates).toEqual(['2026-07-30', '2026-08-06', '2026-08-13', '2026-08-20']);
  });

  it('hằng năm, kẹp 29/2 về 28/2 ở năm không nhuận', () => {
    const dates = expandRecurrence(
      recur({ freq: 'yearly', intervalN: 1 }),
      '2028-01-01',
      '2031-12-31',
      '2028-02-29',
    );
    expect(dates).toEqual(['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28']);
  });

  it('untilDate cắt đúng chỗ', () => {
    const dates = expandRecurrence(
      recur({ freq: 'daily', intervalN: 1, untilDate: '2026-08-01' }),
      '2026-07-30',
      '2026-08-10',
      '2026-07-30',
    );
    expect(dates).toEqual(['2026-07-30', '2026-07-31', '2026-08-01']);
  });

  it('không trả ngày trước anchor', () => {
    const dates = expandRecurrence(
      recur({ freq: 'daily', intervalN: 1 }),
      '2026-07-01',
      '2026-08-05',
      '2026-08-01',
    );
    expect(dates[0]).toBe('2026-08-01');
  });

  it('khoảng đảo ngược trả mảng rỗng', () => {
    expect(
      expandRecurrence(recur({ freq: 'daily' }), '2026-08-10', '2026-08-01', '2026-08-01'),
    ).toEqual([]);
  });

  it('cửa sổ 90 ngày hằng ngày sinh đúng 90 mục (03 §4)', () => {
    const dates = expandRecurrence(
      recur({ freq: 'daily', intervalN: 1 }),
      '2026-07-30',
      '2026-10-27',
      '2026-07-30',
    );
    expect(dates).toHaveLength(90);
  });
});

describe('nextDue', () => {
  function task(over: Partial<Task> = {}): Task {
    return {
      id: 't1',
      title: 'Đổ rác',
      notes: null,
      list: 'recurring',
      assigneeId: null,
      dueDate: '2026-07-30',
      dueTime: null,
      recur: null,
      remindLeadDays: 0,
      status: 'todo',
      eventId: null,
      ...over,
    };
  }

  it('việc không lặp: trả hạn nếu còn ở tương lai', () => {
    expect(nextDue(task(), '2026-07-29')).toBe('2026-07-30');
  });

  it('việc không lặp đã qua hạn: null', () => {
    expect(nextDue(task(), '2026-07-30')).toBeNull();
    expect(nextDue(task(), '2026-08-01')).toBeNull();
  });

  it('việc không có hạn: null', () => {
    expect(nextDue(task({ dueDate: null }), '2026-07-30')).toBeNull();
  });

  it('việc lặp hằng tuần: trả lần kế, không bao gồm chính "after"', () => {
    const t = task({ recur: recur({ freq: 'weekly', intervalN: 1 }) });
    expect(nextDue(t, '2026-07-30')).toBe('2026-08-06');
  });

  it('việc lặp đã hết untilDate: null', () => {
    const t = task({
      recur: recur({ freq: 'weekly', intervalN: 1, untilDate: '2026-08-01' }),
    });
    expect(nextDue(t, '2026-08-02')).toBeNull();
  });
});
