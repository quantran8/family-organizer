/**
 * Hook Mời người thứ hai — F2, luồng SỐNG-CÒN (05 §9).
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/data/queries/keys';
import { inviteRepository } from '@/features/invite/repository';
import { useHouseholdId } from '@/stores/session';

/**
 * Mã đang mở, tạo mới nếu chưa có.
 *
 * `staleTime: Infinity` — mã không tự đổi, và refetch giữa lúc người dùng đang
 * đọc nó cho vợ/chồng nghe qua điện thoại là cách chắc chắn để họ đọc nhầm.
 */
export function useInviteCode() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.invite.currentCode(hh),
    queryFn: () => inviteRepository.currentCode(hh),
    staleTime: Infinity,
  });
}

/**
 * Đổi mã lấy household — dùng ở `(auth)/join/[code]`.
 *
 * KHÔNG dùng `useHouseholdId` ở đây: lúc gọi thì người dùng chưa thuộc nhà nào,
 * đó chính là điều họ đang cố sửa. Hook này cố ý nằm ngoài phạm vi household.
 */
export function useRedeemInvite() {
  return useMutation({
    mutationFn: (v: { code: string; displayName: string }) =>
      inviteRepository.redeem(v.code, v.displayName),
  });
}
