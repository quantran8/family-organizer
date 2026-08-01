/**
 * Lịch tiêm — 03 §11.2. PHẦN CẨN THẬN NHẤT CỦA CẢ APP.
 *
 * KHÔNG CÓ LOGIC Y TẾ NÀO TRONG FILE NÀY. Toàn bộ tri thức nằm trong `items`,
 * là dữ liệu tham chiếu có phiên bản (`vaccine_schedule_items`), seed từ một
 * file được người có chuyên môn y tế xác nhận — xem `supabase/seed/README.md`.
 *
 * Đây là ràng buộc kiến trúc CÓ CHỦ Ý: nếu lịch tiêm nằm trong code thì việc
 * cập nhật nó thành một PR, và không ai có chuyên môn y tế đọc PR. Nằm trong
 * file dữ liệu thì nó là một tài liệu, và tài liệu thì xem xét được.
 *
 * Hàm ở đây chỉ làm số học ngày tháng: dueDate = birthday + dueAgeMonths.
 */

import { addDays, addMonthsClamped, daysBetween } from '../date/civil.ts';
import type { DoseStatus, ISODate } from '../types/base.ts';
import type { ChildVaccineDose, VaccineScheduleItem } from '../types/entities.ts';

/** Nhắc trước 7 ngày — 07 §4.5. */
export const DOSE_REMIND_LEAD_DAYS = 7;

/**
 * Mốc tuổi tính bằng tháng, có thể LẺ (1.5 tháng = 6 tuần, một mốc thật trong
 * lịch TCMR). Phần nguyên cộng bằng addMonthsClamped để "ngày 31" không tràn
 * sang tháng sau; phần lẻ quy ra ngày theo tháng 30 ngày.
 *
 * Vì sao không quy hết ra ngày: cộng 60 ngày từ 31/12 ra 1/3, còn "hai tháng
 * tuổi" thì bố mẹ và cơ sở tiêm đều hiểu là 28/2. Sai lệch một hai ngày ở đây
 * không nguy hiểm, nhưng lệch tháng thì có.
 */
function dueDateFor(birthday: ISODate, dueAgeMonths: number): ISODate {
  const whole = Math.floor(dueAgeMonths);
  const frac = dueAgeMonths - whole;
  const base = addMonthsClamped(birthday, whole);
  return frac === 0 ? base : addDays(base, Math.round(frac * 30));
}

/**
 * Sinh lịch tiêm cho một đứa trẻ từ ngày sinh — hàm THUẦN.
 *
 * Đây là nguồn mật độ dữ liệu lớn nhất trong toàn app: một hộ mới có con sẽ có
 * ngay hàng chục mốc THẬT, không phải dữ liệu mẫu.
 *
 * `items` rỗng (chưa seed) → trả mảng rỗng. Màn hình hiện trạng thái rỗng
 * THÀNH THẬT. Không có đường nào để hàm này bịa ra một mốc.
 *
 * Trả về bản nháp chưa có `id`: id do DB sinh lúc ghi. `status` luôn là
 * 'planned' — chuyển sang 'overdue' là việc của doseStatus() lúc đọc và của
 * cron lúc ghi.
 */
export function buildVaccineSchedule(
  birthday: ISODate,
  items: VaccineScheduleItem[],
): Omit<ChildVaccineDose, 'id' | 'memberId'>[] {
  return [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((it) => ({
      scheduleCode: it.code,
      customName: null,
      displayName: it.doseLabel ? `${it.displayName} — ${it.doseLabel}` : it.displayName,
      dueDate: dueDateFor(birthday, it.dueAgeMonths),
      status: 'planned' as DoseStatus,
      administeredOn: null,
      facility: null,
      notes: null,
    }));
}

/**
 * Trạng thái một mũi — CHỈ BA GIÁ TRỊ.
 *
 * KHÔNG CÓ 'skipped', KHÔNG CÓ 'postponed'. App không bao giờ gợi ý hoãn, bỏ,
 * hay đổi thứ tự mũi tiêm — xem 07 §4.2. Thêm một trạng thái như vậy là mở
 * đường cho một tính năng gây hại thật.
 */
export function doseStatus(d: ChildVaccineDose, today: ISODate): DoseStatus {
  if (d.administeredOn !== null) return 'done';
  if (d.dueDate === null) return 'planned';
  return daysBetween(d.dueDate, today) > 0 ? 'overdue' : 'planned';
}

/**
 * Nhãn cho một mũi. Nguyên liệu có tham số, i18n dựng chữ.
 *
 * KHÔNG DÙNG CHỮ TRÁCH MÓC: không "bạn đã bỏ lỡ", không "chưa hoàn thành".
 * Mũi trễ đọc là "quá lịch 12 ngày", và UI kèm gợi ý liên hệ cơ sở tiêm —
 * một việc làm được, không phải một lời trách.
 */
export type DoseLabel =
  | { kind: 'planned'; inDays: number }
  | { kind: 'planned_no_date' }
  | { kind: 'overdue'; days: number }
  | { kind: 'done'; on: ISODate };

export function formatDoseLabel(d: ChildVaccineDose, today: ISODate): DoseLabel {
  const status = doseStatus(d, today);

  if (status === 'done') {
    // administeredOn không null khi status='done' — constraint dose_done_has_date
    // ép điều đó ở DB. Vẫn phải kẹp vì type cho phép null.
    return { kind: 'done', on: d.administeredOn ?? today };
  }
  if (d.dueDate === null) return { kind: 'planned_no_date' };

  const days = daysBetween(today, d.dueDate);
  return days < 0 ? { kind: 'overdue', days: -days } : { kind: 'planned', inDays: days };
}
