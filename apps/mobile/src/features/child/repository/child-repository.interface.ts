/**
 * Hợp đồng đọc/ghi của Hồ sơ con — 02 §11, 07 §4.
 *
 * PHẦN CẨN THẬN NHẤT CỦA CẢ APP. Sai một mũi hoặc sai một mốc tuổi là gây hại
 * thật — khác về bản chất với mọi lỗi khác trong repo này. Một ngày giỗ sai thì
 * bỏ lỡ một dịp; một mốc tiêm sai thì một đứa trẻ không được bảo vệ đúng lúc.
 *
 * ── KHÔNG CÓ ĐƯỜNG NÀO GHI `vaccine_schedule_items` ──
 *
 * Interface này chỉ có `listScheduleItems()`. GRANT ở 0005 §5 cũng chỉ cấp
 * SELECT, nên kể cả khi ai đó viết thêm một phương thức ghi thì DB vẫn từ chối.
 * Hai lớp cùng nói một điều: tri thức y tế vào app qua file seed đã được người
 * có chuyên môn xác nhận, không qua client.
 *
 * ── BỐN THỨ CỐ Ý KHÔNG CÓ ──
 *
 * `skipDose()` / `postponeDose()` — app KHÔNG BAO GIỜ gợi ý hoãn, bỏ, hay đổi
 * thứ tự mũi tiêm (07 §4.2). `DoseStatus` cũng chỉ có ba giá trị, không có
 * 'skipped'. Thêm một trạng thái như vậy là mở đường cho một tính năng gây hại.
 *
 * `growthPercentile()` / `assessGrowth()` — bách phân vị, z-score, hay bất kỳ
 * đánh giá nào. App GHI VÀ VẼ, KHÔNG DIỄN GIẢI. Bố mẹ mới rất dễ lo lắng, và
 * một nhãn đỏ do app tự tính sẽ gây hoảng mà không giúp được gì; việc đánh giá
 * thuộc về bác sĩ (07 §4.3).
 *
 * `compareChildren()` — so hai con trong nhà. Xem 07 §5.
 *
 * Ghi triệu chứng, thuốc, liều lượng. Đây không phải hồ sơ bệnh án (07 §4.6).
 */

import type {
  ChildVaccineDose,
  GrowthRecord,
  ISODate,
  UUID,
  VaccineScheduleItem,
} from '@family-organizer/domain';

export interface DoseInput {
  /** null cho mũi ngoài lịch (dịch vụ, tiêm bù) — khi đó `customName` phải có. */
  scheduleCode: string | null;
  customName?: string | null;
  dueDate: ISODate | null;
}

export interface GrowthInput {
  measuredOn: ISODate;
  heightCm?: number | null;
  weightKg?: number | null;
  notes?: string | null;
}

/** Ba trường ở `members` (0005 §2.3). */
export interface ChildInfoInput {
  birthday?: ISODate | null;
  schoolName?: string | null;
  schoolClass?: string | null;
  healthInsuranceNo?: string | null;
}

export interface ChildRepository {
  /**
   * Bảng tham chiếu. RỖNG khi chưa seed — và màn hình phải hiện trạng thái rỗng
   * THÀNH THẬT chứ không dựng tạm một lịch nào.
   */
  listScheduleItems(hh: UUID): Promise<VaccineScheduleItem[]>;

  /** Mũi của một con, sắp theo `due_date`. */
  listDoses(hh: UUID, memberId: UUID): Promise<ChildVaccineDose[]>;

  /**
   * Mũi sắp tới và mũi quá lịch của MỌI con — nguồn dòng trên Nhà mình.
   *
   * Trả cả mũi quá lịch chứ không chỉ mũi trong `leadDays` sắp tới: một mũi
   * trôi qua mà biến mất khỏi màn hình là kiểu hỏng tệ nhất mà module này có
   * thể có.
   */
  listUpcomingDoses(hh: UUID, today: ISODate, leadDays: number): Promise<ChildVaccineDose[]>;

  /**
   * Ghi lịch sinh từ `buildVaccineSchedule()` xuống DB.
   *
   * `upsert` theo `(member_id, schedule_code)` — unique constraint ở 0005 §2.1.
   * Nghĩa là chạy lại khi lịch được cập nhật phiên bản thì mũi đã tiêm KHÔNG bị
   * ghi đè: `ignoreDuplicates` giữ nguyên hàng cũ. Một lịch mới không được phép
   * xoá mất chuyện một đứa trẻ đã tiêm gì.
   */
  seedSchedule(
    hh: UUID,
    memberId: UUID,
    doses: DoseInput[],
  ): Promise<void>;

  /** Mũi ngoài lịch: dịch vụ, tiêm bù. */
  addDose(hh: UUID, memberId: UUID, input: DoseInput): Promise<ChildVaccineDose>;

  /**
   * Đánh dấu ĐÃ TIÊM. Chỉ có một chiều này và `undoDose` để sửa nhầm.
   *
   * KHÔNG CÓ tham số nào để bỏ hay hoãn — xem ghi chú đầu file.
   */
  markDoseDone(
    hh: UUID,
    id: UUID,
    administeredOn: ISODate,
    facility?: string | null,
  ): Promise<void>;

  /** Chạm nhầm thì gỡ ra được — đưa về 'planned', xoá ngày tiêm. */
  undoDose(hh: UUID, id: UUID): Promise<void>;

  softDeleteDose(hh: UUID, id: UUID): Promise<void>;

  // --- Chiều cao cân nặng: GHI VÀ VẼ, KHÔNG DIỄN GIẢI ---

  listGrowth(hh: UUID, memberId: UUID): Promise<GrowthRecord[]>;
  addGrowth(hh: UUID, memberId: UUID, input: GrowthInput): Promise<GrowthRecord>;
  softDeleteGrowth(hh: UUID, id: UUID): Promise<void>;

  /** Ba trường trên `members` + ngày sinh (đầu vào của lịch tiêm). */
  updateChildInfo(hh: UUID, memberId: UUID, input: ChildInfoInput): Promise<void>;
}
