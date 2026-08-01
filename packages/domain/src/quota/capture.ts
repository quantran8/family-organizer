/**
 * Quota AI capture — 03 §7.
 *
 * Cùng khuôn với `canUpload`: client chạy để nói sớm và nói rõ, NHƯNG quyết
 * định thật nằm ở Edge `parse-capture` — cùng hàm này, chạy lại phía server.
 *
 * Khác `canUpload` ở một chỗ quan trọng: bản free có một lượng dùng THẬT.
 * `canUpload` chặn ngay từ byte đầu nếu chưa trả phí, còn ở đây chặn từ lần
 * đầu là hỏng — đây là tính năng bán được, và người chưa từng thấy nó hoạt
 * động thì không có gì để cân nhắc mua. Năm lần là đủ để một người gặp đúng
 * khoảnh khắc "nó đọc được cái ảnh Zalo này thật à", và không đủ để thay hẳn
 * việc nhập tay.
 */

import type { AppError } from '../types/errors.ts';
import type { Household } from '../types/entities.ts';

/** Bản free: 5 lần mỗi tháng (06 §6). */
export const FREE_CAPTURES_PER_MONTH = 5;

/**
 * Pro "không giới hạn thực dụng" (03 §7) — một trần vẫn phải có, vì không có
 * trần nào nghĩa là một vòng lặp hỏng ở client tiêu tiền model không giới hạn.
 * Đặt đủ cao để không người dùng thật nào chạm tới.
 */
export const PRO_CAPTURES_PER_MONTH = 500;

export type CanUseCaptureResult = { ok: true } | { ok: false; reason: AppError };

/**
 * Household có quyền dùng AI capture ở mức Pro hay không.
 *
 * Tách riêng khỏi `hasStorageEntitlement` dù hiện tại hai danh sách trạng thái
 * giống hệt nhau: chúng là hai câu hỏi khác nhau về quyền, và gộp làm một hàm
 * sẽ khiến lần đầu một trong hai đổi (ví dụ `grace` còn đọc được file nhưng
 * thôi gọi được model) phải gỡ ra giữa lúc đang sửa việc khác.
 */
export function hasCaptureEntitlement(h: Household): boolean {
  return (
    h.subscriptionStatus === 'active' ||
    h.subscriptionStatus === 'trialing' ||
    h.subscriptionStatus === 'grace'
  );
}

/** Trần của tháng này theo gói. */
export function captureQuotaFor(h: Household): number {
  return hasCaptureEntitlement(h) ? PRO_CAPTURES_PER_MONTH : FREE_CAPTURES_PER_MONTH;
}

/**
 * `usedThisMonth` là số bản nháp đã tạo trong tháng dương lịch hiện tại — do
 * chỗ gọi đếm và truyền vào, không đếm ở đây (domain không chạm I/O, và "tháng
 * hiện tại" là một tham số thời gian chứ không phải `Date.now()` ẩn).
 *
 * Đếm theo bản nháp ĐÃ TẠO, không theo bản nháp được xác nhận: mỗi lần gọi là
 * một lần tốn model, kể cả khi người dùng nhìn kết quả rồi bỏ. Đếm theo lần
 * xác nhận sẽ khiến một người thử mười tấm ảnh mà không lưu cái nào vẫn còn
 * nguyên quota, và hoá đơn thì đã trả.
 */
export function canUseCapture(h: Household, usedThisMonth: number): CanUseCaptureResult {
  const quota = captureQuotaFor(h);
  if (usedThisMonth >= quota) {
    return {
      ok: false,
      reason: { kind: 'premium_required', feature: 'ai_capture' },
    };
  }
  return { ok: true };
}
