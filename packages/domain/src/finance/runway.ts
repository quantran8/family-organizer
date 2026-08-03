/**
 * Dự tính tiền cần chuẩn bị — 03 §1c.
 *
 * Nội dung của MÀN HÌNH HERO. Đây là thứ duy nhất mà Zalo, Calendar, Sheet và
 * Drive cộng lại vẫn không làm được, vì nó cần đồng thời ba nguồn: khoản sắp
 * trả, chi phí sự kiện, và phí gia hạn giấy tờ.
 *
 * SQL chỉ gom số (view `upcoming_needs`). Dự tính tính ở đây vì nó là chính
 * sách sản phẩm sẽ đổi nhiều lần — cùng lý do với computeFinanceStatus.
 */

import { addDays, daysBetween } from '../date/civil.ts';
import { computeFreshness } from '../format/declared.ts';
import type { ISODate } from '../types/base.ts';
import type { FinanceMetrics, RunwayProjection, UpcomingNeed } from '../types/views.ts';

/** Cửa sổ của màn hình "Sắp tới" — 06 §3. */
export const RUNWAY_HORIZON_DAYS = 90;

/**
 * Ngưỡng mặc định khi household chưa chốt `recordThresholdAmount` (06 §2).
 * 2 triệu — mức mà một khoản trở nên đáng hỏi lại về độ chính xác của số dư.
 */
export const DEFAULT_RECORD_THRESHOLD = 2_000_000;

/** Cửa sổ "sắp tới" của shouldAskForRefresh — 03 §1b. */
const REFRESH_LOOKAHEAD_DAYS = 14;

/**
 * Gom `needs` theo tháng trong cửa sổ 90 ngày, cộng tổng, trừ khỏi
 * `totalUsable`, trả về phần còn lại và mức thiếu nếu âm.
 *
 * Ba ràng buộc BẮT BUỘC:
 *
 *   1. `basis` LUÔN là 'declared'. UI in kèm câu "theo những khoản nhà mình đã
 *      ghi". Đây là một dự tính, không phải một báo cáo.
 *   2. `usableAsOf` và `freshness` LUÔN được trả về, để không có đường nào
 *      hiển thị kết quả mà thiếu nhãn thời gian.
 *   3. Mục tiêu KHÔNG được cộng vào `total`. Nghĩa vụ khác nguyện vọng: học phí
 *      tháng 9 là thứ PHẢI trả, góp quỹ mua nhà là thứ MUỐN làm. Trộn hai loại
 *      vào một con số làm "cần chuẩn bị" mất nghĩa, và làm màn hình hero trở
 *      nên đáng sợ mà không có lý do.
 *
 *      ĐỔI CƠ CHẾ Ở v3 (10 §5): mục tiêu GIỜ CÓ trong `needs`, mang
 *      kind='optional', để hiện CÙNG MÀN HÌNH với nghĩa vụ. Nguyên tắc không
 *      đổi — chỉ chỗ ép đổi: từ "view không union goals" sang "hàm này chỉ cộng
 *      kind==='mandatory'". `optional` trả riêng cho UI vẽ khối riêng.
 *
 *      Chỗ gọi KHÔNG được tự cộng `total + optional`.
 */
