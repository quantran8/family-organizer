/**
 * Hiện thực AttentionRepository.
 */

import { supabase } from '@/lib/supabase';
import type { AttentionItemRow } from '@/lib/database.types';
import { unwrap, unwrapVoid } from '@/data/shared/errors';
import { toAttentionItem } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { AttentionRepository } from './attention-repository.interface';

export const attentionRepository: AttentionRepository = {
  async listOpen(hh) {
    const rows = await unwrap<AttentionItemRow[]>(
      supabase
        .from('attention_items')
        .select('*')
        .eq('household_id', hh)
        .is('resolved_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    );
    return rows.map(toAttentionItem);
  },

  /**
   * Một entity chỉ có MỘT cờ mở tại một thời điểm — partial unique index
   * `attention_one_open_per_entity` chặn ở DB. Trùng thì repo ném
   * AppError { kind: 'conflict' }, UI hiện cờ đang có thay vì báo lỗi.
   */
  async flag(hh, entityType, entityId, note) {
    const createdBy = await currentProfileId();
    const row = await unwrap<AttentionItemRow>(
      supabase
        .from('attention_items')
        .insert({
          household_id: hh,
          entity_type: entityType,
          entity_id: entityId,
          note: note ?? null,
          created_by: createdBy,
        })
        .select()
        .single(),
    );
    return toAttentionItem(row);
  },

  async resolve(hh, id, resolutionNote) {
    const resolvedBy = await currentProfileId();
    await unwrapVoid(
      supabase
        .from('attention_items')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_note: resolutionNote ?? null,
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
