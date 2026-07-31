/**
 * Hợp đồng đọc/ghi của Household — 02 §4.
 *
 * Tách khỏi hiện thực để tầng trên phụ thuộc vào HÌNH DẠNG, không phụ thuộc
 * Supabase. Đây là điều kiện để đổi backend sau này chỉ phải viết lại một file,
 * và để test hook bằng repository giả (01 §2).
 *
 * Mọi phương thức nhận `householdId` TƯỜNG MINH — không repository nào tự lấy
 * household từ biến toàn cục.
 */

import type { FinanceMetrics, HomeFeedItem, Household, ISODate, UUID } from '@family-organizer/domain';

export interface HouseholdPatch {
  name?: string;
  snapshotIntervalDays?: 7 | 30;
}

export interface HouseholdRepository {
  get(hh: UUID): Promise<Household | null>;
  update(hh: UUID, patch: HouseholdPatch): Promise<Household>;
  /** View `home_feed` — MỘT lần fetch cho toàn bộ dashboard (05 §4). */
  homeFeed(hh: UUID, from: ISODate, to: ISODate): Promise<HomeFeedItem[]>;
  /**
   * View `finance_metrics` — nguyên liệu thô, KHÔNG chứa trạng thái.
   * Trạng thái tính ở client bằng computeFinanceStatus (03 §1).
   */
  financeMetrics(hh: UUID): Promise<FinanceMetrics | null>;
}
