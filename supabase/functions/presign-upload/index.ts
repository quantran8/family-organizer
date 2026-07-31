/**
 * `presign-upload` — pha 1 của ba pha (01 §6).
 *
 * File **không bao giờ đi qua server của mình**: ở đây chỉ kiểm quyền rồi trả
 * về một URL đã ký để client `PUT` thẳng lên R2. Cho file đi qua Edge Function
 * nghĩa là mỗi tấm ảnh tốn hai lần băng thông và một lần giữ nguyên tấm ảnh
 * trong RAM của một runtime có giới hạn bộ nhớ — với 8 ảnh hồ sơ chụp liền tay
 * thì đó là 8 lần có thể chết giữa chừng.
 *
 * ── Đây là chỗ QUYẾT ĐỊNH về quota, không phải client ──
 *
 * `useCanUpload` ở app chạy đúng hàm `canUpload` này, nhưng nó chỉ để nói sớm
 * và nói rõ ("Đã dùng 48MB trên 50MB") trước khi mở bộ chọn file. Client không
 * được tin: presigned URL là thứ cấp quyền GHI thật, và ai gỡ được bundle thì
 * gọi thẳng được function này. Cùng một hàm thuần chạy ở hai runtime — đó là lý
 * do `packages/domain` không có dependency nào.
 *
 * Trả về `documentFileId` của một hàng `document_files` ĐÃ ghi ở trạng thái
 * chưa confirm. Ghi trước khi client PUT là cố ý (xem repository interface):
 * mất mạng giữa chừng để lại một hàng pending mà cron `sweep-orphan-uploads`
 * dọn được sau 24h, còn ghi sau thì file nằm trên R2 và không ai biết để dọn.
 */

import { canUpload, MAX_FILE_BYTES, type Household } from '@family-organizer/domain';

import { jsonResponse, userClient } from '../_shared/client.ts';
import { presignR2Url, r2ConfigFromEnv } from '../_shared/r2.ts';

/** TTL 5 phút (01 §6) — đủ cho một file lớn trên 3G, không đủ để phát tán. */
const URL_TTL_SECONDS = 5 * 60;

interface Body {
  documentId?: string;
  filename?: string;
  mime?: string;
  sizeBytes?: number;
  pageOrder?: number;
  /** Có tải kèm thumbnail không — ảnh thì có, PDF thì tuỳ client dựng được không. */
  withThumb?: boolean;
  thumbSizeBytes?: number;
}

/** MIME cho phép. Danh sách TRẮNG, không phải danh sách đen. */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
]);