export function projectRunway(
  m: FinanceMetrics,
  needs: UpcomingNeed[],
  today: ISODate,
): RunwayProjection {
  const horizonEnd = addDays(today, RUNWAY_HORIZON_DAYS);

  // Chỉ lấy khoản nằm trong cửa sổ. Khoản QUÁ HẠN vẫn được tính: nó vẫn là
  // tiền nhà mình còn phải chuẩn bị, và bỏ nó ra làm con số hero nói thiếu.
  const inWindow = needs.filter((n) => daysBetween(n.onDate, horizonEnd) >= 0);

  // TÁCH NGHĨA VỤ KHỎI NGUYỆN VỌNG — 03 §1c ràng buộc 3, cơ chế đổi ở 10 §5.
  //
  // Mục tiêu giờ CÓ trong `needs` (mang kind='optional') để hiện CÙNG MÀN HÌNH
  // với nghĩa vụ — hai người cần thấy tháng 9 đóng học phí xong thì quỹ du lịch
  // phải chậm lại. Nhưng CÙNG MÀN HÌNH KHÔNG PHẢI CÙNG MỘT CON SỐ: trộn hai
  // loại vào `total` làm con số "cần chuẩn bị" mất nghĩa, và làm màn hình hero
  // đáng sợ mà không có lý do.
  const mandatory = inWindow.filter((n) => n.kind === 'mandatory');
  const optional = inWindow
    .filter((n) => n.kind === 'optional')
    .sort((a, b) => (a.onDate < b.onDate ? -1 : a.onDate > b.onDate ? 1 : 0));

  const total = mandatory.reduce((s, n) => s + n.amount, 0);

  // Gom theo 'YYYY-MM', không theo số tháng: cùng số tháng khác năm phải là
  // HAI nhóm. Cùng ca biên đã bắt được ở groupEventsByMonth (G6).
  const buckets = new Map<string, UpcomingNeed[]>();
  for (const n of mandatory) {
    const key = n.onDate.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(n);
    else buckets.set(key, [n]);
  }

  const byMonth = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, items]) => ({
      month: `${month}-01`,
      total: items.reduce((s, n) => s + n.amount, 0),
      items: [...items].sort((a, b) => (a.onDate < b.onDate ? -1 : a.onDate > b.onDate ? 1 : 0)),
    }));

  const projectedRemaining = m.totalUsable - total;

  return {
    basis: 'declared',
    horizonDays: RUNWAY_HORIZON_DAYS,
    total,
    byMonth,
    // Trả riêng để UI vẽ khối riêng dưới nhãn "có thể hoãn". Không nằm trong
    // bất kỳ phép cộng nào ở trên.
    optional,
    projectedRemaining,
    // null khi dư. Vừa đủ (=== 0) KHÔNG phải thiếu — cùng ranh giới với bậc 2
    // của computeFinanceStatus.
    shortfall: projectedRemaining < 0 ? -projectedRemaining : null,
    usableAsOf: m.lastUsableUpdatedOn,
    freshness: computeFreshness(m.lastUsableUpdatedOn, today),
  };
}

/**
 * Ngoại lệ DUY NHẤT được phép hỏi lại: HỎI THEO NGỮ CẢNH, KHÔNG THEO LỊCH.
 * 03 §1b.
 *
 * `true` khi CẢ HAI cùng đúng:
 *   - có ít nhất một `need` ≥ ngưỡng ghi đến hạn trong 14 ngày
 *   - `computeFreshness(m.lastUsableUpdatedOn)` là `stale`
 *
 * Chỉ một trong hai thì im. Số dư cũ mà không có khoản lớn nào sắp tới thì
 * không có gì để quyết; khoản lớn mà số dư còn mới thì không có gì để hỏi.
 *
 * Khi `true`, màn hình "Sắp tới" hiện MỘT DÒNG bỏ qua được. Bỏ qua thì im 14
 * ngày. Không push, không badge, không nhắc lại trong cùng phiên.
 */
export function shouldAskForRefresh(
  m: FinanceMetrics,
  needs: UpcomingNeed[],
  today: ISODate,
): boolean {
  if (computeFreshness(m.lastUsableUpdatedOn, today) !== 'stale') return false;

  const threshold = m.recordThresholdAmount ?? DEFAULT_RECORD_THRESHOLD;
  const lookaheadEnd = addDays(today, REFRESH_LOOKAHEAD_DAYS);

  return needs.some(
    (n) =>
      n.amount >= threshold &&
      // Đã tới hạn hoặc quá hạn cũng tính: khoản quá hạn là lý do MẠNH HƠN để
      // hỏi lại số dư, không phải lý do để im.
      daysBetween(n.onDate, lookaheadEnd) >= 0,
  );
}
