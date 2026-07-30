import { describe, expect, it } from 'vitest';

import { computeFinanceStatus, explainFinanceStatus } from '../src/finance/status.js';
import { inferLiquidity } from '../src/finance/liquidity.js';
import { ASSET_KINDS, type Liquidity } from '../src/types/base.js';
import type { FinanceMetrics } from '../src/types/views.js';

const TODAY = '2026-07-30';

function metrics(over: Partial<FinanceMetrics> = {}): FinanceMetrics {
  return {
    totalUsable: 0,
    totalSavings: 0,
    totalLongTerm: 0,
    totalDebt: 0,
    dueNext30d: 0,
    dueNext7dCount: 0,
    overdueCount: 0,
    attentionCount: 0,
    lastUpdatedOn: null,
    lastSnapshotOn: null,
    snapshotIntervalDays: 7,
    currency: 'VND',
    ...over,
  };
}

describe('computeFinanceStatus — cả 4 nhánh (03 §9)', () => {
  it('bậc 1: chưa có gì → no_data', () => {
    expect(computeFinanceStatus(metrics(), TODAY)).toBe('no_data');
  });

  it('bậc 1: chỉ cần một khoản nợ cũng đủ để thoát no_data', () => {
    expect(computeFinanceStatus(metrics({ totalDebt: 1 }), TODAY)).not.toBe('no_data');
  });

  it('bậc 2: có khoản quá hạn → tight', () => {
    const m = metrics({ totalUsable: 100_000_000, overdueCount: 1 });
    expect(computeFinanceStatus(m, TODAY)).toBe('tight');
    expect(explainFinanceStatus(m, TODAY).reason).toEqual({ kind: 'overdue', count: 1 });
  });

  it('bậc 2: tiền dùng ngay ít hơn khoản sắp trả 30 ngày → tight', () => {
    const m = metrics({ totalUsable: 10_000_000, dueNext30d: 25_000_000 });
    expect(computeFinanceStatus(m, TODAY)).toBe('tight');
    expect(explainFinanceStatus(m, TODAY).reason).toEqual({
      kind: 'not_enough',
      dueNext30d: 25_000_000,
      totalUsable: 10_000_000,
    });
  });

  it('bậc 3: có cờ cần trao đổi → watch', () => {
    const m = metrics({ totalUsable: 50_000_000, attentionCount: 1 });
    expect(computeFinanceStatus(m, TODAY)).toBe('watch');
  });

  it('bậc 3: có khoản đến hạn trong 7 ngày → watch', () => {
    const m = metrics({ totalUsable: 50_000_000, dueNext7dCount: 2 });
    expect(computeFinanceStatus(m, TODAY)).toBe('watch');
    expect(explainFinanceStatus(m, TODAY).reason).toEqual({ kind: 'due_soon', count: 2 });
  });

  it('bậc 3: số liệu cũ hơn snapshotIntervalDays × 3 → watch', () => {
    // interval 7 ngày → ngưỡng 21 ngày. 24 ngày trước là quá cũ.
    const m = metrics({
      totalUsable: 50_000_000,
      lastUpdatedOn: '2026-07-06',
      snapshotIntervalDays: 7,
    });
    expect(computeFinanceStatus(m, TODAY)).toBe('watch');
    expect(explainFinanceStatus(m, TODAY).reason).toEqual({ kind: 'stale', daysAgo: 24 });
  });

  it('bậc 3: đúng ngưỡng cũ (21 ngày) thì CHƯA phải watch — điều kiện là ">"', () => {
    const m = metrics({
      totalUsable: 50_000_000,
      lastUpdatedOn: '2026-07-09', // đúng 21 ngày trước
      snapshotIntervalDays: 7,
    });
    expect(computeFinanceStatus(m, TODAY)).toBe('ok');
  });

  it('bậc 4: còn lại → ok', () => {
    const m = metrics({
      totalUsable: 50_000_000,
      dueNext30d: 20_000_000,
      lastUpdatedOn: TODAY,
    });
    expect(computeFinanceStatus(m, TODAY)).toBe('ok');
    expect(explainFinanceStatus(m, TODAY).reason).toEqual({ kind: 'ok' });
  });
});

describe('computeFinanceStatus — ranh giới totalUsable === dueNext30d (03 §9)', () => {
  it('vừa đủ tiền KHÔNG phải tight — điều kiện là "<" chứ không phải "<="', () => {
    const m = metrics({
      totalUsable: 25_000_000,
      dueNext30d: 25_000_000,
      lastUpdatedOn: TODAY,
    });
    expect(computeFinanceStatus(m, TODAY)).toBe('ok');
  });

  it('thiếu đúng 1 đồng thì thành tight', () => {
    const m = metrics({
      totalUsable: 24_999_999,
      dueNext30d: 25_000_000,
      lastUpdatedOn: TODAY,
    });
    expect(computeFinanceStatus(m, TODAY)).toBe('tight');
  });
});

describe('computeFinanceStatus — thứ tự bậc, dừng ở điều kiện khớp đầu tiên', () => {
  it('quá hạn thắng cờ cần trao đổi: tight chứ không phải watch', () => {
    const m = metrics({ totalUsable: 99_000_000, overdueCount: 1, attentionCount: 5 });
    expect(computeFinanceStatus(m, TODAY)).toBe('tight');
  });

  it('no_data thắng tất cả: không có dữ liệu thì không phán xét gì', () => {
    // attentionCount không nằm trong danh sách "có gì đó" — cờ không phải tiền.
    const m = metrics({ attentionCount: 3 });
    expect(computeFinanceStatus(m, TODAY)).toBe('no_data');
  });
});

describe('inferLiquidity — phủ hết AssetKind (03 §9)', () => {
  const expected: Record<string, Liquidity> = {
    cash: 'usable_now',
    bank_account: 'usable_now',
    savings: 'not_immediate',
    gold: 'not_immediate',
    receivable: 'not_immediate',
    real_estate: 'long_term',
    investment: 'long_term',
    other: 'not_immediate',
  };

  it.each(ASSET_KINDS)('%s', (kind) => {
    expect(inferLiquidity(kind)).toBe(expected[kind]);
  });

  it('không bỏ sót loại nào', () => {
    expect(ASSET_KINDS).toHaveLength(Object.keys(expected).length);
  });
});
