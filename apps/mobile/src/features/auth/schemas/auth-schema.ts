/**
 * zod schema cho màn Đăng nhập và Khởi tạo.
 */

import { z } from 'zod';

import { requiredText } from '@/data/schemas/common';
import { t } from '@/i18n';

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: t.error.emailInvalid }),
  password: z.string().min(8, { message: t.error.passwordTooShort }),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = signInSchema.pick({ email: true });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: t.error.passwordTooShort }),
});
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Tạo nhà mới — hỏi ĐÚNG MỘT trường (05 §3.2).
 *
 * Tên nhà không hỏi: mặc định "Nhà mình". Thêm một ô nữa ở đây là thêm một chỗ
 * dừng lại suy nghĩ, trong khi mục tiêu F1 là dưới 90 giây tới bản ghi đầu tiên.
 * Đổi tên nhà nằm ở Cài đặt, cho ai thật sự muốn.
 */
export const createHouseholdSchema = z.object({
  displayName: requiredText(t.validation.displayName, 50),
});
export type CreateHouseholdValues = z.infer<typeof createHouseholdSchema>;

/**
 * Mã mời 6 ký tự.
 *
 * Bảng chữ sinh mã là `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` — cố ý bỏ `0 O 1 I`,
 * bốn ký tự người ta hay đọc nhầm cho nhau qua điện thoại.
 *
 * Chỉ chuẩn hoá những thứ KHÔNG THỂ SAI: viết hoa và bỏ khoảng trắng/gạch nối
 * (`redeem_invite` khớp bằng `upper(trim(code))`). CỐ Ý KHÔNG tự ánh xạ ký tự
 * dễ nhầm: `0` và `O` không cùng nằm trong bảng chữ nên không có chiều nào đúng,
 * và đoán sai một ký tự có thể biến mã gõ nhầm thành một mã HỢP LỆ CỦA NHÀ KHÁC.
 * Báo "mã không đúng" rồi để họ gõ lại an toàn hơn nhiều so với vào nhầm nhà.
 */
export const joinHouseholdSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .pipe(z.string().length(6, { message: t.validation.inviteCodeLength })),
  displayName: requiredText(t.validation.displayName, 50),
});
export type JoinHouseholdValues = z.infer<typeof joinHouseholdSchema>;
