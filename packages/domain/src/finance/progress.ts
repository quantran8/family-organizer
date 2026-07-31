/**
 * Tiến độ — thanh phần trăm cho mục tiêu và cho nợ.
 *
 * Ở `packages/domain` chứ không ở component vì cả hai hàm đều có **ca biên
 * thật**, và ca biên trong JSX là ca biên không có test:
 *
 *   - mẫu số 0 hoặc âm (mục tiêu chưa đặt số, nợ chưa nhập gốc)
 *   - đã trả vượt gốc (trả thêm ngoài lịch) → thanh phải đầy, không được tràn
 *   - `principal < remaining` (nhập gốc sai, hoặc lãi nhập gộp vào dư nợ) →
 *     "đã trả" ra ÂM, và một thanh tiến độ âm vẽ ra hình thù không đoán được
 *
 * Hàm thuần, không biết gì về UI — cùng quy ước với `finance/status.ts`.
 */

/** Phần trăm đã đạt, kẹp 0–100. Vượt mục tiêu vẫn vẽ đầy thanh, không tràn. */
export function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/**
 * Đã trả được bao nhiêu của một khoản nợ — suy ra, KHÔNG lưu.
 *
 * Không có cột nào đếm số này: `debts` chỉ giữ `principal_amount` và
 * `remaining_amount`, còn lịch sử từng kỳ nằm ở `money_events`. Suy ra bằng
 * hiệu hai cột là cách duy nhất không sinh thêm một nguồn sự thật thứ hai có
 * thể lệch với `settle_payment`.
 *
 * `null` khi chưa nhập gốc: lúc đó **không biết được** đã trả bao nhiêu, và
 * đoán bừa một con số 0% sẽ nói với người dùng rằng họ chưa trả đồng nào cho
 * một khoản họ đã trả hai năm.
 *
 * Kẹp sàn ở 0: `remaining > principal` xảy ra thật khi người dùng nhập gốc chưa
 * gồm lãi, và một con số âm ở đây sẽ đi thẳng vào thanh tiến độ.
 */
export function debtPaidAmount(
  principalAmount: number | null,
  remainingAmount: number,
): number | null {
  if (principalAmount === null || principalAmount <= 0) return null;
  return Math.max(0, principalAmount - remainingAmount);
}
