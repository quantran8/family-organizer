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
  /**
   * Nút nằm TRONG ô, sát mép phải — hiện/ẩn mật khẩu, xoá nội dung.
   *
   * Ô nhập được chừa `pr-14` khi có nút, nếu không chữ dài sẽ chạy xuống dưới
   * nút và bị che mất phần đuôi.
   */
  trailing?: ReactNode;
  /** Nhãn phụ bên phải nhãn chính — "Quên mật khẩu?". */
  action?: ReactNode;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, children, trailing, action, className, ...rest },
  ref,
) {
  return (
    <View className="mb-4">
      {/*
        `min-h-touch` CHỈ khi có `action`: nút phụ cần vùng chạm 44px, nhưng ép
        chiều cao đó lên mọi nhãn sẽ nới rộng khoảng cách ở toàn bộ form đang có.
      */}
      <View
        className={[
          'mb-1.5 flex-row items-center justify-between',
          action ? 'min-h-touch' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Text className="text-label font-medium text-muted">{label}</Text>
        {action}
      </View>

      {children ?? (
        <View className="relative justify-center">
          <TextInput
            ref={ref}
            className={[
              'min-h-touch rounded-control border bg-white py-3 pl-4 text-body text-ink',
              trailing ? 'pr-14' : 'pr-4',
              error ? 'border-critical' : 'border-line',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            placeholderTextColor="#A4A4AD"
            accessibilityLabel={label}
            {...rest}
          />
          {trailing ? <View className="absolute right-1 self-end">{trailing}</View> : null}
        </View>
      )}

      {error ? (
        <Text className="mt-1.5 text-caption text-critical">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-caption text-subtle">{hint}</Text>
      ) : null}
    </View>
  );
});
