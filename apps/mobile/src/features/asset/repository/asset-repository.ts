/**
 * Hiện thực AssetRepository.
 */

import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { toAsset } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { AssetRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { AssetInput, AssetRepository } from './asset-repository.interface';

function toRow(i: Partial<AssetInput>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (i.name !== undefined) r.name = i.name;
  if (i.assetKind !== undefined) r.asset_kind = i.assetKind;
  if (i.liquidity !== undefined) r.liquidity = i.liquidity;
  if (i.currentValue !== undefined) r.current_value = i.currentValue;
  if (i.holderMemberId !== undefined) r.holder_member_id = i.holderMemberId;
  if (i.institution !== undefined) r.institution = i.institution;
  if (i.quantity !== undefined) r.quantity = i.quantity;
  if (i.quantityUnit !== undefined) r.quantity_unit = i.quantityUnit;
  if (i.dueDate !== undefined) r.due_date = i.dueDate;
  if (i.asOfDate !== undefined) r.as_of_date = i.asOfDate;
  if (i.notes !== undefined) r.notes = i.notes;
  return r;
}

export const assetRepository: AssetRepository = {
  async list(hh) {
    const rows = await unwrap<AssetRow[]>(
      supabase
        .from('assets')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        .order('current_value', { ascending: false }),
    );
    return rows.map(toAsset);
  },

  async get(hh, id) {
    const row = await unwrapMaybe<AssetRow>(
      supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toAsset(row) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<AssetRow>(
      supabase
        .from('assets')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toAsset(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<AssetRow>(
      supabase
        .from('assets')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toAsset(row);
  },

  /**
   * Hai lệnh ghi (assets + money_events) nên BẮT BUỘC qua RPC (01 §3).
   * Ghép từ client mà mất mạng giữa chừng sẽ làm lịch sử sai vĩnh viễn.
   */
  async updateValue(_hh, id, value, asOf, note) {
    await unwrapVoid(
      supabase.rpc('update_asset_value', {
        p_asset_id: id,
        p_value: value,
        p_as_of: asOf,
        p_note: note ?? null,
      }),
    );
  },

  async close(hh, id) {
    await unwrapVoid(
      supabase.from('assets').update({ is_closed: true }).eq('id', id).eq('household_id', hh),
    );
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
