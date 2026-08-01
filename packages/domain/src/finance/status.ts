/**
 * Trạng thái tài chính — 03 §1.
 *
 * Câu hỏi trung tâm của app đã đổi ở concept v2: từ *"nhà mình đang ổn không?"*
 * sang *"SẮP TỚI NHÀ MÌNH CẦN BAO NHIÊU?"*. Trạng thái vì thế không còn đứng
 * riêng — nó là một DÒNG BỔ NGHĨA cho con số cần chuẩn bị (projectRunway).
 *
 * Chạy Ở CLIENT, không phải Edge: nó là hàm thuần của các con số từ hai view
 * `finance_metrics` + `upcoming_needs`, nên hiện tức thì và hoạt động cả khi
 * offline. Edge dùng lại chính hàm này khi ghi money_snapshots.status.
 *
 * Không có ngưỡng do người dùng tự đặt — một màn hình cài đặt mà hầu hết không
 * mở, đổi lại làm trạng thái khó đoán và khó giải thích.
 */

import { addDays, daysBetween } from '../date/civil.ts';
import type { FinanceStatus, ISODate } from '../types/base.ts';
import type { FinanceMetrics, UpcomingNeed } from '../types/views.ts';

/**
 * Lý do có tham số, KHÔNG phải câu tiếng Việt.
 *
 * Domain là hàm thuần không biết gì về UI; câu chữ dựng ở apps/mobile/src/i18n.
 * 03 §1 mô tả explainFinanceStatus() trả "một câu" — ở đây trả nguyên liệu để
 * dựng đúng câu đó, để bảng từ vựng (04 §7) kiểm được bằng một lần grep.
 */
export type FinanceReason =
  | { kind: 'no_data' }
  | { kind: 'overdue'; count: number }
  /** `dueNext30d` giờ là tổng CẢ BA nguồn, không chỉ upcoming_payments. */
  | { kind: 'not_enough'; dueNext30d: number; totalUsable: number }
  | { kind: 'attention'; count: number }
  | { kind: 'due_soon'; count: number }
  | { kind: 'ok' };
// ĐÃ BỎ `{ kind: 'stale' }` — độ mới không còn là một lý do khiến trạng thái
// đổi màu. Xem computeFreshness() ở format/declared.ts.

/**
 * Thứ tự đánh giá, DỪNG ở điều kiện khớp đầu tiên (03 §1).
 *
 *   1. Chưa có tài sản, khoản sắp trả, hay khoản nợ nào     → no_data
 *   2. overdueCount > 0  HOẶC  totalUsable < tổng needs 30d → tight
 *   3. attentionCount > 0  HOẶC  dueNext7dCount > 0         → watch
 *   4. còn lại                                              → ok
 *
 * Lưu ý ranh giới: bậc 2 dùng `<`, nên totalUsable === tổng needs KHÔNG phải
 * `tight`. Vừa đủ tiền là vừa đủ, không phải thiếu.
 */
export function computeFinanceStatus(
  m: FinanceMetrics,
  needs: UpcomingNeed[],
  today: ISODate,
): FinanceStatus {
  return explainFinanceStatus(m, needs, today).status;
}

/**
 * Trả về trạng thái KÈM lý do. UI luôn hiện cả hai — một nhãn màu không kèm lý
 * do sẽ bị hiểu là phán xét (03 §1).
 *
 * computeFinanceStatus() gọi hàm này rồi bỏ lý do đi, để chỉ có MỘT chỗ định
 * nghĩa thứ tự bốn bậc; hai đường code song song là cách chắc chắn để chúng
 * lệch nhau.
 */
export function explainFinanceStatus(
  m: FinanceMetrics,
  needs: UpcomingNeed[],
  today: ISODate,
): { status: FinanceStatus; reason: FinanceReason } {
  // Tổng của CẢ BA nguồn trong 30 ngày — đây là chỗ sửa lỗi 06 §0.2.
  //
  // Bản trước chỉ so với `m.dueNext30d`, mà con số đó CHỈ gồm
  // upcoming_payments. Giỗ 3tr, cưới 2tr, gia hạn bảo hiểm 12tr đều không được
  // tính — trong khi đó chính là thứ màn hình chính phải trả lời.
  const horizon30 = addDays(today, 30);
  const needs30 = needs
    .filter((n) => daysBetween(n.onDate, horizon30) >= 0)
    .reduce((s, n) => s + n.amount, 0);

  // Bậc 1 — chưa có gì để nói.
  const hasAnything =
    m.totalUsable > 0 ||
    m.totalSavings > 0 ||
    m.totalLongTerm > 0 ||
    m.totalDebt > 0 ||
    needs30 > 0 ||
    m.dueNext7dCount > 0 ||
    m.overdueCount > 0;
  if (!hasAnything) {
    return { status: 'no_data', reason: { kind: 'no_data' } };
  }

  // Bậc 2 — căng.
  if (m.overdueCount > 0) {
    return { status: 'tight', reason: { kind: 'overdue', count: m.overdueCount } };
  }
  // Ranh giới dùng `<`, nên totalUsable === needs30 KHÔNG phải `tight`.
  // Vừa đủ tiền là vừa đủ, không phải thiếu.
  if (m.totalUsable < needs30) {
    return {
      status: 'tight',
      reason: { kind: 'not_enough', dueNext30d: needs30, totalUsable: m.totalUsable },
    };
  }

  // Bậc 3 — cần chú ý.
  if (m.attentionCount > 0) {
    return { status: 'watch', reason: { kind: 'attention', count: m.attentionCount } };
  }
  if (m.dueNext7dCount > 0) {
    return { status: 'watch', reason: { kind: 'due_soon', count: m.dueNext7dCount } };
  }

  // ĐÃ BỎ điều kiện "dữ liệu cũ" khỏi bậc 3 (03 §1).
  //
  // Trước đây lastUpdatedOn cũ hơn snapshotIntervalDays × 3 sẽ đẩy trạng thái
  // sang `watch`. Một chấm vàng vì "BẠN CHƯA CẬP NHẬT" là một LỜI THÚC, và
  // nghi thức cập nhật định kỳ đã bị loại bỏ ở concept v2 §7.6.
  //
  // KHÔNG BIẾT TÌNH HÌNH khác với TÌNH HÌNH KHÔNG ỔN. Độ mới giờ là một nhãn
  // riêng — computeFreshness() ở format/declared.ts — và nó CHỈ đổi văn bản.

  // Bậc 4.
  return { status: 'ok', reason: { kind: 'ok' } };
}
