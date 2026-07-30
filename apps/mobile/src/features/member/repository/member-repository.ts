/**
 * Hiện thực MemberRepository.
 */

import { supabase } from '@/lib/supabase';
import type { MemberRow } from '@/lib/database.types';
import { unwrap, unwrapMaybe } from '@/data/shared/errors';
import { toMember } from '@/data/shared/mappers';
import { currentProfileId } from '@/data/shared/session';
import type { MemberRepository } from './member-repository.interface';

export const memberRepository: MemberRepository = {
  async list(hh) {
    const rows = await unwrap<MemberRow[]>(
      supabase
        .from('members')
        .select('*')
        .eq('household_id', hh)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('joined_at', { ascending: true }),
    );
    return rows.map(toMember);
  },

  async create(hh, input) {
    const row = await unwrap<MemberRow>(
      supabase
        .from('members')
        .insert({
          household_id: hh,
          display_name: input.displayName,
          role: input.role,
          birthday: input.birthday,
        })
        .select()
        .single(),
    );
    return toMember(row);
  },

  async update(hh, id, patch) {
    const row = await unwrap<MemberRow>(
      supabase
        .from('members')
        .update({
          ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
          ...(patch.role !== undefined ? { role: patch.role } : {}),
          ...(patch.birthday !== undefined ? { birthday: patch.birthday } : {}),
        })
        .eq('id', id)
        .eq('household_id', hh)
        .select()
        .single(),
    );
    return toMember(row);
  },

  async me(hh) {
    const profileId = await currentProfileId();
    const row = await unwrapMaybe<MemberRow>(
      supabase
        .from('members')
        .select('*')
        .eq('household_id', hh)
        .eq('profile_id', profileId)
        .is('deleted_at', null)
        .single(),
    );
    return row ? toMember(row) : null;
  },
};
