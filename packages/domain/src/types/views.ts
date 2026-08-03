/**
 * View đọc — 02 §3.
 *
 * Ba view trong DB ánh xạ thẳng sang ba type ở đây. UI CHỈ đọc từ đây cho các
 * màn hình tổng hợp — không tự ghép nhiều query.
 */

import type { Basis, Freshness, ISODate, NeedKind, NeedSource, UUID } from './base.ts';

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
 * Ba nguồn nghĩa vụ được trộn vào một danh sách: khoản sắp trả, chi phí sự
 * kiện, phí gia hạn giấy tờ. Người dùng không cần biết chúng đến từ ba bảng.
 *
 * ĐỔI Ở v3 (10 §5): `goals` GIỜ CÓ mặt, mang kind='optional'.
 *
 * Bản trước loại hẳn goals ra, để bảo vệ nguyên tắc "không trộn nghĩa vụ với
 * nguyện vọng vào một con số". Nguyên tắc đó KHÔNG ĐỔI — chỉ cơ chế đổi: thay
 * vì loại khỏi view, giờ tách bằng `kind`, và projectRunway CHỈ CỘNG
 * 'mandatory'.
 *
 * Ai đọc mảng này rồi cộng tất cả lại là đang phá đúng nguyên tắc mà `kind`
 * sinh ra để giữ.
 */
export interface UpcomingNeed {
  source: NeedSource;
  /** 'mandatory' cho ba nguồn nghĩa vụ, 'optional' cho `goal`. */
  kind: NeedKind;
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
  /** CHỈ tổng của kind==='mandatory'. Nguyện vọng không bao giờ vào đây. */
  total: number;
  /** Cũng chỉ gồm 'mandatory' — mỗi tháng một dòng tổng của nghĩa vụ. */
  byMonth: { month: ISODate; total: number; items: UpcomingNeed[] }[];
  /**
   * Nguyện vọng, trả riêng để UI vẽ khối riêng dưới nhãn "có thể hoãn".
   * KHÔNG cộng vào `total`, `projectedRemaining`, hay `shortfall`.
   */
  optional: UpcomingNeed[];
  /** totalUsable − total. Âm = thiếu. */
  projectedRemaining: number;
  /** null khi dư. Số dương khi thiếu. */
  shortfall: number | null;
  usableAsOf: ISODate | null;
  freshness: Freshness;
}

/**
 * Quỹ chung gom theo MỘT tháng — view `fund_month_summary` +
 * `fund_month_contributors`.
 *
 * KHÔNG TỒN TẠI biến thể nào nhận khoảng thời gian. Đó là tầng thứ hai trong ba
 * tầng ép ranh giới một-tháng của 03 §9 ngoại lệ 2 (tầng một: `month` trong
 * group by của view; tầng ba: prop bắt buộc của contributor-block.tsx).
 */
export interface FundMonthSummary {
  /** Ngày đầu tháng. */
  month: ISODate;
  deposits: number;
  withdrawals: number;
  net: number;
  /**
   * BẮT BUỘC, không phải tuỳ chọn. Một con số tổng không kèm số lượng bản ghi
   * thì tự nhận là đầy đủ — cùng luật với groupHistoryByMonth (03 §12).
   */
  entryCount: number;
  /**
   * Sắp THEO TÊN, thứ tự ABC — không theo số tiền. Sắp theo tiền là một bảng
   * xếp hạng, và xếp hạng hai vợ chồng là thứ cả spec này tránh. ABC là thứ tự
   * duy nhất không mang thông điệp nào.
   */
  byContributor: { name: string; total: number; count: number }[];
}
