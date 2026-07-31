/**
 * `purge-soft-deleted` — xoá cứng bản ghi đã xoá mềm quá 30 ngày.
 *
 * Xoá mềm toàn hệ thống (schema §3) tồn tại để có hoàn tác và để không mất dữ
 * liệu vì một cú chạm nhầm. Nhưng "xoá" mà giữ mãi thì không phải xoá — job này
 * là thứ làm cho lời hứa đó thành thật.
 *
 * ── Thứ tự xoá quan trọng: FILE TRƯỚC, DB SAU ──
 *
 * `document_files` là bảng duy nhất có bản sao nằm ngoài Postgres. Xoá hàng DB
 * trước rồi mới gọi R2 nghĩa là nếu bước hai lỗi, **không còn gì trên đời biết
 * key đó tồn tại** — object nằm trên bucket vĩnh viễn, tính tiền vĩnh viễn, và
 * không có cách nào tìm lại. Gọi R2 trước: lỗi thì hàng DB còn đó và lần chạy
 * sau thử lại được.
 *
 * ── `households` KHÔNG nằm trong danh sách ──
 *
 * Mọi bảng khác đều `on delete cascade` từ `households`. Xoá cứng một nhà là
 * xoá toàn bộ dữ liệu của hai người, gồm cả những gì họ chưa bao giờ chạm vào —
 * và không có màn hình nào trong app xoá mềm một household. Nếu nó xuất hiện ở
 * đây thì đó là dữ liệu bị hỏng, không phải một yêu cầu xoá; để lại cho người
 * thật xem.
 *
 * ── Vì sao không dùng một câu SQL cho tất cả ──
 *
 * Vì bước gọi R2 nằm giữa. Một hàm plpgsql không gọi được HTTP tới Cloudflare,
 * và đó chính là lý do schema §13 xếp `purge_soft_deleted` vào nhóm "phải là
 * Edge Function" thay vì một job pg_cron thuần SQL.
 */

import { jsonResponse, serviceClient } from '../_shared/client.ts';
import { deleteR2Object, r2ConfigFromEnv } from '../_shared/r2.ts';

/** Retention 30 ngày (schema §3). */
const RETENTION_DAYS = 30;

/**
 * Bảng xoá cứng được, theo thứ tự AN TOÀN.
 *
 * `document_files` đứng đầu vì nó phải xong trước `documents` — cascade từ
 * `documents` sẽ cuốn theo hàng file và mất luôn `r2_key` trước khi kịp gọi R2.
 *
 * Hai bảng cố ý VẮNG MẶT:
 *   - `households` — xem đầu file.
 *   - `task_instances` — không có cột `deleted_at`. Nó là dữ liệu vật hoá do
 *     `generate-task-instances` sinh ra, và xoá một việc lặp thì cascade cuốn
 *     theo mọi instance của nó.
 */
const TABLES = [
  'document_files',
  'documents',
  'tasks',
  'events',
  'assets',
  'debts',
  'upcoming_payments',
  'goals',
  'members',
] as const;

Deno.serve(async () => {
  const supabase = serviceClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const cfg = r2ConfigFromEnv();

  const purged: Record<string, number> = {};
  let r2Deleted = 0;
  let r2Skipped = 0;

  // ── Bước 1: file trên R2 (xem đầu file về thứ tự) ──
  const { data: staleFiles, error: staleError } = await supabase
    .from('document_files')
    .select('id, r2_key, thumb_key')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);

  if (staleError) return jsonResponse({ error: staleError.message }, 500);

  for (const file of staleFiles ?? []) {
    if (!cfg) {
      // Chưa cấu hình R2: KHÔNG xoá hàng DB. Xoá đi là mất key vĩnh viễn cho
      // một object có thể đang tồn tại. Bỏ qua và chờ lần chạy sau khi đã có key.
      r2Skipped += 1;
      continue;
    }
    await deleteR2Object(cfg, file.r2_key as string);
    const thumbKey = file.thumb_key as string | null;
    if (thumbKey) await deleteR2Object(cfg, thumbKey);
    r2Deleted += 1;
  }

  // ── Bước 2: hàng DB ──
  for (const table of TABLES) {
    // R2 chưa cấu hình thì bỏ qua `document_files` — bước 1 chưa xoá được gì.
    if (table === 'document_files' && !cfg) {
      purged[table] = 0;
      continue;
    }

    const { data, error } = await supabase
      .from(table)
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff)
      .select('id');

    if (error) return jsonResponse({ error: `${table}: ${error.message}` }, 500);
    purged[table] = (data ?? []).length;
  }

  return jsonResponse({ purged, r2Deleted, r2Skipped, cutoff });
});
