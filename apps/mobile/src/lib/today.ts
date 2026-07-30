/**
 * "Hôm nay" theo UTC+7 — chỗ DUY NHẤT trong app đọc đồng hồ để lấy ngày.
 *
 * `packages/domain` không có hàm này có chủ ý: không hàm nào ở đó đọc đồng hồ,
 * thời gian luôn là tham số (01 §1). Nhưng UI thì phải lấy ngày từ đâu đó, và
 * nếu mỗi màn hình tự lấy thì sẽ có màn dùng `new Date().toISOString()` (UTC) và
 * màn khác dùng `toLocaleDateString()` (múi giờ máy) — hai màn hình lệch nhau
 * một ngày trong khoảng 00:00–07:00 giờ Việt Nam.
 *
 * Neo cứng UTC+7 thay vì đọc múi giờ thiết bị: nhà mình ở Việt Nam. Người dùng
 * đi công tác Nhật vẫn cần "hôm nay" là hôm nay ở nhà — ngày giỗ không đổi theo
 * chỗ họ đang đứng.
 */

import { formatISODate, type ISODate } from '@nhaminh/domain';

/** Lệch múi giờ Việt Nam, tính bằng phút. */
const VN_OFFSET_MINUTES = 7 * 60;

/** Ngày hôm nay ở UTC+7. Nhận `now` tường minh để test được. */
export function todayInVN(now: Date = new Date()): ISODate {
  // Cộng lệch vào mốc epoch rồi đọc bằng getUTC*: đây là cách duy nhất lấy được
  // "ngày ở UTC+7" mà không phụ thuộc múi giờ máy đang chạy.
  const shifted = new Date(now.getTime() + VN_OFFSET_MINUTES * 60_000);
  return formatISODate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}
