/**
 * Nút.
 *
 * Đặt tên nút bằng VIỆC NÓ LÀM và giữ nguyên tên đó suốt luồng (04 §7):
 * `[Lưu cập nhật]` → toast "Đã cập nhật", không phải "Thành công".
 *
 * ── CTA chính màu ĐEN, không phải màu brand (design.md §5.2, §10.1) ──
 *
 * Đây là luật dễ vi phạm nhất khi dựng màn mới, vì "nút chính = màu thương
 * hiệu" là phản xạ mặc định của gần như mọi design system khác. Ở đây thì
 * ngược lại: brand (chàm) dành cho **nhận diện và ngữ cảnh thời gian** — ngày
 * được chọn, tab đang mở. Nếu nút chính cũng mang màu đó thì trên một màn hình
 * có cả hai, mắt không còn phân biệt được "chỗ này là hành động" với "chỗ này
 * là thông tin", và cả hai cùng mất tác dụng.
 *
 * Bán kính `999px` cho nút chính (§8) — không phải `rounded-control` như ô nhập.
 */

import { forwardRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps, View } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<ButtonVariant, { box: string; label: string }> = {
  // Mỗi màn chỉ nên có MỘT nút primary; nhiều hơn nghĩa là chưa quyết định đâu
  // là việc chính.
  primary: { box: 'bg-action active:bg-action-pressed rounded-full', label: 'text-white' },
  secondary: { box: 'bg-white border border-line active:bg-soft rounded-full', label: 'text-ink' },
  ghost: { box: 'bg-transparent active:bg-soft rounded-full', label: 'text-brand-deep' },
  danger: {
    box: 'bg-white border border-critical active:bg-critical-soft rounded-full',
    label: 'text-critical',
  },
};

/** Màu vòng quay chờ — phải tương phản với nền của chính biến thể đó. */
const SPINNER: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#101014',
  ghost: '#4C43D8',
  danger: '#D64545',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Icon bên trái nhãn. */
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  { label, variant = 'primary', loading = false, icon, fullWidth = true, disabled, className, ...rest },
  ref,
) {
  const v = VARIANT[variant];
  const isDisabled = disabled === true || loading;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={[
        'min-h-touch flex-row items-center justify-center gap-2 px-5 py-3',
        v.box,
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={SPINNER[variant]} />
      ) : (
        <>
          {icon}
          <Text className={`text-body font-semibold ${v.label}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
});
