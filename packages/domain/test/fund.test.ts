import { describe, expect, it } from 'vitest';

import * as fundsModule from '../src/funds/month.js';
import { fundMonthsPresent, summarizeFundMonth, UNNAMED_CONTRIBUTOR } from '../src/funds/month.js';
import type { FundEntry } from '../src/types/entities.js';

function entry(over: Partial<FundEntry> = {}): FundEntry {
  return {
    id: 'f1',
    fundId: 'fund-1',
    kind: 'deposit',
    amount: 1_000_000,
    occurredOn: '2026-09-05',
    purpose: null,
    contributorName: null,
    contributorMemberId: null,
    note: null,
    ...over,
  };
}

describe('summarizeFundMonth — gom đúng một tháng', () => {
  it('cộng nạp và rút riêng, net là hiệu', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', kind: 'deposit', amount: 10_000_000 }),
        entry({ id: 'b', kind: 'deposit', amount: 10_000_000 }),
        entry({ id: 'c', kind: 'withdrawal', amount: 8_500_000, purpose: 'tiền nhà' }),
      ],
      '2026-09-15',
    );

    expect(s.deposits).toBe(20_000_000);
    expect(s.withdrawals).toBe(8_500_000);
    expect(s.net).toBe(11_500_000);
  });

  it('LOẠI khoản ngoài tháng được hỏi — ca biên của cả module', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', amount: 5_000_000, occurredOn: '2026-08-31' }),
        entry({ id: 'b', amount: 7_000_000, occurredOn: '2026-09-01' }),
        entry({ id: 'c', amount: 9_000_000, occurredOn: '2026-10-01' }),
      ],
      '2026-09-20',
    );

    expect(s.deposits).toBe(7_000_000);
    expect(s.entryCount).toBe(1);
  });

  it('cùng số tháng khác năm là HAI tháng khác nhau', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', amount: 3_000_000, occurredOn: '2025-09-10' }),
        entry({ id: 'b', amount: 4_000_000, occurredOn: '2026-09-10' }),
      ],
      '2026-09-01',
    );

    expect(s.deposits).toBe(4_000_000);
  });

  it('`month` nhận bất kỳ ngày nào trong tháng, trả về ngày đầu tháng', () => {
    expect(summarizeFundMonth([], '2026-09-28').month).toBe('2026-09-01');
    expect(summarizeFundMonth([], '2026-09-01').month).toBe('2026-09-01');
  });

  it('tháng rỗng trả summary rỗng, KHÔNG phải null — màn hình vẫn phải vẽ được', () => {
    const s = summarizeFundMonth([entry({ occurredOn: '2026-08-05' })], '2026-09-01');

    expect(s.entryCount).toBe(0);
    expect(s.deposits).toBe(0);
    expect(s.byContributor).toEqual([]);
  });

  it('entryCount LUÔN có mặt và bằng số khoản trong tháng', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a' }),
        entry({ id: 'b' }),
        entry({ id: 'c', kind: 'withdrawal', purpose: 'điện nước' }),
      ],
      '2026-09-01',
    );

    expect(s.entryCount).toBe(3);
  });
});

describe('byContributor — ngoại lệ có điều kiện của 03 §9', () => {
  it('gom theo tên, cộng đúng số tiền và số lần', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', contributorName: 'Anh', amount: 6_000_000 }),
        entry({ id: 'b', contributorName: 'Anh', amount: 4_000_000 }),
        entry({ id: 'c', contributorName: 'Em', amount: 10_000_000 }),
      ],
      '2026-09-01',
    );

    expect(s.byContributor).toEqual([
      { name: 'Anh', total: 10_000_000, count: 2 },
      { name: 'Em', total: 10_000_000, count: 1 },
    ]);
  });

  it('sắp theo TÊN ABC, KHÔNG theo số tiền — sắp theo tiền là bảng xếp hạng', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', contributorName: 'Yến', amount: 90_000_000 }),
        entry({ id: 'b', contributorName: 'An', amount: 1_000_000 }),
      ],
      '2026-09-01',
    );

    // Yến góp nhiều hơn gấp 90 lần nhưng vẫn đứng sau An.
    expect(s.byContributor.map((c) => c.name)).toEqual(['An', 'Yến']);
  });

  it('khoản không ghi tên gom vào MỘT nhóm mà không mất số tiền', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', contributorName: null, amount: 2_000_000 }),
        entry({ id: 'b', contributorName: '   ', amount: 3_000_000 }),
      ],
      '2026-09-01',
    );

    expect(s.byContributor).toEqual([{ name: UNNAMED_CONTRIBUTOR, total: 5_000_000, count: 2 }]);
    expect(s.deposits).toBe(5_000_000);
  });

  it('CHỈ khoản nạp vào khối người đóng góp — rút không hỏi ai rút', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', kind: 'deposit', contributorName: 'Anh', amount: 10_000_000 }),
        entry({
          id: 'b',
          kind: 'withdrawal',
          contributorName: 'Em',
          amount: 4_000_000,
          purpose: 'tiền nhà',
        }),
      ],
      '2026-09-01',
    );

    expect(s.byContributor).toEqual([{ name: 'Anh', total: 10_000_000, count: 1 }]);
  });

  it('KHÔNG gom theo contributorMemberId — người nạp có thể không phải member', () => {
    const s = summarizeFundMonth(
      [
        entry({ id: 'a', contributorName: 'Bà ngoại', contributorMemberId: null, amount: 5_000_000 }),
        entry({ id: 'b', contributorName: 'Bà ngoại', contributorMemberId: 'm-9', amount: 5_000_000 }),
      ],
      '2026-09-01',
    );

    // Cùng tên thì cùng một nhóm, bất kể memberId khác nhau hay null.
    expect(s.byContributor).toEqual([{ name: 'Bà ngoại', total: 10_000_000, count: 2 }]);
  });
});

describe('fundMonthsPresent', () => {
  it('trả các tháng có bản ghi, mới nhất trước, không trùng', () => {
    const months = fundMonthsPresent([
      entry({ id: 'a', occurredOn: '2026-09-05' }),
      entry({ id: 'b', occurredOn: '2026-09-20' }),
      entry({ id: 'c', occurredOn: '2026-07-01' }),
    ]);

    expect(months).toEqual(['2026-09-01', '2026-07-01']);
  });

  it('rỗng khi chưa có khoản nào', () => {
    expect(fundMonthsPresent([])).toEqual([]);
  });
});

/**
 * ĐÂY LÀ BẢN KIỂM ĐƯỢC BẰNG MÁY CỦA 03 §9 NGOẠI LỆ 2.
 *
 * Ngoại lệ "tổng tiền theo người" chỉ an toàn nhờ cửa sổ MỘT THÁNG. Một hàm
 * nhận khoảng thời gian, hay một hàm gom theo người mà không cần biết tháng, sẽ
 * phá đúng ranh giới đó — và nó sẽ được thêm vào bởi người không đọc tài liệu.
 *
 * Test này đóng băng danh sách export. Thêm hàm mới thì nó đỏ, và người thêm
 * buộc phải đọc tới đây trước khi sửa danh sách.
 */
describe('đóng băng bề mặt export của src/funds/', () => {
  it('đúng ba export, không hơn', () => {
    expect(Object.keys(fundsModule).sort()).toEqual([
      'UNNAMED_CONTRIBUTOR',
      'fundMonthsPresent',
      'summarizeFundMonth',
    ]);
  });

  it('summarizeFundMonth nhận ĐÚNG hai tham số — không có biến thể nhận range', () => {
    expect(summarizeFundMonth.length).toBe(2);
  });
});
