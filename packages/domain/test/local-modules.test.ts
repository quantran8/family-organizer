import { describe, expect, it } from 'vitest';

import {
  buildVaccineSchedule,
  doseStatus,
  formatDoseLabel,
} from '../src/child/vaccine.js';
import { suggestGiftAmount, summarizeOccasion } from '../src/gifts/suggest.js';
import { lastYearFor } from '../src/events/last-year.js';
import * as domain from '../src/index.js';
import type {
  ChildVaccineDose,
  EventOccurrence,
  FamilyEvent,
  GiftEntry,
  GiftHistory,
  VaccineScheduleItem,
} from '../src/types/entities.js';

const TODAY = '2026-07-30';

// =============================================================================
// Sổ mừng cưới — 03 §11.1
// =============================================================================

function gift(over: Partial<GiftEntry> = {}): GiftEntry {
  return {
    id: 'g1',
    contactId: 'c1',
    direction: 'received',
    occasion: 'wedding',
    amount: 2_000_000,
    occurredOn: '2023-03-15',
    eventId: null,
    inKindNote: null,
    notes: null,
    ...over,
  };
}

function history(over: Partial<GiftHistory> = {}): GiftHistory {
  return {
    contactId: 'c1',
    displayName: 'Chú Ba',
    timesReceived: 1,
    timesGiven: 0,
    totalReceived: 2_000_000,
    totalGiven: 0,
    lastReceivedOn: '2023-03-15',
    lastGivenOn: null,
    ...over,
  };
}

describe('suggestGiftAmount — vòng lặp quan trọng nhất (03 §13)', () => {
  it('trả null khi contact CHƯA TỪNG mừng nhà mình', () => {
    // UI khi đó không hiện gì cả — không hiện "chưa có dữ liệu".
    const h = history({ timesReceived: 0, totalReceived: 0, lastReceivedOn: null });
    expect(suggestGiftAmount(h, [])).toBeNull();
  });

  it('trả null khi không có lịch sử nào', () => {
    expect(suggestGiftAmount(null, [])).toBeNull();
  });

  it('trả lần NHẬN gần nhất kèm bản ghi làm căn cứ', () => {
    const older = gift({ id: 'g0', amount: 1_000_000, occurredOn: '2021-08-01' });
    const newer = gift({ id: 'g1', amount: 2_000_000, occurredOn: '2023-03-15' });
    const r = suggestGiftAmount(history(), [older, newer]);
    expect(r?.amount).toBe(2_000_000);
    expect(r?.basis.id).toBe('g1');
  });

  it('KHÔNG nội suy, KHÔNG điều chỉnh lạm phát, KHÔNG làm tròn', () => {
    // App đưa ra một DỮ KIỆN, người dùng quyết định. Số trả về phải khớp
    // nguyên văn bản ghi, kể cả khi nó lẻ.
    const odd = gift({ amount: 1_234_567 });
    const r = suggestGiftAmount(history({ totalReceived: 1_234_567 }), [odd]);
    expect(r?.amount).toBe(1_234_567);
  });

  it('bỏ qua chiều "given" — chỉ nhìn lần nhà mình NHẬN', () => {
    const given = gift({ id: 'g9', direction: 'given', amount: 5_000_000, occurredOn: '2026-01-01' });
    const received = gift({ id: 'g1', amount: 2_000_000, occurredOn: '2023-03-15' });
    const r = suggestGiftAmount(history(), [given, received]);
    expect(r?.amount).toBe(2_000_000);
  });

  it('bỏ qua contact khác', () => {
    const other = gift({ id: 'gx', contactId: 'c2', amount: 9_000_000, occurredOn: '2026-01-01' });
    const mine = gift({ id: 'g1', amount: 2_000_000 });
    expect(suggestGiftAmount(history(), [other, mine])?.amount).toBe(2_000_000);
  });

  it('quà hiện vật (amount = 0) KHÔNG sinh gợi ý "đi 0 đồng"', () => {
    const inKind = gift({ amount: 0, inKindNote: 'một cây vàng' });
    expect(suggestGiftAmount(history({ totalReceived: 0 }), [inKind])).toBeNull();
  });
});

describe('summarizeOccasion — tổng của một đám (03 §11.1)', () => {
  it('trả cả count và total', () => {
    // count đi kèm total theo cùng nguyên tắc với groupHistoryByMonth: một
    // tổng không kèm số lượng bản ghi sẽ được đọc là đầy đủ.
    const r = summarizeOccasion([gift({ amount: 2_000_000 }), gift({ amount: 1_000_000 })]);
    expect(r).toEqual({ count: 2, total: 3_000_000 });
  });

  it('rỗng → count 0, total 0', () => {
    expect(summarizeOccasion([])).toEqual({ count: 0, total: 0 });
  });
});

