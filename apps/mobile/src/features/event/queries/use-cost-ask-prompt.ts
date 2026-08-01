/**
 * Tự mở sheet hỏi chi phí thực tế khi mở app — 05 §5.7.
 *
 * Đây là màn hình DUY NHẤT trong app tự đẩy một modal lên mà người dùng không
 * bấm gì. Ngoại lệ đó có lý do: câu hỏi này chỉ đúng trong một cửa sổ ngắn sau
 * khi dịp diễn ra, và nếu chờ người dùng tự tìm tới thì phần lớn sẽ không bao
 * giờ trả lời — khi đó trí nhớ năm ngoái chỉ còn ngày, mất phần số tiền, tức là
 * mất đúng thứ khiến nó đáng giá.
 *
 * Vì là ngoại lệ nên nó bị bó chặt bằng ba điều kiện, và cả ba đều cần thiết:
 *
 * 1. **Đúng một lần mỗi lần chạy app** (`promptedThisSession`). Không có nó,
 *    mỗi lần người dùng quay về tab Nhà mình từ một tab khác là sheet lại bật —
 *    kể cả khi họ vừa vuốt xuống để đóng nó ba giây trước. Cờ nằm ở module
 *    scope, không phải state của component: `HomeScreen` tháo/lắp lại theo tab
 *    và mọi state trong nó chết theo.
 *
 * 2. **Chỉ khi màn Nhà mình đang được nhìn** (`useIsFocused`). Đẩy một modal
 *    lên trong lúc người dùng đang gõ dở ở tab khác là cướp bàn phím.
 *
 * 3. **Chờ query xong** — không đẩy khi `isPending`, nếu không route được push
 *    trước khi biết có gì để hỏi và sheet mở ra rỗng.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { usePendingCostAsk } from './use-events';

/**
 * Module scope, KHÔNG phải `useRef`: mục đích của cờ này là sống lâu hơn vòng
 * đời component. Nó reset khi app bị kill — đúng nghĩa "lần mở app kế tiếp".
 */
let promptedThisSession = false;

/** Cho màn đăng xuất / đổi nhà: nhà mới là một phiên hỏi mới. */
export function resetCostAskPrompt(): void {
  promptedThisSession = false;
}

export function useCostAskPrompt(): void {
  const router = useRouter();
  const { data: pending, isPending } = usePendingCostAsk();

  // `useFocusEffect` thay cho `useEffect` + `useIsFocused`: nó chỉ chạy khi màn
  // này thật sự được nhìn, và chạy LẠI mỗi lần quay về — nên trường hợp "query
  // xong trong lúc người dùng đang ở tab khác" vẫn được phục vụ khi họ quay lại,
  // thay vì im lặng bỏ qua vì effect đã chạy một lần lúc chưa có dữ liệu.
  useFocusEffect(
    useCallback(() => {
      if (promptedThisSession || isPending || !pending) return;

      promptedThisSession = true;
      router.push('/(modals)/event-actual-cost');
    }, [pending, isPending, router]),
  );
}
