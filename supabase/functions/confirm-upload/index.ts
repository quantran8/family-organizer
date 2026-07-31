/**
 * `confirm-upload` — pha 3 của ba pha (01 §6).
 *
 * **NƠI DUY NHẤT** được đặt `document_files.is_confirmed = true` (02 §7), và nó
 * chỉ đặt sau khi đã HEAD thấy file có thật trên R2.
 *
 * Vì sao không để client tự đặt: `is_confirmed` là thứ trigger `sync_storage_used`
 * đếm để ra `households.storage_used_bytes`. Client tự bật cờ nghĩa là quota
 * đếm cả những file chưa bao giờ lên tới nơi — và một nhà đầy quota vì những
 * file không tồn tại là loại lỗi không ai gỡ được từ trong app.
 *
 * ── Kích thước lấy từ R2, không lấy từ client ──
 *
 * `presign-upload` ghi `size_bytes` do client khai để kiểm quota TRƯỚC. Chữ ký
 * có ghim `content-length` nên R2 đã từ chối mọi thứ khác — nhưng ở đây vẫn ghi
 * đè bằng con số HEAD trả về. Lý do: đó là con số DUY NHẤT không đi qua tay
 * client, và bộ đếm quota phải dựa trên nó.
 *
 * Không tìm thấy file trên R2 (client PUT hỏng, URL hết hạn) → XOÁ HẲN hàng
 * pending thay vì để đó. Cron `sweep-orphan-uploads` cũng dọn được sau 24h,
 * nhưng dọn ngay thì màn chi tiết không hiện một ô ảnh trống trong một ngày.
 */

import { jsonResponse, userClient } from '../_shared/client.ts';
import { headR2Object, r2ConfigFromEnv } from '../_shared/r2.ts';

interface Body {
  documentFileId?: string;
}

Deno.serve(async (req) => {
  const supabase = userClient(req);
  if (!supabase) return jsonResponse({ error: 'auth' }, 401);

  const cfg = r2ConfigFromEnv();
  if (!cfg) return jsonResponse({ error: 'storage_not_configured' }, 503);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (!body.documentFileId) return jsonResponse({ error: 'bad_request' }, 400);

  // RLS lo phần quyền: hàng của nhà khác trả về rỗng, không cần lọc tay.
  const { data: file, error } = await supabase
    .from('document_files')
    .select('id, r2_key, thumb_key, is_confirmed')
    .eq('id', body.documentFileId)
    .maybeSingle();
  if (error) return jsonResponse({ error: 'unknown' }, 500);
  if (!file) return jsonResponse({ error: 'not_found' }, 404);

  // Đã confirm rồi thì trả về như thành công. Hàng đợi ở client có thể gọi lại
  // sau khi app bị giết giữa chừng, và một lần thử lại KHÔNG được thành lỗi —
  // nếu không, một file đã lên tới nơi sẽ mắc kẹt ở trạng thái "chưa xong" và
  // người dùng bấm Thử lại mãi.
  if (file.is_confirmed) return jsonResponse({ confirmed: true, alreadyConfirmed: true });

  const head = await headR2Object(cfg, file.r2_key as string);
  if (!head.exists) {
    await supabase.from('document_files').delete().eq('id', file.id);
    return jsonResponse({ error: 'upload_incomplete' }, 409);
  }

  // Thumbnail vắng mặt KHÔNG chặn confirm: bản gốc mới là thứ người dùng cần
  // giữ. Xoá `thumb_key` để danh sách biết mà hiện ô giữ chỗ thay vì đi tải
  // một key trỏ vào chỗ trống.
  let thumbKey = file.thumb_key as string | null;
  if (thumbKey) {
    const thumbHead = await headR2Object(cfg, thumbKey);
    if (!thumbHead.exists) thumbKey = null;
  }

  const { error: updateError } = await supabase
    .from('document_files')
    .update({
      is_confirmed: true,
      size_bytes: head.sizeBytes,
      thumb_key: thumbKey,
    })
    .eq('id', file.id);
  if (updateError) return jsonResponse({ error: 'unknown' }, 500);

  return jsonResponse({ confirmed: true, sizeBytes: head.sizeBytes, thumbKey });
});
