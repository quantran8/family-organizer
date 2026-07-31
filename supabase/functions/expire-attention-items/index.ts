/**
 * `expire-attention-items` — đóng cờ "cần trao đổi" đã quá `expires_at`.
 *
 * ── Vì sao cờ PHẢI tự hết hạn (05 §6.7) ──
 *
 * `finance_metrics.attentionCount` đếm cờ đang mở, và `computeFinanceStatus`
 * đọc con số đó để ra trạng thái `watch`. Một cờ nằm mãi nghĩa là trạng thái
 * tài chính **mắc kẹt ở "Cần chú ý" vĩnh viễn** — và một cảnh báo không bao giờ
 * tắt là một cảnh báo không ai đọc nữa. Cờ chết đi là điều kiện để cờ còn sống
 * có nghĩa.
 *
 * 14 ngày cũng là một câu nói với người GẮN cờ: bạn không tạo ra một món nợ
 * tinh thần vĩnh viễn cho người kia. Màn `attention.tsx` hiện thẳng số ngày còn
 * lại trên mỗi cờ.
 *
 * ── `resolved_by` để NULL, không phải id của ai đó ──
 *
 * Cờ hết hạn KHÔNG phải "đã giải quyết". Ghi một `resolved_by` giả (người gắn
 * cờ, chẳng hạn) sẽ nói dối rằng có người đã xem và đóng nó. `resolution_note`
 * cũng để trống: không ai kết luận gì cả, cờ chỉ đơn giản hết hiệu lực.
 *
 * ── Vì sao vẫn cần cron khi `listOpen` đã lọc theo `expires_at` ──
 *
 * Client lọc để KHÔNG HIỆN cờ đã hết hạn. Nhưng view `finance_metrics` đếm
 * `resolved_at is null` — nó không biết gì về `expires_at`. Không có job này
 * thì cờ biến mất khỏi màn hình mà trạng thái vẫn kẹt ở "Cần chú ý", và đó là
 * kiểu hỏng tệ nhất: một cảnh báo không còn chỗ nào bấm để tắt.
 */

import { jsonResponse, serviceClient } from '../_shared/client.ts';

Deno.serve(async () => {
  const supabase = serviceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('attention_items')
    .update({ resolved_at: now })
    .is('resolved_at', null)
    .lt('expires_at', now)
    .select('id');

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ expired: (data ?? []).length, now });
});
