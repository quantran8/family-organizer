/**
 * Suy ra tính thanh khoản — 03 §2.
 *
 * Người dùng CHỈ chọn loại tài sản. Trường thanh khoản được điền sẵn và ẩn sau
 * một dòng nhỏ "Đổi cách phân loại".
 *
 * Nếu hỏi thẳng "khoản này có dùng ngay được không?" thì mất nguyên tắc
 * nhập-vài-giây, mà nó lại là điều kiện bắt buộc để tính được trạng thái.
 */

import type { AssetKind, Liquidity } from '../types/base.ts';

export function inferLiquidity(kind: AssetKind): Liquidity {
  switch (kind) {
    case 'cash':
    case 'bank_account':
      return 'usable_now';
    case 'savings':
    case 'gold':
    case 'receivable':
      return 'not_immediate';
    case 'real_estate':
    case 'investment':
      return 'long_term';
    case 'other':
      return 'not_immediate';
  }
}
