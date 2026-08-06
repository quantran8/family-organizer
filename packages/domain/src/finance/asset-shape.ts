/**
 * Hình dạng form theo loại tài sản — 03 §2b.
 *
 * Một form chung cho tám loại là một form đúng cho không loại nào. "Nơi giữ"
 * của sổ tiết kiệm là tên ngân hàng, của vàng là chỗ cất trong nhà, của khoản
 * cho vay là TÊN MỘT NGƯỜI, và của tiền mặt thì không tồn tại. Cùng một ô, bốn
 * nghĩa khác nhau — người dùng phải tự dịch mỗi lần, và dữ liệu thu về là bốn
 * thứ khác nhau nằm chung một cột.
 *
 * Hàm này trả về *hình dạng*, không trả về câu chữ: nhãn nào dùng cho `institution`
 * là một khoá i18n, không phải chuỗi tiếng Việt (domain không chứa chuỗi hiển
 * thị). Tầng UI tra khoá đó trong `i18n/vi.ts`.
 *
 * Vì sao ở domain chứ không ở app: cùng lý do với `inferLiquidity`. Đây là quy
 * tắc nghiệp vụ (*loại này cần biết gì*), không phải chi tiết trình bày, nên nó
 * test được không cần dựng màn hình — và Edge cần nó khi kiểm dữ liệu nhập vào
 * từ `ingest_drafts`.
 */

import type { AssetKind } from '../types/base.ts';

/**
 * Ô "nơi giữ" (`institution`) mang nghĩa khác nhau theo loại — khoá i18n, không
 * phải nhãn. `null` = loại này KHÔNG có ô đó, đừng hiện.
 */
export type PlaceLabelKey = 'bank' | 'storage' | 'address' | 'borrower' | 'platform';

export interface AssetShape {
  /**
   * Khoá nhãn cho `institution`, hoặc `null` khi loại này không có nơi giữ.
   *
   * Tiền mặt là `null` có chủ đích: "nơi giữ" của tiền mặt hoặc là hiển nhiên
   * (trong nhà) hoặc là thứ không nên ghi vào một app đồng bộ lên mây.
   */
  placeLabel: PlaceLabelKey | null;
  /** Loại đo được bằng đơn vị vật lý (vàng). Kéo theo ô số lượng + đơn vị. */
  hasQuantity: boolean;
  /**
   * Có hỏi "ai đang giữ" không.
   *
   * `false` cho `receivable`: khoản cho vay không có người giữ — tiền đang ở
   * chỗ NGƯỜI VAY, mà người đó đã được ghi ở ô `institution` rồi. Hỏi thêm
   * "người giữ" ở đây tạo ra đúng thứ ràng buộc #1 cấm: một cái tên gắn vào một
   * con số tiền mà không trả lời câu hỏi nào cả.
   */
  hasHolder: boolean;
  /** Loại có ngày hẹn — hiện tại chỉ khoản cho vay (ngày hẹn trả). */
  hasDueDate: boolean;
}

/**
 * Bốn nhóm, không phải tám form.
 *
 * Gộp theo *cần biết gì*, không theo *tên gọi là gì*: tài khoản ngân hàng, sổ
 * tiết kiệm và đầu tư hỏi cùng một bộ câu, nên chúng dùng chung một hình dạng
 * dù nằm ở ba nhóm thanh khoản khác nhau.
 */
export function assetShape(kind: AssetKind): AssetShape {
  switch (kind) {
    // Tiền mặt — không nơi giữ, không tổ chức nào đứng sau.
    case 'cash':
      return { placeLabel: null, hasQuantity: false, hasHolder: true, hasDueDate: false };

    case 'bank_account':
    case 'savings':
      return { placeLabel: 'bank', hasQuantity: false, hasHolder: true, hasDueDate: false };

    case 'investment':
      return { placeLabel: 'platform', hasQuantity: false, hasHolder: true, hasDueDate: false };

    // Vàng — thứ duy nhất mà GIÁ TRỊ TIỀN KHÔNG PHẢI dữ liệu gốc. "2 chỉ" đúng
    // mãi mãi; "15 triệu" đúng đến lần giá vàng đổi tiếp theo. Ghi cả hai, và
    // ghi số lượng trước.
    case 'gold':
      return { placeLabel: 'storage', hasQuantity: true, hasHolder: true, hasDueDate: false };

    case 'real_estate':
      return { placeLabel: 'address', hasQuantity: false, hasHolder: true, hasDueDate: false };

    // Cho vay — "nơi giữ" là một CON NGƯỜI, nên không hỏi thêm người giữ.
    case 'receivable':
      return { placeLabel: 'borrower', hasQuantity: false, hasHolder: false, hasDueDate: true };

    case 'other':
      return { placeLabel: 'storage', hasQuantity: false, hasHolder: true, hasDueDate: false };
  }
}
