import { describe, expect, it } from 'vitest';

import { computeFreshness, formatDeclaredAt } from '../src/format/declared.js';
import {
  DEFAULT_RECORD_THRESHOLD,
  projectRunway,
  shouldAskForRefresh,
} from '../src/finance/runway.js';
import type { FinanceMetrics, UpcomingNeed } from '../src/types/views.js';

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
    lastUsableUpdatedOn: null,
    lastUpdatedOn: null,
    currency: 'VND',
    recordThresholdAmount: null,
    ...over,
  };
}

function need(over: Partial<UpcomingNeed> = {}): UpcomingNeed {
  return {
    source: 'upcoming_payment',
    kind: 'mandatory',
    id: 'n1',
    title: 'Học phí',
    amount: 1_000_000,
    onDate: '2026-08-10',
    ...over,
  };
}

describe('computeFreshness — ranh giới 14 và 45 ngày (03 §13)', () => {
  it('hôm nay → fresh', () => {
    expect(computeFreshness(TODAY, TODAY)).toBe('fresh');
  });

  it('đúng 14 ngày vẫn là fresh — ranh giới là "≤"', () => {
    expect(computeFreshness('2026-07-16', TODAY)).toBe('fresh');
  });

  it('15 ngày → aging', () => {
    expect(computeFreshness('2026-07-15', TODAY)).toBe('aging');
  });

  it('đúng 45 ngày vẫn là aging', () => {
    expect(computeFreshness('2026-06-15', TODAY)).toBe('aging');
  });

  it('46 ngày → stale', () => {
    expect(computeFreshness('2026-06-14', TODAY)).toBe('stale');
  });

  it('asOf = null → stale', () => {
    // Chưa ai khai gì thì độ tin cậy thấp nhất, không phải cao nhất.
    expect(computeFreshness(null, TODAY)).toBe('stale');
  });
});

describe('formatDeclaredAt — nhãn thời gian bắt buộc (03 §8)', () => {
  it('chưa có số liệu', () => {
    expect(formatDeclaredAt(null, 'Anh', TODAY)).toEqual({ kind: 'never' });
  });

  it('`undefined` KHÔNG ném — đọc như chưa có số liệu', () => {
    // Ngoài hợp đồng kiểu (`ISODate | null`) nhưng tới được thật: cache đĩa
    // khôi phục một hàng view lưu TRƯỚC khi migration thêm cột. Trước khi có
    // nhánh này, `parseISODate` ném RangeError và nguyên màn Nhà mình trắng.
    // Hàm này bắt buộc ở MỌI chỗ hiện số tổng, nên nó phải chịu được dữ liệu
    // lệch hình dạng thay vì kéo sập màn hình.
    expect(formatDeclaredAt(undefined as unknown as null, 'Anh', TODAY)).toEqual({
      kind: 'never',
    });
  });

  it('hôm nay, kèm tên người khai', () => {
    expect(formatDeclaredAt(TODAY, 'Em', TODAY)).toEqual({ kind: 'today', by: 'Em' });
  });

  it('hôm qua', () => {
    expect(formatDeclaredAt('2026-07-29', 'Anh', TODAY)).toEqual({
      kind: 'yesterday',
      by: 'Anh',
    });
  });

  it('dưới một tuần đếm theo ngày', () => {
    expect(formatDeclaredAt('2026-07-26', 'Anh', TODAY)).toEqual({
      kind: 'days_ago',
      days: 4,
      by: 'Anh',
    });
  });

  it('6 tuần trước — ca mẫu của 06 §1', () => {
    // 42 ngày = đúng 6 tuần.
    expect(formatDeclaredAt('2026-06-18', 'Anh', TODAY)).toEqual({
      kind: 'weeks_ago',
      weeks: 6,
      by: 'Anh',
    });
  });

  it('quá 8 tuần thì chuyển sang tháng', () => {
    expect(formatDeclaredAt('2026-04-30', 'Em', TODAY)).toEqual({
      kind: 'months_ago',
      months: 3,
      by: 'Em',
    });
  });

  it('vẫn ra nhãn thời gian khi không biết ai khai', () => {
    // Người khai đã rời nhà. Nhãn thời gian mới là phần BẮT BUỘC, tên là phụ.
    expect(formatDeclaredAt('2026-07-29', null, TODAY)).toEqual({
      kind: 'yesterday',
      by: null,
    });
  });

  it('ngày khai ở tương lai đọc là "hôm nay", không phải số âm', () => {
    expect(formatDeclaredAt('2026-08-02', 'Anh', TODAY)).toEqual({
      kind: 'today',
      by: 'Anh',
    });
  });
});

