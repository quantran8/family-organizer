/**
 * `parse-capture` — đọc ảnh chụp màn hình / ảnh giấy tờ / text thành bản nháp.
 *
 * ── Vì sao function này khác MỌI function còn lại ──
 *
 * Đây là Edge Function ĐẦU TIÊN nhận input của người dùng (06 §6, 02 §5). Mọi
 * function khác chỉ ghi trường dẫn xuất từ dữ liệu đã có trong DB, nên `02 §5`
 * trước đây khẳng định "không có input nào đi qua Edge". Khẳng định đó không
 * còn đúng kể từ file này, và hệ quả là đây là chỗ đầu tiên cần validation
 * phía server thật sự — không phải một phép kiểm cho có.
 *
 * Hai chiều đều phải validate:
 *   1. INPUT từ client — người dùng gửi được bất cứ thứ gì.
 *   2. OUTPUT từ model — AI KHÔNG ĐƯỢC TIN. Ở đây chỉ ghi xuống `parsed` dạng
 *      jsonb; việc kiểm hình dạng theo từng entity nằm ở client, bằng đúng zod
 *      schema mà form dùng (02 §5). Ghi thẳng vào bảng thật từ đây sẽ là đường
 *      tạo bản ghi thứ hai, không qua mắt người dùng.
 *
 * ── Đây là chỗ QUYẾT ĐỊNH về quota ──
 *
 * `useCanUseCapture` ở app chạy đúng hàm `canUseCapture` này, nhưng chỉ để nói
 * sớm và nói rõ. Cùng lý do với `presign-upload`: ai gỡ được bundle thì gọi
 * thẳng được function này, nên client không được tin.
 *
 * ── `userClient`, KHÔNG phải `serviceClient` ──
 *
 * Cùng lý do với `presign-upload`/`confirm-upload`: function này nhận
 * `householdId` từ thân request. Với service role thì id của một nhà khác cũng
 * ghi được. Đi qua JWT nghĩa là RLS tự chặn — chọn nhầm client ở đây là một lỗ
 * hổng bảo mật, không phải một lựa chọn phong cách.
 */

import { canUseCapture, type Household } from '@family-organizer/domain';

import { jsonResponse, userClient } from '../_shared/client.ts';
import { parseWithModel, type ParseModelResult } from './model.ts';

/** Nguồn hợp lệ — danh sách TRẮNG, khớp enum `ingest_source` trong 0004. */
const ALLOWED_SOURCES = new Set(['screenshot', 'photo', 'text']);

/**
 * Trần độ dài text. Một tin nhắn Zalo dài nhất cũng không tới mức này; con số
 * này để chặn việc dán cả một cuốn sách vào rồi trả tiền model cho nó.
 */
const MAX_TEXT_LENGTH = 8_000;

interface Body {
  householdId?: string;
  source?: string;
  text?: string;
  /** Khoá R2 của ảnh đã upload trước đó. Ảnh KHÔNG đi qua Edge (01 §6). */
  imagePath?: string;
}

Deno.serve(async (req) => {
  const supabase = userClient(req);
  if (!supabase) return jsonResponse({ error: 'auth' }, 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  const { householdId, source, text, imagePath } = body;

  // ── Validation input (chiều 1) ──
  if (!householdId || typeof householdId !== 'string') {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (!source || !ALLOWED_SOURCES.has(source)) {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (text !== undefined && typeof text !== 'string') {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (imagePath !== undefined && typeof imagePath !== 'string') {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (text && text.length > MAX_TEXT_LENGTH) {
    return jsonResponse({ error: 'text_too_long' }, 400);
  }
  // Nguồn `text` phải có text; hai nguồn ảnh phải có ảnh. Thiếu phép kiểm này
  // thì một request rỗng vẫn tốn một suất quota và trả về bản nháp trống.
  if (source === 'text' && !text?.trim()) {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  if (source !== 'text' && !imagePath) {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return jsonResponse({ error: 'auth' }, 401);

  // RLS lo phần "người này có thuộc nhà đó không": câu này trả rỗng nếu không.
  const { data: hhRow, error: hhError } = await supabase
    .from('households')
    .select('id, subscription_status, storage_used_bytes, storage_quota_bytes')
    .eq('id', householdId)
    .maybeSingle();
  if (hhError) return jsonResponse({ error: 'unknown' }, 500);
  if (!hhRow) return jsonResponse({ error: 'not_found' }, 404);

  // ── Quota (chỗ quyết định thật) ──
  //
  // Đếm theo THÁNG DƯƠNG hiện tại và theo bản nháp ĐÃ TẠO, không theo bản nháp
  // được xác nhận: mỗi lần gọi là một lần tốn model, kể cả khi người dùng nhìn
  // kết quả rồi bỏ.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { count, error: countError } = await supabase
    .from('ingest_drafts')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .gte('created_at', monthStart);
  if (countError) return jsonResponse({ error: 'unknown' }, 500);

  const household = {
    subscriptionStatus: hhRow.subscription_status,
    storageUsedBytes: Number(hhRow.storage_used_bytes),
    storageQuotaBytes: Number(hhRow.storage_quota_bytes),
  } as Household;

  const verdict = canUseCapture(household, count ?? 0);
  if (!verdict.ok) {
    // Trả nguyên `AppError` của domain: app đã có sẵn câu chữ cho từng `kind`.
    // Màn capture-review VẪN cho nhập tay sau lỗi này (05 §F4) — hết quota là
    // mất đường tắt, không phải mất đường vào.
    return jsonResponse({ error: verdict.reason.kind, detail: verdict.reason }, 403);
  }

  // ── Gọi model ──
  let result: ParseModelResult;
  try {
    result = await parseWithModel({ source, text: text ?? null, imagePath: imagePath ?? null });
  } catch (error) {
    // Chưa cấu hình nhà cung cấp: nói THẲNG là chưa cấu hình, không giả vờ là
    // lỗi mạng hay lỗi quota. Cùng khuôn với `storage_not_configured` ở
    // `presign-upload` — đường nhập tay ở màn capture-review vẫn chạy bình
    // thường, và đó mới là đường luôn có.
    if (error instanceof Error && error.message === 'capture_not_configured') {
      return jsonResponse({ error: 'capture_not_configured' }, 503);
    }
    return jsonResponse({ error: 'unknown' }, 500);
  }

  // Ghi bản nháp ở trạng thái `pending`. KHÔNG ghi vào bảng thật nào cả —
  // người dùng luôn xác nhận trước khi ghi (06 §6). Dòng này tự hết hạn sau 7
  // ngày theo `expires_at` mặc định của bảng.
  const { data: draftRow, error: insertError } = await supabase
    .from('ingest_drafts')
    .insert({
      household_id: householdId,
      created_by: user.id,
      source,
      raw_text: text ?? null,
      image_path: imagePath ?? null,
      suggested_entity_type: result.suggestedEntityType,
      parsed: result.parsed,
    })
    .select('id, source, raw_text, image_path, suggested_entity_type, parsed, status, created_at')
    .single();
  if (insertError || !draftRow) return jsonResponse({ error: 'unknown' }, 500);

  return jsonResponse({ draft: draftRow });
});
