/**
 * Cờ "cần trao đổi" — lõi cảm xúc của wedge: cách hỏi mà không buộc tội.
 *
 * CỐ Ý KHÔNG có luồng bình luận (schema §5.6): app không thay thế việc hai
 * người nói chuyện. Đóng cờ bằng nút "Đã rõ", có thể kèm kết luận ngắn.
 *
 * Cờ tự hết hiệu lực sau 14 ngày để không tích tụ khiến trạng thái mắc kẹt ở
 * "Cần chú ý" vĩnh viễn (05 §6.7).
 */

import type { AttentionItem, EntityType, UUID } from '@nhaminh/domain';

export interface AttentionRepository {
  listOpen(hh: UUID): Promise<AttentionItem[]>;
  flag(hh: UUID, entityType: EntityType, entityId: UUID, note?: string): Promise<AttentionItem>;
  resolve(hh: UUID, id: UUID, resolutionNote?: string): Promise<void>;
}
