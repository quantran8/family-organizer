/**
 * Lời xác nhận đang chờ hiện — sống QUA một lần đóng modal.
 *
 * Vì sao cần store thay vì `useToast()` cục bộ trong màn hình:
 *
 *   Nghi thức cập nhật là một route trong `(modals)/`. Lưu xong thì modal đóng
 *   và **component đó bị gỡ ngay** — một toast dựng trong nó biến mất trước khi
 *   kịp đọc. Còn màn hình phía dưới (Tiền) thì không biết chuyện gì vừa xảy ra
 *   ở modal.
 *
 * Store nhỏ này là chỗ nối: modal `show()` rồi `router.back()`, màn hình dưới
 * đọc và hiện. Cùng một lối cho `[Đã trả]` và `Cập nhật giá trị` — cả hai đều
 * là sheet đóng lại sau khi ghi.
 *
 * KHÔNG persist: một lời xác nhận cho thao tác vừa làm mà xuất hiện lại sau khi
 * mở app lần sau là một lời nói dối nhỏ. Mất nó khi app bị giết là đúng.
 */

import { create } from 'zustand';

interface ToastState {
  /** Câu đã dựng sẵn từ i18n. `null` = không có gì để hiện. */
  message: string | null;
  /** Đổi mỗi lần `show` để cùng một câu hai lần liên tiếp vẫn kích hoạt lại. */
  nonce: number;
  show: (message: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  nonce: 0,
  show: (message) => set((s) => ({ message, nonce: s.nonce + 1 })),
  clear: () => set({ message: null }),
}));

/** Cho chỗ ngoài component (callback của mutation). */
export function showToast(message: string): void {
  useToastStore.getState().show(message);
}
