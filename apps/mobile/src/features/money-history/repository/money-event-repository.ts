/**
 * Hiện thực MoneyEventRepository.
 */

import { supabase } from '@/lib/supabase';
import type { MoneyEventRow } from '@/lib/database.types';
import { unwrap } from '@/data/shared/errors';
import { toMoneyEvent } from '@/data/shared/mappers';
import type { MoneyEntityType, MoneyEvent, UUID } from '@nhaminh/domain';

import type { MoneyEventRepository } from './money-event-repository.interface';

/**
 * `as const` để tên bảng giữ kiểu literal — nhờ đó TypeScript kiểm được là
 * bốn bảng này đều thật sự có cột `name`.
 */
const TABLE_OF = {
  asset: 'assets',
  debt: 'debts',
  goal: 'goals',
  upcoming_payment: 'upcoming_payments',
} as const satisfies Record<MoneyEntityType, string>;

/**
 * Gắn tên khoản và tên người thực hiện.
 *
 * Join thủ công vì entity nằm ở 4 bảng khác nhau — PostgREST không join được
 * quan hệ đa hình. Chỉ 4 truy vấn phụ tối đa cho cả trang.
 */
async function attachTitles(hh: UUID, rows: MoneyEventRow[]): Promise<MoneyEvent[]> {
  if (rows.length === 0) return [];

  const idsByType = new Map<MoneyEntityType, Set<string>>();
  for (const r of rows) {
    const type = r.entity_type as MoneyEntityType;
    if (!(type in TABLE_OF)) continue;
    const set = idsByType.get(type) ?? new Set<string>();
    set.add(r.entity_id);
    idsByType.set(type, set);
  }

  const titles = new Map<string, string>();
  for (const [type, ids] of idsByType) {
    // KHÔNG lọc deleted_at: khoản đã xoá mềm VẪN phải hiện tên trong lịch sử.
    const data = await unwrap<Array<{ id: string; name: string }>>(
      supabase
        .from(TABLE_OF[type])
        .select('id, name')
        .eq('household_id', hh)
        .in('id', [...ids]),
    );
    for (const row of data) titles.set(`${type}:${row.id}`, row.name);
  }

  const actorIds = [
    ...new Set(rows.map((r) => r.actor_profile_id).filter((x): x is string => x !== null)),
  ];
  const actors = new Map<string, string>();
  if (actorIds.length > 0) {
    const data = await unwrap<Array<{ id: string; display_name: string }>>(
      supabase.from('profiles').select('id, display_name').in('id', actorIds),
    );
    for (const row of data) actors.set(row.id, row.display_name);
  }

  return rows.map((r) =>
    toMoneyEvent(r, {
      entityTitle: titles.get(`${r.entity_type}:${r.entity_id}`) ?? null,
      actorDisplayName: r.actor_profile_id ? (actors.get(r.actor_profile_id) ?? null) : null,
    }),
  );
}

export const moneyEventRepository: MoneyEventRepository = {
  async timeline(hh, opts) {
    let q = supabase
      .from('money_events')
      .select('*')
      .eq('household_id', hh)
      .order('occurred_on', { ascending: false })
      .order('id', { ascending: false })
      .limit(opts.limit);

    if (opts.entityType) q = q.eq('entity_type', opts.entityType);
    if (opts.before) q = q.lt('occurred_on', opts.before);

    const rows = await unwrap<MoneyEventRow[]>(q);
    return attachTitles(hh, rows);
  },

  /** 5 thay đổi gần nhất của một khoản — mục "Thay đổi gần nhất" ở màn chi tiết. */
  async forEntity(hh, entityType, entityId, limit) {
    const rows = await unwrap<MoneyEventRow[]>(
      supabase
        .from('money_events')
        .select('*')
        .eq('household_id', hh)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('occurred_on', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit),
    );
    return attachTitles(hh, rows);
  },
};