describe('KHÔNG TỒN TẠI hàm chênh lệch đi–nhận (03 §9, 07 §3.4)', () => {
  it('không export hàm nào tên giftBalance hay tương tự', () => {
    // Dữ liệu đủ để tính, và đó chính là lý do phải khẳng định là không tính:
    // nó biến quan hệ họ hàng thành sổ nợ.
    const names = Object.keys(domain);
    expect(names).not.toContain('giftBalance');
    expect(names.filter((n) => /balance|owed|deficit/i.test(n))).toEqual([]);
  });
});

// =============================================================================
// Lịch tiêm — 03 §11.2
// =============================================================================

function item(over: Partial<VaccineScheduleItem> = {}): VaccineScheduleItem {
  return {
    code: 'BCG',
    displayName: 'Lao (BCG)',
    doseLabel: null,
    dueAgeMonths: 0,
    sortOrder: 1,
    sourceName: 'TCMR (giả lập cho test)',
    sourceDate: '2026-01-01',
    scheduleVersion: 'test-1',
    ...over,
  };
}

function dose(over: Partial<ChildVaccineDose> = {}): ChildVaccineDose {
  return {
    id: 'd1',
    memberId: 'm1',
    scheduleCode: 'BCG',
    customName: null,
    displayName: 'Lao (BCG)',
    dueDate: '2026-08-05',
    status: 'planned',
    administeredOn: null,
    facility: null,
    notes: null,
    ...over,
  };
}

describe('buildVaccineSchedule — 03 §13', () => {
  it('items rỗng (chưa seed) → mảng rỗng, KHÔNG bịa ra mốc nào', () => {
    // Cổng chặn phát hành: bảng rỗng làm màn hình hiện trạng thái rỗng THÀNH
    // THẬT. Không có đường nào để hàm này tự sinh dữ liệu y tế.
    expect(buildVaccineSchedule('2025-06-01', [])).toEqual([]);
  });

  it('dueDate = birthday + dueAgeMonths', () => {
    const r = buildVaccineSchedule('2025-06-01', [item({ dueAgeMonths: 2 })]);
    expect(r[0]?.dueDate).toBe('2025-08-01');
  });

  it('mốc tuổi LẺ (1.5 tháng = 6 tuần)', () => {
    // 1 tháng → 1/7, cộng 15 ngày → 16/7.
    const r = buildVaccineSchedule('2025-06-01', [item({ dueAgeMonths: 1.5 })]);
    expect(r[0]?.dueDate).toBe('2025-07-16');
  });

  it('ngày sinh 29/2 — cộng tháng phải kẹp về cuối tháng ngắn', () => {
    // 29/2/2024 + 12 tháng = 28/2/2025 (2025 không nhuận), không phải 1/3.
    const r = buildVaccineSchedule('2024-02-29', [item({ dueAgeMonths: 12 })]);
    expect(r[0]?.dueDate).toBe('2025-02-28');
  });

  it('ngày sinh 31 — cộng sang tháng 30 ngày phải kẹp', () => {
    const r = buildVaccineSchedule('2025-01-31', [item({ dueAgeMonths: 3 })]);
    expect(r[0]?.dueDate).toBe('2025-04-30');
  });

  it('sắp theo sortOrder, không theo thứ tự đầu vào', () => {
    const r = buildVaccineSchedule('2025-06-01', [
      item({ code: 'B', sortOrder: 2, dueAgeMonths: 2 }),
      item({ code: 'A', sortOrder: 1, dueAgeMonths: 0 }),
    ]);
    expect(r.map((d) => d.scheduleCode)).toEqual(['A', 'B']);
  });

  it('ghép doseLabel vào displayName khi có', () => {
    const r = buildVaccineSchedule('2025-06-01', [
      item({ displayName: 'Sởi - Rubella', doseLabel: 'mũi 1' }),
    ]);
    expect(r[0]?.displayName).toBe('Sởi - Rubella — mũi 1');
  });

  it('mọi mũi sinh ra đều ở trạng thái planned', () => {
    const r = buildVaccineSchedule('2025-06-01', [item(), item({ code: 'X', sortOrder: 2 })]);
    expect(r.every((d) => d.status === 'planned')).toBe(true);
    expect(r.every((d) => d.administeredOn === null)).toBe(true);
  });
});

describe('doseStatus — CHỈ ba trạng thái (07 §4.2)', () => {
  it('đã tiêm → done', () => {
    expect(doseStatus(dose({ administeredOn: '2026-07-01' }), TODAY)).toBe('done');
  });

  it('chưa tới hạn → planned', () => {
    expect(doseStatus(dose({ dueDate: '2026-08-05' }), TODAY)).toBe('planned');
  });

  it('đúng ngày đến hạn vẫn là planned, chưa phải quá lịch', () => {
    expect(doseStatus(dose({ dueDate: TODAY }), TODAY)).toBe('planned');
  });

  it('qua hạn mà chưa tiêm → overdue', () => {
    expect(doseStatus(dose({ dueDate: '2026-07-18' }), TODAY)).toBe('overdue');
  });

  it('đã tiêm thì KHÔNG bao giờ là overdue, dù hạn đã qua lâu', () => {
    const d = dose({ dueDate: '2025-01-01', administeredOn: '2025-02-01' });
    expect(doseStatus(d, TODAY)).toBe('done');
  });

  it('chưa có ngày dự kiến → planned', () => {
    expect(doseStatus(dose({ dueDate: null }), TODAY)).toBe('planned');
  });
});

