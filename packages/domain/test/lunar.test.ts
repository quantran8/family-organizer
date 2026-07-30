import { describe, expect, it } from 'vitest';

import { addDays } from '../src/date/civil.js';
import {
  lunarMonthLength,
  lunarToSolar,
  lunarToSolarClamped,
  solarToLunar,
} from '../src/lunar/convert.js';
import { nextLunarOccurrence, previousLunarOccurrence } from '../src/lunar/occurrence.js';

/**
 * Mốc đối chiếu: mùng 1 Tết Nguyên đán theo lịch Việt Nam (UTC+7).
 * Đây là ngày duy nhất cả nước đều biết chắc, nên là mốc kiểm tốt nhất.
 */
const TET: Array<[solar: string, lunarYear: number]> = [
  ['2020-01-25', 2020],
  ['2021-02-12', 2021],
  ['2022-02-01', 2022],
  ['2023-01-22', 2023],
  ['2024-02-10', 2024],
  ['2025-01-29', 2025],
  ['2026-02-17', 2026],
];

describe('solarToLunar — mốc Tết Nguyên đán', () => {
  it.each(TET)('%s là mùng 1 tháng Giêng năm %i', (solar, year) => {
    expect(solarToLunar(solar)).toEqual({
      day: 1,
      month: 1,
      year,
      isLeapMonth: false,
    });
  });
});

describe('lunarToSolar — chiều ngược lại', () => {
  it.each(TET)('mùng 1 tháng Giêng năm %i → %s', (solar, year) => {
    expect(lunarToSolar({ day: 1, month: 1, year, isLeapMonth: false })).toBe(solar);
  });
});

describe('round-trip dương → âm → dương', () => {
  it('đúng trên 400+ ngày rải suốt 40 năm', () => {
    let checked = 0;
    // Rải bước 37 ngày để chạm đủ mọi tháng âm và cả tháng nhuận.
    for (let i = 0; i < 15_000; i += 37) {
      const d = addDays('2000-01-01', i);
      expect(lunarToSolar(solarToLunar(d))).toBe(d);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(400);
  });
});

describe('năm nhuận âm (03 §9)', () => {
  it('2023 có tháng 2 nhuận', () => {
    // 22/3/2023 là mùng 1 tháng 2 NHUẬN năm Quý Mão.
    expect(solarToLunar('2023-03-22')).toEqual({
      day: 1,
      month: 2,
      year: 2023,
      isLeapMonth: true,
    });
  });

  it('tháng 2 thường và tháng 2 nhuận năm 2023 là hai ngày dương khác nhau', () => {
    const thuong = lunarToSolar({ day: 1, month: 2, year: 2023, isLeapMonth: false });
    const nhuan = lunarToSolar({ day: 1, month: 2, year: 2023, isLeapMonth: true });
    expect(thuong).toBe('2023-02-20');
    expect(nhuan).toBe('2023-03-22');
    expect(thuong).not.toBe(nhuan);
  });

  it('năm không nhuận mà đòi tháng nhuận thì ném lỗi', () => {
    expect(() => lunarToSolar({ day: 1, month: 2, year: 2024, isLeapMonth: true })).toThrow(
      RangeError,
    );
  });

  it('quy tắc 03 §3: sự kiện KHÔNG đánh dấu nhuận thì dùng tháng thường', () => {
    // Giỗ "mùng 1 tháng 2" ở năm có nhuận tháng 2 → vẫn là tháng thường.
    const occurrence = nextLunarOccurrence({ day: 1, month: 2 }, '2023-01-01');
    expect(occurrence).toBe('2023-02-20');
  });

  it('lunarToSolarClamped: đòi tháng nhuận ở năm không nhuận thì lùi về tháng thường', () => {
    const solar = lunarToSolarClamped({ day: 1, month: 2, year: 2024, isLeapMonth: true });
    expect(solar).toBe(lunarToSolar({ day: 1, month: 2, year: 2024, isLeapMonth: false }));
  });
});

describe('ngày 30 rơi vào tháng thiếu (03 §9)', () => {
  it('tìm được một tháng âm chỉ có 29 ngày', () => {
    // Tháng 1 năm 2025 âm lịch: kiểm tra độ dài thật.
    const lengths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) =>
      lunarMonthLength(2025, m, false),
    );
    expect(lengths).toContain(29);
    expect(lengths).toContain(30);
  });

  it('lunarToSolar ném lỗi khi đòi ngày 30 của tháng thiếu', () => {
    const shortMonth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(
      (m) => lunarMonthLength(2025, m, false) === 29,
    );
    expect(shortMonth).toBeDefined();
    expect(() =>
      lunarToSolar({ day: 30, month: shortMonth as number, year: 2025, isLeapMonth: false }),
    ).toThrow(RangeError);
  });

  it('lunarToSolarClamped LÙI VỀ NGÀY 29 thay vì ném', () => {
    const shortMonth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(
      (m) => lunarMonthLength(2025, m, false) === 29,
    ) as number;
    const clamped = lunarToSolarClamped({
      day: 30,
      month: shortMonth,
      year: 2025,
      isLeapMonth: false,
    });
    const day29 = lunarToSolar({ day: 29, month: shortMonth, year: 2025, isLeapMonth: false });
    expect(clamped).toBe(day29);
  });

  it('giỗ ngày 30 vẫn nhắc được mọi năm, không năm nào bị bỏ', () => {
    // Đây là ca thật: giỗ ngày 30 tháng 7 âm, chạy liên tục 10 năm.
    let cursor = '2024-01-01';
    for (let i = 0; i < 10; i += 1) {
      const next = nextLunarOccurrence({ day: 30, month: 7 }, cursor);
      expect(next >= cursor).toBe(true);
      const back = solarToLunar(next);
      // Rơi đúng ngày 30, hoặc ngày 29 nếu tháng đó thiếu.
      expect([29, 30]).toContain(back.day);
      expect(back.month).toBe(7);
      cursor = addDays(next, 1);
    }
  });
});

