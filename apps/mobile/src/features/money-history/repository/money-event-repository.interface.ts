/**
 * Lịch sử từng khoản — CHỈ ĐỌC.
 *
 * Vì sao cần: niềm tin của người không giữ tiền đến từ việc THẤY ĐƯỢC THAY ĐỔI,
 * không phải từ con số hiện tại (schema §5.5). Không có màn hình đọc thì `delta`
 * chỉ nằm trong DB.
 *
 * Append-only: DB có trigger chặn update/delete, và ở đây cũng KHÔNG có phương
 * thức ghi. Sửa sai bằng cách ghi event bù qua thao tác bình thường (cập nhật
 * lại giá trị).
 */

import type { ISODate, MoneyEntityType, MoneyEvent, UUID } from '@family-organizer/domain';

export interface MoneyEventRepository {
  timeline(
    hh: UUID,
    opts: { entityType?: MoneyEntityType; limit: number; before?: ISODate },
  ): Promise<MoneyEvent[]>;
  forEntity(
    hh: UUID,
    entityType: MoneyEntityType,
    entityId: UUID,
    limit: number,
  ): Promise<MoneyEvent[]>;
}
