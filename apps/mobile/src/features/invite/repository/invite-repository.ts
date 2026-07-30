/**
 * Hiện thực InviteRepository.
 */

import { AppErrorException } from '@nhaminh/domain';

import { throwAppError, unwrap, unwrapMaybe } from '@/data/shared/errors';
import { currentProfileId } from '@/data/shared/session';
import type { InviteRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { InviteRepository } from './invite-repository.interface';

/** Bỏ 0 O 1 I — dễ đọc nhầm khi đọc mã qua điện thoại (01 §8). */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const CODE_LENGTH = 6;

function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Chuẩn hoá mã người dùng gõ: tự viết hoa, bỏ khoảng trắng (05 §3.2). */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase().slice(0, CODE_LENGTH);
}

export const inviteRepository: InviteRepository = {
  async currentCode(hh) {
    const existing = await unwrapMaybe<InviteRow>(
      supabase
        .from('invites')
        .select('*')
        .eq('household_id', hh)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    if (existing) return existing.code;

    const invitedBy = await currentProfileId();

    // 32^6 ≈ 1 tỷ tổ hợp nên va chạm gần như không xảy ra, nhưng `code` là
    // unique nên vẫn thử lại vài lần cho chắc.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const row = await unwrap<InviteRow>(
          supabase
            .from('invites')
            .insert({ household_id: hh, code: generateCode(), invited_by: invitedBy })
            .select()
            .single(),
        );
        return row.code;
      } catch (e) {
        if (e instanceof AppErrorException && e.error.kind === 'conflict') continue;
        throw e;
      }
    }
    throw new AppErrorException({ kind: 'unknown', cause: 'không tạo được mã mời' });
  },

  async redeem(code, displayName) {
    try {
      const { data, error } = await supabase.rpc('redeem_invite', {
        p_code: normalizeInviteCode(code),
        p_display_name: displayName.trim(),
      });
      if (error) throwAppError(error);
      if (!data) throw new AppErrorException({ kind: 'not_found' });
      return data as string;
    } catch (e) {
      throwAppError(e);
    }
  },
};
