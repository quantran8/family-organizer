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
  EventOccurrence,
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
  /**
   * NHẮC KÉP — 03 §5b. 1-3 ngày trước, null = không có.
   *
   * Mốc này KHÔNG bắn thêm push; nó SINH MỘT VIỆC LINH HOẠT. Phần lớn sự cố gia
   * đình không phải quên sự kiện, mà là nhớ sự kiện nhưng quên phần chuẩn bị.
   *
   * CỐ Ý KHÔNG có `prepTaskId` ở đây: đó là trường chỉ đọc, chỉ Edge
   * `build-reminders` được ghi (02 §7) — cùng lý do với `nextOccurrenceDate`.
   */
  prepLeadDays: number | null;
  /** Sự kiện của con nào (`kind='child'`). Chỉ để lọc và lấy màu. */
  childMemberId: UUID | null;
  estimatedCost: number | null;
}

/** Một lần diễn ra CHƯA được hỏi chi phí, kèm tên sự kiện để dựng câu hỏi. */
export interface PendingCostAsk {
  occurrence: EventOccurrence;
  eventTitle: string;
  /** Số dự kiến lúc trước — điền sẵn vào ô nhập để người dùng chỉ cần sửa. */
  estimatedCost: number | null;
}

export interface EventRepository {
  list(hh: UUID): Promise<FamilyEvent[]>;
  get(hh: UUID, id: UUID): Promise<FamilyEvent | null>;
  create(hh: UUID, input: EventInput): Promise<FamilyEvent>;
  update(hh: UUID, id: UUID, patch: Partial<EventInput>): Promise<FamilyEvent>;
  softDelete(hh: UUID, id: UUID): Promise<void>;

  /**
   * Trí nhớ năm ngoái — những lần đã diễn ra, mới nhất trước (06 §5).
   *
   * CHỈ ĐỌC. Không có `create`: dòng `event_occurrences` do Edge cron
   * `refresh-lunar-dates` sinh ra khi `next_occurrence_date` trôi qua, và đó là
   * đường DUY NHẤT (03 §3). Một hàm tạo ở đây sẽ là đường thứ hai.
   */
  occurrences(hh: UUID, eventId: UUID, limit: number): Promise<EventOccurrence[]>;

  /**
   * Lần diễn ra kế tiếp cần hỏi chi phí, hoặc `null` nếu không có.
   *
   * Trả **một** thôi, dù có nhiều lần chưa hỏi: `05 §5.7` nói rõ "hiện MỘT
   * sheet". Ba dịp trôi qua trong lúc người dùng đi vắng không được biến thành
   * ba câu hỏi xếp hàng lúc mở app.
   */
  pendingCostAsk(hh: UUID): Promise<PendingCostAsk | null>;

  /**
   * Ghi chi phí thực tế và đóng câu hỏi lại VĨNH VIỄN.
   *
   * `amount === null` là "bỏ qua" — vẫn đặt `cost_asked = true`. Đó là toàn bộ
   * điểm của cột đó: bỏ qua rồi thì không bao giờ hỏi lại về dịp ấy. Hỏi lần
   * hai về một chuyện đã qua là phiền, không phải chu đáo.
   */
  recordActualCost(hh: UUID, occurrenceId: UUID, amount: number | null): Promise<void>;
}
