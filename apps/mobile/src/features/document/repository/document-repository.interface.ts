/**
 * Hợp đồng đọc/ghi của Giấy tờ — 02 §4.
 *
 * Hai thứ tách bạch có chủ ý:
 *
 *   `documents`      — thông tin + **vị trí bản giấy**. Đây mới là bản ghi.
 *   `document_files` — ảnh/PDF đính kèm. TUỲ CHỌN, và là bước làm sau.
 *
 * Giấy tờ **không có file nào vẫn là bản ghi đầy đủ** (05 §7.2). Đó không phải
 * sự nhân nhượng: "hộ chiếu để ngăn kéo phòng làm việc, hết hạn 3/2027" đã trả
 * lời đúng câu người dùng cần, và đó cũng là thứ Google Drive không làm được.
 * Vì đã bỏ máy quét, ma sát để có ảnh chụp cao hơn — nên đường "chỉ ghi chỗ để
 * giấy" phải là đường chính, không phải đường lui.
 */

import type { DocType, FamilyDocument, ISODate, UUID } from '@nhaminh/domain';

export interface DocumentInput {
  title: string;
  type: DocType;
  ownerMemberId: UUID | null;
  issuedDate: ISODate | null;
  expiryDate: ISODate | null;
  remindLeadDays: number;
  /** Trường quan trọng nhất trên màn chi tiết (05 §7.2). */
  physicalLocation: string | null;
  externalLink: string | null;
  notes: string | null;
  renewalCost: number | null;
  eventId: UUID | null;
  debtId: UUID | null;
  /** Metadata riêng theo loại — jsonb để không phải migration mỗi doc_type mới. */
  extra: Record<string, unknown>;
}

export type DocumentFilter = 'all' | 'expiring' | 'no_expiry';

/**
 * Một file đã tải xong, chờ ghi nhận.
 *
 * `isConfirmed` KHÔNG có ở đây: nó là trường chỉ đọc (02 §7), chỉ Edge
 * `confirm-upload` được đặt thành true sau khi đã kiểm file có thật trên R2.
 * Client tự đặt thì quota đếm được cả những file chưa bao giờ lên tới nơi.
 */
export interface DocumentFileDraft {
  r2Key: string;
  thumbKey: string | null;
  filename: string;
  mime: string;
  sizeBytes: number;
  pageOrder: number;
}

export interface DocumentRepository {
  list(hh: UUID, filter: DocumentFilter, today: ISODate): Promise<FamilyDocument[]>;
  /** Chi tiết: kèm file đã confirm, sắp theo `page_order`. */
  get(hh: UUID, id: UUID): Promise<FamilyDocument | null>;
  create(hh: UUID, input: DocumentInput): Promise<FamilyDocument>;
  update(hh: UUID, id: UUID, patch: Partial<DocumentInput>): Promise<FamilyDocument>;
  softDelete(hh: UUID, id: UUID): Promise<void>;

  /** Giấy tờ gắn với một sự kiện — sự kiện là hub ngữ cảnh (05 §5.4). */
  listByEvent(hh: UUID, eventId: UUID): Promise<FamilyDocument[]>;

  /**
   * Ghi hàng `document_files` ở trạng thái chưa confirm, TRƯỚC khi client PUT
   * lên R2. Hàng pending quá 24h chưa confirm sẽ bị cron dọn (schema §6) — nên
   * ghi trước là an toàn: mất mạng giữa chừng để lại rác có hạn, còn ghi sau
   * thì file nằm trên R2 mà không ai biết để dọn.
   */
  registerFile(hh: UUID, documentId: UUID, draft: DocumentFileDraft): Promise<UUID>;
  /** Gỡ một file khỏi giấy tờ. Xoá mềm — bản ghi lịch sử vẫn đọc được. */
  softDeleteFile(hh: UUID, fileId: UUID): Promise<void>;

  /** Dung lượng đã dùng, để `canUpload` chạy ở client trước khi gọi presign. */
  storageUsedBytes(hh: UUID): Promise<number>;
}
