/**
 * Hook Thành viên.
 *
 * Thành viên KHÔNG nhất thiết có tài khoản: con nhỏ, bố mẹ hai bên là member
 * nhưng `profile_id = null` (schema §1). Đừng lọc bỏ họ ở bất cứ danh sách nào —
 * "giỗ ông nội" cần ông nội là một member để gắn, dù ông không dùng app.
 */

import type { UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { memberRepository, type MemberInput } from '@/features/member/repository';
import { useHouseholdId } from '@/stores/session';

export function useMembers() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.members.list(hh),
    queryFn: () => memberRepository.list(hh),
    // Danh sách thành viên gần như không đổi; refetch mỗi phút là lãng phí.
    staleTime: 10 * 60_000,
  });
}

/** Member ứng với người đang đăng nhập — dùng cho "ai vừa làm việc này". */
export function useMe() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.members.me(hh),
    queryFn: () => memberRepository.me(hh),
    staleTime: 10 * 60_000,
  });
}

export function useCreateMember() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => memberRepository.create(hh, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.members.all(hh) }),
  });
}

export function useUpdateMember() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<MemberInput> }) =>
      memberRepository.update(hh, id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.members.all(hh) }),
  });
}
