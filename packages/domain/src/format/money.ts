/**
 * Định dạng tiền — 03 §8.
 *
 * CỐ Ý không dùng Intl.NumberFormat ở đây dù 02 §1 có nhắc tới nó: Hermes chỉ
 * có Intl đầy đủ khi bật `jsEngine: hermes` + `intl` polyfill, còn Deno thì
 * mặc định có — nghĩa là cùng một hàm cho ra kết quả khác nhau ở hai runtime,
 * đúng thứ packages/domain sinh ra để tránh. Tự tách hàng nghìn là 6 dòng và
 * không bao giờ vênh.
 */

/** VND không có phần lẻ. Các tiền tệ khác thêm vào bảng này khi cần. */
const ZERO_DECIMAL_CURRENCIES = new Set(['VND', 'JPY', 'KRW']);

const CURRENCY_SYMBOL: Record<string, string> = {
  VND: '₫',
};

function groupThousands(n: number): string {
  const s = Math.abs(Math.trunc(n)).toString();
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '.';
    out += s[i];
  }
  return out;
}

/** `formatMoney(12000000, 'VND')` → `"12.000.000 ₫"` */
export function formatMoney(v: number, currency: string): string {
  const sign = v < 0 ? '-' : '';
  const symbol = CURRENCY_SYMBOL[currency];

  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    const body = groupThousands(v);
    return symbol ? `${sign}${body} ${symbol}` : `${sign}${body} ${currency}`;
  }

  const abs = Math.abs(v);
  const whole = groupThousands(Math.trunc(abs));
  const cents = Math.round((abs - Math.trunc(abs)) * 100)
    .toString()
    .padStart(2, '0');
  const body = `${whole},${cents}`;
  return symbol ? `${sign}${body} ${symbol}` : `${sign}${body} ${currency}`;
}

/**
 * Cho card chật: `"12 triệu"`, `"1,2 tỷ"` — 03 §8.
 *
 * design.md §4 nói rõ: trên màn tổng quan ưu tiên dạng rút gọn dễ đọc hơn
 * `25.000.000 ₫`.
 */
export function formatMoneyShort(v: number, currency: string): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);

  if (!ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return formatMoney(v, currency);
  }

  const unit = (value: number, divisor: number, label: string): string => {
    const scaled = value / divisor;
    // Một chữ số thập phân, bỏ ",0" cho tròn số: 12 triệu chứ không phải 12,0 triệu.
    const rounded = Math.round(scaled * 10) / 10;
    const text = Number.isInteger(rounded)
      ? rounded.toString()
      : rounded.toString().replace('.', ',');
    return `${sign}${text} ${label}`;
  };

  if (abs >= 1_000_000_000) return unit(abs, 1_000_000_000, 'tỷ');
  if (abs >= 1_000_000) return unit(abs, 1_000_000, 'triệu');
  if (abs >= 1_000) return unit(abs, 1_000, 'nghìn');
  return formatMoney(v, currency);
}
