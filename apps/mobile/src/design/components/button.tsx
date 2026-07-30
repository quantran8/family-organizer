/**
 * Nút.
 *
 * Đặt tên nút bằng VIỆC NÓ LÀM và giữ nguyên tên đó suốt luồng (04 §7):
 * `[Lưu cập nhật]` → toast "Đã cập nhật", không phải "Thành công".
 */

import { forwardRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps, View } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<ButtonVariant, { box: string; label: string }> = {
  // Tím iris dùng DÈ — khoảng 5–8% một màn hình (design.md §3.2). Mỗi màn chỉ
  // nên có một nút primary; nhiều hơn nghĩa là chưa quyết định đâu là việc chính.
  primary: { box: 'bg-iris-500 active:bg-iris-600', label: 'text-white' },
  secondary: { box: 'bg-white border border-line active:bg-subtle', label: 'text-ink' },
  ghost: { box: 'bg-transparent active:bg-subtle', label: 'text-iris-500' },
  danger: { box: 'bg-white border border-danger active:bg-danger-soft', label: 'text-danger' },
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
        'min-h-touch flex-row items-center justify-center gap-2 rounded-control px-5 py-3',
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
        <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : '#7457E8'} />
      ) : (
        <>
          {icon}
          <Text className={`text-body font-semibold ${v.label}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
});
