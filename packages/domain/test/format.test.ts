import { describe, expect, it } from 'vitest';

import { formatMoney, formatMoneyShort } from '../src/format/money.js';
import { formatDueLabel, formatLunarLabel, lunarLabelOfDate } from '../src/format/dates.js';
import type { FamilyEvent } from '../src/types/entities.js';

describe('formatMoney (03 §8)', () => {
  it('12.000.000 ₫', () => {
    expect(formatMoney(12_000_000, 'VND')).toBe('12.000.000 ₫');
  });

  it('VND không có phần lẻ', () => {
    expect(formatMoney(1234, 'VND')).toBe('1.234 ₫');
    expect(formatMoney(999, 'VND')).toBe('999 ₫');
  });

  it('số 0', () => {
    expect(formatMoney(0, 'VND')).toBe('0 ₫');
  });

  it('số âm', () => {
    expect(formatMoney(-8_000_000, 'VND')).toBe('-8.000.000 ₫');
  });

  it('tiền tệ chưa có ký hiệu thì dùng mã', () => {
    expect(formatMoney(1500, 'USD')).toBe('1.500,00 USD');
  });
});

describe('formatMoneyShort — cho card chật (03 §8)', () => {
  it('12 triệu', () => {
    expect(formatMoneyShort(12_000_000, 'VND')).toBe('12 triệu');
  });

  it('1,2 tỷ', () => {
    expect(formatMoneyShort(1_200_000_000, 'VND')).toBe('1,2 tỷ');
  });

  it('25 triệu', () => {
    expect(formatMoneyShort(25_000_000, 'VND')).toBe('25 triệu');
  });

  it('làm tròn một chữ số thập phân', () => {
    expect(formatMoneyShort(12_500_000, 'VND')).toBe('12,5 triệu');
    expect(formatMoneyShort(12_340_000, 'VND')).toBe('12,3 triệu');
  });

  it('bỏ ",0" cho số tròn', () => {
    expect(formatMoneyShort(800_000_000, 'VND')).toBe('800 triệu');
    expect(formatMoneyShort(2_000_000_000, 'VND')).toBe('2 tỷ');
  });

  it('nghìn', () => {
    expect(formatMoneyShort(45_000, 'VND')).toBe('45 nghìn');
  });

  it('dưới 1000 thì hiện đầy đủ', () => {
    expect(formatMoneyShort(500, 'VND')).toBe('500 ₫');
  });

  it('số âm giữ dấu', () => {
    expect(formatMoneyShort(-30_000_000, 'VND')).toBe('-30 triệu');
  });
});

describe('formatDueLabel (03 §8)', () => {
  const today = '2026-07-30';

  it('Hôm nay', () => {
    expect(formatDueLabel('2026-07-30', today)).toEqual({ kind: 'today' });
  });

  it('Ngày mai', () => {
    expect(formatDueLabel('2026-07-31', today)).toEqual({ kind: 'tomorrow' });
  });

  it('Hôm qua', () => {
    expect(formatDueLabel('2026-07-29', today)).toEqual({ kind: 'yesterday' });
  });

  it('Còn 5 ngày', () => {
    expect(formatDueLabel('2026-08-04', today)).toEqual({ kind: 'in_days', days: 5 });
  });

  it('Quá hạn 2 ngày', () => {
    expect(formatDueLabel('2026-07-28', today)).toEqual({ kind: 'overdue_days', days: 2 });
  });

  it('vắt qua tháng', () => {
    expect(formatDueLabel('2026-08-01', today)).toEqual({ kind: 'in_days', days: 2 });
  });
});

describe('formatLunarLabel (03 §8)', () => {
  function event(over: Partial<FamilyEvent> = {}): FamilyEvent {
    return {
      id: 'e1',
      title: 'Giỗ ông ngoại',
      kind: 'death_anniversary',
      side: 'wife_family',
      location: null,
      notes: null,
      calendar: 'lunar',
      solarDate: null,
      lunarDay: 15,
      lunarMonth: 8,
      lunarLeapMonth: false,
      startTime: null,
      isAllDay: true,
      recur: null,
      remindLeadDays: 3,
      prepLeadDays: null,
      prepTaskId: null,
      childMemberId: null,
      nextOccurrenceDate: '2025-10-06',
      estimatedCost: null,
      ...over,
    };
  }

  it('trả CẢ HAI vế: ngày âm và ngày dương', () => {
    const label = formatLunarLabel(event());
    expect(label).toMatchObject({
      lunarDay: 15,
      lunarMonth: 8,
      isLeapMonth: false,
      solarDate: '2025-10-06',
      solarDay: 6,
      solarMonth: 10,
    });
  });

  it('sự kiện dương lịch trả null', () => {
    expect(formatLunarLabel(event({ calendar: 'solar', solarDate: '2026-10-20' }))).toBeNull();
  });

  it('chưa có nextOccurrenceDate thì vẫn trả vế âm, vế dương null', () => {
    const label = formatLunarLabel(event({ nextOccurrenceDate: null }));
    expect(label).toMatchObject({ lunarDay: 15, lunarMonth: 8, solarDate: null, weekday: null });
  });

  it('weekday: 0 = Chủ nhật', () => {
    // 2025-10-05 là Chủ nhật.
    const label = formatLunarLabel(event({ nextOccurrenceDate: '2025-10-05' }));
    expect(label?.weekday).toBe(0);
  });
});

describe('lunarLabelOfDate — khối ngày trên Nhà mình', () => {
  it('trả ngày âm của một ngày dương bất kỳ', () => {
    expect(lunarLabelOfDate('2026-02-17')).toEqual({ day: 1, month: 1, isLeapMonth: false });
  });
});
