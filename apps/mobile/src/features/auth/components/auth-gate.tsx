/**
 * GATE điều hướng — quyết định người dùng thấy nhánh nào.
 *
 *   chưa đăng nhập            → (auth)/sign-in
 *   đã đăng nhập, chưa có nhà → (auth)/setup  (hoặc join/[code] nếu có mã chờ)
 *   đã có nhà                 → (app)
 *
 * Thứ tự đó quan trọng: người đã đăng nhập bằng Google nhưng chưa tạo nhà mà bị
 * đẩy về sign-in sẽ đăng nhập lại vô hạn.
 *
 * Vì sao nằm ở `features/auth/` chứ không ở `app/_layout.tsx`:
 *
 * Đây là **logic nghiệp vụ**, không phải khai báo route. Nó biết ba nhánh onboarding,
 * biết mã mời phải thắng màn setup, biết lúc nào được ẩn splash. `app/_layout.tsx`
 * chỉ nên trả lời "app có những provider nào" — nạp font, dựng QueryClient, bọc
 * gesture handler. Trộn hai thứ làm file gốc phình lên 176 dòng và không ai biết
 * nên mở nó ra để sửa cái gì.
 *
 * Render `<Slot />`: Expo Router điền màn hình con vào đây theo route hiện tại.
 */

import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useMyHouseholds, useRestoreSession } from '@/features/auth/queries/use-auth';
import { useResumeUploads } from '@/features/document/queries/use-upload-queue';
import { useCaptureInviteCode } from '@/features/invite/queries/use-capture-invite-code';
import { readPendingInvite } from '@/stores/pending-invite';
import { useSessionStore } from '@/stores/session';

export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isRestoring, householdId, setHousehold } = useSessionStore();

  // Khôi phục phiên + theo dõi đăng nhập/đăng xuất ở MỘT chỗ.
  useRestoreSession();

  const { data: households, isPending: householdsPending } = useMyHouseholds();

  // Người dùng ở đúng MỘT nhà thì vào thẳng. Nhiều nhà là chuyện của bản sau
  // (05 §9 chỉ có một hộ gia đình mỗi tài khoản trong MVP) — lấy cái đầu tiên.
  useEffect(() => {
    const first = households?.[0];
    if (first) {
      setHousehold({ id: first.householdId, name: first.householdName, memberId: first.memberId });
    }
  }, [households, setHousehold]);

  const firstHousehold = households?.[0];
  const effectiveHouseholdId = householdId ?? firstHousehold?.householdId ?? null;
  const isReady = !isRestoring && (!session || !householdsPending);

  useCaptureInviteCode();

  // File còn dang dở từ lần mở app trước — chạy tiếp sau khi ĐÃ có phiên và có
  // nhà. Chạy sớm hơn thì pha 1 và pha 3 gọi Edge mà chưa có JWT, và mọi mục
  // đang chờ lập tức `failed`: người dùng mở app lên thấy tám file báo lỗi cho
  // một việc chưa kịp bắt đầu.
  useResumeUploads(isReady && session !== null && effectiveHouseholdId !== null);

  const path: string[] = segments;
  const inAuth = path[0] === '(auth)';
  const atRoot = path.length === 0;
  const inJoin = path[1] === 'join';

  useEffect(() => {
    if (!isReady) return;
    // Chờ biết có nhà hay không rồi mới điều hướng — điều hướng sớm sẽ đẩy
    // người đã có nhà sang màn setup rồi mới giật ngược lại.

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }
    if (!effectiveHouseholdId) {
      // Mã mời còn hiệu lực thì đi thẳng vào màn tham gia, KHÔNG qua setup.
      // Đây là mấu chốt của F2: B chạm deep link lúc chưa đăng nhập bị đẩy sang
      // sign-in, và không có nhánh này thì đăng nhập xong B rơi vào setup với
      // hai nút, phải tự nhớ mã 6 ký tự vừa lướt qua.
      if (inJoin) return;
      const pending = readPendingInvite();
      // Dạng object chứ không phải chuỗi nối: `typedRoutes` chỉ chấp nhận dạng
      // này cho route động, và nó cũng tự escape giá trị thay vì ghép thô.
      router.replace(
        pending ? { pathname: '/(auth)/join/[code]', params: { code: pending } } : '/(auth)/setup',
      );
      return;
    }
    if (inAuth || atRoot) router.replace('/(app)/home');
  }, [isReady, session, effectiveHouseholdId, inAuth, atRoot, inJoin, router]);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.warn('[bootstrap] Không thể ẩn splash screen:', error);
      });
    }
  }, [isReady]);

  /**
   * Được phép render `<Slot />` chưa?
   *
   * `useEffect` điều hướng chạy SAU khi cây con đã render xong một lần. Nên nếu
   * ở đây render vô điều kiện, người mở app thẳng vào `/(app)/home` sẽ dựng
   * `HomeScreen` → `useTasks()` → `useHouseholdId()` NÉM, trước khi effect kịp
   * đẩy họ sang `(auth)/setup`. Đó không phải lỗi của `useHouseholdId` — nó
   * đang báo đúng: có màn hình lọt ra ngoài gate.
   *
   * Hai khoảng hở đều thật:
   *   - chưa xong khôi phục phiên / `my_households` còn pending → chưa biết có nhà
   *   - có phiên nhưng chưa có nhà (vừa đăng ký xong) → `(app)` không được dựng
   *
   * Quy về đúng một câu hỏi: **đã có nhà chưa**. Chưa có (dù chưa đăng nhập hay
   * đã đăng nhập mà chưa lập/tham gia) thì chỉ `(auth)` được dựng; có rồi thì
   * `(auth)` và route rỗng là hai chỗ effect sắp rời đi, nên cũng không dựng.
   */
  const hasHousehold = session !== null && effectiveHouseholdId !== null;
  const canRender = isReady && (hasHousehold ? !inAuth && !atRoot : inAuth);

  // Splash vẫn đang phủ kín màn hình lúc `isReady` còn false, nên `null` ở đây
  // không tạo ra một khoảnh khắc trắng — nó chỉ ngăn cây con dựng quá sớm.
  if (!canRender) return null;

  return <Slot />;
}
