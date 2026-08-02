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
import type {
  ContactRow,
  GiftEntryRow,
  GiftHistoryRow,
  GiftOutstandingRow,
} from '@/lib/database.types';
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
    reciprocates_id: input.reciprocatesId ?? null,
    no_reciprocity_needed: input.noReciprocityNeeded ?? false,
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
          ...(input.reciprocatesId === undefined
            ? {}
            : { reciprocates_id: input.reciprocatesId }),
          ...(input.noReciprocityNeeded === undefined
            ? {}
            : { no_reciprocity_needed: input.noReciprocityNeeded }),
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

  // --- Nghĩa vụ đáp lễ (07 §3.2) ---

  /**
   * Bốn bất biến (cùng contact, đúng chiều, không phải tang lễ, chưa đánh dấu
   * không cần đáp) do trigger `gift_entries_reciprocity_check` ép ở DB. KHÔNG
   * kiểm lại ở đây: hai chỗ kiểm cùng một luật là hai chỗ để chúng trôi khỏi
   * nhau, và chỗ đúng là chỗ không bỏ qua được.
   */
  async linkReciprocity(hh, givenId, receivedId) {
    await unwrapVoid(
      supabase
        .from('gift_entries')
        .update({ reciprocates_id: receivedId })
        .eq('id', givenId)
        .eq('household_id', hh),
    );
  },

  async setNoReciprocityNeeded(hh, id, value) {
    await unwrapVoid(
      supabase
        .from('gift_entries')
        .update({ no_reciprocity_needed: value })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  /**
   * Đọc từ view `gift_outstanding` — nơi ba cái lọc (chưa ghép cặp, không phải
   * tang lễ, chưa đánh dấu không cần đáp) nằm cạnh nhau ở một chỗ duy nhất.
   *
   * Sắp theo NGÀY NHẬN, cũ nhất trước: nghĩa vụ lâu nhất nằm trên. Không bao
   * giờ có `.order('amount')` ở đây — 07 §3.6.
   */
  async listOutstanding(hh, contactId) {
    let q = supabase.from('gift_outstanding').select('*').eq('household_id', hh);
    if (contactId !== undefined) q = q.eq('contact_id', contactId);

    const rows = await unwrap<GiftOutstandingRow[]>(
      q.order('occurred_on', { ascending: true }),
    );

    // View trả cột của cả contact lẫn entry; chỉ lấy phần entry. `entry_id` là
    // id của khoản nhận, dùng để ghép cặp.
    return rows.map((r) =>
      toGiftEntry({
        id: r.entry_id,
        household_id: r.household_id,
        contact_id: r.contact_id,
        direction: 'received',
        occasion: r.occasion,
        amount: r.amount,
        occurred_on: r.occurred_on,
        event_id: null,
        in_kind_note: r.in_kind_note,
        notes: null,
        reciprocates_id: null,
        no_reciprocity_needed: false,
        created_by: '',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      }),
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
