/**
 * Hiện thực SnapshotRepository.
 */

import { supabase } from '@/lib/supabase';
import type { MoneySnapshotRow } from '@/lib/database.types';
import { unwrap, unwrapMaybe } from '@/data/shared/errors';
import { toMoneySnapshot } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { SnapshotRepository } from './snapshot-repository.interface';

export const snapshotRepository: SnapshotRepository = {
  async latest(hh) {
    const row = await unwrapMaybe<MoneySnapshotRow>(
      supabase
        .from('money_snapshots')
        .select('*')
        .eq('household_id', hh)
        .order('as_of_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    return row ? toMoneySnapshot(row) : null;
  },

  async history(hh, limit) {
    const rows = await unwrap<MoneySnapshotRow[]>(
      supabase
        .from('money_snapshots')
        .select('*')
        .eq('household_id', hh)
        .order('as_of_date', { ascending: false })
        .limit(limit),
    );
    return rows.map(toMoneySnapshot);
  },

  /**
   * Ghi money_snapshots, KHÔNG ghi đè từng assets (05 §6.2). Muốn sửa từng
   * khoản thì vào danh sách tài sản.
   *
   * upsert theo (household_id, as_of_date): cập nhật hai lần trong cùng ngày
   * thì lần sau đè lần trước, không tạo hai mốc trùng ngày.
   */
  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<MoneySnapshotRow>(
      supabase
        .from('money_snapshots')
        .upsert(
          {
            household_id: hh,
            as_of_date: input.asOfDate,
            total_usable: input.totalUsable,
            total_savings: input.totalSavings,
            total_long_term: input.totalLongTerm,
            total_debt: input.totalDebt,
            status: input.status,
            is_manual: true,
            note: input.note,
            created_by: createdBy,
          },
          { onConflict: 'household_id,as_of_date' },
        )
        .select()
        .single(),
    );
    return toMoneySnapshot(row);
  },
};