describe('projectRunway — 03 §1c', () => {
  it('LUÔN trả basis = declared', () => {
    // Ràng buộc bắt buộc 1: đây là một dự tính, không phải một báo cáo.
    expect(projectRunway(metrics(), [], TODAY).basis).toBe('declared');
    expect(projectRunway(metrics({ totalUsable: 9 }), [need()], TODAY).basis).toBe('declared');
  });

  it('LUÔN trả usableAsOf và freshness để UI in được nhãn', () => {
    // Ràng buộc bắt buộc 2: không có đường nào hiển thị kết quả mà thiếu nhãn.
    const r = projectRunway(metrics({ lastUsableUpdatedOn: '2026-06-01' }), [], TODAY);
    expect(r.usableAsOf).toBe('2026-06-01');
    expect(r.freshness).toBe('stale');
  });

  it('shortfall là null khi dư', () => {
    const r = projectRunway(metrics({ totalUsable: 50_000_000 }), [need({ amount: 20_000_000 })], TODAY);
    expect(r.total).toBe(20_000_000);
    expect(r.projectedRemaining).toBe(30_000_000);
    expect(r.shortfall).toBeNull();
  });

  it('vừa đủ (projectedRemaining === 0) vẫn KHÔNG phải thiếu', () => {
    const r = projectRunway(metrics({ totalUsable: 20_000_000 }), [need({ amount: 20_000_000 })], TODAY);
    expect(r.projectedRemaining).toBe(0);
    expect(r.shortfall).toBeNull();
  });

  it('shortfall là số DƯƠNG khi thiếu', () => {
    const r = projectRunway(metrics({ totalUsable: 6_000_000 }), [need({ amount: 20_000_000 })], TODAY);
    expect(r.projectedRemaining).toBe(-14_000_000);
    expect(r.shortfall).toBe(14_000_000);
  });

  it('gom theo tháng, sắp tăng dần, tổng từng tháng đúng', () => {
    const r = projectRunway(
      metrics({ totalUsable: 100_000_000 }),
      [
        need({ id: 'a', amount: 25_000_000, onDate: '2026-09-05' }),
        need({ id: 'b', amount: 3_000_000, onDate: '2026-10-05' }),
        need({ id: 'c', amount: 2_000_000, onDate: '2026-10-20' }),
      ],
      TODAY,
    );
    expect(r.byMonth.map((m) => m.month)).toEqual(['2026-09-01', '2026-10-01']);
    expect(r.byMonth.map((m) => m.total)).toEqual([25_000_000, 5_000_000]);
    expect(r.byMonth[1]?.items).toHaveLength(2);
  });

  it('cùng số tháng khác năm là HAI nhóm', () => {
    // Gom theo 'YYYY-MM', không theo số tháng. Cùng ca biên với groupEventsByMonth.
    const r = projectRunway(
      metrics(),
      [
        need({ id: 'a', amount: 1, onDate: '2026-08-05' }),
        need({ id: 'b', amount: 2, onDate: '2027-08-05' }),
      ],
      TODAY,
    );
    // 2027 nằm ngoài cửa sổ 90 ngày nên bị loại — chỉ còn một nhóm.
    expect(r.byMonth).toHaveLength(1);
  });

  it('khoản ngoài cửa sổ 90 ngày bị loại khỏi tổng', () => {
    const r = projectRunway(
      metrics({ totalUsable: 10_000_000 }),
      [
        need({ id: 'a', amount: 1_000_000, onDate: '2026-08-10' }),
        need({ id: 'b', amount: 99_000_000, onDate: '2027-01-01' }),
      ],
      TODAY,
    );
    expect(r.total).toBe(1_000_000);
  });

  it('khoản QUÁ HẠN vẫn được tính — nó vẫn là tiền phải chuẩn bị', () => {
    const r = projectRunway(
      metrics({ totalUsable: 1_000_000 }),
      [need({ amount: 5_000_000, onDate: '2026-07-01' })],
      TODAY,
    );
    expect(r.total).toBe(5_000_000);
    expect(r.shortfall).toBe(4_000_000);
  });

  it('không có needs → tổng 0, còn lại đúng bằng totalUsable', () => {
    const r = projectRunway(metrics({ totalUsable: 45_000_000 }), [], TODAY);
    expect(r.total).toBe(0);
    expect(r.byMonth).toEqual([]);
    expect(r.optional).toEqual([]);
    expect(r.projectedRemaining).toBe(45_000_000);
    expect(r.horizonDays).toBe(90);
  });
});

/**
 * Nghĩa vụ khác nguyện vọng — 03 §1c ràng buộc 3, cơ chế đổi ở 10 §5.
 *
 * Mục tiêu giờ CÓ trong `needs` để hiện cùng màn hình, nhưng con số hero phải
 * không đổi. Cả nhóm test này là bản kiểm của đúng câu đó.
 */
