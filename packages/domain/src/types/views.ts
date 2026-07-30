/**
 * View đọc — 02 §3.
 *
 * Ba view trong DB ánh xạ thẳng sang ba type ở đây. UI CHỈ đọc từ đây cho các
 * màn hình tổng hợp — không tự ghép nhiều query.
 */

import type { ISODate, UUID } from './base.ts';

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
  dueNext30d: number;
  dueNext7dCount: number;
  overdueCount: number;
  attentionCount: number;
  lastUpdatedOn: ISODate | null;
  lastSnapshotOn: ISODate | null;
  snapshotIntervalDays: number;
  currency: string;
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
