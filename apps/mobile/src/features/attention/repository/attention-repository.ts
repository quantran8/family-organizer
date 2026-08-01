/**
 * Hiện thực AttentionRepository.
 */

import type { EntityType, UUID } from '@family-organizer/domain';

import { supabase } from '@/lib/supabase';
import type { AttentionItemRow } from '@/lib/database.types';
import { unwrap, unwrapVoid } from '@/data/shared/errors';
import { toAttentionItem } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type {
  AttentionItemWithEntity,
  AttentionRepository,
} from './attention-repository.interface';

/**
 * Tên của các khoản thuộc MỘT loại, tra theo id.
 *
 * `attention_items` KHÔNG có foreign key tới một bảng cụ thể — `entity_id` trỏ
 * tới bảy bảng khác nhau tuỳ `entity_type` (schema §5.6). Đó là đánh đổi có chủ
 * ý ở tầng schema: một cột FK cho mỗi loại sẽ là bảy cột mà sáu cái luôn null.
 *
 * Hệ quả: PostgREST không join hộ được, phải tự tra. Bù lại chỉ tốn một câu
 * truy vấn cho mỗi LOẠI đang có cờ (nhiều nhất bảy, thực tế một hai) chứ không
 * phải một câu cho mỗi cờ.
 *
 * ── Vì sao là `switch` chứ không phải một bảng tra `{table, column}` ──
 *
 * Bảng tra gọn hơn để đọc, nhưng tên bảng và tên cột lúc đó là **chuỗi động**,
 * và `database.types.ts` không kiểm được chuỗi động: `.from(t.table)` mất sạch
 * kiểu, `.eq('household_id', …)` không còn được đối chiếu với cột thật. Đổi tên
 * một cột trong migration sẽ **không** làm typecheck đỏ ở đây — nó chỉ hỏng lúc
 * chạy, ở một màn hình phụ, dưới dạng một dòng thiếu tên.
 *
 * `switch` dài hơn bảy dòng nhưng mỗi nhánh là một câu truy vấn tĩnh mà
 * TypeScript kiểm được đầy đủ.
 */
async function fetchNames(
  hh: UUID,
  entityType: EntityType,
  ids: UUID[],
): Promise<{ id: string; name: string }[]> {
  switch (entityType) {
    case 'task': {
      const rows = await unwrap<{ id: string; title: string }[]>(
        supabase.from('tasks').select('id, title').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows.map((r) => ({ id: r.id, name: r.title }));
    }
    case 'event': {
      const rows = await unwrap<{ id: string; title: string }[]>(
        supabase.from('events').select('id, title').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows.map((r) => ({ id: r.id, name: r.title }));
    }
    case 'document': {
      const rows = await unwrap<{ id: string; title: string }[]>(
        supabase.from('documents').select('id, title').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows.map((r) => ({ id: r.id, name: r.title }));
    }
    case 'asset': {
      const rows = await unwrap<{ id: string; name: string }[]>(
        supabase.from('assets').select('id, name').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows;
    }
    case 'debt': {
      const rows = await unwrap<{ id: string; name: string }[]>(
        supabase.from('debts').select('id, name').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows;
    }
    case 'upcoming_payment': {
      const rows = await unwrap<{ id: string; name: string }[]>(
        supabase.from('upcoming_payments').select('id, name').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows;
    }
    case 'goal': {
      const rows = await unwrap<{ id: string; name: string }[]>(
        supabase.from('goals').select('id, name').eq('household_id', hh).in('id', ids).is('deleted_at', null),
      );
      return rows;
    }
    // Hai loại này KHÔNG BAO GIỜ được gắn cờ, nhưng enum cho phép nên switch
    // phải xử lý — nếu không, thêm một giá trị enum ở migration sau sẽ làm hàm
    // này trả `undefined` lúc chạy mà typecheck vẫn xanh.
    //
    //   shopping_item: một món đồ cần mua không phải thứ hai người ngồi lại
    //     bàn bạc. Gắn cờ vào nó là biến danh sách thành việc được giao.
    //   household: cờ cấp nhà không trỏ vào bản ghi nào nên không có tên để tra.
    case 'shopping_item':
    case 'household':
      return [];
  }
}

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
   * Cờ đang mở, kèm tên khoản.
   *
   * Gom id theo LOẠI rồi tra một lần cho mỗi loại: nhiều nhất sáu câu truy vấn
   * cho cả màn hình, thay vì một câu cho mỗi cờ. Chạy song song vì chúng không
   * phụ thuộc nhau — sáu lượt tuần tự trên 3G là sáu lần chờ nối nhau.
   *
   * Khoản đã xoá mềm trả về `entityName = null`. Cờ vẫn hiện (xem interface):
   * người dùng phải đóng được một cờ trỏ vào thứ đã biến mất.
   */
  async listOpenWithEntities(hh) {
    const items = await this.listOpen(hh);
    if (items.length === 0) return [];

    const idsByType = new Map<EntityType, UUID[]>();
    for (const item of items) {
      const list = idsByType.get(item.entityType) ?? [];
      list.push(item.entityId);
      idsByType.set(item.entityType, list);
    }

    const names = new Map<string, string>();
    await Promise.all(
      [...idsByType].map(async ([entityType, ids]) => {
        for (const row of await fetchNames(hh, entityType, ids)) {
          // Khoá gộp cả loại: hai bảng khác nhau về lý thuyết có thể trùng uuid,
          // và một cái tên hiện nhầm ở dòng khác là lỗi không ai truy ra được.
          names.set(`${entityType}:${row.id}`, row.name);
        }
      }),
    );

    return items.map<AttentionItemWithEntity>((item) => ({
      ...item,
      entityName: names.get(`${item.entityType}:${item.entityId}`) ?? null,
    }));
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
