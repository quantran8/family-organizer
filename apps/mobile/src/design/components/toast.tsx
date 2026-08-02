/**
 * Toast xác nhận — "Đã cập nhật", "Đã ghi khoản đã trả".
 *
 * Khác `UndoToast`: cái kia có một nút và một cửa sổ 5 giây để rút lại thao
 * tác; cái này KHÔNG có nút nào. Nó chỉ đóng một vòng: nút tên "Lưu cập nhật"
 * sinh ra "Đã cập nhật" (04 §7 — giữ nguyên tên việc suốt luồng).
 *
 * Vì sao cần dù kết quả đã hiện ngay trên màn hình: nghi thức cập nhật là một
 * modal, và nó ĐÓNG sau khi lưu. Người dùng quay về đúng màn hình họ vừa rời
 * đi, nơi bốn con số cần một nhịp để refetch. Trong nhịp đó, thao tác thành
 * công và thao tác bị nuốt mất trông giống hệt nhau.
 *
 * Nguồn câu chữ là `useToastStore` chứ không phải prop: chỗ GỌI nằm trong modal
 * vừa bị gỡ, chỗ HIỆN nằm ở màn hình phía dưới. Xem `stores/toast.ts`.
 *
 * Tự tắt sau 2 giây và KHÔNG chặn thao tác gì phía dưới (`pointerEvents="none"`)
 * — một lời xác nhận không được phép cản đường việc tiếp theo.
 */

import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useToastStore } from '@/stores/toast';

/** Đủ đọc một câu ngắn, chưa đủ để thành vật cản. */
const TOAST_MS = 2000;

/**
 * Đặt MỘT lần ở mỗi màn hình nhận xác nhận.
 *
 * Không đặt ở `(app)/_layout.tsx` cho tiện: tab bar nằm ngoài vùng an toàn của
 * từng màn, và một toast neo ở đó sẽ đè lên tab bar trên máy có notch.
 */
export function Toast() {
  const message = useToastStore((s) => s.message);
  const nonce = useToastStore((s) => s.nonce);
  const clear = useToastStore((s) => s.clear);

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(clear, TOAST_MS);
    return () => clearTimeout(timer);
    // `nonce` trong deps: cùng một câu hiện hai lần liên tiếp phải đặt lại đồng
    // hồ, mà `message` lúc đó không đổi nên effect sẽ không chạy lại nếu thiếu nó.
  }, [message, nonce, clear]);

  if (message === null) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-4 bottom-6 items-center rounded-control bg-ink px-4 py-3"
    >
      {/* `accessibilityLiveRegion`: trình đọc màn hình đọc lên mà KHÔNG chuyển
          tiêu điểm — chuyển tiêu điểm sang thứ sắp biến mất sau 2 giây là cách
          chắc chắn để người dùng mất chỗ đang đứng. */}
      <Text accessibilityLiveRegion="polite" className="text-label text-on-action">
        {message}
      </Text>
    </View>
  );
}
