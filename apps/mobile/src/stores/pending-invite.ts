/**
 * Mã mời đang chờ, GIỮ QUA vòng đăng nhập — F2, luồng sống-còn (05 §9).
 *
 * Đây là chỗ luồng F2 dễ gãy nhất, và nó gãy im lặng:
 *
 *   B chạm `family://join/K7M2PQ` khi chưa đăng nhập
 *     → route `(auth)/join/[code]` mở ra, đọc được mã
 *     → nhưng B chưa có phiên, gate ở `app/_layout.tsx` đẩy sang `sign-in`
 *     → B đăng nhập xong… và mã đã biến mất cùng route bị thay thế.
 *
 * B lúc đó rơi vào màn `setup` với hai nút, phải tự nhớ mã 6 ký tự vừa thấy
 * lướt qua. Spec nói thẳng: "chưa cài app → store → cài → mở → deep link **giữ
 * nguyên**". Giữ nguyên nghĩa là mã phải sống lâu hơn cả vòng đăng nhập lẫn một
 * lần app bị hệ điều hành thu hồi giữa chừng.
 *
 * Vì sao persist xuống đĩa chứ không giữ trong bộ nhớ: giữa lúc B chạm link và
 * lúc B gõ xong mật khẩu có thể có một chuyến đi qua app Mail hoặc Zalo, và
 * Android hoàn toàn có thể giết process ở giữa. Một biến trong RAM không sống
 * qua chuyện đó.
 *
 * Mã tự hết hạn sau 24 giờ. Không có nó thì một mã cũ nằm lại trên máy sẽ kéo
 * người dùng vào màn tham gia mỗi lần họ đăng nhập lại, kể cả nhiều tháng sau.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Mã sống 24 giờ. Đủ cho "cài app rồi mai mở lại", không đủ để thành rác. */
const TTL_MS = 24 * 60 * 60 * 1000;

interface PendingInviteState {
  code: string | null;
  /** Mốc lưu, để biết mã đã cũ chưa. */
  savedAt: number | null;
  setCode: (code: string, now?: number) => void;
  clear: () => void;
}

export const usePendingInvite = create<PendingInviteState>()(
  persist(
    (set) => ({
      code: null,
      savedAt: null,
      setCode: (code, now = Date.now()) => set({ code, savedAt: now }),
      clear: () => set({ code: null, savedAt: null }),
    }),
    {
      name: 'family-organizer.pending-invite',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Mã còn hiệu lực, hoặc `null`.
 *
 * Đọc qua hàm này chứ không đọc thẳng `code`: mã hết hạn vẫn nằm trong store
 * cho tới lần `clear()` kế tiếp, và một chỗ gọi quên kiểm `savedAt` sẽ đưa
 * người dùng tới màn tham gia với một mã chết.
 */
export function readPendingInvite(now: number = Date.now()): string | null {
  const { code, savedAt } = usePendingInvite.getState();
  if (!code || savedAt === null) return null;
  return now - savedAt < TTL_MS ? code : null;
}
