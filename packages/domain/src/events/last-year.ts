/**
 * Trí nhớ năm ngoái — 03 §10.
 *
 * Subscription sống bằng CÁI MẤT ĐI KHI HỦY. Đây là thứ đó: sang năm thứ hai,
 * người dùng mở form tạo giỗ và thấy "Năm ngoái: 3.200.000 ₫" — một dữ kiện
 * không ai khác giữ hộ được.
 *
 * Đó cũng là lý do `event_occurrences` được ghi từ ngày đầu cho MỌI household,
 * kể cả free: nếu không ghi thì tính năng này vô nghĩa vào năm thứ hai. Paywall
 * chỉ chặn phần ĐỌC dữ liệu cũ hơn 12 tháng.
 */

import { compareISODate } from '../date/civil.ts';
import type { ISODate } from '../types/base.ts';
import type { EventOccurrence, FamilyEvent } from '../types/entities.ts';

/**
 * Lần diễn ra gần nhất TRƯỚC hôm nay của cùng một sự kiện.
 *
 * `null` khi chưa từng diễn ra — khi đó UI không hiện khối NĂM NGOÁI, không
 * hiện "chưa có dữ liệu". Một khối trống nói với người dùng rằng họ thiếu thứ
 * gì đó; không có khối nào thì không nói gì cả, và đó mới đúng.
 *
 * Không lọc theo `actualCost`: một lần diễn ra mà người dùng bỏ qua câu hỏi chi
 * phí VẪN là một lần diễn ra. UI hiện ngày và để trống số tiền.
 */
export function lastYearFor(
  e: FamilyEvent,
  occurrences: EventOccurrence[],
  today: ISODate,
): EventOccurrence | null {
  let best: EventOccurrence | null = null;

  for (const o of occurrences) {
    if (o.eventId !== e.id) continue;
    // Nghiêm ngặt TRƯỚC hôm nay: một sự kiện diễn ra đúng hôm nay chưa phải là
    // "năm ngoái", và hiện nó ở khối đó sẽ đọc như một lỗi.
    if (compareISODate(o.occurredOn, today) >= 0) continue;
    if (best === null || compareISODate(o.occurredOn, best.occurredOn) > 0) {
      best = o;
    }
  }

  return best;
}
