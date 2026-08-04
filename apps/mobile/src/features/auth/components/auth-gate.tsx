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
 * Render `<Stack>`: Expo Router điền màn hình con vào đây theo route hiện tại.
 * Phải là `Stack` chứ không `Slot` vì đây cũng là cấp mà `(modals)` được present
 * như bottom sheet — xem chú thích ở chỗ return.
 */

import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
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

  /**
   * Hai bước onboarding chạy KHI NHÀ ĐÃ TỒN TẠI (05 §3.3, §3.4): ngưỡng ghi và
   * gói khởi tạo. Chúng nằm trong `(auth)` mà `effectiveHouseholdId` đã có, nên
   * cả effect điều hướng lẫn `canRender` đều coi chúng là "đã có nhà mà còn ở
   * `(auth)`" và đá ra — không có lỗi nào để nhìn thấy, chỉ là một bước
   * onboarding im lặng biến mất. Đó đúng là chuyện đã xảy ra với `threshold` ở
   * G12; giữ hai bước trong MỘT danh sách để bước thứ ba thêm vào sau không
   * phải phát hiện lại bài học đó.
   */
  const POST_HOUSEHOLD_STEPS = ['threshold', 'seed'];
  const inPostHouseholdStep = POST_HOUSEHOLD_STEPS.includes(path[1] ?? '');

  /**
   * `(modals)` KHÔNG được coi là rời khỏi `(app)`.
   *
   * Sheet đẩy lên trên màn hình đang đứng chứ không thay thế nó, nhưng
   * `segments` vẫn đổi thành `['(modals)', …]` — và mọi giá trị dẫn xuất ở trên
   * đổi theo, làm gate render lại cả cây `(app)` (HomeScreen + toàn bộ query của
   * nó) đúng lúc sheet cần JS thread để trượt lên. Đó là nửa giây khựng khi mở
   * form từ menu [+].
   *
   * Giữ nguyên trạng thái gate trong lúc modal mở: nó là lớp phủ, không phải một
   * nhánh onboarding khác.
   */
  const inModal = path[0] === '(modals)';

  useEffect(() => {
    if (!isReady) return;
    // Modal là lớp phủ trên màn hình đang đứng — không có quyết định điều hướng
    // nào ở đây, và chạy lại nhánh dưới trong lúc sheet đang mở chỉ tốn một lượt
    // trên JS thread mà sheet đang cần.
    if (inModal) return;
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
    // Xem chú thích ở `POST_HOUSEHOLD_STEPS`: thiếu ngoại lệ này thì màn hình
    // bị đẩy về `home` ngay trong khung hình đầu tiên và người tạo nhà không
    // bao giờ thấy các bước đó.
    if (inPostHouseholdStep) return;
    if (inAuth || atRoot) router.replace('/(app)/(tabs)/home');
  }, [
    isReady,
    session,
    effectiveHouseholdId,
    inAuth,
    atRoot,
    inJoin,
    inPostHouseholdStep,
    inModal,
    router,
  ]);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.warn('[bootstrap] Không thể ẩn splash screen:', error);
      });
    }
  }, [isReady]);

  /**
   * Được phép render cây con chưa?
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
  // `inModal` đi cùng nhánh có nhà: modal chỉ mở được từ trong `(app)`, nên tới
  // được đây là đã qua gate rồi. Nói tường minh để lần sau siết điều kiện không
  // vô tình chặn mất cây đang có sheet nằm trên.
  //
  // `inPostHouseholdStep` cũng vậy nhưng vì lý do khác: đó là những bước
  // onboarding chạy khi nhà đã tồn tại (05 §3.3, §3.4). Không có nó ở đây thì
  // effect ở trên cho phép ở lại route, còn chỗ này lại trả `null` — màn hình
  // trắng, không lỗi.
  const canRender =
    isReady && (hasHousehold ? inModal || inPostHouseholdStep || (!inAuth && !atRoot) : inAuth);

  // Splash vẫn đang phủ kín màn hình lúc `isReady` còn false, nên `null` ở đây
  // không tạo ra một khoảnh khắc trắng — nó chỉ ngăn cây con dựng quá sớm.
  if (!canRender) return null;

  /**
   * `Stack` chứ không `Slot` — đây là chỗ `(modals)` được present như sheet.
   *
   * `Slot` render route con mà KHÔNG tạo navigator. Ba nhóm `(app)`, `(auth)`,
   * `(modals)` là anh em cùng cấp, nên không có navigator ở cấp này thì không có
   * gì đọc `presentation` của chúng: `(modals)` bị dựng như một màn hình thường,
   * phủ kín màn hình. `presentation: 'formSheet'` khai trong `(modals)/_layout.tsx`
   * chỉ áp cho các route BÊN TRONG nhóm đó, không áp cho chính nhóm lúc nó được
   * đẩy lên — đó là lý do sheet vẫn fullscreen dù đã ghim detent.
   */
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="(modals)"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.7],
          sheetGrabberVisible: true,
          // Cùng bán kính với `rounded-status` của Card (04 §6): sheet đọc như
          // một thẻ lớn trượt lên, không phải cửa sổ của hệ điều hành khác.
          sheetCornerRadius: 24,
        }}
      />
    </Stack>
  );
}
