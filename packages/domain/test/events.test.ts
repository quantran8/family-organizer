import { describe, expect, it } from 'vitest';

import { groupEventsByMonth } from '../src/events/group.ts';
import type { ISODate } from '../src/types/base.ts';
import type { FamilyEvent } from '../src/types/entities.ts';

function ev(over: Partial<FamilyEvent> = {}): FamilyEvent {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Giỗ ông ngoại',
    kind: 'death_anniversary',
    side: null,
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
    nextOccurrenceDate: null,
    estimatedCost: null,
    ...over,
  };
}

const TODAY: ISODate = '2026-07-31';

describe('groupEventsByMonth', () => {
  it('rỗng → không nhóm nào', () => {
    expect(groupEventsByMonth([], TODAY)).toEqual([]);
  });

  it('gom theo tháng dương và sắp tăng dần', () => {
    const groups = groupEventsByMonth(
      [
        ev({ id: 'thang10-muon', nextOccurrenceDate: '2026-10-20' }),
        ev({ id: 'thang9', nextOccurrenceDate: '2026-09-25' }),
        ev({ id: 'thang10-som', nextOccurrenceDate: '2026-10-05' }),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.month)).toEqual(['2026-09', '2026-10']);
    expect(groups[1]?.events.map((e) => e.id)).toEqual(['thang10-som', 'thang10-muon']);
  });

  it('cùng tháng nhưng KHÁC NĂM là hai nhóm', () => {
    // Ca dễ sai nếu gom theo số tháng thay vì theo `YYYY-MM`: tháng 9/2026 và
    // tháng 9/2027 sẽ dính làm một, và người dùng thấy giỗ sang năm nằm lẫn
    // vào tháng này.
    const groups = groupEventsByMonth(
      [
        ev({ id: 'namsau', nextOccurrenceDate: '2027-09-14' }),
        ev({ id: 'namnay', nextOccurrenceDate: '2026-09-25' }),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.month)).toEqual(['2026-09', '2027-09']);
  });

  it('sự kiện đã qua bị loại', () => {
    const groups = groupEventsByMonth(
      [ev({ id: 'qua', calendar: 'solar', nextOccurrenceDate: '2026-07-30' })],
      TODAY,
    );
    expect(groups).toEqual([]);
  });

  it('đúng hôm nay thì GIỮ — không phải "đã qua"', () => {
    const groups = groupEventsByMonth([ev({ id: 'homnay', nextOccurrenceDate: TODAY })], TODAY);
    expect(groups[0]?.events.map((e) => e.id)).toEqual(['homnay']);
  });

  it('chưa có ngày → nhóm cuối, KHÔNG bị loại', () => {
    // Sự kiện âm lịch vừa tạo, Edge chưa kịp tính. Loại nó đi thì người dùng
    // vừa bấm Lưu xong nhìn vào danh sách trống và tưởng thao tác hỏng.
    const groups = groupEventsByMonth(
      [
        ev({ id: 'chuatinh', nextOccurrenceDate: null }),
        ev({ id: 'cotinh', nextOccurrenceDate: '2026-09-25' }),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.month)).toEqual(['2026-09', null]);
    expect(groups[1]?.events.map((e) => e.id)).toEqual(['chuatinh']);
  });

  it('CHỈ có sự kiện chưa tính ngày → vẫn trả một nhóm', () => {
    const groups = groupEventsByMonth([ev({ nextOccurrenceDate: null })], TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.month).toBeNull();
  });

  it('year và monthNumber khớp với month', () => {
    const groups = groupEventsByMonth([ev({ nextOccurrenceDate: '2026-10-05' })], TODAY);
    expect(groups[0]).toMatchObject({ month: '2026-10', year: 2026, monthNumber: 10 });
  });
});
