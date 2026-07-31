/**
 * Hiện thực InviteRepository.
 */

import { AppErrorException } from '@family-organizer/domain';

import { throwAppError, unwrap, unwrapMaybe } from '@/data/shared/errors';
import { currentProfileId } from '@/data/shared/session';
import { generateInviteCode, normalizeInviteCode } from '@/features/invite/code';
import type { InviteRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { InviteRepository } from './invite-repository.interface';

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
            .insert({ household_id: hh, code: generateInviteCode(), invited_by: invitedBy })
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
