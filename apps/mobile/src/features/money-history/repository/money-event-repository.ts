/**
 * Hiện thực MoneyEventRepository.
 *
 * Đọc view `money_history`, KHÔNG đọc bảng `money_events` trần. View đã join
 * sẵn tên khoản (từ 4 bảng, qua coalesce) và tên người thực hiện (từ `members`)
 * — thứ trước đây làm bằng 5 truy vấn phụ ở client cho mỗi trang.
 *
 * Vì sao đáng đổi, ngoài chuyện nhanh hơn: join thủ công ở client thì mỗi chỗ
 * gọi phải TỰ NHỚ gọi kèm, và một chỗ quên sẽ hiện danh sách toàn dòng không có
 * tên khoản — vẫn chạy, không lỗi, chỉ vô nghĩa. Đưa vào SQL thì không còn chỗ
 * nào quên được.
 *
 * Hai điểm khác so với bản join tay:
 *   - Khoản đã xoá mềm hiện `'(đã xoá)'` thay vì null. Dòng lịch sử vẫn còn vì
 *     `money_events` là append-only, nên nó cần một cái tên để hiện.
 *   - Tên người lấy từ `members.display_name` (trong phạm vi nhà), không phải
 *     `profiles.display_name` (toàn cục). Tên hiển thị là thoả thuận trong một
 *     nhà, không phải danh tính toàn hệ thống.
 */

import { supabase } from '@/lib/supabase';
import type { MoneyHistoryRow } from '@/lib/database.types';
import { unwrap } from '@/data/shared/errors';
import { toMoneyEvent } from '@/data/shared/mappers';
import type { MoneyEvent } from '@family-organizer/domain';

import type { MoneyEventRepository } from './money-event-repository.interface';

/** Hàng view → MoneyEvent. Tên khoản và tên người đã có sẵn trong hàng. */
function fromView(r: MoneyHistoryRow): MoneyEvent {
  return toMoneyEvent(r, {
    entityTitle: r.entity_title,
    actorDisplayName: r.actor_display_name,
  });
}

export const moneyEventRepository: MoneyEventRepository = {
  async timeline(hh, opts) {
    let q = supabase
      .from('money_history')
      .select('*')
      .eq('household_id', hh)
      .order('occurred_on', { ascending: false })
      .order('id', { ascending: false })
      .limit(opts.limit);

    if (opts.entityType) q = q.eq('entity_type', opts.entityType);
    if (opts.before) q = q.lt('occurred_on', opts.before);

    const rows = await unwrap<MoneyHistoryRow[]>(q);
    return rows.map(fromView);
  },

  /** Lịch sử của MỘT khoản — mục "Thay đổi gần nhất" ở màn chi tiết. */
  async forEntity(hh, entityType, entityId, limit) {
    const rows = await unwrap<MoneyHistoryRow[]>(
      supabase
        .from('money_history')
        .select('*')
        .eq('household_id', hh)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('occurred_on', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit),
    );
    return rows.map(fromView);
  },
};
