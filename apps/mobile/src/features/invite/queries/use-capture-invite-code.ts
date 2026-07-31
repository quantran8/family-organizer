/**
 * Bắt mã mời từ deep link và cất vào store — F2, luồng sống-còn.
 *
 * Phải nghe HAI nguồn, và thiếu một cái là hỏng một nửa số ca:
 *   - `getInitialURL()`: app chưa chạy, link khởi động nó. Đây là ca chính của
 *     F2 ("chưa cài app → store → cài → mở").
 *   - `addEventListener`: app đang chạy nền, link đưa nó lên trước.
 *
 * Cất vào store NGAY tại đây, trước cả khi biết B đã đăng nhập hay chưa: mã
 * phải sống lâu hơn cú `router.replace` sang sign-in mà gate sắp thực hiện.
 *
 * Nằm ở `features/invite/` chứ không ở `app/_layout.tsx`: nó là nghiệp vụ của
 * lời mời (biết mã dài mấy ký tự, chuẩn hoá thế nào, cất ở đâu), không phải
 * khai báo route. Gate chỉ gọi nó một dòng.
 */

import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { CODE_LENGTH, normalizeInviteCode } from '@/features/invite/code';
import { usePendingInvite } from '@/stores/pending-invite';

export function useCaptureInviteCode(): void {
  const setPendingInvite = usePendingInvite((s) => s.setCode);

  useEffect(() => {
    const capture = (url: string | null): void => {
      if (!url) return;
      // `family://join/K7M2PQ` — `expo-linking` bóc scheme, phần còn lại là
      // `join/K7M2PQ`. Bắt cả dạng có `/` thừa và query string ở đuôi.
      const match = /(?:^|\/)join\/([^/?#]+)/i.exec(url);
      const raw = match?.[1];
      if (!raw) return;
      const code = normalizeInviteCode(decodeURIComponent(raw));
      if (code.length === CODE_LENGTH) setPendingInvite(code);
    };

    void Linking.getInitialURL()
      .then(capture)
      .catch((error: unknown) => {
        console.warn('[deep-link] Không đọc được URL khởi động:', error);
      });

    const sub = Linking.addEventListener('url', ({ url }) => capture(url));
    return () => sub.remove();
  }, [setPendingInvite]);
}
