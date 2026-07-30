/**
 * zod schema cho NGHI THỨC CẬP NHẬT — 4 con số, xong dưới 30 giây (05 §6.2).
 *
 * `status` KHÔNG có ở đây: nó tính bằng `computeFinanceStatus` ngay trước khi
 * ghi, không phải thứ người dùng chọn. Snapshot lưu trạng thái ĐÃ TÍNH tại thời
 * điểm đó, để màn lịch sử đọc nguyên mà không phải tính lại trên số cũ.
 */

import { z } from 'zod';

import { isoDate, money, optionalText } from '@/data/schemas/common';

export const snapshotSchema = z.object({
  asOfDate: isoDate,
  totalUsable: money,
  totalSavings: money,
  totalLongTerm: money,
  totalDebt: money,
  /** Một dòng ngữ cảnh: "vừa nhận thưởng quý". Không bắt buộc. */
  note: optionalText(200),
});
export type SnapshotValues = z.infer<typeof snapshotSchema>;
