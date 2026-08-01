/**
 * Hiện thực GoalRepository.
 */

import { supabase } from '@/lib/supabase';
import type { GoalRow } from '@/lib/database.types';
import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { toGoal } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { GoalPatch, GoalRepository } from './goal-repository.interface';

/**
 * `currentAmount` chỉ đi qua đây ở đường `create` — xem chú thích `GoalPatch`.
 * `update` nhận `GoalPatch` (đã loại cột này ở tầng type), nên không có đường
 * nào ghi số khai mà bỏ quên nhãn thời gian.
 */
function toRow(i: GoalPatch & { currentAmount?: number }): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (i.name !== undefined) r.name = i.name;
  if (i.targetAmount !== undefined) r.target_amount = i.targetAmount;
  if (i.currentAmount !== undefined) r.current_amount = i.currentAmount;
  if (i.targetDate !== undefined) r.target_date = i.targetDate;
  return r;
}

export const goalRepository: GoalRepository = {
  async list(hh) {
    const rows = await unwrap<GoalRow[]>(
      supabase
        .from('goals')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        .eq('is_archived', false),
    );
    return rows.map(toGoal);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<GoalRow>(
      supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toGoal(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<GoalRow>(
      supabase
        .from('goals')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toGoal(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<GoalRow>(
      supabase
        .from('goals')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toGoal(row);
  },

  /**
   * Ba lệnh ghi (goals + as_of_date/updated_by + money_events) → RPC.
   * Bản dựng lại ở 0004 §12: thêm `p_note` và ghi nhãn "ai khai, khai lúc nào".
   */
  async contribute(_hh, id, amount, on, note) {
    await unwrapVoid(
      supabase.rpc('contribute_to_goal', {
        p_goal_id: id,
        p_amount: amount,
        p_as_of: on,
        p_note: note ?? null,
      }),
    );
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('goals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
