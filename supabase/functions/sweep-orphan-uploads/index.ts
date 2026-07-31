/**
 * `sweep-orphan-uploads` — dọn hàng `document_files` pending quá 24h.
 *
 * Ba pha upload (01 §6) ghi hàng DB **trước** khi client PUT lên R2. Đó là lựa
 * chọn đúng — mất mạng giữa chừng để lại rác có hạn, còn ghi sau thì file nằm
 * trên R2 mà không ai biết để dọn. Job này là vế thứ hai của lựa chọn đó: thứ
 * làm cho "có hạn" thành sự thật.
 *
 * Không có nó, mỗi lần một upload hỏng giữa chừng để lại một hàng
 * `is_confirmed = false` nằm lại vĩnh viễn. Chúng không tính vào quota
 * (`sync_storage_used` chỉ đếm file đã confirm) nên người dùng không thấy gì —
 * nhưng `document_files_orphan_idx` phình ra và mỗi lần mở màn chi tiết là một
 * lần quét thêm rác.
 *
 * ── Cẩn thận với ngưỡng 24h ──
 *
 * Nó phải rộng hơn hẳn thời gian một upload thật có thể kéo dài. Tình huống
 * chuẩn của 01 §6 là *chụp 8 ảnh rồi khoá máy đi làm việc khác*: hàng đợi chạy
 * tiếp trong nền, nhưng máy có thể hết pin, hoặc người dùng ra khỏi vùng sóng
 * cả buổi. Xoá một hàng pending mà client vẫn đang định confirm sẽ làm
 * `confirm-upload` trả `not_found`, và file đã nằm trên R2 thành rác thật sự —
 * đúng thứ job này sinh ra để tránh.
 *
 * ── Xoá CỨNG, không xoá mềm ──
 *
 * Khác mọi bảng khác. Một hàng pending chưa bao giờ là dữ liệu của người dùng:
 * nó là dấu vết của một thao tác chưa hoàn thành. Giữ lại 30 ngày như bản ghi
 * bị xoá mềm là giữ rác lâu hơn.
 *
 * ── Chưa xoá object trên R2 ──
 *
 * Một hàng pending có thể trỏ tới một object đã lên R2 xong (client PUT thành
 * công rồi chết trước pha 3). Xoá hàng DB mà không xoá object để lại một file
 * mồ côi trên bucket. Việc đó thuộc `purge-soft-deleted` — nơi đã có sẵn
 * credential R2 và logic xoá object; gộp vào đây sẽ có hai chỗ cùng gọi R2 API.
 * Ghi ra để lần sau không ai tưởng đây là chỗ sót.
 */

import { jsonResponse, serviceClient } from '../_shared/client.ts';

/** Rộng hơn hẳn thời gian một upload thật có thể kéo dài — xem đầu file. */
const ORPHAN_AGE_HOURS = 24;

Deno.serve(async () => {
  const supabase = serviceClient();
  const cutoff = new Date(Date.now() - ORPHAN_AGE_HOURS * 3_600_000).toISOString();

  const { data, error } = await supabase
    .from('document_files')
    .delete()
    .eq('is_confirmed', false)
    .lt('created_at', cutoff)
    .select('id, r2_key');

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ deleted: (data ?? []).length, cutoff });
});
