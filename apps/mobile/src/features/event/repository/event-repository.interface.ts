/**
 * Sự kiện gia đình — trung tâm ngữ cảnh của cả app (05 §5.4).
 *
 * `next_occurrence_date` là TRƯỜNG CHỈ ĐỌC (02 §7): chỉ Edge
 * `refresh-lunar-dates` được ghi. EventInput cố ý không có nó, và toRow() ở đây
 * không bao giờ đụng tới — nếu có form nào chạm tới, đó là bug.
 */

import type {
  CalendarType,
  EventKind,
  FamilyEvent,
  FamilySide,
  ISODate,
  Recurrence,
  UUID,
} from '@family-organizer/domain';

/**
 * CỐ Ý KHÔNG có `nextOccurrenceDate` — trường chỉ đọc, chỉ Edge
 * `refresh-lunar-dates` được ghi (02 §7). Nếu có form nào chạm tới, đó là bug.
 */
export interface EventInput {
  title: string;
  kind: EventKind;
  side: FamilySide | null;
  location: string | null;
  notes: string | null;
  calendar: CalendarType;
  solarDate: ISODate | null;
  lunarDay: number | null;
  lunarMonth: number | null;
  lunarLeapMonth: boolean;
  startTime: string | null;
  isAllDay: boolean;
  recur: Recurrence | null;
  remindLeadDays: number;
  estimatedCost: number | null;
}

export interface EventRepository {
  list(hh: UUID): Promise<FamilyEvent[]>;
  get(hh: UUID, id: UUID): Promise<FamilyEvent | null>;
  create(hh: UUID, input: EventInput): Promise<FamilyEvent>;
  update(hh: UUID, id: UUID, patch: Partial<EventInput>): Promise<FamilyEvent>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
