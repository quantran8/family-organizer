import { describe, expect, it } from 'vitest';

import {
  buildReminders,
  capPerDay,
  DEFAULT_LEAD_DAYS,
  DEFAULT_REMIND_HOUR,
  defaultLeadDaysForDocument,
  type BuildRemindersInput,
} from '../src/reminders/build.js';
import type { FamilyDocument, FamilyEvent, TaskInstance, UpcomingPayment } from '../src/types/entities.js';

const TODAY = '2026-07-30';

function emptyInput(over: Partial<BuildRemindersInput> = {}): BuildRemindersInput {
  return { events: [], documents: [], payments: [], tasks: [], ...over };
}

function event(over: Partial<FamilyEvent> = {}): FamilyEvent {
  return {
    id: 'e1',
    title: 'Giỗ ông ngoại',
    kind: 'death_anniversary',
    side: 'maternal',
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
    remindLeadDays: DEFAULT_LEAD_DAYS.event,
    nextOccurrenceDate: '2026-08-10',
    estimatedCost: null,
    ...over,
  };
}

function doc(over: Partial<FamilyDocument> = {}): FamilyDocument {
  return {
    id: 'd1',
    title: 'Bảo hiểm xe',
    type: 'insurance',
    ownerMemberId: null,
    issuedDate: null,
    expiryDate: '2026-09-06',
    remindLeadDays: DEFAULT_LEAD_DAYS.document,
    physicalLocation: null,
    externalLink: null,
    renewalCost: null,
    eventId: null,
    debtId: null,
    extra: {},
    files: [],
    ...over,
  };
}

function payment(over: Partial<UpcomingPayment> = {}): UpcomingPayment {
  return {
    id: 'p1',
    name: 'Học phí',
    amount: 25_000_000,
    dueDate: '2026-08-10',
    dueMonth: null,
    recur: null,
    state: 'unpaid',
    sourceDebtId: null,
    eventId: null,
    notes: null,
    ...over,
  };
}

function taskInstance(over: Partial<TaskInstance> = {}): TaskInstance {
  return {
    id: 'ti1',
    taskId: 't1',
    dueDate: '2026-08-07',
    status: 'todo',
    completedBy: null,
    skipped: false,
    ...over,
  };
}

describe('buildReminders — ngày bắn = hạn − lead', () => {
  it('sự kiện lead 3 ngày', () => {
    const drafts = buildReminders(emptyInput({ events: [event()] }), TODAY, 90);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fireOn).toBe('2026-08-07');
    expect(drafts[0]?.fireHour).toBe(DEFAULT_REMIND_HOUR);
  });

  it('giấy tờ lead 30 ngày', () => {
    const drafts = buildReminders(emptyInput({ documents: [doc()] }), TODAY, 90);
    expect(drafts[0]?.fireOn).toBe('2026-08-07');
  });

  it('hộ chiếu lead 180 ngày (03 §5)', () => {
    expect(defaultLeadDaysForDocument('passport')).toBe(180);
    expect(defaultLeadDaysForDocument('insurance')).toBe(30);
  });

  it('việc nhà lead 0 — bắn đúng ngày đến hạn', () => {
    const drafts = buildReminders(emptyInput({ tasks: [taskInstance()] }), TODAY, 90);
    expect(drafts[0]?.fireOn).toBe('2026-08-07');
  });

  it('khoản sắp trả lead 3 ngày', () => {
    const drafts = buildReminders(emptyInput({ payments: [payment()] }), TODAY, 90);
    expect(drafts[0]?.fireOn).toBe('2026-08-07');
  });
});

