/**
 * Hook Đăng nhập và khởi tạo.
 *
 * Cố ý KHÔNG dùng `useHouseholdId`: mọi thứ ở đây chạy TRƯỚC khi có nhà.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { householdScope } from '@/data/queries/keys';
import { authRepository } from '@/features/auth/repository';
import { clearProfileCache } from '@/data/shared/session';
import { useSessionStore } from '@/stores/session';

/** Danh sách nhà — gate ở `app/_layout.tsx` dùng để quyết định đi đâu. */
export function useMyHouseholds() {
  const session = useSessionStore((s) => s.session);
  return useQuery({
    queryKey: ['my-households', session?.user.id ?? null],
    queryFn: () => authRepository.myHouseholds(),
    enabled: session !== null,
    staleTime: 5 * 60_000,
  });
}

/**
 * MỘT nút `[Tiếp tục]` duy nhất: email chưa tồn tại thì tự chuyển sang đăng ký.
 * Người dùng không phải tự biết mình đã có tài khoản hay chưa — đó là thứ app
 * biết được, không phải họ.
 */
export function useSignInWithPassword() {
  return useMutation({
    mutationFn: (v: { email: string; password: string }) =>
      authRepository.signInOrSignUpWithPassword(v.email, v.password),
  });
}

export function useSignInWithIdToken() {
  return useMutation({
    mutationFn: (v: { provider: 'google' | 'apple'; idToken: string; nonce?: string }) =>
      authRepository.signInWithIdToken(v.provider, v.idToken, v.nonce),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (v: { email: string; redirectTo: string }) =>
      authRepository.resetPassword(v.email, v.redirectTo),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string) => authRepository.updatePassword(password),
  });
}

/** Tạo nhà mới + member cho chính mình, MỘT transaction (RPC `create_household`). */
export function useCreateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { displayName: string; householdName?: string }) =>
      authRepository.createHousehold(v.displayName, v.householdName),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-households'] }),
  });
}

/**
 * Đăng xuất.
 *
 * Xoá SẠCH cache của nhà cũ, không chỉ reset store. Nếu người khác đăng nhập
 * trên cùng máy mà cache còn, họ sẽ thấy tiền của gia đình trước trong khoảnh
 * khắc trước khi refetch xong — đây chính là lý do mọi query key bắt đầu bằng
 * `['hh', householdId]`.
 */
export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authRepository.signOut(),
    onSuccess: () => {
      // Đọc state lúc CHẠY, không lúc render: người dùng có thể đã đổi nhà kể
      // từ lần render cuối, và lúc đó ta sẽ xoá cache của nhà sai.
      const { householdId, clear } = useSessionStore.getState();
      if (householdId) qc.removeQueries({ queryKey: householdScope(householdId) });
      qc.removeQueries({ queryKey: ['my-households'] });
      clearProfileCache();
      clear();
    },
  });
}
