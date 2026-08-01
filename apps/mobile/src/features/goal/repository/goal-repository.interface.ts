/**
 * Mục tiêu tài chính chung.
 *
 * Giải thích cho người không giữ tiền: vì sao tiền không phải để tiêu ngay.
 * KHÔNG phân loại, KHÔNG mức ưu tiên — hai thứ đó không đổi hành vi nào
 * (schema §5.4).
 */

import type { Goal, ISODate, UUID } from '@family-organizer/domain';

export interface GoalInput {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: ISODate | null;
}

/**
 * Những gì `update()` được sửa — CỐ Ý không có `currentAmount`.
 *
 * `currentAmount` là SỐ KHAI, y hệt `assets.current_value`: nó chỉ có nghĩa khi
 * đi kèm `as_of_date` và `updated_by_member_id`. Một `update` thường chỉ ghi
 * được cột số, để hai cột nhãn đứng yên — màn hình khi đó nói "Em cập nhật 5
 * tuần trước" ngay cạnh một con số vừa đổi hôm nay. Không có lỗi nào ném ra;
 * chỉ có một dòng chữ nói sai.
 *
 * Đường ghi duy nhất là RPC `contribute_to_goal` (0004 §12), ghi cả ba cột
 * trong một transaction. `create()` vẫn nhận `currentAmount` để khai số ban đầu.
 */
export type GoalPatch = Omit<Partial<GoalInput>, 'currentAmount'>;

export interface GoalRepository {
  list(hh: UUID): Promise<Goal[]>;
  get(hh: UUID, id: UUID): Promise<Goal | null>;
  create(hh: UUID, input: GoalInput): Promise<Goal>;
  update(hh: UUID, id: UUID, patch: GoalPatch): Promise<Goal>;
  contribute(hh: UUID, id: UUID, amount: number, on: ISODate, note?: string): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}
