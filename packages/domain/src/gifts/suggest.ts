/**
 * Sổ hiếu hỉ — 03 §11.1, 07 §3.
 *
 * Nỗi đau cụ thể: nhà chú Ba mừng đám cưới mình 2 triệu năm 2023. Giờ con chú
 * Ba cưới. Mình đi bao nhiêu? Đi thiếu thì mất mặt, đi thừa thì tiếc, và KHÔNG
 * AI NHỚ NỔI.
 *
 * Cùng câu hỏi đó xuất hiện ở tân gia, đầy tháng, giỗ, thôi nôi. Cưới chỉ là
 * MỘT trong tám dịp — module không đóng khung vào đám cưới.
 */

import { compareISODate } from '../date/civil.ts';
import type { GiftOccasion, UUID } from '../types/base.ts';
import type { GiftEntry, GiftHistory, ReciprocityStatus } from '../types/entities.ts';

/**
 * Tập id các khoản NHẬN đã được một khoản `given` ghép vào.
 *
 * Dùng chung bởi `suggestGiftAmount` và `listOutstandingObligations` — hai hàm
 * phải trả lời "đã đáp lễ chưa" giống hệt nhau, và tách ra là cách duy nhất để
 * chúng không trôi khỏi nhau khi một trong hai được sửa.
 */
function answeredIds(entries: GiftEntry[]): Set<UUID> {
  const answered = new Set<UUID>();
  for (const g of entries) {
    if (g.direction === 'given' && g.reciprocatesId !== null) answered.add(g.reciprocatesId);
  }
  return answered;
}

/**
 * Trạng thái đáp lễ của MỘT khoản nhận — 07 §3.3.
 *
 * Thứ tự kiểm có ý nghĩa: `not_needed` xét trước, vì một khoản đã đánh dấu
 * không cần đáp thì không có nghĩa vụ nào để nói là chưa xong.
 */
export function reciprocityStatus(entry: GiftEntry, entries: GiftEntry[]): ReciprocityStatus {
  if (entry.noReciprocityNeeded) return 'not_needed';
  if (answeredIds(entries).has(entry.id)) return 'reciprocated';
  return 'outstanding';
}

/**
 * Điều app biết về một contact khi đang nhập khoản mừng cho họ.
 *
 * `amount` tách khỏi `basis` có chủ ý: app luôn nói được ĐÃ NHẬN GÌ, nhưng chỉ
 * đôi khi mới được phép ĐỀ XUẤT SỐ.
 */
export interface GiftSuggestion {
  /** Bản ghi làm căn cứ — lần nhận gần nhất, để UI nói "cưới, 3/2023". */
  basis: GiftEntry;
  /**
   * Số đề xuất, hoặc `null` khi app KHÔNG được đề xuất (khác dịp / tang lễ /
   * quà hiện vật). `null` = hiện dữ kiện, KHÔNG hiện nút "Dùng số này".
   */
  amount: number | null;
  /**
   * Trạng thái đáp lễ của khoản căn cứ — 07 §3.3. Ba giá trị, không phải cờ
   * hai trạng thái: "chưa đáp lễ" và "không cần đáp lễ" đọc lên khác hẳn nhau.
   */
  status: ReciprocityStatus;
}

/**
 * Gợi ý số tiền mừng — TOÀN BỘ lý do module này tồn tại.
 *
 * Trả về lần NHẬN gần nhất từ contact đó, kèm bản ghi làm căn cứ để UI hiện
 * được ngữ cảnh:
 *
 *     Chú Ba đã mừng nhà mình 2.000.000 ₫ — cưới, 3/2023
 *     [ Dùng số này ]
 *
 * Không có hàm này thì module sổ hiếu hỉ chỉ là một cái Excel có màu.
 *
 * ── VÌ SAO `amount` CÓ THỂ NULL DÙ `basis` CÓ ──
 *
 * Mức tiền gắn với DỊP, không gắn với NHÀ. Hai triệu ở đám cưới không dịch được
 * sang mừng tân gia. Khi `basis.occasion !== forOccasion`, app hiện dữ kiện
 * (nhà đó đã mừng mình, và mình chưa đáp lễ) nhưng KHÔNG đề xuất con số — dịch
 * mức tiền giữa hai dịp là app nói sai một cách tự tin, và người dùng có xu
 * hướng tin con số app đưa ra hơn tin cảm nhận của mình. Xem 07 §3.4.
 *
 * Đây là cùng một nguyên tắc với lệnh cấm nội suy và điều chỉnh lạm phát: app
 * đưa ra một DỮ KIỆN, người dùng quyết định. Mọi phép điều chỉnh đều là app có
 * ý kiến về chuyện nên đi bao nhiêu — chuyện đó thuộc về hai vợ chồng.
 *
 * Trả `null` khi chưa từng nhận: khi đó UI KHÔNG HIỆN GÌ CẢ, không hiện "chưa
 * có dữ liệu".
 *
 * Nhận `entries` để lấy được bản ghi căn cứ: `GiftHistory` chỉ có ngày và tổng,
 * không đủ để nói "cưới, 3/2023".
 */
