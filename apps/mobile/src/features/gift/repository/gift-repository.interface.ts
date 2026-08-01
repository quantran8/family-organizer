/**
 * Hợp đồng đọc/ghi của Sổ mừng cưới — 02 §11, 07 §3.
 *
 * Module này ghi DỮ LIỆU VỀ NGƯỜI KHÁC — họ hàng, người không có tài khoản và
 * không bao giờ thấy được thứ được ghi về mình. Mọi ràng buộc dưới đây bắt
 * nguồn từ chỗ đó.
 *
 * ── BỐN THỨ CỐ Ý KHÔNG CÓ ──
 *
 * `balanceFor(contactId)` — chênh lệch đi–nhận của một nhà. Dữ liệu đủ để tính
 * (view `gift_history` có cả `total_given` lẫn `total_received`), và đó chính
 * là lý do phải nói rõ là không có: nó biến quan hệ họ hàng thành sổ nợ. App
 * hiện hai chiều SONG SONG, người dùng tự cân — 07 §3.4.
 *
 * `listRankedByAmount()` — xếp hạng contact theo số tiền. Xếp hạng họ hàng theo
 * độ hào phóng là thứ khiến người dùng thấy app bẩn.
 *
 * `export()` / `share()` — dữ liệu này lộ ra ngoài household là một sự cố xã
 * hội thật, không phải một rò rỉ kỹ thuật.
 *
 * Một `search()` riêng: `list()` đã trả cả sổ và lọc ở client. Sổ mừng cưới của
 * một nhà là vài trăm dòng, không phải vài chục nghìn — một round-trip cho mỗi
 * ký tự gõ vào ô tìm khi đang nhập 100 phong bì thì tệ hơn nhiều so với việc
 * giữ cả danh sách trong bộ nhớ.
 */

import type { Contact, ContactSide, GiftEntry, GiftHistory, UUID } from '@family-organizer/domain';

/** Nguyên liệu để ghi một khoản mừng. `id` do DB sinh. */
export interface GiftEntryInput {
  contactId: UUID;
  direction: GiftEntry['direction'];
  occasion: GiftEntry['occasion'];
  /** 0 khi là quà hiện vật — khi đó `inKindNote` phải có chữ. */
  amount: number;
  occurredOn: string;
  eventId?: UUID | null;
  inKindNote?: string | null;
  notes?: string | null;
}

export interface ContactInput {
  displayName: string;
  relationNote?: string | null;
  side?: ContactSide;
}

export interface GiftRepository {
  // --- Contacts ---

  /** Sắp theo tên. KHÔNG BAO GIỜ theo số tiền — xem ghi chú đầu file. */
  listContacts(hh: UUID): Promise<Contact[]>;
  createContact(hh: UUID, input: ContactInput): Promise<Contact>;
  updateContact(hh: UUID, id: UUID, input: Partial<ContactInput>): Promise<void>;
  softDeleteContact(hh: UUID, id: UUID): Promise<void>;

  /**
   * Tìm theo tên rồi tạo nếu chưa có — dùng cho luồng NHẬP HÀNG LOẠT.
   *
   * Ngày cưới nhận 100 phong bì và người nhập gõ tên tự do; bắt họ dừng lại để
   * chọn "tạo mới hay chọn cũ" ở mỗi dòng là làm hỏng đúng luồng mà chế độ này
   * tồn tại để phục vụ. So khớp không phân biệt hoa thường và khoảng trắng
   * thừa; KHÔNG so khớp mờ — gộp nhầm hai người họ hàng khác nhau tệ hơn nhiều
   * so với việc có hai dòng trùng tên mà người dùng gộp tay sau.
   */
  findOrCreateContact(hh: UUID, displayName: string): Promise<Contact>;

  // --- Gift entries ---

  /** Mặc định MỚI NHẤT TRƯỚC (theo ngày), không theo số tiền — 07 §3.4. */
  listEntries(hh: UUID, contactId?: UUID): Promise<GiftEntry[]>;

  /** Của một đám cụ thể — nguyên liệu cho `summarizeOccasion()`. */
  listEntriesByEvent(hh: UUID, eventId: UUID): Promise<GiftEntry[]>;

  createEntry(hh: UUID, input: GiftEntryInput): Promise<GiftEntry>;

  /**
   * Ghi nhiều khoản một lượt — luồng nhập hàng loạt và luồng AI (07 §3.3).
   *
   * MỘT lệnh insert, không phải N lệnh: nhập 100 phong bì qua 100 round-trip
   * trên sóng 3G ở nhà hàng tiệc cưới thì một nửa số dòng sẽ hỏng giữa chừng,
   * và người nhập không có cách nào biết dòng nào đã vào.
   */
  createEntries(hh: UUID, inputs: GiftEntryInput[]): Promise<GiftEntry[]>;

  updateEntry(hh: UUID, id: UUID, input: Partial<GiftEntryInput>): Promise<void>;
  softDeleteEntry(hh: UUID, id: UUID): Promise<void>;

  // --- View gift_history ---

  /**
   * Nguồn của DÒNG GỢI Ý — toàn bộ lý do module này tồn tại.
   *
   * Trả cả sổ (không phân trang): `suggestGiftAmount()` là hàm thuần cần cả
   * lịch sử của contact đang chọn, và người dùng gõ tên trước khi biết mình cần
   * hàng nào.
   */
  listHistory(hh: UUID): Promise<GiftHistory[]>;
}
