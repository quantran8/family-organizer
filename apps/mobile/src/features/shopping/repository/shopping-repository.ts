/**
 * Hiện thực ShoppingRepository.
 *
 * `added_by` / `done_by` là `members.id`, không phải `profiles.id` — cùng quy
 * ước với `tasks.assignee_id` và `completed_by`.
 */

import { unwrap, unwrapVoid } from '@/data/shared/errors';
import { toShoppingItem } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { ShoppingItemRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ShoppingRepository } from './shopping-repository.interface';

/**
 * Mục đã tick còn hiện bao lâu trên danh sách chính.
 *
 * Khớp với cron dọn ở `purge-soft-deleted`: client lọc để mục cũ biến mất ngay
 * cả khi cron chưa chạy, cron xoá mềm để nó không quay lại. Hai vế cùng con số,
 * nếu lệch thì mục đã tick sẽ nhấp nháy quay lại giữa hai lần cron.
 */
const DONE_VISIBLE_HOURS = 24;

export const shoppingRepository: ShoppingRepository = {
  async list(hh) {
    const cutoff = new Date(Date.now() - DONE_VISIBLE_HOURS * 3_600_000).toISOString();

    const rows = await unwrap<ShoppingItemRow[]>(
      supabase
        .from('shopping_items')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        // Chưa mua thì luôn hiện; đã tick chỉ hiện trong 24h để bỏ tick được.
        .or(`is_done.eq.false,done_at.gte.${cutoff}`)
        // Chưa mua lên trước, trong mỗi nhóm thì cũ nhất trước: món thêm từ hôm
        // qua mà chưa mua là món dễ quên nhất, đẩy nó xuống cuối là sai.
        .order('is_done', { ascending: true })
        .order('created_at', { ascending: true }),
    );
    return rows.map(toShoppingItem);
  },

  async add(hh, title, memberId, note) {
    const createdBy = await currentProfileId();
    const row = await unwrap<ShoppingItemRow>(
      supabase
        .from('shopping_items')
        .insert({
          household_id: hh,
          title,
          note: note ?? null,
          added_by: memberId,
          created_by: createdBy,
        })
        .select()
        .single(),
    );
    return toShoppingItem(row);
  },

  async toggle(hh, id, isDone, memberId) {
    await unwrapVoid(
      supabase
        .from('shopping_items')
        .update({
          is_done: isDone,
          // Bỏ tick phải xoá cả `done_at`: giữ lại thì cron dọn sẽ thấy một mục
          // "đã mua từ hôm qua" và xoá mất một món vừa được đưa lại vào danh sách.
          done_at: isDone ? new Date().toISOString() : null,
          done_by: isDone ? memberId : null,
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('shopping_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },
};
