/**
 * Hợp đồng đọc/ghi của Danh sách mua sắm — 02 §4, 06 §4.
 *
 * Bề mặt DUY NHẤT có tần suất hằng ngày và tự nhiên hai chiều. Đây là lý do app
 * được mở trong tuần không có sự kiện nào.
 *
 * CỐ Ý KHÔNG CÓ: `update()` đầy đủ, `assign()`, `setQuantity()`, `setPrice()`.
 * Danh sách này chỉ có bốn thao tác — thêm, tick, bỏ tick, xoá. Thêm bất kỳ
 * thao tác nào khác là biến nó thành việc được giao, và mất đúng lý do nó tồn
 * tại.
 */

import type { ShoppingItem, UUID } from '@family-organizer/domain';

export interface ShoppingRepository {
  /**
   * Mục chưa mua trước, mục đã tick sau (mờ dần, cron dọn sau 24h).
   *
   * Trả CẢ mục đã tick trong 24h qua: tick nhầm thì phải bỏ tick được ngay, và
   * một mục biến mất tức thì lúc chạm là một thao tác không hoàn tác được.
   */
  list(hh: UUID): Promise<ShoppingItem[]>;
  /** `memberId` ghi vào `added_by`. Không hiện trên UI — xem ghi chú ở toggle. */
  add(
    hh: UUID,
    title: string,
    memberId: UUID | null,
    note?: string | null,
  ): Promise<ShoppingItem>;
  /** `memberId` ghi vào `done_by` để hoàn tác. KHÔNG BAO GIỜ lên UI. */
  toggle(hh: UUID, id: UUID, isDone: boolean, memberId: UUID | null): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
