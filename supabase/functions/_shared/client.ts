/**
 * Client dùng chung cho các Edge Function.
 *
 * Dùng SERVICE ROLE: các function ở đây là cron chạy cho MỌI nhà, không thay
 * mặt một người dùng nào, nên RLS theo `auth.uid()` sẽ chặn sạch. Bù lại,
 * service role bỏ qua RLS hoàn toàn — nghĩa là mọi câu truy vấn trong các
 * function này phải TỰ lọc `household_id`, không có lưới an toàn nào phía dưới.
 *
 * NGOẠI LỆ: `presign-upload` và `confirm-upload` chạy THAY MẶT một người dùng
 * thật (client gọi thẳng, không phải cron) — chúng dùng `userClient` ở dưới để
 * RLS vẫn là lưới an toàn. Xem ghi chú ở đó.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client mang theo JWT của người gọi — RLS còn nguyên hiệu lực.
 *
 * Dùng cho function client gọi thẳng (`presign-upload`, `confirm-upload`). Ở
 * đó service role là lựa chọn SAI: hai function này nhận `documentId` từ thân
 * request, và với service role thì một id của nhà khác cũng đọc được. Đi qua
 * JWT nghĩa là câu truy vấn tự trả về rỗng nếu người gọi không thuộc nhà đó —
 * đúng thứ RLS sinh ra để làm, và không phải nhớ lọc bằng tay ở từng câu.
 *
 * Trả `null` khi thiếu header: chưa đăng nhập thì không có gì để làm tiếp.
 */
export function userClient(req: Request): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization');
  if (!url || !anon || !authorization) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ngày hôm nay ở UTC+7 — cùng quy ước với `apps/mobile/src/lib/today.ts`. */
export function todayInVN(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 7 * 60 * 60_000);
  const y = String(shifted.getUTCFullYear()).padStart(4, '0');
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
