/**
 * Nhãn thời gian cho SỐ KHAI — 03 §8.
 *
 * Con số tài sản là thứ MỘT NGƯỜI ĐÃ NÓI RA TẠI MỘT THỜI ĐIỂM, không phải sự
 * thật hiện tại. Nếu hiển thị trần trụi, hai người cùng tin vào một thứ có thể
 * đã sai — và đó còn tệ hơn không có app.
 *
 * `formatDeclaredAt` là BẮT BUỘC ở mọi chỗ hiển thị số tổng. Không có ngoại lệ.
 *
 * Trả về nguyên liệu có tham số, không phải câu tiếng Việt — cùng lý do với
 * formatDueLabel và explainFinanceStatus: bảng từ vựng (04 §7) phải kiểm được
 * bằng một lần grep trong i18n.
 */

import { daysBetween } from '../date/civil.ts';
import type { Freshness, ISODate } from '../types/base.ts';

/**
 * "Anh cập nhật 6 tuần trước" · "Em cập nhật hôm nay" · "Chưa có số liệu".
 *
 * `byDisplayName` null mà vẫn có ngày: người khai đã rời nhà hoặc bản ghi cũ
 * hơn cột `updated_by`. Vẫn hiện được nhãn thời gian — đó mới là phần bắt buộc.
 */
export type DeclaredLabel =
  | { kind: 'never' }
  | { kind: 'today'; by: string | null }
  | { kind: 'yesterday'; by: string | null }
  | { kind: 'days_ago'; days: number; by: string | null }
  | { kind: 'weeks_ago'; weeks: number; by: string | null }
  | { kind: 'months_ago'; months: number; by: string | null };

export function formatDeclaredAt(
  asOf: ISODate | null,
  byDisplayName: string | null,
  today: ISODate,
): DeclaredLabel {
  // `== null` bắt CẢ `undefined`, không chỉ `null`.
  //
  // Kiểu nói là `ISODate | null`, nên `undefined` là giá trị NGOÀI hợp đồng —
  // nhưng nó tới được: cache đĩa (persist 7 ngày) khôi phục một hàng view được
  // lưu TRƯỚC khi migration thêm cột, và hàng cũ đó không có trường này. Lúc
  // đó `parseISODate` ném `RangeError` và nguyên màn hình trắng.
  //
  // Hàm này bắt buộc ở MỌI chỗ hiện số tổng (03 §8), nên nó là chỗ một dữ liệu
  // lệch hình dạng gây thiệt hại lớn nhất. "Chưa có số liệu" là câu trả lời
  // trung thực cho một ngày không đọc được — và trung thực hơn hẳn một màn hình
  // vỡ, vốn không nói được gì cho người dùng.
  if (asOf == null) return { kind: 'never' };

  const by = byDisplayName;
  // Số ngày ĐÃ TRÔI QUA kể từ lúc khai. daysBetween(today, asOf) âm khi asOf ở
  // quá khứ, nên đảo dấu để đọc xuôi.
  const days = -daysBetween(today, asOf);

  // Ngày khai ở tương lai (lệch múi giờ, hoặc người dùng chọn tay ngày mai):
  // đọc là "hôm nay". Nói "còn 1 ngày nữa mới khai" là vô nghĩa với người đọc.
  if (days <= 0) return { kind: 'today', by };
  if (days === 1) return { kind: 'yesterday', by };
  if (days < 7) return { kind: 'days_ago', days, by };

  // Dưới 8 tuần thì đếm tuần: "6 tuần trước" là cách người Việt nói về khoảng
  // này. Quá 8 tuần thì tuần mất nghĩa và tháng dễ hình dung hơn.
  if (days < 56) return { kind: 'weeks_ago', weeks: Math.floor(days / 7), by };

  // Tháng xấp xỉ 30 ngày. Không cần chính xác theo lịch: đây là nhãn để người
  // đọc tự hiệu chỉnh mức tin, không phải một phép tính.
  return { kind: 'months_ago', months: Math.max(2, Math.floor(days / 30)), by };
}

/**
 * Độ mới của số khai — 03 §1b.
 *
 *   ≤ 14 ngày           fresh
 *   15–45 ngày          aging
 *   > 45 ngày hoặc null stale
 *
 * TÁCH HẲN khỏi trạng thái tài chính. Freshness CHỈ đổi văn bản nhãn: không
 * đổi màu trạng thái, không sinh badge, không sinh thông báo.
 *
 * Lý do: một chấm vàng vì "bạn chưa cập nhật" chính là một LỜI THÚC — đúng thứ
 * concept v2 §7.6 loại bỏ. KHÔNG BIẾT TÌNH HÌNH khác với TÌNH HÌNH KHÔNG ỔN.
 * Người đọc tự hiệu chỉnh mức tin và tự sửa nếu muốn.
 */
export function computeFreshness(asOf: ISODate | null, today: ISODate): Freshness {
  if (asOf === null) return 'stale';
  const days = -daysBetween(today, asOf);
  if (days <= 14) return 'fresh';
  if (days <= 45) return 'aging';
  return 'stale';
}
