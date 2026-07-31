/**
 * `sign-download` — URL đọc có hạn cho thumbnail và bản gốc.
 *
 * Bucket R2 KHÔNG công khai. Giấy tờ ở đây là căn cước, hộ chiếu, giấy khai
 * sinh — một URL đoán được là một rò rỉ không thể thu hồi. Nên mọi lần đọc đều
 * đi qua đây và nhận một URL sống ngắn.
 *
 * ── Vì sao nhận một MẢNG id ──
 *
 * Danh sách giấy tờ hiện hàng chục thumbnail cùng lúc. Ký từng cái một là hàng
 * chục lần gọi Edge Function cho một lần cuộn, và trên 3G thì thumbnail nhỏ
 * giọt xuất hiện lệch nhau vài giây. Một lần gọi cho cả màn hình.
 *
 * ── `kind` tách bạch thumb và bản gốc (01 §6) ──
 *
 * Danh sách **chỉ bao giờ** xin `thumb`. Bản gốc chỉ được ký khi người dùng
 * thật sự mở một file ra xem. Đây không phải tối ưu băng thông đơn thuần: một
 * màn danh sách tự tải mười bản scan hộ chiếu đầy đủ là mười bản sao nằm trong
 * cache đĩa của máy, cho một thứ người dùng chỉ định liếc qua.
 */

import { jsonResponse, userClient } from '../_shared/client.ts';
import { presignR2Url, r2ConfigFromEnv } from '../_shared/r2.ts';

/**
 * 15 phút. Dài hơn `presign-upload` (5 phút) có chủ ý: URL đọc đi vào cache ảnh
 * của app và một người cuộn tới cuối danh sách rồi cuộn ngược lên không nên gặp
 * một ô ảnh vỡ. Vẫn đủ ngắn để một URL lọt ra ngoài không sống được lâu.
 */
const URL_TTL_SECONDS = 15 * 60;

interface Body {
  fileIds?: string[];
  kind?: 'thumb' | 'original';
}

/** Xin nhiều hơn ngần này trong một lần gọi là dấu hiệu gọi sai, không phải nhu cầu thật. */
const MAX_IDS = 100;

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

  const kind = body.kind ?? 'thumb';
  const fileIds = (body.fileIds ?? []).filter((s) => typeof s === 'string');
  if (fileIds.length === 0) return jsonResponse({ urls: {} });
  if (fileIds.length > MAX_IDS) return jsonResponse({ error: 'bad_request' }, 400);

  // RLS lọc giúp: id của nhà khác đơn giản không có trong kết quả. Không cần
  // báo lỗi cho chúng — chỗ gọi chỉ nhận về ít key hơn số đã xin.
  const { data: rows, error } = await supabase
    .from('document_files')
    .select('id, r2_key, thumb_key')
    .in('id', fileIds)
    .eq('is_confirmed', true)
    .is('deleted_at', null);
  if (error) return jsonResponse({ error: 'unknown' }, 500);

  const urls: Record<string, string> = {};
  for (const row of rows ?? []) {
    const key = kind === 'thumb' ? (row.thumb_key as string | null) : (row.r2_key as string);
    // Thumbnail vắng mặt là chuyện bình thường (PDF client không dựng được,
    // hoặc thumb hỏng lúc upload). Bỏ qua id đó — chỗ gọi hiện ô giữ chỗ.
    if (!key) continue;
    urls[row.id as string] = await presignR2Url(cfg, {
      method: 'GET',
      key,
      expiresIn: URL_TTL_SECONDS,
    });
  }

  return jsonResponse({ urls, expiresIn: URL_TTL_SECONDS });
});
