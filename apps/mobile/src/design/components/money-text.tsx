/**
 * Hiển thị số tiền — 04 §6.
 *
 * Một trong hai primitive dễ sai nhất của cả app, nên viết trước.
 *
 * Ba thứ phải đúng:
 *   1. **Chữ số đều bề ngang** (`tabular-nums`). Không có nó, một cột số tiền
 *      sẽ so le vì chữ `1` hẹp hơn `8`, và mắt không quét được theo cột.
 *   2. **Tự thu nhỏ khi số dài.** "1.250.000.000 ₫" tràn ra khỏi thẻ trên máy
 *      hẹp. Xuống dòng giữa một con số tiền còn tệ hơn chữ nhỏ.
 *   3. **Số âm dùng dấu trừ thật** (U+2212), không phải gạch nối. Việc này do
 *      `deltaText` ở i18n lo; ở đây chỉ cần không tự ý thêm dấu.
 *
 * Màu: số tiền KHÔNG mặc định đỏ/xanh theo dấu (design.md §3.4, G7b). Đây là
 * bức tranh tình hình, không phải điểm số — người dùng tự đọc con số, app không
 * phán xét hộ. Muốn nhấn thì truyền `tone` tường minh.
 */

import { formatMoney, formatMoneyShort } from '@family-organizer/domain';
import { Text, type TextProps } from 'react-native';

import { useCurrency } from '@/design/use-currency';

export type MoneyTone = 'default' | 'muted' | 'ok' | 'warn' | 'danger';

const TONE_CLASS: Record<MoneyTone, string> = {
  default: 'text-ink',
  muted: 'text-muted',
  ok: 'text-positive',
  warn: 'text-attention',
  danger: 'text-critical',
};

export type MoneySize = 'display' | 'title1' | 'title2' | 'heading' | 'body' | 'label' | 'caption';

const SIZE_CLASS: Record<MoneySize, string> = {
  display: 'text-display font-semibold',
  title1: 'text-title1 font-semibold',
  title2: 'text-title2 font-semibold',
  heading: 'text-heading font-semibold',
  body: 'text-body',
  label: 'text-label font-medium',
  caption: 'text-caption',
};

export interface MoneyTextProps extends Omit<TextProps, 'children'> {
  amount: number;
  /**
   * Rút gọn: "25 triệu" thay vì "25.000.000 ₫".
   *
   * Mặc định BẬT ở màn tổng quan (design.md §4): con số đầy đủ ở đó không giúp
   * quyết định gì mà lại chiếm chỗ và bắt đếm số 0. Màn chi tiết và ô nhập thì
   * tắt — ở đó từng đồng mới có ý nghĩa.
   */
  short?: boolean;
  tone?: MoneyTone;
  size?: MoneySize;
  /** Thêm ký hiệu ₫ khi rút gọn (mặc định `formatMoneyShort` không có). */
  withSymbol?: boolean;
}

export function MoneyText({
  amount,
  short = false,
  tone = 'default',
  size = 'body',
  withSymbol = false,
  className,
  ...rest
}: MoneyTextProps) {
  const currency = useCurrency();
  const text = short ? formatMoneyShort(amount, currency) : formatMoney(amount, currency);
  return (
    <Text
      // `adjustsFontSizeToFit` + `numberOfLines={1}`: thu nhỏ thay vì xuống dòng.
      // Xuống dòng giữa một con số tiền làm nó đọc thành hai số khác nhau.
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={{ fontVariant: ['tabular-nums'] }}
      className={[SIZE_CLASS[size], TONE_CLASS[tone], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {short && withSymbol ? `${text} ₫` : text}
    </Text>
  );
}
