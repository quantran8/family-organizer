/**
 * Hiện thực GiftRepository.
 *
 * Xoá là XOÁ MỀM ở cả hai bảng (`deleted_at`) — GRANT ở 0005 §5 cố ý không cấp
 * DELETE. Một khoản mừng bị xoá nhầm là một dữ kiện xã hội mất vĩnh viễn, và
 * không ai nhớ lại được số tiền của một cái phong bì từ ba năm trước.
 */

import { unwrap, unwrapVoid } from '@/data/shared/errors';
import { toContact, toGiftEntry, toGiftHistory } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { ContactRow, GiftEntryRow, GiftHistoryRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { GiftEntryInput, GiftRepository } from './gift-repository.interface';

/** Chuẩn hoá tên để so khớp trong `findOrCreateContact`. */
function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

/** Hàng để INSERT — `household_id`/`created_by` gắn ở nơi gọi. */
function entryRow(input: GiftEntryInput) {
  return {
    contact_id: input.contactId,
    direction: input.direction,
    occasion: input.occasion,
    amount: input.amount,
    occurred_on: input.occurredOn,
    event_id: input.eventId ?? null,
    in_kind_note: input.inKindNote ?? null,
    notes: input.notes ?? null,
  };
}

export const giftRepository: GiftRepository = {
  // --- Contacts ---

  async listContacts(hh) {
    const rows = await unwrap<ContactRow[]>(
      supabase
        .from('contacts')
        .select('*')
        .eq('household_id', hh)
        .is('deleted_at', null)
        // Theo TÊN. Sắp theo số tiền không bao giờ là mặc định — 07 §3.4.
        .order('display_name', { ascending: true }),
    );
    return rows.map(toContact);
  },

  async createContact(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<ContactRow>(
      supabase
        .from('contacts')
        .insert({
          household_id: hh,
          display_name: input.displayName.trim(),
          relation_note: input.relationNote ?? null,
          side: input.side ?? 'other',
          created_by: createdBy,
        })
        .select()
        .single(),
    );
    return toContact(row);
  },

  async updateContact(hh, id, input) {
    await unwrapVoid(
      supabase
        .from('contacts')
        .update({
          // `undefined` bị PostgREST bỏ qua, nên chỉ trường được truyền mới ghi.
          ...(input.displayName === undefined
            ? {}
            : { display_name: input.displayName.trim() }),
          ...(input.relationNote === undefined ? {} : { relation_note: input.relationNote }),
          ...(input.side === undefined ? {} : { side: input.side }),
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async softDeleteContact(hh, id) {
    await unwrapVoid(
      supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  /**
   * So khớp Ở CLIENT trên danh sách đã tải, không phải một truy vấn `ilike`.
   *
   * Lý do: luồng nhập hàng loạt gọi hàm này một lần cho MỖI dòng, và một
   * round-trip cho mỗi cái phong bì là thứ làm chế độ nhập nhanh không còn
   * nhanh. `listContacts` đã nằm sẵn trong cache khi màn hình mở.
   *
   * KHÔNG so khớp mờ (trigram): index `contacts_name_trgm_idx` có để phục vụ ô
   * TÌM KIẾM, nơi người dùng nhìn thấy kết quả và tự chọn. Ở đây thì không ai
   * nhìn — gộp nhầm "chú Ba" với "chú Bảy" là hỏng dữ liệu im lặng.
   */
  async findOrCreateContact(hh, displayName) {
    const wanted = normalizeName(displayName);
    const existing = await this.listContacts(hh);
    const hit = existing.find((c) => normalizeName(c.displayName) === wanted);
    if (hit) return hit;
    return this.createContact(hh, { displayName });
  },

  // --- Gift entries ---

  async listEntries(hh, contactId) {
    let q = supabase
      .from('gift_entries')
      .select('*')
      .eq('household_id', hh)
      .is('deleted_at', null);

    if (contactId !== undefined) q = q.eq('contact_id', contactId);

    const rows = await unwrap<GiftEntryRow[]>(
      // Theo NGÀY, mới nhất trước. Sắp theo `amount` là tuỳ chọn của UI và
      // không bao giờ là mặc định — 07 §3.4.
      q.order('occurred_on', { ascending: false }),
    );
    return rows.map(toGiftEntry);
  },

  async listEntriesByEvent(hh, eventId) {
    const rows = await unwrap<GiftEntryRow[]>(
      supabase
        .from('gift_entries')
        .select('*')
        .eq('household_id', hh)
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('occurred_on', { ascending: false }),
    );
    return rows.map(toGiftEntry);
  },

  async createEntry(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<GiftEntryRow>(
      supabase
        .from('gift_entries')
        .insert({ household_id: hh, created_by: createdBy, ...entryRow(input) })
        .select()
        .single(),
    );
    return toGiftEntry(row);
  },

  async createEntries(hh, inputs) {
    if (inputs.length === 0) return [];
    const createdBy = await currentProfileId();
    const rows = await unwrap<GiftEntryRow[]>(
      supabase
        .from('gift_entries')
        .insert(
          inputs.map((i) => ({ household_id: hh, created_by: createdBy, ...entryRow(i) })),
        )
        .select(),
    );
    return rows.map(toGiftEntry);
  },

  async updateEntry(hh, id, input) {
    await unwrapVoid(
      supabase
        .from('gift_entries')
        .update({
          ...(input.contactId === undefined ? {} : { contact_id: input.contactId }),
          ...(input.direction === undefined ? {} : { direction: input.direction }),
          ...(input.occasion === undefined ? {} : { occasion: input.occasion }),
          ...(input.amount === undefined ? {} : { amount: input.amount }),
          ...(input.occurredOn === undefined ? {} : { occurred_on: input.occurredOn }),
          ...(input.eventId === undefined ? {} : { event_id: input.eventId }),
          ...(input.inKindNote === undefined ? {} : { in_kind_note: input.inKindNote }),
          ...(input.notes === undefined ? {} : { notes: input.notes }),
        })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async softDeleteEntry(hh, id) {
    await unwrapVoid(
      supabase
        .from('gift_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  // --- View gift_history ---

  async listHistory(hh) {
    const rows = await unwrap<GiftHistoryRow[]>(
      supabase
        .from('gift_history')
        .select('*')
        .eq('household_id', hh)
        .order('display_name', { ascending: true }),
    );
    return rows.map(toGiftHistory);
  },
};
