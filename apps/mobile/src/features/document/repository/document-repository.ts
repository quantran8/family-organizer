/**
 * Hiện thực DocumentRepository.
 */

import { addDays } from '@nhaminh/domain';

import { unwrap, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { toDocument } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { DocumentFileRow, DocumentRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { DocumentInput, DocumentRepository } from './document-repository.interface';

/** Sắp hết hạn = trong 30 ngày tới (05 §7.1). */
const EXPIRING_WINDOW_DAYS = 30;

function toRow(i: Partial<DocumentInput>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (i.title !== undefined) r.title = i.title;
  if (i.type !== undefined) r.type = i.type;
  if (i.ownerMemberId !== undefined) r.owner_member_id = i.ownerMemberId;
  if (i.issuedDate !== undefined) r.issued_date = i.issuedDate;
  if (i.expiryDate !== undefined) r.expiry_date = i.expiryDate;
  if (i.remindLeadDays !== undefined) r.remind_lead_days = i.remindLeadDays;
  if (i.physicalLocation !== undefined) r.physical_location = i.physicalLocation;
  if (i.externalLink !== undefined) r.external_link = i.externalLink;
  if (i.notes !== undefined) r.notes = i.notes;
  if (i.renewalCost !== undefined) r.renewal_cost = i.renewalCost;
  if (i.eventId !== undefined) r.event_id = i.eventId;
  if (i.debtId !== undefined) r.debt_id = i.debtId;
  if (i.extra !== undefined) r.extra = i.extra;
  return r;
}

/**
 * Danh sách CHỈ tải metadata + thumbnail, không bao giờ tải bản gốc (01 §6).
 * Cột `r2_key` cố ý không có ở đây — nó chỉ cần khi thật sự mở file.
 */
const FILE_COLS_FOR_LIST =
  'id, filename, mime, size_bytes, page_order, thumb_key, is_confirmed, deleted_at';
const FILE_COLS_FULL = '*';

/**
 * Hai hình dạng khác nhau vì hai câu select khác nhau — `toDocument` chỉ đụng
 * tới các cột có trong bản rút gọn, nên nó nhận được cả hai.
 */
type FileForList = Pick<
  DocumentFileRow,
  'id' | 'filename' | 'mime' | 'size_bytes' | 'page_order' | 'thumb_key' | 'is_confirmed' | 'deleted_at'
>;
type DocWithFileList = DocumentRow & { document_files: FileForList[] };
type DocWithFullFiles = DocumentRow & { document_files: DocumentFileRow[] };

export const documentRepository: DocumentRepository = {
  async list(hh, filter, today) {
    let q = supabase
      .from('documents')
      .select(`*, document_files(${FILE_COLS_FOR_LIST})`)
      .eq('household_id', hh)
      .is('deleted_at', null);

    // Sắp hết hạn: từ HÔM NAY trở đi, không lấy cái đã quá hạn từ lâu —
    // "hộ chiếu hết hạn 2019" không còn là việc cần làm gấp, nó là việc đã lỡ.
    // Quá hạn vẫn hiện ở bộ lọc 'all' và vẫn có viền cảnh báo trên thẻ.
    if (filter === 'expiring') {
      q = q
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today)
        .lte('expiry_date', addDays(today, EXPIRING_WINDOW_DAYS));
    } else if (filter === 'no_expiry') {
      q = q.is('expiry_date', null);
    }

    // Mặc định sắp theo hạn gần nhất (05 §7.1). `nullsFirst: false` đẩy giấy tờ
    // không có hạn xuống cuối — chúng không cấp bách, nhưng vẫn phải thấy được.
    const rows = await unwrap<DocWithFileList[]>(
      q.order('expiry_date', { ascending: true, nullsFirst: false }).order('title'),
    );
    return rows.map((r) => toDocument(r, r.document_files ?? []));
  },

  async get(hh, id) {
    const row = await unwrapMaybe<DocWithFullFiles>(
      supabase
        .from('documents')
        .select(`*, document_files(${FILE_COLS_FULL})`)
        .eq('id', id)
        .eq('household_id', hh)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toDocument(row, row.document_files ?? []) : null;
  },

  async create(hh, input) {
    const createdBy = await currentProfileId();
    const row = await unwrap<DocumentRow>(
      supabase
        .from('documents')
        .insert({ ...toRow(input), household_id: hh, created_by: createdBy })
        .select()
        .single(),
    );
    return toDocument(row, []);
  },

  async update(hh, id, patch) {
    const row = await unwrap<DocWithFullFiles>(
      supabase
        .from('documents')
        .update(toRow(patch))
        .eq('id', id)
        .eq('household_id', hh)
        .select(`*, document_files(${FILE_COLS_FULL})`)
        .single(),
    );
    return toDocument(row, row.document_files ?? []);
  },

  async softDelete(hh, id) {
    await unwrapVoid(
      supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', hh),
    );
  },

  async listByEvent(hh, eventId) {
    const rows = await unwrap<DocWithFileList[]>(
      supabase
        .from('documents')
        .select(`*, document_files(${FILE_COLS_FOR_LIST})`)
        .eq('household_id', hh)
        .eq('event_id', eventId)
        .is('deleted_at', null)
        .order('title'),
    );
    return rows.map((r) => toDocument(r, r.document_files ?? []));
  },

  async registerFile(hh, documentId, draft) {
    const uploadedBy = await currentProfileId();
    const row = await unwrap<{ id: string }>(
      supabase
        .from('document_files')
        .insert({
          household_id: hh,
          document_id: documentId,
          r2_key: draft.r2Key,
          thumb_key: draft.thumbKey,
          filename: draft.filename,
          mime: draft.mime,
          size_bytes: draft.sizeBytes,
          page_order: draft.pageOrder,
          uploaded_by: uploadedBy,
          // is_confirmed CỐ Ý không đặt — mặc định false, chỉ Edge
          // `confirm-upload` được bật lên true (02 §7).
        })
        .select('id')
        .single(),
    );
    return row.id;
  },

  async softDeleteFile(hh, fileId) {
    await unwrapVoid(
      supabase
        .from('document_files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId)
        .eq('household_id', hh),
    );
  },

  /**
   * Đếm lại từ `document_files` thay vì đọc `households.storage_used_bytes`:
   * cột đó là trường chỉ đọc do trigger duy trì (02 §7), và ở đây ta cần con số
   * đúng ngay cả khi trigger vừa lỡ một nhịp. Chỉ đếm file ĐÃ CONFIRM — file
   * pending có thể chưa bao giờ lên tới R2.
   */
  async storageUsedBytes(hh) {
    const rows = await unwrap<{ size_bytes: number }[]>(
      supabase
        .from('document_files')
        .select('size_bytes')
        .eq('household_id', hh)
        .eq('is_confirmed', true)
        .is('deleted_at', null),
    );
    return rows.reduce((sum, r) => sum + Number(r.size_bytes), 0);
  },
};
