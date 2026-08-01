/**
 * Hoãn việc bật bàn phím trong sheet cho tới khi sheet trượt xong.
 *
 * Vì sao không dùng thẳng `autoFocus` như một form thường:
 *
 * Trên iOS, `autoFocus` bên trong một `formSheet` yêu cầu bàn phím bật lên ngay
 * ở khung hình đầu tiên — tức CÙNG LÚC sheet đang chạy animation trượt lên. Hai
 * chuyển động native tranh nhau, và hệ thống chọn cách trì hoãn presentation cho
 * tới khi bàn phím ổn định. Người dùng thấy: chạm một mục ở menu [+], màn hình
 * đứng im khoảng nửa giây, rồi sheet mới bung ra.
 *
 * Đây là độ trễ ở tầng native, nên không chữa được từ JS thread — dời việc bật
 * bàn phím ra sau khi sheet đã yên chỗ mới là cách chữa đúng.
 *
 * Trả về `ref` chứ không phải một cờ để gán vào `autoFocus`: `autoFocus` chỉ có
 * tác dụng ở lần mount đầu tiên, nên đổi nó thành `true` sau đó không bật được
 * bàn phím. Phải gọi `.focus()` tường minh.
 *
 * `Sheet` không tự làm được việc này: ô nhập nằm trong `children`, mà `children`
 * là `ReactNode` đã dựng xong. Nên hook nằm ở đây và mỗi form tự gắn `ref` vào ô
 * nhập đầu tiên của nó.
 */

import { useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';

/**
 * Sheet trượt lên trong `300–340ms` (design.md §14). Chờ dư một nhịp để bàn phím
 * không chen vào phần đuôi của animation — con số dư này rẻ hơn nhiều so với
 * việc canh sát nút: sớm vài chục ms là lag quay lại, còn muộn vài chục ms thì
 * không ai nhận ra.
 */
const SHEET_SETTLE_MS = 420;

/**
 * @param enabled Có nên focus hay không — form ở chế độ SỬA thường không focus
 *   (người dùng mở ra để xem, không phải để gõ ngay). Truyền `!isEdit`.
 * @returns `ref` để gắn vào ô nhập đầu tiên. Bàn phím bật sau khi sheet yên chỗ.
 */
export function useSheetAutoFocus(enabled = true) {
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => ref.current?.focus(), SHEET_SETTLE_MS);
    return () => clearTimeout(id);
  }, [enabled]);

  return ref;
}
