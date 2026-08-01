/**
 * Nhập nhanh bằng AI — 02 §2, 06 §6.
 *
 * ── Vì sao repository này KHÔNG có `create` ──
 *
 * Không có hàm nào ở đây ghi vào `events`/`tasks`/`upcoming_payments`. Bản
 * nháp chỉ là bản nháp: UI đọc `parsed`, chạy qua zod của entity tương ứng, đổ
 * vào form, và **người dùng bấm Lưu** — lúc đó repository của entity đó mới
 * ghi. Một hàm `createFromDraft` ở đây sẽ là đường tạo bản ghi thứ hai không
 * qua mắt người dùng, và đó đúng là thứ `06 §6` cấm: một ngày giỗ sai do AI
 * đoán sẽ phá niềm tin ở đúng tính năng khác biệt nhất.
 *
 * `confirm` chỉ đánh dấu nháp đã được dùng — nó nhận `createdEntityId` của bản
 * ghi mà UI vừa tạo qua repo khác, chứ không tự tạo gì.
 */

import type { IngestDraft, UUID } from '@family-organizer/domain';

export interface SubmitCaptureInput {
  source: IngestDraft['source'];
  /** Với `source: 'text'`. */
  text?: string;
  /** Khoá R2 của ảnh đã upload. Ảnh không đi qua Edge (01 §6). */
  imagePath?: string;
}

/** Số lần đã dùng trong tháng dương hiện tại — đầu vào của `canUseCapture`. */
export interface CaptureUsage {
  usedThisMonth: number;
}

export interface IngestRepository {
  /**
   * Gửi lên Edge `parse-capture`.
   *
   * Ném `premium_required` (feature `ai_capture`) khi hết quota, và
   * `conflict` với message `capture_not_configured` khi chưa cắm nhà cung cấp
   * model. Hai thứ này KHÁC nhau ở UI: một cái mở paywall, một cái chỉ nói
   * đường AI chưa bật — cả hai đều để đường nhập tay chạy tiếp.
   */
  submit(hh: UUID, input: SubmitCaptureInput): Promise<IngestDraft>;

  get(hh: UUID, id: UUID): Promise<IngestDraft | null>;

  /** Người dùng bỏ bản nháp. Không xoá hàng — đổi `status`, để cron dọn. */
  discard(hh: UUID, id: UUID): Promise<void>;

  /**
   * Đánh dấu đã dùng để tạo bản ghi thật. KHÔNG tự tạo — xem đầu file.
   */
  confirm(hh: UUID, id: UUID, createdEntityId: UUID): Promise<void>;

  /** Đếm để `canUseCapture` chạy được ở client (nói sớm, không phải quyết định). */
  usage(hh: UUID): Promise<CaptureUsage>;
}
