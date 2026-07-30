/**
 * Client dùng chung cho các Edge Function.
 *
 * Dùng SERVICE ROLE: các function ở đây là cron chạy cho MỌI nhà, không thay
 * mặt một người dùng nào, nên RLS theo `auth.uid()` sẽ chặn sạch. Bù lại,
 * service role bỏ qua RLS hoàn toàn — nghĩa là mọi câu truy vấn trong các
 * function này phải TỰ lọc `household_id`, không có lưới an toàn nào phía dưới.
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
