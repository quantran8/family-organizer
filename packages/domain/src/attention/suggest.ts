/**
 * Gợi ý gắn cờ cần trao đổi — 03 §6.
 *
 * Chạy sau khi cập nhật giá trị tài sản. Đề xuất gắn cờ khi biến động vượt
 * ngưỡng: giảm hơn 20% giá trị khoản, hoặc hơn 10% tổng tài sản khả dụng.
 *
 * Đây là GỢI Ý, không tự gắn. UI hỏi: "Khoản này thay đổi khá nhiều. Ghi chú
 * lại để cả hai cùng nắm?" — KHÔNG BAO GIỜ hỏi "vì sao khoản này giảm".
 *
 * Ở MVP trả về mảng rỗng: money_events vẫn được ghi từ ngày đầu, nhưng tính
 * năng gợi ý là Phase 2. Chữ ký hàm giữ nguyên để không phải sửa chỗ gọi.
 */

import type { ISODate, MoneyEntityType, UUID } from '../types/base.ts';
import type { MoneyEvent } from '../types/entities.ts';

export const DROP_PCT_OF_ITEM = 0.2;
export const DROP_PCT_OF_TOTAL_USABLE = 0.1;

export interface AttentionSuggestion {
  entityType: MoneyEntityType;
  entityId: UUID;
  /** Nguyên liệu để UI dựng câu — domain không giữ chuỗi hiển thị. */
  reason: { kind: 'large_drop'; delta: number; pctOfItem: number };
}

/**
 * `actorMemberId` là người VỪA THỰC HIỆN thay đổi.
 *
 * THU HẸP so với bản trước (03 §6): gợi ý CHỈ hiện cho người đó, không bao giờ
 * cho người kia. Nếu người kia cũng nhận được, nó thôi là một ghi chú tự nguyện
 * và thành một LỜI TRIỆU TẬP — vi phạm nguyên tắc 10.7 (không tạo bằng chứng
 * dùng được lúc cãi nhau).
 *
 * Ràng buộc đó phải sống ở đây chứ không ở UI: một hàm trả về gợi ý cho mọi
 * người rồi trông cậy vào chỗ gọi lọc đúng là một hàm sẽ bị gọi sai.
 */
export function suggestAttention(
  _events: MoneyEvent[],
  _actorMemberId: UUID,
  _today: ISODate,
): AttentionSuggestion[] {
  // Phase 2. Xem chú thích đầu file.
  //
  // Khi hiện thực: lọc `_events` theo actor TRƯỚC khi tính ngưỡng, không lọc
  // sau — lọc sau thì một thay đổi lớn của người kia vẫn kéo tổng đi và sinh
  // gợi ý cho người này về một việc họ không làm.
  return [];
}