Deno.serve(async (req) => {
  const supabase = userClient(req);
  if (!supabase) return jsonResponse({ error: 'auth' }, 401);

  const cfg = r2ConfigFromEnv();
  // Chưa cấu hình R2: nói THẲNG là chưa cấu hình, không giả vờ là lỗi quota hay
  // lỗi mạng. Nửa "ghi thông tin + vị trí bản giấy" của Giấy tờ vẫn chạy bình
  // thường — đó mới là đường chính (05 §7.2), phần file là bước làm thêm.
  if (!cfg) return jsonResponse({ error: 'storage_not_configured' }, 503);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  const { documentId, filename, mime, sizeBytes, pageOrder = 0, withThumb = false } = body;
  if (!documentId || !filename || !mime || typeof sizeBytes !== 'number') {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (!ALLOWED_MIME.has(mime)) return jsonResponse({ error: 'unsupported_type' }, 400);
  if (sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
    return jsonResponse({ error: 'file_too_large' }, 400);
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return jsonResponse({ error: 'auth' }, 401);

  // RLS lo phần "người này có thuộc nhà đó không": câu này trả rỗng nếu không.
  // Không có `.eq('household_id', …)` nào ở đây vì không có gì để so — chính
  // hàng `documents` là thứ nói cho ta biết household nào.
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, household_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle();
  if (docError) return jsonResponse({ error: 'unknown' }, 500);
  if (!doc) return jsonResponse({ error: 'not_found' }, 404);

  const householdId = doc.household_id as string;

  const { data: hhRow, error: hhError } = await supabase
    .from('households')
    .select('id, subscription_status, storage_used_bytes, storage_quota_bytes')
    .eq('id', householdId)
    .single();
  if (hhError || !hhRow) return jsonResponse({ error: 'not_found' }, 404);

  // Đếm LẠI từ `document_files` thay vì tin cột do trigger duy trì: hai giá trị
  // chỉ lệch khi trigger vừa lỡ nhịp, và lúc đó con số đếm lại mới là con số
  // đúng. Đây là chỗ quyết định cấp quyền ghi, nên nó phải dùng con số đúng.
  const { data: usedRows } = await supabase
    .from('document_files')
    .select('size_bytes')
    .eq('household_id', householdId)
    .eq('is_confirmed', true)
    .is('deleted_at', null);
  const usedBytes = (usedRows ?? []).reduce(
    (sum: number, r: { size_bytes: number }) => sum + Number(r.size_bytes),
    0,
  );

  const household = {
    subscriptionStatus: hhRow.subscription_status,
    storageUsedBytes: usedBytes,
    storageQuotaBytes: Number(hhRow.storage_quota_bytes),
  } as Household;

  const verdict = canUpload(household, sizeBytes);
  if (!verdict.ok) {
    // Trả nguyên `AppError` của domain: app đã có sẵn câu chữ cho từng `kind`
    // ở `i18n.error` (quota / premium), nên không dựng câu mới ở đây.
    return jsonResponse({ error: verdict.reason.kind, detail: verdict.reason }, 403);
  }

  // Key mang household_id ở đầu: một tiền tố duy nhất để đặt lifecycle rule
  // trên bucket và để xoá sạch khi một nhà rời đi.
  const uid = crypto.randomUUID();
  const r2Key = `hh/${householdId}/doc/${uid}`;
  const thumbKey = withThumb ? `hh/${householdId}/thumb/${uid}` : null;

  const { data: fileRow, error: insertError } = await supabase
    .from('document_files')
    .insert({
      household_id: householdId,
      document_id: documentId,
      r2_key: r2Key,
      thumb_key: thumbKey,
      filename,
      mime,
      size_bytes: sizeBytes,
      page_order: pageOrder,
      uploaded_by: user.id,
      // is_confirmed CỐ Ý không đặt — chỉ `confirm-upload` được bật, sau khi
      // đã HEAD thấy file có thật trên R2 (02 §7).
    })
    .select('id')
    .single();
  if (insertError || !fileRow) return jsonResponse({ error: 'unknown' }, 500);

  // Ghim `content-length` và `content-type` vào chữ ký: không có nó thì cùng
  // URL này tải lên được file 2GB thay vì tấm ảnh vừa kiểm quota ở trên, và
  // toàn bộ phép kiểm vừa rồi thành trang trí.
  const uploadUrl = await presignR2Url(cfg, {
    method: 'PUT',
    key: r2Key,
    expiresIn: URL_TTL_SECONDS,
    signedHeaders: { 'content-length': String(sizeBytes), 'content-type': mime },
  });

  const thumbUploadUrl =
    thumbKey && typeof body.thumbSizeBytes === 'number' && body.thumbSizeBytes > 0
      ? await presignR2Url(cfg, {
          method: 'PUT',
          key: thumbKey,
          expiresIn: URL_TTL_SECONDS,
          signedHeaders: {
            'content-length': String(body.thumbSizeBytes),
            'content-type': 'image/jpeg',
          },
        })
      : null;

  return jsonResponse({
    documentFileId: fileRow.id,
    r2Key,
    thumbKey,
    uploadUrl,
    thumbUploadUrl,
    expiresIn: URL_TTL_SECONDS,
  });
});
