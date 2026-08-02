/**
 * Hook cho Sổ hiếu hỉ — 07 §3.
 *
 * KHÔNG optimistic ở bất kỳ mutation nào. Đây là module có form, không phải
 * thao tác một chạm (01 §3): người dùng gõ tên, gõ số tiền, chọn ngày — họ đã
 * chờ vài giây rồi và chờ thêm 200ms không ai thấy. Đổi lại, một số tiền mừng
 * hiện ra rồi biến mất vì lệnh ghi hỏng sẽ làm người dùng nghi ngờ cả quyển sổ.
 *
 * Mọi mutation invalidate `gifts.all` chứ không chỉ `entries`: view
 * `gift_history` là nguồn của DÒNG GỢI Ý, và một dòng gợi ý nói số cũ ngay sau
 * khi vừa ghi là hỏng đúng thứ module này tồn tại để làm đúng.
 */

import type { UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import {
  giftRepository,
  type ContactInput,
  type GiftEntryInput,
} from '@/features/gift/repository';
import { useHouseholdId } from '@/stores/session';

export function useContacts() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.contacts.list(hh),
    queryFn: () => giftRepository.listContacts(hh),
  });
}

/** `contactId` undefined = cả sổ. */
export function useGiftEntries(contactId?: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.gifts.entries(hh, contactId),
    queryFn: () => giftRepository.listEntries(hh, contactId),
  });
}

/**
 * View `gift_history` — nguyên liệu của `suggestGiftAmount()`.
 *
 * Tải cùng lúc với danh sách contact chứ không đợi người dùng chọn xong: dòng
 * gợi ý phải hiện ra NGAY khi chọn tên, không phải sau một vòng tải nữa. Cả sổ
 * của một nhà là vài trăm dòng.
 */
export function useGiftHistory() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.gifts.history(hh),
    queryFn: () => giftRepository.listHistory(hh),
  });
}

/**
 * Khoản nhận CHƯA ĐÁP LỄ — 07 §3.2.
 *
 * KHÔNG CÓ hook nào trả về tổng số tiền của danh sách này. Nếu UI cần biết "còn
 * mấy khoản" thì đếm `data.length`; cộng tiền lại là dựng lại số dư nợ mà cả
 * thiết kế tránh (07 §3.6).
 */
export function useOutstandingGifts(contactId?: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.gifts.outstanding(hh, contactId),
    queryFn: () => giftRepository.listOutstanding(hh, contactId),
  });
}

/**
 * Ghép một khoản ĐI vào khoản NHẬN mà nó đáp lại — 07 §3.3.
 *
 * Không optimistic: cùng lý do với mọi mutation khác trong module này, và thêm
 * một lý do riêng — bốn bất biến do trigger ở DB ép, nên một ghép cặp sai sẽ bị
 * từ chối và hiện ra rồi biến mất là trải nghiệm tệ hơn chờ 200ms.
 */
export function useLinkReciprocity() {
  const hh = useHouseholdId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ givenId, receivedId }: { givenId: UUID; receivedId: UUID | null }) =>
      giftRepository.linkReciprocity(hh, givenId, receivedId),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

/**
 * Bật/tắt "không cần đáp lễ" cho một khoản NHẬN — 07 §3.4b.
 *
 * Bố mẹ mừng con, người trên mừng người dưới, người đã mất. App KHÔNG BAO GIỜ
 * tự bật cờ này; nó chỉ đổi khi người dùng chạm vào.
 */
export function useSetNoReciprocityNeeded() {
  const hh = useHouseholdId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: { id: UUID; value: boolean }) =>
      giftRepository.setNoReciprocityNeeded(hh, id, value),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

/** Khoản mừng của MỘT đám — nguyên liệu của `summarizeOccasion()`. */
export function useGiftEntriesByEvent(eventId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.gifts.byEvent(hh, eventId),
    queryFn: () => giftRepository.listEntriesByEvent(hh, eventId),
  });
}

export function useCreateContact() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactInput) => giftRepository.createContact(hh, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(hh) });
      // Contact mới xuất hiện trong `gift_history` với số lần = 0.
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

export function useUpdateContact() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: UUID; input: Partial<ContactInput> }) =>
      giftRepository.updateContact(hh, id, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

export function useDeleteContact() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => giftRepository.softDeleteContact(hh, id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

export function useCreateGiftEntry() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GiftEntryInput) => giftRepository.createEntry(hh, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

/**
 * Ghi một khoản mừng khi chỉ biết TÊN nhà, chưa biết `contactId`.
 *
 * Đây là hình dạng thật của luồng nhập: người dùng đang cầm cái phong bì và đọc
 * tên trên đó, họ chưa biết tên ấy đã có trong sổ hay chưa. `findOrCreateContact`
 * giải quyết chuyện đó ở đây — trong tầng queries — chứ KHÔNG phải ở màn hình:
 * tầng UI chỉ gọi hook, không chạm repository (01 §2).
 */
export function useCreateGiftEntryByName() {
  const hh = useHouseholdId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      ...rest
    }: Omit<GiftEntryInput, 'contactId'> & { name: string }) => {
      const contact = await giftRepository.findOrCreateContact(hh, name);
      return giftRepository.createEntry(hh, { ...rest, contactId: contact.id });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
      // Có thể vừa tạo một contact mới.
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(hh) });
    },
  });
}

/**
 * Nhập hàng loạt — luồng của ngày cưới (07 §3.3).
 *
 * Nhận tên dạng CHỮ chứ không phải `contactId`: người nhập đang đọc từ một
 * chồng phong bì và không biết ai đã có trong sổ. `findOrCreateContact` giải
 * quyết từng dòng, rồi MỘT lệnh insert cho cả mẻ.
 *
 * Tuần tự chứ không `Promise.all`: hai phong bì cùng tên trong một mẻ mà chạy
 * song song sẽ tạo HAI contact trùng — cả hai lượt đều thấy sổ chưa có tên đó.
 * Với 100 dòng thì phần tra tên chạy trên cache, không phải 100 round-trip.
 */
export function useCreateGiftEntriesBulk() {
  const hh = useHouseholdId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (rows: (Omit<GiftEntryInput, 'contactId'> & { name: string })[]) => {
      const inputs: GiftEntryInput[] = [];
      for (const r of rows) {
        const contact = await giftRepository.findOrCreateContact(hh, r.name);
        const { name: _name, ...rest } = r;
        inputs.push({ ...rest, contactId: contact.id });
      }
      return giftRepository.createEntries(hh, inputs);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(hh) });
    },
  });
}

export function useUpdateGiftEntry() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: UUID; input: Partial<GiftEntryInput> }) =>
      giftRepository.updateEntry(hh, id, input),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}

export function useDeleteGiftEntry() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => giftRepository.softDeleteEntry(hh, id),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.gifts.all(hh) });
    },
  });
}
