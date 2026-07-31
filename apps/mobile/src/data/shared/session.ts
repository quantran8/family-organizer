/**
 * `profiles.id` của người đang đăng nhập.
 *
 * Mọi bảng dữ liệu đều có `created_by references profiles(id)`, nên gần như mọi
 * lệnh INSERT cần giá trị này. Cache trong bộ nhớ: nó không đổi trong suốt một
 * phiên, và một lượt round-trip cho mỗi lần tạo bản ghi là lãng phí thấy rõ.
 */

import { AppErrorException, type UUID } from '@family-organizer/domain';

import { supabase } from '@/lib/supabase';
import { unwrap } from './errors';

let cached: { authUserId: string; profileId: UUID } | null = null;

export async function currentProfileId(): Promise<UUID> {
  const { data: auth } = await supabase.auth.getUser();
  const authUserId = auth.user?.id;
  if (!authUserId) throw new AppErrorException({ kind: 'auth' });

  if (cached?.authUserId === authUserId) return cached.profileId;

  const row = await unwrap<{ id: string }>(
    supabase.from('profiles').select('id').eq('auth_user_id', authUserId).single(),
  );
  cached = { authUserId, profileId: row.id };
  return row.id;
}

/** Gọi khi đăng xuất — phiên sau là người khác. */
export function clearProfileCache(): void {
  cached = null;
}
