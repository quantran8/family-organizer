import { describe, expect, it } from 'vitest';

import { computeFinanceStatus, explainFinanceStatus } from '../src/finance/status.js';
import { inferLiquidity } from '../src/finance/liquidity.js';
import { debtPaidAmount, progressPct } from '../src/finance/progress.js';
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

/**
 * Tiến độ — G9.
 *
 * Ba ca biên không kiểm được trong JSX, và cả ba đều xảy ra thật.
 */
describe('progressPct', () => {
  it('kẹp 0–100 và làm tròn', () => {
    expect(progressPct(0, 100)).toBe(0);
    expect(progressPct(40, 100)).toBe(40);
    expect(progressPct(1, 3)).toBe(33);
  });

  // Góp vượt mục tiêu: thanh phải ĐẦY, không tràn ra ngoài khung.
  it('vượt mục tiêu vẫn là 100, không hơn', () => {
    expect(progressPct(150, 100)).toBe(100);
  });

  // Mục tiêu chưa đặt số. Chia cho 0 ra Infinity, và `width: Infinity%` là một
  // thuộc tính style không hợp lệ — React Native bỏ qua im lặng, thanh vẽ rỗng
  // trông y hệt 0% nên bug này không bao giờ tự lộ ra.
  it('mẫu số 0 hoặc âm ra 0, không phải Infinity hay NaN', () => {
    expect(progressPct(50, 0)).toBe(0);
    expect(progressPct(50, -100)).toBe(0);
  });

  it('current âm vẫn kẹp về 0', () => {
    expect(progressPct(-10, 100)).toBe(0);
  });
});

describe('debtPaidAmount', () => {
  it('gốc trừ dư nợ', () => {
    expect(debtPaidAmount(500_000_000, 320_000_000)).toBe(180_000_000);
  });

  it('vừa vay xong, chưa trả đồng nào', () => {
    expect(debtPaidAmount(500_000_000, 500_000_000)).toBe(0);
  });

  it('trả xong', () => {
    expect(debtPaidAmount(500_000_000, 0)).toBe(500_000_000);
  });

  /**
   * Chưa nhập gốc thì KHÔNG BIẾT đã trả bao nhiêu — phải trả `null` để UI ẩn
   * hẳn thanh tiến độ. Trả 0 sẽ nói với người dùng rằng họ chưa trả đồng nào
   * cho một khoản họ đã trả hai năm.
   */
  it('chưa nhập gốc ra null, KHÔNG phải 0', () => {
    expect(debtPaidAmount(null, 320_000_000)).toBeNull();
    expect(debtPaidAmount(0, 320_000_000)).toBeNull();
  });

  /**
   * Dư nợ lớn hơn gốc: xảy ra thật khi người dùng nhập gốc chưa gồm lãi. Kẹp
   * sàn ở 0 — một con số âm ở đây đi thẳng vào `progressPct` rồi vào `width`.
   */
  it('dư nợ lớn hơn gốc thì kẹp về 0, không ra số âm', () => {
    expect(debtPaidAmount(300_000_000, 320_000_000)).toBe(0);
  });
});
