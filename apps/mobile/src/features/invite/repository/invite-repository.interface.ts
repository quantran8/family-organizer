/**
 * Hợp đồng của Mời người thứ hai — F2, luồng SỐNG-CÒN của sản phẩm (05 §9).
 *
 * Nếu người thứ hai không tham gia được thì mọi thứ xây thêm đều vô nghĩa. Đó
 * là lý do luồng này được dựng ở bước 3, trước cả tính năng khác biệt nhất.
 */

import type { UUID } from '@family-organizer/domain';

export interface InviteRepository {
  /** Mã đang mở của household, tạo mới nếu chưa có. */
  currentCode(hh: UUID): Promise<string>;
  /**
   * Đổi mã mời lấy household — dùng ở (auth)/join/[code].
   *
   * Qua RPC vì RLS không cho người CHƯA phải member đọc bảng invites; vòng
   * luẩn quẩn đó giải ở 0002_onboarding_rpc.sql.
   */
  redeem(code: string, displayName: string): Promise<UUID>;
}
