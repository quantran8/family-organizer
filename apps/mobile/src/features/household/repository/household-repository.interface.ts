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

import type {
  FinanceMetrics,
  HomeFeedItem,
  Household,
  ISODate,
  UpcomingNeed,
  UUID,
} from '@family-organizer/domain';

export interface HouseholdPatch {
  name?: string;
  /**
   * Ngưỡng ghi hai người tự chốt. `null` = "tự quyết" (06 §2).
   *
   * KHÔNG PHẢI VALIDATION: repository chỉ lưu, không kiểm. Không có ràng buộc
   * nào chặn ghi khoản nhỏ hơn ngưỡng — nó là một quy ước của gia đình, không
   * phải quy định của app.
   */
  recordThresholdAmount?: number | null;
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
  /**
   * View `upcoming_needs` — nguồn DUY NHẤT cho màn hình "Sắp tới nhà mình cần
   * bao nhiêu" (02 §4), và là đầu vào bắt buộc của computeFinanceStatus.
   *
   * Gộp ba nguồn: khoản sắp trả, chi phí sự kiện, phí gia hạn giấy tờ. Trước v2
   * chỉ có nguồn thứ nhất được tính, nên giỗ 3tr và gia hạn bảo hiểm 12tr không
   * bao giờ xuất hiện trong con số "cần chuẩn bị" (06 §0.2).
   */
  upcomingNeeds(hh: UUID, today: ISODate, horizonDays: number): Promise<UpcomingNeed[]>;
}
