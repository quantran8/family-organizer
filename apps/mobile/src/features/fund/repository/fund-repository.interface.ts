/**
 * Quỹ chung — v3 §7.6.
 *
 * Tiền nhà, ăn uống, điện nước của cặp ở riêng. Tần suất nhập CỰC THẤP (2-4
 * lần/tháng, không phải 200), nên nó không kéo sản phẩm về phía app thu chi.
 *
 * ĐÂY LÀ TẦNG THỨ NHẤT RƯỠI trong ba tầng ép ranh giới "chỉ một tháng" của
 * 03 §9 ngoại lệ 2: mọi phương thức đọc theo người đều BẮT BUỘC nhận `month`.
 * Ba tầng đầy đủ:
 *
 *   1. view  — `month` nằm trong group by của `fund_month_contributors`
 *   2. đây   — không có chữ ký nào đọc nhiều tháng
 *   3. domain — `summarizeFundMonth(entries, month)` nhận tháng bắt buộc
 *   4. UI    — `contributor-block.tsx` nhận `month` là prop bắt buộc
 *
 * Bốn tầng độc lập nhau là có chủ ý: phá được một tầng vẫn còn ba tầng chặn.
 */

import type { Fund, FundEntry, FundMonthSummary, ISODate, UUID } from '@family-organizer/domain';

export interface FundInput {
  name: string;
}

export interface FundEntryInput {
  kind: FundEntry['kind'];
  amount: number;
  occurredOn: ISODate;
  /** Bắt buộc khi rút — RPC cũng chặn lần nữa ở server. */
  purpose: string | null;
  /**
   * CHỮ TỰ DO, không phải id. Người bỏ tiền vào quỹ không nhất thiết là thành
   * viên household: bố mẹ đưa, em ruột góp. Chỉ có nghĩa khi `kind='deposit'`.
   */
  contributorName: string | null;
  note: string | null;
}

/**
 * Những gì `update()` được sửa — CỐ Ý không có `currentAmount`.
 *
 * Số dư là SỐ DẪN XUẤT: nó phải khớp với tổng các khoản đã ghi. Cho client ghi
 * thẳng vào nó là mở đường cho một số dư không giải thích được bằng bất kỳ dòng
 * lịch sử nào — và đó đúng là con số hai người nhìn vào để quyết có tiêu được
 * không. Đường ghi duy nhất là hai RPC ở 0008 §11.
 */
export type FundPatch = Partial<FundInput>;

export interface FundRepository {
  list(hh: UUID): Promise<Fund[]>;
  get(hh: UUID, id: UUID): Promise<Fund | null>;
  create(hh: UUID, input: FundInput): Promise<Fund>;
  update(hh: UUID, id: UUID, patch: FundPatch): Promise<Fund>;

  /** Các khoản của ĐÚNG một tháng. `month` là ngày bất kỳ trong tháng đó. */
  entriesForMonth(hh: UUID, fundId: UUID, month: ISODate): Promise<FundEntry[]>;
  /** Tổng của ĐÚNG một tháng, gồm khối người bỏ vào. */
  monthSummary(hh: UUID, fundId: UUID, month: ISODate): Promise<FundMonthSummary>;
  /** Những tháng có bản ghi — để dựng bộ chọn tháng, KHÔNG phải để cộng lại. */
  monthsPresent(hh: UUID, fundId: UUID): Promise<ISODate[]>;

  /** RPC nguyên tử: fund_entries + funds.current_amount + money_events. */
  recordEntry(hh: UUID, fundId: UUID, input: FundEntryInput): Promise<UUID>;
  /** Xoá mềm + TÍNH LẠI số dư từ các dòng còn sống (không trừ dồn). */
  deleteEntry(hh: UUID, entryId: UUID): Promise<void>;

  archive(hh: UUID, id: UUID): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;

  // KHÔNG CÓ, và không được thêm:
  //   allTimeSummary()          -- cộng dồn qua tháng = sổ nợ vợ chồng
  //   contributorTotals()       -- thiếu tháng thì mất đúng ranh giới an toàn
  //   balanceSeries()           -- số dư theo thời gian = đường xu hướng
  //   whoOwesWhom()             -- app không bao giờ kết luận thay người dùng
  // Lý do đầy đủ ở 03 §9 ngoại lệ 2 và 10 §3.
}