describe('formatDoseLabel — không dùng chữ trách móc (07 §4.2)', () => {
  it('planned trả số ngày còn lại', () => {
    expect(formatDoseLabel(dose({ dueDate: '2026-08-08' }), TODAY)).toEqual({
      kind: 'planned',
      inDays: 9,
    });
  });

  it('overdue trả số ngày QUÁ LỊCH, số dương', () => {
    expect(formatDoseLabel(dose({ dueDate: '2026-07-18' }), TODAY)).toEqual({
      kind: 'overdue',
      days: 12,
    });
  });

  it('done trả ngày đã tiêm', () => {
    expect(formatDoseLabel(dose({ administeredOn: '2026-07-01' }), TODAY)).toEqual({
      kind: 'done',
      on: '2026-07-01',
    });
  });

  it('chưa có ngày dự kiến', () => {
    expect(formatDoseLabel(dose({ dueDate: null }), TODAY)).toEqual({ kind: 'planned_no_date' });
  });
});

describe('KHÔNG TỒN TẠI hàm diễn giải tăng trưởng (03 §11.3)', () => {
  it('không export percentile / WHO / so sánh giữa các con', () => {
    const names = Object.keys(domain);
    expect(names.filter((n) => /percentile|who|growthassess|comparechild/i.test(n))).toEqual([]);
  });

  it('không export hàm nào gợi ý hoãn hay bỏ mũi tiêm', () => {
    const names = Object.keys(domain);
    expect(names.filter((n) => /skipdose|postponedose|suggestskip/i.test(n))).toEqual([]);
  });
});

// =============================================================================
// Trí nhớ năm ngoái — 03 §10
// =============================================================================

function occurrence(over: Partial<EventOccurrence> = {}): EventOccurrence {
  return {
    id: 'o1',
    eventId: 'e1',
    occurredOn: '2025-10-03',
    actualCost: 3_200_000,
    notes: null,
    costAsked: true,
    ...over,
  };
}

const EVENT = { id: 'e1' } as FamilyEvent;

describe('lastYearFor — 03 §10', () => {
  it('chưa từng diễn ra → null', () => {
    expect(lastYearFor(EVENT, [], TODAY)).toBeNull();
  });

  it('trả lần gần nhất TRƯỚC hôm nay', () => {
    const old = occurrence({ id: 'o0', occurredOn: '2024-10-15' });
    const recent = occurrence({ id: 'o1', occurredOn: '2025-10-03' });
    expect(lastYearFor(EVENT, [old, recent], TODAY)?.id).toBe('o1');
  });

  it('bỏ qua lần diễn ra ở tương lai', () => {
    const future = occurrence({ id: 'oF', occurredOn: '2026-10-05' });
    const past = occurrence({ id: 'oP', occurredOn: '2025-10-03' });
    expect(lastYearFor(EVENT, [future, past], TODAY)?.id).toBe('oP');
  });

  it('lần diễn ra ĐÚNG HÔM NAY chưa phải "năm ngoái"', () => {
    expect(lastYearFor(EVENT, [occurrence({ occurredOn: TODAY })], TODAY)).toBeNull();
  });

  it('bỏ qua occurrence của sự kiện khác', () => {
    const other = occurrence({ id: 'oX', eventId: 'e2', occurredOn: '2026-01-01' });
    const mine = occurrence({ id: 'o1', occurredOn: '2025-10-03' });
    expect(lastYearFor(EVENT, [other, mine], TODAY)?.id).toBe('o1');
  });

  it('lần diễn ra mà người dùng BỎ QUA câu hỏi chi phí vẫn được trả về', () => {
    // Một lần diễn ra không có actualCost VẪN là một lần diễn ra. UI hiện ngày
    // và để trống số tiền.
    const skipped = occurrence({ actualCost: null, costAsked: true });
    expect(lastYearFor(EVENT, [skipped], TODAY)?.actualCost).toBeNull();
  });

  it('lần gần nhất KHÔNG có số tiền vẫn thắng lần cũ hơn CÓ số tiền', () => {
    // Thứ tự chọn theo NGÀY, không theo "dòng nào đầy đủ hơn". Nếu có lúc nào
    // đó thấy nên ưu tiên dòng có số — đừng: nó sẽ hiện chi phí của hai năm
    // trước dưới nhãn "năm ngoái", sai một cách rất khó phát hiện vì bản thân
    // con số trông hoàn toàn hợp lý.
    const oldWithCost = occurrence({ id: 'cu-co-so', occurredOn: '2024-10-15', actualCost: 2_800_000 });
    const newNoCost = occurrence({ id: 'moi-khong-so', occurredOn: '2025-10-03', actualCost: null });
    expect(lastYearFor(EVENT, [oldWithCost, newNoCost], TODAY)?.id).toBe('moi-khong-so');
  });
});