describe('buildReminders — GỘP nhiều mục cùng ngày (03 §9)', () => {
  it('bốn nguồn khác nhau trùng ngày bắn → MỘT thông báo', () => {
    const drafts = buildReminders(
      emptyInput({
        events: [event()], //        hạn 10/8, lead 3 → bắn 7/8
        documents: [doc()], //       hạn 6/9,  lead 30 → bắn 7/8
        payments: [payment()], //    hạn 10/8, lead 3 → bắn 7/8
        tasks: [taskInstance()], //  hạn 7/8,  lead 0 → bắn 7/8
        taskTitles: { t1: 'Đổ rác' },
      }),
      TODAY,
      90,
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.fireOn).toBe('2026-08-07');
    expect(drafts[0]?.items).toHaveLength(4);
  });

  it('mục trong một thông báo được sắp theo hạn gần nhất trước', () => {
    const drafts = buildReminders(
      emptyInput({
        events: [event()], //     hạn 10/8
        documents: [doc()], //    hạn 6/9
        tasks: [taskInstance()], // hạn 7/8
        taskTitles: { t1: 'Đổ rác' },
      }),
      TODAY,
      90,
    );
    const dues = drafts[0]?.items.map((i) => i.dueOn);
    expect(dues).toEqual(['2026-08-07', '2026-08-10', '2026-09-06']);
  });

  it('ngày bắn khác nhau thì KHÔNG gộp', () => {
    const drafts = buildReminders(
      emptyInput({
        events: [event(), event({ id: 'e2', nextOccurrenceDate: '2026-08-20' })],
      }),
      TODAY,
      90,
    );
    expect(drafts).toHaveLength(2);
    expect(drafts.map((d) => d.fireOn)).toEqual(['2026-08-07', '2026-08-17']);
  });

  it('kết quả sắp theo ngày bắn tăng dần', () => {
    const drafts = buildReminders(
      emptyInput({
        events: [
          event({ id: 'e3', nextOccurrenceDate: '2026-09-20' }),
          event({ id: 'e1', nextOccurrenceDate: '2026-08-10' }),
          event({ id: 'e2', nextOccurrenceDate: '2026-08-25' }),
        ],
      }),
      TODAY,
      90,
    );
    expect(drafts.map((d) => d.fireOn)).toEqual(['2026-08-07', '2026-08-22', '2026-09-17']);
  });
});

describe('buildReminders — bỏ qua đúng thứ cần bỏ', () => {
  it('ngày bắn đã qua thì không nhắc', () => {
    // Hạn 1/8, lead 30 → bắn 2/7, đã qua so với hôm nay 30/7.
    const drafts = buildReminders(
      emptyInput({ documents: [doc({ expiryDate: '2026-08-01' })] }),
      TODAY,
      90,
    );
    expect(drafts).toHaveLength(0);
  });

  it('vượt chân trời thì không nhắc', () => {
    const drafts = buildReminders(
      emptyInput({ events: [event({ nextOccurrenceDate: '2027-01-01' })] }),
      TODAY,
      30,
    );
    expect(drafts).toHaveLength(0);
  });

  it('khoản đã trả không nhắc', () => {
    const drafts = buildReminders(
      emptyInput({ payments: [payment({ state: 'paid' })] }),
      TODAY,
      90,
    );
    expect(drafts).toHaveLength(0);
  });

  it('việc đã xong hoặc đã bỏ qua thì không nhắc', () => {
    const drafts = buildReminders(
      emptyInput({
        tasks: [
          taskInstance({ id: 'a', status: 'done' }),
          taskInstance({ id: 'b', skipped: true }),
        ],
      }),
      TODAY,
      90,
    );
    expect(drafts).toHaveLength(0);
  });

  it('sự kiện chưa có nextOccurrenceDate thì bỏ qua, không ném', () => {
    const drafts = buildReminders(
      emptyInput({ events: [event({ nextOccurrenceDate: null })] }),
      TODAY,
      90,
    );
    expect(drafts).toHaveLength(0);
  });

  it('khoản dùng dueMonth khi không có dueDate', () => {
    const drafts = buildReminders(
      emptyInput({ payments: [payment({ dueDate: null, dueMonth: '2026-08-10' })] }),
      TODAY,
      90,
    );
    expect(drafts[0]?.fireOn).toBe('2026-08-07');
  });
});

describe('capPerDay — trần 2 thông báo/ngày (03 §5)', () => {
  it('buildReminders đã gộp nên bình thường chỉ 1 thông báo/ngày', () => {
    const drafts = buildReminders(
      emptyInput({
        events: [event()],
        documents: [doc()],
        payments: [payment()],
      }),
      TODAY,
      90,
    );
    expect(capPerDay(drafts)).toHaveLength(1);
  });

  it('cắt phần vượt trần khi người gọi tự thêm draft', () => {
    const extra = [
      { fireOn: '2026-08-07', fireHour: 8, items: [] },
      { fireOn: '2026-08-07', fireHour: 9, items: [] },
      { fireOn: '2026-08-07', fireHour: 10, items: [] },
    ];
    expect(capPerDay(extra)).toHaveLength(2);
  });

  it('trần tính riêng theo từng ngày', () => {
    const extra = [
      { fireOn: '2026-08-07', fireHour: 8, items: [] },
      { fireOn: '2026-08-07', fireHour: 9, items: [] },
      { fireOn: '2026-08-07', fireHour: 10, items: [] },
      { fireOn: '2026-08-08', fireHour: 8, items: [] },
    ];
    expect(capPerDay(extra)).toHaveLength(3);
  });
});
