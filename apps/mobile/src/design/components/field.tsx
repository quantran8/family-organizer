/**
 * Ô nhập có nhãn và thông báo lỗi — 04 §6.
 *
 * Thông báo lỗi theo 04 §8: nói rõ CHUYỆN GÌ và CÁCH SỬA, không xin lỗi.
 * "Mật khẩu cần ít nhất 8 ký tự." chứ không phải "Đã xảy ra lỗi."
 */

import { forwardRef, type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Dòng gợi ý dưới ô — luôn ở đó, không phải chỉ khi lỗi. */
  hint?: string;
  /** Thay ô nhập mặc định bằng thứ khác (bộ chọn ngày, AmountInput…). */
  children?: ReactNode;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, children, className, ...rest },
  ref,
) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-label font-medium text-muted">{label}</Text>

      {children ?? (
        <TextInput
          ref={ref}
          className={[
            'min-h-touch rounded-control border bg-white px-4 py-3 text-body text-ink',
            error ? 'border-danger' : 'border-line',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          placeholderTextColor="#96968F"
          accessibilityLabel={label}
          {...rest}
        />
      )}

      {error ? (
        <Text className="mt-1.5 text-caption text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-caption text-tertiary">{hint}</Text>
      ) : null}
    </View>
  );
});
