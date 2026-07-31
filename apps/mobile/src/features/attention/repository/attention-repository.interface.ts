/**
 * Cờ "cần trao đổi" — lõi cảm xúc của wedge: cách hỏi mà không buộc tội.
 *
 * CỐ Ý KHÔNG có luồng bình luận (schema §5.6): app không thay thế việc hai
 * người nói chuyện. Đóng cờ bằng nút "Đã rõ", có thể kèm kết luận ngắn.
 *
 * Cờ tự hết hiệu lực sau 14 ngày để không tích tụ khiến trạng thái mắc kẹt ở
 * "Cần chú ý" vĩnh viễn (05 §6.7).
 */

import type { AttentionItem, EntityType, UUID } from '@family-organizer/domain';

/**
 * Cờ kèm TÊN của khoản nó trỏ tới — cho màn danh sách đầy đủ (G9).
 *
 * `AttentionItem` chỉ có `entityType` + `entityId`, và một dòng *"▸ (asset)
 * 3f9c-…"* thì không ai đọc được. Spec 05 §6.7 viết mỗi mục *"dẫn tới khoản
 * liên quan"*, nghĩa là nó phải nói được đó là khoản nào.
 *
 * `entityName` là `null` khi khoản đã bị xoá mềm. Đó KHÔNG phải lỗi và cờ vẫn
 * hiện: người dùng cần đóng được một cờ trỏ vào thứ đã biến mất, nếu không nó
 * nằm đó tới khi hết 14 ngày và mục "Cần chú ý" mắc kẹt vì một lý do không ai
 * nhìn thấy.
 */
export interface AttentionItemWithEntity extends AttentionItem {
  entityName: string | null;
}

export interface AttentionRepository {
  listOpen(hh: UUID): Promise<AttentionItem[]>;
  /** Như `listOpen` nhưng kèm tên khoản — dùng ở màn `money/attention`. */
  listOpenWithEntities(hh: UUID): Promise<AttentionItemWithEntity[]>;
  flag(hh: UUID, entityType: EntityType, entityId: UUID, note?: string): Promise<AttentionItem>;
  resolve(hh: UUID, id: UUID, resolutionNote?: string): Promise<void>;
}