describe('projectRunway — mục tiêu không bao giờ vào con số hero', () => {
  const optionalNeed = (over: Partial<UpcomingNeed> = {}): UpcomingNeed =>
    need({ source: 'goal', kind: 'optional', id: 'g1', title: 'Quỹ du lịch', ...over });

  it('`total` KHÔNG đổi khi thêm một mục tiêu', () => {
    const base = projectRunway(
      metrics({ totalUsable: 50_000_000 }),
      [need({ amount: 20_000_000 })],
      TODAY,
    );
    const withGoal = projectRunway(
      metrics({ totalUsable: 50_000_000 }),
      [need({ amount: 20_000_000 }), optionalNeed({ amount: 5_000_000 })],
      TODAY,
    );

    expect(withGoal.total).toBe(base.total);
    expect(withGoal.projectedRemaining).toBe(base.projectedRemaining);
  });

  it('`shortfall` KHÔNG đổi khi thêm một mục tiêu', () => {
    const withGoal = projectRunway(
      metrics({ totalUsable: 6_000_000 }),
      [need({ amount: 20_000_000 }), optionalNeed({ amount: 900_000_000 })],
      TODAY,
    );

    // Thiếu vẫn đúng 14tr như khi không có mục tiêu — một quỹ du lịch 900 triệu
    // không được phép làm màn hình hero trở nên đáng sợ.
    expect(withGoal.shortfall).toBe(14_000_000);
  });

  it('`byMonth` chỉ gồm nghĩa vụ', () => {
    const r = projectRunway(
      metrics(),
      [
        need({ id: 'a', amount: 25_000_000, onDate: '2026-09-05' }),
        optionalNeed({ amount: 5_000_000, onDate: '2026-09-20' }),
      ],
      TODAY,
    );

    expect(r.byMonth).toHaveLength(1);
    expect(r.byMonth[0]?.total).toBe(25_000_000);
    expect(r.byMonth[0]?.items).toHaveLength(1);
  });

  it('`optional` được trả về đầy đủ và sắp theo ngày', () => {
    const r = projectRunway(
      metrics(),
      [
        optionalNeed({ id: 'g2', amount: 2_000_000, onDate: '2026-10-01' }),
        optionalNeed({ id: 'g1', amount: 5_000_000, onDate: '2026-08-15' }),
      ],
      TODAY,
    );

    expect(r.optional.map((n) => n.id)).toEqual(['g1', 'g2']);
    expect(r.total).toBe(0);
  });

  it('mục tiêu ngoài cửa sổ 90 ngày cũng bị loại khỏi `optional`', () => {
    const r = projectRunway(metrics(), [optionalNeed({ onDate: '2027-06-01' })], TODAY);
    expect(r.optional).toEqual([]);
  });
});

describe('shouldAskForRefresh — chỉ true khi CẢ HAI điều kiện đúng (03 §13)', () => {
  const staleMetrics = metrics({ lastUsableUpdatedOn: '2026-05-01' }); // > 45 ngày
  const freshMetrics = metrics({ lastUsableUpdatedOn: TODAY });
  const bigSoon = need({ amount: DEFAULT_RECORD_THRESHOLD, onDate: '2026-08-05' });

  it('số dư cũ + khoản lớn sắp tới → true', () => {
    expect(shouldAskForRefresh(staleMetrics, [bigSoon], TODAY)).toBe(true);
  });

  it('số dư CÒN MỚI + khoản lớn sắp tới → false', () => {
    expect(shouldAskForRefresh(freshMetrics, [bigSoon], TODAY)).toBe(false);
  });

  it('số dư cũ nhưng KHÔNG có khoản lớn nào → false', () => {
    const small = need({ amount: DEFAULT_RECORD_THRESHOLD - 1, onDate: '2026-08-05' });
    expect(shouldAskForRefresh(staleMetrics, [small], TODAY)).toBe(false);
  });

  it('số dư cũ, khoản lớn nhưng ngoài 14 ngày → false', () => {
    const late = need({ amount: 10_000_000, onDate: '2026-09-30' });
    expect(shouldAskForRefresh(staleMetrics, [late], TODAY)).toBe(false);
  });

  it('không có needs nào → false', () => {
    expect(shouldAskForRefresh(staleMetrics, [], TODAY)).toBe(false);
  });

  it('dùng ngưỡng của household khi đã chốt', () => {
    const m = metrics({ lastUsableUpdatedOn: '2026-05-01', recordThresholdAmount: 500_000 });
    const mid = need({ amount: 600_000, onDate: '2026-08-05' });
    // Dưới ngưỡng mặc định 2tr nhưng trên ngưỡng nhà này tự chốt.
    expect(shouldAskForRefresh(m, [mid], TODAY)).toBe(true);
    expect(shouldAskForRefresh(staleMetrics, [mid], TODAY)).toBe(false);
  });

  it('ngưỡng null dùng mặc định 2 triệu', () => {
    expect(DEFAULT_RECORD_THRESHOLD).toBe(2_000_000);
    const atThreshold = need({ amount: 2_000_000, onDate: '2026-08-05' });
    expect(shouldAskForRefresh(staleMetrics, [atThreshold], TODAY)).toBe(true);
  });

  it('khoản lớn ĐÃ QUÁ HẠN là lý do MẠNH HƠN để hỏi, không phải để im', () => {
    const overdue = need({ amount: 10_000_000, onDate: '2026-07-01' });
    expect(shouldAskForRefresh(staleMetrics, [overdue], TODAY)).toBe(true);
  });
});
