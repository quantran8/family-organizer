/**
 * Sổ mừng cưới — 03 §11.1.
 *
 * Nỗi đau cụ thể: nhà chú Ba mừng đám cưới mình 2 triệu năm 2023. Giờ con chú
 * Ba cưới. Mình đi bao nhiêu? Đi thiếu thì mất mặt, đi thừa thì tiếc, và KHÔNG
 * AI NHỚ NỔI.
 */

import { compareISODate } from '../date/civil.ts';
import type { GiftEntry, GiftHistory } from '../types/entities.ts';

/**
 * Gợi ý số tiền mừng — TOÀN BỘ lý do module này tồn tại.
 *
 * Trả về lần NHẬN gần nhất từ contact đó, kèm bản ghi làm căn cứ để UI hiện
 * được ngữ cảnh:
 *
 *     Chú Ba đã mừng nhà mình 2.000.000 ₫ — cưới, 3/2023
 *     [ Dùng số này ]
 *
 * Không có hàm này thì module sổ mừng cưới chỉ là một cái Excel có màu.
 *
 * KHÔNG NỘI SUY, KHÔNG ĐIỀU CHỈNH LẠM PHÁT, KHÔNG LÀM TRÒN "CHO ĐẸP". App đưa
 * ra một DỮ KIỆN, người dùng quyết định. Mọi phép điều chỉnh đều là app có ý
 * kiến về chuyện nên đi bao nhiêu — chuyện đó thuộc về hai vợ chồng.
 *
 * Trả `null` khi chưa từng nhận: khi đó UI KHÔNG HIỆN GÌ CẢ, không hiện "chưa
 * có dữ liệu".
 *
 * Nhận `entries` để lấy được bản ghi căn cứ: `GiftHistory` chỉ có ngày và tổng,
 * không đủ để nói "cưới, 3/2023".
 */
export function suggestGiftAmount(
  h: GiftHistory | null,
  entries: GiftEntry[],
): { amount: number; basis: GiftEntry } | null {
  if (h === null || h.timesReceived === 0 || h.lastReceivedOn === null) return null;

  let basis: GiftEntry | null = null;
  for (const g of entries) {
    if (g.contactId !== h.contactId) continue;
    if (g.direction !== 'received') continue;
    if (basis === null || compareISODate(g.occurredOn, basis.occurredOn) > 0) {
      basis = g;
    }
  }

  if (basis === null) return null;

  // Quà không phải tiền (amount = 0, có inKindNote): không gợi ý số. "Đi 0
  // đồng" là một lời khuyên sai; UI hiện ghi chú hiện vật thay vì con số.
  if (basis.amount <= 0) return null;

  return { amount: basis.amount, basis };
}

/**
 * Tổng của MỘT ĐÁM: nhận được bao nhiêu, từ bao nhiêu nhà — 03 §11.1.
 *
 * Đây là con số người dùng thật sự muốn biết sau đám cưới mình.
 *
 * `count` đi kèm `total` theo cùng nguyên tắc với groupHistoryByMonth: một
 * tổng không kèm số lượng bản ghi sẽ được đọc là đầy đủ.
 *
 * KHÔNG CÓ HÀM NÀO TÍNH CHÊNH LỆCH ĐI–NHẬN. Dữ liệu đủ để tính, và đó chính là
 * lý do phải nói rõ: nó biến quan hệ họ hàng thành sổ nợ. Xem 07 §3.4.
 */
export function summarizeOccasion(entries: GiftEntry[]): { count: number; total: number } {
  return {
    count: entries.length,
    total: entries.reduce((s, g) => s + g.amount, 0),
  };
}
