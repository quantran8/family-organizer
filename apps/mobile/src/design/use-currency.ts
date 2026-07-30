/**
 * Đơn vị tiền của nhà đang mở.
 *
 * `formatMoney`/`formatMoneyShort` ở domain đều nhận `currency` tường minh —
 * chúng là hàm thuần, không được biết household nào đang mở. Chỗ nối hai thứ
 * đó là đây, và nó phải là MỘT chỗ: rải `'VND'` ở 40 chỗ gọi thì ngày thêm
 * đồng tiền thứ hai sẽ có vài chỗ bị bỏ sót, và lỗi hiện ra dưới dạng một con
 * số đúng với ký hiệu sai.
 */

import { useSessionStore } from '@/stores/session';

/** Mặc định khi chưa nạp xong household — MVP chỉ có VND. */
const DEFAULT_CURRENCY = 'VND';

export function useCurrency(): string {
  return useSessionStore((s) => s.currency) ?? DEFAULT_CURRENCY;
}
