/**
 * View đọc — 02 §3.
 *
 * Ba view trong DB ánh xạ thẳng sang ba type ở đây. UI CHỈ đọc từ đây cho các
 * màn hình tổng hợp — không tự ghép nhiều query.
 */

import type { Basis, Freshness, ISODate, NeedSource, UUID } from './base.ts';

/**
 * View `home_feed`. Cột `source` trong DB có kiểu entity_type (7 giá trị) nhưng
 * chỉ 4 nguồn thật sự xuất hiện trong union — thu hẹp ở đây, repository narrow
 * lúc map.
 */
export interface HomeFeedItem {
  source: 'task' | 'event' | 'upcoming_payment' | 'document';
  id: UUID;
  title: string;
  onDate: ISODate | null;
  memberId: UUID | null;
  amount: number | null;
  isDone: boolean;
}

/**
 * View `finance_metrics` — nguyên liệu thô.
 *
 * KHÔNG chứa status: trạng thái là chính sách sản phẩm, tính ở
 * computeFinanceStatus() để đổi được mà không cần migration.
 */
export interface FinanceMetrics {
  totalUsable: number;
  totalSavings: number;
  totalLongTerm: number;
  totalDebt: number;
  /**
   * CHỈ upcoming_payments. Chi phí sự kiện và phí gia hạn giấy tờ nằm ở
   * UpcomingNeed — trộn vào đây sẽ đếm trùng ở màn hình Sắp tới.
   */
  dueNext30d: number;
  dueNext7dCount: number;
  overdueCount: number;
  attentionCount: number;
  /**
   * Ngày khai gần nhất CỦA RIÊNG nhóm "dùng ngay" — đây là con số màn hình Sắp
   * tới dựa vào, nên nhãn thời gian phải theo đúng nhóm này. Dùng cho NHÃN,
   * không cho status.
   */
  lastUsableUpdatedOn: ISODate | null;
  lastUpdatedOn: ISODate | null;
  currency: string;
  /** Xem Household.recordThresholdAmount — KHÔNG phải validation. */
  recordThresholdAmount: number | null;
}

/** View `money_feed` — tầng UI không cần biết tài chính nằm ở 4 bảng. */
export interface MoneyFeedItem {
  kind: 'asset' | 'debt' | 'upcoming_payment' | 'goal';
  id: UUID;
  title: string;
  amount: number;
  onDate: ISODate | null;
  memberId: UUID | null;
  isClosed: boolean;
}

/**
 * View `upcoming_needs` — một khoản tiền sắp phải chuẩn bị, bất kể sinh ra từ
 * đâu. Nguồn của màn hình "Sắp tới nhà mình cần bao nhiêu" (06 §3).
 *
 * Ba nguồn được trộn vào một danh sách: khoản sắp trả, chi phí sự kiện, phí
 * gia hạn giấy tờ. Người dùng không cần biết chúng đến từ ba bảng.
 *
 * `goals` CỐ Ý không có mặt: nghĩa vụ khác nguyện vọng (08 §2.3).
 */
export interface UpcomingNeed {
  source: NeedSource;
  id: UUID;
  title: string;
  amount: number;
  onDate: ISODate;
}

/**
 * Kết quả của projectRunway(). Mọi con số đều là DỰ TÍNH từ số đã khai.
 *
 * `basis` và `usableAsOf`/`freshness` luôn được trả về để UI không có đường
 * nào hiển thị kết quả mà thiếu nhãn thời gian — 03 §1c.
 */
export interface RunwayProjection {
  basis: Basis;
  /** 90 */
  horizonDays: number;
  total: number;
  byMonth: { month: ISODate; total: number; items: UpcomingNeed[] }[];
  /** totalUsable − total. Âm = thiếu. */
  projectedRemaining: number;
  /** null khi dư. Số dương khi thiếu. */
  shortfall: number | null;
  usableAsOf: ISODate | null;
  freshness: Freshness;
}
