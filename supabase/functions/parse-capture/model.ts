/**
 * Adapter gọi model — CHỖ DUY NHẤT chưa nối nhà cung cấp thật.
 *
 * ── Trạng thái hiện tại (G16) ──
 *
 * Toàn bộ đường đi đã chạy thật: client → Edge → validate → quota → ghi
 * `ingest_drafts` → màn `capture-review` đọc và đổ vào form. Chỉ đúng hàm
 * `parseWithModel` dưới đây là chưa nối. Nối vào là điền một hàm, không phải
 * sửa kiến trúc — đó là lý do nó nằm riêng một file thay vì nằm trong
 * `index.ts`.
 *
 * Khi chưa có biến môi trường, hàm này ném `capture_not_configured` và Edge
 * trả 503. CỐ Ý không trả về một bản nháp rỗng "cho có": một bản nháp trống
 * hiện lên màn xác nhận trông y hệt như model đọc ảnh và không thấy gì, và
 * người dùng sẽ kết luận tính năng này vô dụng thay vì kết luận nó chưa bật.
 *
 * ── Ràng buộc khi nối vào ──
 *
 * 1. `parsed` trả về KHÔNG ĐƯỢC TIN. Không ghi thẳng vào bảng thật từ đây.
 *    Client chạy nó qua đúng zod schema của entity tương ứng trước khi đổ vào
 *    form, và người dùng luôn xác nhận (06 §6).
 * 2. Không bao giờ suy ra `householdId`, `memberId`, hay bất kỳ khoá ngoại nào
 *    từ output của model. Chúng đến từ phiên đăng nhập, không từ tấm ảnh.
 * 3. Ngày ÂM phải giữ nguyên là ngày âm (`lunarDay`/`lunarMonth`), không tự
 *    quy đổi sang dương ở đây. Chuyển đổi là việc của Edge
 *    `refresh-lunar-dates` — đúng MỘT nơi ghi `next_occurrence_date` (02 §7).
 *    Một ngày giỗ sai do model tự quy đổi sẽ phá niềm tin ở đúng tính năng
 *    khác biệt nhất của app.
 */

/** Nhóm con của `entity_type` mà capture dựng được form (02 §2). */
export type SuggestedEntityType = 'event' | 'task' | 'upcoming_payment' | 'document';

export interface ParseModelInput {
  source: string;
  text: string | null;
  /** Khoá R2 của ảnh. Ảnh không đi qua Edge — adapter tự ký URL đọc khi cần. */
  imagePath: string | null;
}

export interface ParseModelResult {
  suggestedEntityType: SuggestedEntityType | null;
  /**
   * Payload thô của model. Hình dạng tuỳ `suggestedEntityType`, và **chưa được
   * kiểm** — cột `ingest_drafts.parsed` là jsonb đúng vì lý do đó.
   */
  parsed: Record<string, unknown> | null;
}

/**
 * Đã cấu hình nhà cung cấp model chưa.
 *
 * Tách riêng để `index.ts` hỏi được mà không phải gọi thật, và để chỗ nối vào
 * sau này chỉ có một điều kiện duy nhất phải sửa.
 */
export function isCaptureConfigured(): boolean {
  return Boolean(Deno.env.get('CAPTURE_MODEL_API_KEY'));
}

export function parseWithModel(_input: ParseModelInput): Promise<ParseModelResult> {
  if (!isCaptureConfigured()) {
    // Ném chứ không trả rỗng — xem lý do ở đầu file.
    return Promise.reject(new Error('capture_not_configured'));
  }

  // TODO(G17): nối nhà cung cấp model.
  //
  // Hình dạng mong đợi của `parsed`, theo `suggestedEntityType`:
  //   event            → { title, calendar: 'solar'|'lunar', solarDate?,
  //                        lunarDay?, lunarMonth?, estimatedCost? }
  //   task             → { title, dueDate? }
  //   upcoming_payment → { title, amount, dueDate? }
  //   document         → { title, type?, expiryDate? }
  //
  // Mọi trường đều là GỢI Ý và đều sửa được ở màn xác nhận. Thiếu trường thì
  // để trống, KHÔNG đoán bừa: một ô trống là câu hỏi, một ô sai là một lời
  // khẳng định sai mà người dùng có thể bấm Lưu mà không đọc kỹ.
  return Promise.reject(new Error('capture_not_configured'));
}
