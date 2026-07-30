/**
 * Trạng thái tài chính — 03 §1.
 *
 * Câu hỏi trung tâm của app: *nhà mình đang ổn không?*
 *
 * Chạy Ở CLIENT, không phải Edge: nó là hàm thuần của 11 con số từ view
 * `finance_metrics`, nên hiện tức thì và hoạt động cả khi offline. Edge dùng
 * lại chính hàm này khi ghi money_snapshots.status.
 *
 * Không có ngưỡng do người dùng tự đặt — một màn hình cài đặt mà hầu hết không
 * mở, đổi lại làm trạng thái khó đoán và khó giải thích.
 */

import { daysBetween } from '../date/civil.ts';
import type { FinanceStatus, ISODate } from '../types/base.ts';
import type { FinanceMetrics } from '../types/views.ts';

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
  | { kind: 'not_enough'; dueNext30d: number; totalUsable: number }
  | { kind: 'attention'; count: number }
  | { kind: 'due_soon'; count: number }
  | { kind: 'stale'; daysAgo: number }
  | { kind: 'ok' };

/**
 * Thứ tự đánh giá, DỪNG ở điều kiện khớp đầu tiên (03 §1).
 *
 *   1. Chưa có tài sản, khoản sắp trả, hay khoản nợ nào    → no_data
 *   2. overdueCount > 0  HOẶC  totalUsable < dueNext30d    → tight
 *   3. attentionCount > 0  HOẶC  dueNext7dCount > 0
 *      HOẶC lastUpdatedOn cũ hơn snapshotIntervalDays × 3  → watch
 *   4. còn lại                                             → ok
 *
 * Lưu ý ranh giới: bậc 2 dùng `<`, nên totalUsable === dueNext30d KHÔNG phải
 * `tight`. Vừa đủ tiền là vừa đủ, không phải thiếu.
 */
export function computeFinanceStatus(m: FinanceMetrics, today: ISODate): FinanceStatus {
  return explainFinanceStatus(m, today).status;
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
  today: ISODate,
): { status: FinanceStatus; reason: FinanceReason } {
  // Bậc 1 — chưa có gì để nói.
  const hasAnything =
    m.totalUsable > 0 ||
    m.totalSavings > 0 ||
    m.totalLongTerm > 0 ||
    m.totalDebt > 0 ||
    m.dueNext30d > 0 ||
    m.dueNext7dCount > 0 ||
    m.overdueCount > 0;
  if (!hasAnything) {
    return { status: 'no_data', reason: { kind: 'no_data' } };
  }

  // Bậc 2 — căng.
  if (m.overdueCount > 0) {
    return { status: 'tight', reason: { kind: 'overdue', count: m.overdueCount } };
  }
  if (m.totalUsable < m.dueNext30d) {
    return {
      status: 'tight',
      reason: { kind: 'not_enough', dueNext30d: m.dueNext30d, totalUsable: m.totalUsable },
    };
  }

  // Bậc 3 — cần chú ý.
  if (m.attentionCount > 0) {
    return { status: 'watch', reason: { kind: 'attention', count: m.attentionCount } };
  }
  if (m.dueNext7dCount > 0) {
    return { status: 'watch', reason: { kind: 'due_soon', count: m.dueNext7dCount } };
  }
  const staleAfterDays = m.snapshotIntervalDays * 3;
  if (m.lastUpdatedOn !== null) {
    const daysAgo = daysBetween(m.lastUpdatedOn, today);
    if (daysAgo > staleAfterDays) {
      return { status: 'watch', reason: { kind: 'stale', daysAgo } };
    }
  }

  // Bậc 4.
  return { status: 'ok', reason: { kind: 'ok' } };
}
