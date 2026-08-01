/**
 * Hiện thực IngestRepository.
 */

import { AppErrorException, type AppError, type IngestDraft } from '@family-organizer/domain';

import { toAppError, unwrapMaybe, unwrapVoid } from '@/data/shared/errors';
import { toIngestDraft } from '@/data/shared/mappers';
import type { IngestDraftRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type {
  CaptureUsage,
  IngestRepository,
  SubmitCaptureInput,
} from './ingest-repository.interface';

interface EdgeErrorBody {
  error?: string;
  detail?: AppError;
}

/**
 * Gọi `parse-capture` và dịch lỗi thành `AppError`.
 *
 * Cùng lý do với `invokeEdge` ở document-repository: `functions.invoke` KHÔNG
 * ném khi server trả 4xx, nên không mở thân response ra thì `premium_required`
 * — thứ duy nhất ở đây có đường đi riêng (mở paywall) — rơi xuống `unknown` và
 * người dùng nhận "Thử lại giúp mình nhé" cho một việc thử lại bao nhiêu lần
 * cũng không xong.
 *
 * KHÔNG gom chung với hàm ở document-repository: hai chỗ dịch hai tập lỗi khác
 * nhau (`ai_capture` vs `document_files`), và một hàm chung sẽ cần một tham số
 * `feature` chỉ để phân biệt — lúc đó nó là hai hàm mặc một cái áo.
 */
async function invokeParseCapture(body: Record<string, unknown>): Promise<{ draft: IngestDraftRow }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ draft: IngestDraftRow }>(
      'parse-capture',
      { body },
    );
    if (error) {
      const res = (error as { context?: Response }).context;
      if (res) {
        const parsed = (await res.json().catch(() => null)) as EdgeErrorBody | null;
        if (parsed?.detail) throw new AppErrorException(parsed.detail);
        if (parsed?.error === 'auth') throw new AppErrorException({ kind: 'auth' });
        if (parsed?.error === 'not_found') throw new AppErrorException({ kind: 'not_found' });
        if (parsed?.error === 'premium_required') {
          throw new AppErrorException({ kind: 'premium_required', feature: 'ai_capture' });
        }
        if (parsed?.error) {
          // `capture_not_configured`, `bad_request`, `text_too_long` — giữ
          // nguyên chuỗi trong `message` để UI phân biệt được "chưa bật" với
          // "hết lượt", và để log còn đọc được.
          throw new AppErrorException({ kind: 'conflict', message: parsed.error });
        }
      }
      throw new AppErrorException(toAppError(error));
    }
    if (data === null) throw new AppErrorException({ kind: 'unknown', cause: null });
    return data;
  } catch (e) {
    if (e instanceof AppErrorException) throw e;
    throw new AppErrorException(toAppError(e));
  }
}

/** Mốc đầu tháng dương hiện tại — phải KHỚP cách Edge đếm, nếu không hai con số lệch nhau. */
function monthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export const ingestRepository: IngestRepository = {
  async submit(hh, input: SubmitCaptureInput) {
    const { draft } = await invokeParseCapture({
      householdId: hh,
      source: input.source,
      text: input.text,
      imagePath: input.imagePath,
    });
    return toIngestDraft(draft);
  },

  async get(hh, id) {
    const row = await unwrapMaybe(
      supabase
        .from('ingest_drafts')
        .select('*')
        .eq('household_id', hh)
        .eq('id', id)
        .maybeSingle(),
    );
    return row ? toIngestDraft(row) : null;
  },

  async discard(hh, id) {
    // Đổi `status`, KHÔNG xoá hàng: dòng này còn là bằng chứng một suất quota
    // đã tiêu. Xoá đi thì người dùng bỏ năm bản nháp liên tiếp sẽ được đếm lại
    // từ đầu, và mỗi lần bỏ vẫn là một lần đã trả tiền model.
    await unwrapVoid(
      supabase
        .from('ingest_drafts')
        .update({ status: 'discarded' })
        .eq('household_id', hh)
        .eq('id', id),
    );
  },

  async confirm(hh, id, createdEntityId) {
    await unwrapVoid(
      supabase
        .from('ingest_drafts')
        .update({ status: 'confirmed', created_entity_id: createdEntityId })
        .eq('household_id', hh)
        .eq('id', id),
    );
  },

  async usage(hh) {
    // Đếm MỌI bản nháp trong tháng, không lọc theo `status`: một nháp bị bỏ
    // vẫn đã tốn một lần gọi model. Lọc `status = 'confirmed'` ở đây sẽ khiến
    // con số client hiện ra không khớp với con số Edge dùng để chặn, và người
    // dùng thấy "còn 3 lượt" rồi bị từ chối.
    const { count, error } = await supabase
      .from('ingest_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', hh)
      .gte('created_at', monthStartISO());
    if (error) throw new AppErrorException(toAppError(error));
    return { usedThisMonth: count ?? 0 } satisfies CaptureUsage;
  },
};

export type { IngestDraft };
