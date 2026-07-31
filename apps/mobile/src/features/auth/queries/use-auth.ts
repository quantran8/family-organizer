/**
 * Hook Đăng nhập và khởi tạo.
 *
 * Cố ý KHÔNG dùng `useHouseholdId`: mọi thứ ở đây chạy TRƯỚC khi có nhà.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { householdScope } from '@/data/queries/keys';
import { authRepository } from '@/features/auth/repository';
import { clearProfileCache } from '@/data/shared/session';
import { useSessionStore } from '@/stores/session';

/**
 * Khôi phục phiên lúc mở app + theo dõi đăng nhập/đăng xuất suốt vòng đời.
 *
 * KHÔNG phải `useQuery`, và đó là lý do nó từng nằm thẳng trong
 * `app/_layout.tsx`: đây là một subscription dài hạn với `getSession()` chạy
 * một lần, không phải dữ liệu có cache và refetch.
 *
 * Nhưng để nó ở tầng route nghĩa là UI gọi thẳng `authRepository` — đúng thứ
 * ranh giới 01 §2 cấm. Nó lọt suốt từ G3 vì luật lint cũ trỏ vào
 * `data/repositories/`, một thư mục chưa bao giờ tồn tại. Đưa về đây thì
 * `app/_layout.tsx` chỉ còn gọi hook như mọi màn hình khác, và hàng rào lint
 * lại có nghĩa.
 *
 * Gọi ĐÚNG MỘT LẦN, ở gate gốc. Gọi hai chỗ sẽ đăng ký hai listener và mỗi lần
 * đổi phiên sẽ `setSession` hai lần.
 */
export function useRestoreSession(): void {
  const setSession = useSessionStore((s) => s.setSession);
  const setRestored = useSessionStore((s) => s.setRestored);

  useEffect(() => {
    let active = true;

    void authRepository
      .getSession()
      .then((s) => {
        if (active) setSession(s);
      })
      .catch((error: unknown) => {
        // AsyncStorage/session hỏng không được giữ người dùng ở splash mãi.
        // Xem như chưa đăng nhập; màn sign-in vẫn cho họ phục hồi bình thường.
        console.warn('[bootstrap] Không thể khôi phục phiên đăng nhập:', error);
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setRestored();
      });

    const unsubscribe = authRepository.onAuthStateChange((s) => {
      setSession(s);
      setRestored();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSession, setRestored]);
}

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
