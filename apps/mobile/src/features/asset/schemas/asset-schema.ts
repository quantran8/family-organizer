/**
 * zod schema cho form Tài sản.
 */

import { ASSET_KINDS, LIQUIDITIES } from '@nhaminh/domain';
import { z } from 'zod';

import { isoDate, money, optionalText, requiredText, uuid } from '@/data/schemas/common';
import { t } from '@/i18n';

export const assetSchema = z.object({
  name: requiredText(t.validation.assetName, 120),
  assetKind: z.enum(ASSET_KINDS),
  /**
   * Form KHÔNG hỏi trường này — nó được điền bằng `inferLiquidity(assetKind)`
   * và giấu sau dòng nhỏ "Đổi cách phân loại" (05 §6.4).
   *
   * Hỏi thẳng "khoản này dùng ngay được không?" là mất nguyên tắc nhập-vài-giây,
   * mà nó lại là điều kiện bắt buộc để tính được trạng thái tài chính. Suy ra
   * đúng 90% trường hợp, và 10% còn lại sửa được.
   */
  liquidity: z.enum(LIQUIDITIES),
  currentValue: money,
  /** "Tiền đang ở đâu", KHÔNG phải để đối chiếu hai người (ràng buộc #1). */
  holderMemberId: uuid.nullable().default(null),
  institution: optionalText(120),
  asOfDate: isoDate,
  notes: optionalText(),
});
export type AssetValues = z.infer<typeof assetSchema>;

/** Modal cập nhật giá trị → RPC `update_asset_value`, không phải `update()`. */
export const updateAssetValueSchema = z.object({
  value: money,
  asOf: isoDate,
  note: optionalText(200),
});
export type UpdateAssetValueValues = z.infer<typeof updateAssetValueSchema>;
