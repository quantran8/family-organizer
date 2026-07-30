/**
 * Truy cập bảng chuỗi.
 *
 * CỐ Ý không dùng thư viện i18n: MVP chỉ có một locale, và mỗi dependency là
 * một chỗ có thể vênh (01 §1). Khi thật sự có locale thứ hai thì thay bằng
 * i18next — bảng chuỗi đã đúng hình dạng để chuyển thẳng.
 */

import { interpolate, vi, type Interpolations } from './vi';

export { interpolate, vi };
export type { Dictionary, Interpolations } from './vi';
export * from './labels';

/**
 * Hook dùng trong component. Trả về bảng chuỗi và hàm nội suy.
 *
 * Không phải React hook thật (không có state), nhưng giữ tên `useT` để chỗ gọi
 * không phải đổi khi sau này thêm locale và cần context.
 */
export function useT(): {
  t: typeof vi;
  f: (template: string, values?: Interpolations) => string;
} {
  return { t: vi, f: interpolate };
}

/** Cho code ngoài component (repository, notification builder). */
export const t = vi;
export const f = interpolate;