describe('giỗ vắt qua Tết dương lịch (03 §9)', () => {
  it('15/11 âm và 15/12 âm 2024 nằm hai bên mốc 1/1/2025', () => {
    expect(lunarToSolar({ day: 15, month: 11, year: 2024, isLeapMonth: false })).toBe(
      '2024-12-15',
    );
    expect(lunarToSolar({ day: 15, month: 12, year: 2024, isLeapMonth: false })).toBe(
      '2025-01-14',
    );
  });

  it('giỗ tháng Chạp: năm ÂM không tăng khi qua 1/1 dương', () => {
    // 14/1/2025 dương vẫn là tháng 12 năm âm 2024, chưa sang năm âm mới.
    const l = solarToLunar('2025-01-14');
    expect(l.month).toBe(12);
    expect(l.year).toBe(2024);
  });

  it('nextLunarOccurrence tìm đúng lần kế khi mốc "after" nằm giữa hai Tết', () => {
    // Đứng ở 20/12/2024 dương, giỗ 15/12 âm đã qua (14/1/2025 là năm âm 2024
    // nhưng vẫn ở tương lai) → phải trả 14/1/2025.
    expect(nextLunarOccurrence({ day: 15, month: 12 }, '2024-12-20')).toBe('2025-01-14');
  });
});

describe('nextLunarOccurrence / previousLunarOccurrence', () => {
  it('bao gồm chính ngày "after" nếu hôm nay đúng ngày giỗ', () => {
    const today = lunarToSolar({ day: 15, month: 8, year: 2025, isLeapMonth: false });
    expect(nextLunarOccurrence({ day: 15, month: 8 }, today)).toBe(today);
  });

  it('sang năm âm kế nếu ngày đã qua', () => {
    const thisYear = lunarToSolar({ day: 15, month: 8, year: 2025, isLeapMonth: false });
    const next = nextLunarOccurrence({ day: 15, month: 8 }, addDays(thisYear, 1));
    expect(next > thisYear).toBe(true);
    expect(solarToLunar(next)).toMatchObject({ day: 15, month: 8, year: 2026 });
  });

  it('previousLunarOccurrence trả lần gần nhất ĐÃ QUA — dòng "Năm ngoái"', () => {
    const thisYear = lunarToSolar({ day: 15, month: 8, year: 2025, isLeapMonth: false });
    const prev = previousLunarOccurrence({ day: 15, month: 8 }, thisYear);
    expect(prev).not.toBeNull();
    expect(prev! < thisYear).toBe(true);
    expect(solarToLunar(prev as string)).toMatchObject({ day: 15, month: 8, year: 2024 });
  });
});