export function suggestGiftAmount(
  h: GiftHistory | null,
  entries: GiftEntry[],
  forOccasion: GiftOccasion,
): GiftSuggestion | null {
  if (h === null || h.timesReceived === 0 || h.lastReceivedOn === null) return null;

  let basis: GiftEntry | null = null;
  for (const g of entries) {
    if (g.contactId !== h.contactId) continue;
    if (g.direction !== 'received') continue;
    // 07 §3.5: khoản phúng viếng không bao giờ làm căn cứ gợi ý.
    if (g.occasion === 'funeral') continue;
    if (basis === null || compareISODate(g.occurredOn, basis.occurredOn) > 0) {
      basis = g;
    }
  }

  if (basis === null) return null;

  return {
    basis,
    amount: suggestableAmount(basis, forOccasion),
    status: reciprocityStatus(basis, entries),
  };
}

/**
 * Ba trường hợp app KHÔNG được đưa ra con số. Tách riêng để mỗi lý do đứng
 * thành một dòng đọc được, thay vì một biểu thức điều kiện dài.
 */
function suggestableAmount(basis: GiftEntry, forOccasion: GiftOccasion): number | null {
  // 07 §3.5: không bao giờ gợi ý số cho một đám tang. Nghĩa vụ có tồn tại trong
  // đời thật, nhưng đề xuất một con số vào đúng lúc nhà người ta có tang là thứ
  // app không được phép làm.
  if (forOccasion === 'funeral') return null;

  // 07 §3.4: mức tiền gắn với dịp. Khác dịp thì hiện dữ kiện, không hiện số.
  if (basis.occasion !== forOccasion) return null;

  // Quà không phải tiền (amount = 0, có inKindNote): "đi 0 đồng" là một lời
  // khuyên sai; UI hiện ghi chú hiện vật thay vì con số.
  if (basis.amount <= 0) return null;

  return basis.amount;
}

/**
 * Các khoản NHẬN chưa được đáp lễ — 07 §3.2.
 *
 * Đây là thứ bản v2.1 thiếu, và thiếu theo hướng khó thấy: module được dựng như
 * một SỔ GHI CHÉP, hai chiều song song, không chiều nào tham chiếu chiều nào.
 * Nhưng với người Việt, một khoản mừng nhận được KHÔNG phải sự kiện đã khép
 * lại — nó mở ra một nghĩa vụ, và không đi lại là một thất bại xã hội thật.
 *
 * Sắp theo NGÀY NHẬN, cũ nhất trước: nghĩa vụ lâu nhất nằm trên.
 *
 * ── VÌ SAO TRẢ MẢNG TRẦN, KHÔNG TRẢ { count, total } ──
 *
 * Khác `summarizeOccasion` có chủ ý. Một tổng số tiền các khoản chưa đáp lễ
 * ("còn 5 nhà, tổng 8 triệu") CHÍNH LÀ số dư nợ mặc áo khác: nó cộng dồn đúng
 * cái mà thiết kế cố ý giữ ở dạng từng khoản rời. Kiểu trả về không có chỗ nào
 * để nhét con số đó vào, và đó là chủ ý — xem `totalOutstanding` trong danh
 * sách hàm cấm ở 03 §11.3.
 *
 * Phép thử phân biệt nghĩa vụ với số dư nợ: bỏ hết số tiền đi mà thông tin vẫn
 * còn nguyên giá trị thì đó là nghĩa vụ. "Chú Ba mừng cưới mình 3/2023, chưa
 * đáp lễ" vẫn dùng được khi giấu số tiền; "chú Ba: còn 500k" thì không.
 */
export function listOutstandingObligations(
  entries: GiftEntry[],
  contactId?: UUID,
): GiftEntry[] {
  const answered = answeredIds(entries);

  return entries
    .filter((g) => {
      if (g.direction !== 'received') return false;
      // 07 §3.5: phúng viếng được ghi và hiện trong lịch sử, nhưng không bao giờ
      // nằm ở đây. Đáp lễ một đám tang nghĩa là chờ nhà đó có tang — app không
      // được nói ra điều đó, kể cả bằng cách xếp một dòng vào mục "chưa đáp lễ".
      if (g.occasion === 'funeral') return false;
      // 07 §3.4b: bố mẹ mừng con, người trên mừng người dưới, người đã mất.
      // Thiếu dòng này thì danh sách đầy dần những nghĩa vụ KHÔNG BAO GIỜ ĐÓNG
      // ĐƯỢC, và một danh sách không xoá được dạy người dùng bỏ qua cả mục.
      if (g.noReciprocityNeeded) return false;
      if (contactId !== undefined && g.contactId !== contactId) return false;
      return !answered.has(g.id);
    })
    .sort((a, b) => compareISODate(a.occurredOn, b.occurredOn));
}

/**
 * Tổng của MỘT ĐÁM: nhận được bao nhiêu, từ bao nhiêu nhà — 03 §11.1.
 *
 * Đây là con số người dùng thật sự muốn biết sau đám cưới mình.
 *
 * `count` đi kèm `total` theo cùng nguyên tắc với groupHistoryByMonth: một
 * tổng không kèm số lượng bản ghi sẽ được đọc là đầy đủ.
 *
 * KHÔNG CÓ HÀM NÀO TÍNH CHÊNH LỆCH ĐI–NHẬN. Dữ liệu đủ để tính, và đó chính là
 * lý do phải nói rõ: nó biến quan hệ họ hàng thành sổ nợ. Xem 07 §3.4.
 */
export function summarizeOccasion(entries: GiftEntry[]): { count: number; total: number } {
  return {
    count: entries.length,
    total: entries.reduce((s, g) => s + g.amount, 0),
  };
}
