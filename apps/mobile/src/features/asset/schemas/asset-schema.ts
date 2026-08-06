/**
 * zod schema cho form Tài sản.
 */

import { ASSET_KINDS, assetShape, LIQUIDITIES, QUANTITY_UNITS } from '@family-organizer/domain';
import { z } from 'zod';

import { isoDate, money, optionalText, requiredText, uuid } from '@/data/schemas/common';
import { t } from '@/i18n';

/**
 * Số lượng hiện vật — KHÔNG dùng `money`.
 *
 * `money` là `int()` vì VND không có phần lẻ; vàng thì ngược lại, "1,5 chỉ" là
 * cách người ta thực sự nói. Ba chữ số thập phân khớp `numeric(14,3)` ở 0010.
 */
const quantity = z.number().nonnegative().nullable().default(null);

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
  /**
   * Nghĩa đổi theo `assetKind` (`assetShape().placeLabel`): tên ngân hàng · chỗ
   * cất vàng · địa chỉ · TÊN NGƯỜI VAY. Loại nào không có ô này thì luôn `null`.
   */
  institution: optionalText(120),
  quantity,
  quantityUnit: z.enum(QUANTITY_UNITS).nullable().default(null),
  dueDate: isoDate.nullable().default(null),
  asOfDate: isoDate,
  notes: optionalText(),
});
export type AssetValues = z.infer<typeof assetSchema>;

/**
 * Kiểm hình dạng theo loại — soi cùng luật với CHECK ở migration 0010.
 *
 * Hai tầng cùng kiểm là có chủ ý, không phải thừa: CHECK ở DB là thứ giữ dữ
 * liệu không bao giờ sai, còn tầng này là thứ nói cho người dùng biết SAI Ở
 * ĐÂU. Để DB bắt lỗi này thì người dùng chỉ nhận được một câu lỗi chung chung
 * sau khi bấm Lưu.
 *
 * Dùng `.superRefine` chứ không nhét vào từng trường vì luật ở đây là luật
 * GIỮA các trường — `quantity` một mình thì không có gì sai.
 */
export const assetFormSchema = assetSchema.superRefine((v, ctx) => {
  const shape = assetShape(v.assetKind);

  // Có số phải có đơn vị. "3" không đơn vị là con số không đọc được.
  if ((v.quantity === null) !== (v.quantityUnit === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: t.validation.assetQuantityUnit,
    });
  }

  // Loại không có ô số lượng mà vẫn mang số lượng: form đã đổi loại nhưng quên
  // dọn. Chặn ở đây để không ghi xuống một hàng vàng-không-phải-vàng.
  if (!shape.hasQuantity && v.quantity !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: t.validation.assetQuantityKind,
    });
  }
});
export type AssetFormValues = z.infer<typeof assetFormSchema>;

/** Modal cập nhật giá trị → RPC `update_asset_value`, không phải `update()`. */
export const updateAssetValueSchema = z.object({
  value: money,
  asOf: isoDate,
  note: optionalText(200),
});
export type UpdateAssetValueValues = z.infer<typeof updateAssetValueSchema>;
