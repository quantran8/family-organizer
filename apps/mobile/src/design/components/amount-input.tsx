/**
 * Ô nhập số tiền — 04 §6.
 *
 * Primitive dễ sai thứ hai, và là thứ người dùng chạm nhiều nhất trong nghi
 * thức cập nhật (4 ô, xong dưới 30 giây — 05 §6.2).
 *
 * Bốn thứ phải đúng:
 *   1. **Bàn phím số** ngay từ đầu. `keyboardType="number-pad"` chứ không phải
 *      `numeric`: `numeric` trên iOS vẫn có dấu chấm thập phân, mà VND không có
 *      phần lẻ, nên nó chỉ là một phím gõ vào là hỏng.
 *   2. **Tách hàng nghìn NGAY KHI GÕ.** Không có nó, người ta gõ 8 số 0 rồi
 *      phải đếm lại bằng mắt để biết mình vừa nhập 200 triệu hay 20 triệu.
 *   3. **Con trỏ không nhảy về đầu** sau mỗi lần định dạng lại. Đây là chỗ hầu
 *      hết cách làm ngây thơ hỏng: `setState` với chuỗi đã format làm
 *      TextInput đặt lại selection.
 *   4. **Tự thu nhỏ khi số dài**, như `MoneyText`.
 *
 * Giá trị ra ngoài LUÔN là `number` (đồng), không phải chuỗi đã format. Component
 * giữ chuỗi hiển thị cho riêng mình; chỗ gọi không bao giờ phải parse ngược.
 */

import { forwardRef, useCallback, useEffect, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useCurrency } from '@/design/use-currency';

/** `"12000000"` → `"12.000.000"`. Cùng dấu phân tách với `formatMoney`. */
function groupDigits(digits: string): string {
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.';
    out += digits[i];
  }
  return out;
}

/** Bỏ mọi thứ không phải chữ số, và bỏ số 0 vô nghĩa ở đầu. */
function toDigits(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return d;
}

/**
 * Cỡ chữ theo độ dài số.
 *
 * `TextInput` KHÔNG có `adjustsFontSizeToFit` (đó là prop của `Text`), nên phải
 * tự chọn cỡ. Ba nấc là đủ: "1.250.000.000 ₫" ở nấc nhỏ nhất vẫn vừa một ô trên
 * máy hẹp nhất, mà số ngắn thì vẫn to và dễ đọc.
 */
function fontSizeFor(digitCount: number): number {
  if (digitCount <= 9) return 23; // tới 999 triệu — cỡ title2
  if (digitCount <= 12) return 19; // tới 999 tỷ
  return 16;
}

export interface AmountInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number | null;
  onChangeValue: (v: number | null) => void;
  /** Ký hiệu ₫ cuối ô — mặc định hiện, vì nó nói rõ ô này là tiền. */
  showSymbol?: boolean;
  hasError?: boolean;
}

export const AmountInput = forwardRef<TextInput, AmountInputProps>(function AmountInput(
  { value, onChangeValue, showSymbol = true, hasError = false, className, ...rest },
  ref,
) {
  const currency = useCurrency();
  const [text, setText] = useState(() => (value === null ? '' : groupDigits(String(value))));

  // Đồng bộ khi giá trị đổi TỪ BÊN NGOÀI (điền sẵn giá trị lần trước ở nghi
  // thức cập nhật). So sánh theo SỐ, không theo chuỗi: nếu so chuỗi thì mỗi lần
  // người dùng gõ sẽ kích hoạt effect này và ghi đè đúng thứ họ vừa gõ.
  useEffect(() => {
    const current = text === '' ? null : Number(toDigits(text));
    if (value !== current) {
      setText(value === null ? '' : groupDigits(String(value)));
    }
    // `text` cố ý không nằm trong deps — effect này chỉ phản ứng với `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = useCallback(
    (raw: string) => {
      const digits = toDigits(raw);
      setText(digits === '' ? '' : groupDigits(digits));
      onChangeValue(digits === '' ? null : Number(digits));
    },
    [onChangeValue],
  );

  return (
    <View
      className={[
        'flex-row items-center rounded-control border bg-white px-4',
        // Vùng chạm ≥ 44px — mức sàn không thương lượng (design.md §14).
        'min-h-touch',
        hasError ? 'border-critical' : 'border-line',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <TextInput
        ref={ref}
        value={text}
        onChangeText={handleChange}
        // `number-pad`: không có dấu thập phân, không có ký tự nào gõ vào là hỏng.
        keyboardType="number-pad"
        inputMode="numeric"
        numberOfLines={1}
        style={{
          fontVariant: ['tabular-nums'],
          fontSize: fontSizeFor(toDigits(text).length),
        }}
        className="flex-1 py-3 text-ink"
        placeholderTextColor="#A4A4AD"
        {...rest}
      />
      {showSymbol && currency === 'VND' ? (
        <Text className="pl-2 text-heading text-muted">₫</Text>
      ) : null}
    </View>
  );
});
