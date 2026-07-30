import { describe, expect, it } from 'vitest';

import { endOfWeek, groupTasksByDue, taskGroupOf, TASK_GROUP_ORDER } from '../src/tasks/group.js';
import type { ISODate } from '../src/types/base.js';
import type { Task } from '../src/types/entities.js';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Đổ rác',
    notes: null,
    assigneeId: null,
    dueDate: null,
    dueTime: null,
    recur: null,
    remindLeadDays: 0,
    status: 'todo',
    eventId: null,
    ...over,
  };
}

/** 2026-07-30 là Thứ Năm. Cả file neo vào ngày này trừ khi nói khác. */
const THU: ISODate = '2026-07-30';

describe('endOfWeek — tuần bắt đầu Thứ Hai', () => {
  it('Thứ Năm 30/7 → Chủ nhật 2/8', () => {
    expect(endOfWeek(THU)).toBe('2026-08-02');
  });

  it('Thứ Hai → Chủ nhật cùng tuần', () => {
    expect(endOfWeek('2026-07-27')).toBe('2026-08-02');
  });

  it('Chủ nhật trả về CHÍNH NÓ, không nhảy sang tuần sau', () => {
    // Ca dễ sai nhất: weekdayOf trả 0 cho Chủ nhật, và cộng 6 ngày ở đây sẽ
    // kéo cả tuần sau vào nhóm "Tuần này".
    expect(endOfWeek('2026-08-02')).toBe('2026-08-02');
  });
});

describe('taskGroupOf', () => {
  it('không có hạn → no_due', () => {
    expect(taskGroupOf(null, THU)).toBe('no_due');
  });

  it('hôm qua → overdue, hôm nay → today, mai → tomorrow', () => {
    expect(taskGroupOf('2026-07-29', THU)).toBe('overdue');
    expect(taskGroupOf(THU, THU)).toBe('today');
    expect(taskGroupOf('2026-07-31', THU)).toBe('tomorrow');
  });

  it('quá hạn nhiều tháng vẫn là overdue, không rơi xuống later', () => {
    expect(taskGroupOf('2026-01-05', THU)).toBe('overdue');
  });

  it('ngày kia tới hết Chủ nhật → this_week', () => {
    expect(taskGroupOf('2026-08-01', THU)).toBe('this_week');
    expect(taskGroupOf('2026-08-02', THU)).toBe('this_week');
  });

  it('Thứ Hai kế tiếp → later', () => {
    expect(taskGroupOf('2026-08-03', THU)).toBe('later');
  });

  it('nhìn từ Thứ Bảy: ngày mai (Chủ nhật) vẫn là tomorrow, không phải this_week', () => {
    // Ranh giới tuần chỉ được xét TỪ ngày kia trở đi. Nếu xét trước, việc hạn
    // Chủ nhật nhìn từ Thứ Bảy sẽ mất nhãn "Ngày mai" — nhãn cụ thể hơn.
    expect(taskGroupOf('2026-08-02', '2026-08-01')).toBe('tomorrow');
  });

  it('nhìn từ Thứ Bảy: ngày kia đã sang tuần sau → later, không phải this_week', () => {
    // Thứ Bảy 1/8 + 2 ngày = Thứ Hai 3/8, đã qua Chủ nhật 2/8.
    expect(taskGroupOf('2026-08-03', '2026-08-01')).toBe('later');
  });

  it('nhìn từ Chủ nhật: mọi thứ sau ngày mai đều là later — this_week rỗng', () => {
    expect(taskGroupOf('2026-08-03', '2026-08-02')).toBe('tomorrow');
    expect(taskGroupOf('2026-08-04', '2026-08-02')).toBe('later');
  });
});

describe('groupTasksByDue', () => {
  it('luôn trả đủ sáu nhóm, đúng thứ tự hiển thị', () => {
    const groups = groupTasksByDue([], THU);
    expect(groups.map((g) => g.key)).toEqual([...TASK_GROUP_ORDER]);
    expect(groups.every((g) => g.tasks.length === 0)).toBe(true);
  });

  it('loại việc đã xong — danh sách trả lời "còn gì phải làm"', () => {
    const groups = groupTasksByDue(
      [
        task({ id: '1', dueDate: THU, status: 'done' }),
        task({ id: '2', dueDate: THU, status: 'todo' }),
      ],
      THU,
    );
    const today = groups.find((g) => g.key === 'today');
    expect(today?.tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('trong mỗi nhóm sắp theo ngày tăng dần', () => {
    const groups = groupTasksByDue(
      [
        task({ id: 'muộn', dueDate: '2026-07-28' }),
        task({ id: 'sớm', dueDate: '2026-07-20' }),
        task({ id: 'giữa', dueDate: '2026-07-25' }),
      ],
      THU,
    );
    const overdue = groups.find((g) => g.key === 'overdue');
    expect(overdue?.tasks.map((t) => t.id)).toEqual(['sớm', 'giữa', 'muộn']);
  });

  it('việc không có hạn giữ nguyên thứ tự đầu vào', () => {
    const groups = groupTasksByDue([task({ id: 'b' }), task({ id: 'a' })], THU);
    const noDue = groups.find((g) => g.key === 'no_due');
    expect(noDue?.tasks.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('phân bổ đúng qua cả sáu nhóm', () => {
    const groups = groupTasksByDue(
      [
        task({ id: 'qh', dueDate: '2026-07-01' }),
        task({ id: 'hn', dueDate: THU }),
        task({ id: 'mai', dueDate: '2026-07-31' }),
        task({ id: 'tuan', dueDate: '2026-08-02' }),
        task({ id: 'sau', dueDate: '2026-09-01' }),
        task({ id: 'khong' }),
      ],
      THU,
    );
    expect(groups.map((g) => g.tasks.map((t) => t.id))).toEqual([
      ['qh'],
      ['hn'],
      ['mai'],
      ['tuan'],
      ['sau'],
      ['khong'],
    ]);
  });
});
