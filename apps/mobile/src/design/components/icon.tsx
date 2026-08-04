/**
 * Icon — một cửa duy nhất ra `@expo/vector-icons`.
 *
 * Vì sao có lớp bọc này thay vì để mỗi màn `import { Feather }` thẳng:
 *
 * 1. **Chọn bộ icon ở MỘT chỗ.** Đổi Feather sang bộ khác là sửa một dòng ở
 *    đây, không phải rà hai mươi file. Trước đây app dùng glyph text (`✓ ◆ ⧉`)
 *    và bài học đúng là thế: chúng rải khắp nơi nên đổi một cái là đi tìm.
 * 2. **Ép đúng ngôn ngữ hình của design.md §9** — outline, nét 1.9–2.3px, đầu
 *    nét bo tròn. Feather là bộ khớp sẵn cả ba, nên không ai phải nhớ chỉnh
 *    `strokeWidth` cho từng chỗ.
 * 3. **Tên icon thành một tập đóng.** `IconName` liệt kê đúng những icon app
 *    thật sự dùng, nên tự động hoàn thành chỉ gợi ý những cái đã qua kiểm
 *    duyệt, và thêm một icon mới là một quyết định có chủ ý chứ không phải gõ
 *    đại một chuỗi.
 *
 * Màu mặc định là `currentColor` của web thì React Native không có, nên `color`
 * là prop bắt buộc-có-mặc-định (`ink`). Truyền token màu từ tailwind.config.js,
 * không phải mã hex rời.
 */

import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';

/**
 * Tập icon app dùng. Khoá là tên theo NGHĨA trong sản phẩm, không phải tên hình:
 * chỗ gọi nói "assignee", không phải "user" — nên đổi hình cho một khái niệm
 * không phải đi sửa mọi chỗ gọi.
 */
const GLYPH = {
  task: 'check-square',
  event: 'calendar',
  eventKind: 'grid',
  family: 'users',
  date: 'calendar',
  assignee: 'user',
  money: 'dollar-sign',
  location: 'map-pin',
  doc: 'file-text',
  note: 'edit-3',
  close: 'x',
  chevron: 'chevron-right',
  previous: 'chevron-left',
  check: 'check',
  repeat: 'repeat',
  bell: 'bell',
  plus: 'plus',
  submit: 'arrow-up',
  // Khối tài chính đầu màn Nhà mình. `wallet` là khái niệm "tiền nhà mình đang
  // có", khác `money` (`dollar-sign`) vốn dùng cho MỘT khoản.
  wallet: 'credit-card',
  /** Mở màn chi tiết từ một khối tóm tắt — mũi tên chéo, không phải `›`. */
  openDetail: 'arrow-up-right',
  /** Dòng "cập nhật N tuần trước" đi kèm mọi số tổng (03 §8). */
  declaredAt: 'clock',
  shopping: 'shopping-bag',
  payment: 'file-text',
  /** Cảnh báo trên dòng "Cần chú ý" — giấy tờ sắp hết hạn. */
  alert: 'alert-triangle',
} as const;

export type IconName = keyof typeof GLYPH;

/**
 * Màu icon, khớp `tailwind.config.js`.
 *
 * Phải nhân đôi giá trị ở đây vì icon nhận `color` là prop JS, không phải class
 * — NativeWind không đưa `className` xuống được thuộc tính `color` của một
 * component native. Đây là chỗ DUY NHẤT được phép nhân đôi; chỗ gọi dùng
 * `ICON_COLOR.muted`, không viết `'#707078'`.
 *
 * Sửa màu ở `tailwind.config.js` thì phải sửa cả đây.
 */
export const ICON_COLOR = {
  ink: '#111114',
  muted: '#717177',
  subtle: '#A2A2A8',
  // Icon nằm TRÊN nền `bg-accent` (chanh). Accent sáng nên icon trên nó phải
  // đen — không có "màu icon accent" để vẽ lên nền trắng, vì chanh trên trắng
  // gần như không thấy. Một icon muốn nổi thì đổi NỀN sang accent, không đổi
  // nét sang accent (§5.3).
  accentInk: '#111114',
  /** Hạn chót và khoản sắp phải trả — KHÔNG dùng cho lỗi (§5.4). */
  attention: '#FF6B57',
  positive: '#13A86B',
  critical: '#D64545',
  disabled: '#8B8B94',
  white: '#FFFFFF',
} as const;

export interface IconProps {
  name: IconName;
  /** Mặc định 22 — cỡ trong khoảng 18–24 của design.md §9. */
  size?: number;
  /** Mã màu. Lấy từ token tailwind, đừng viết hex rời tại chỗ gọi. */
  color?: string;
}

export function Icon({ name, size = 22, color = ICON_COLOR.ink }: IconProps) {
  // `allowFontScaling={false}`: icon là hình, không phải chữ. Để nó phóng theo
  // Dynamic Type sẽ làm vỡ bố cục hàng đã tính theo ô 32px cố định — trong khi
  // nhãn bên cạnh vẫn phóng bình thường, đúng thứ §15 yêu cầu.
  return <Feather name={GLYPH[name]} size={size} color={color} allowFontScaling={false} />;
}

/**
 * Icon của TAB BAR — bộ riêng, và có lý do.
 *
 * Feather chỉ có nét outline, không có bản tô đặc. Nhưng design.md §11.2 đòi tab
 * đang mở phải dùng "filled or stronger icon", và §15 cấm dùng màu một mình để
 * truyền trạng thái: nếu active chỉ khác ở màu thì người phân biệt màu kém không
 * đọc được mình đang ở đâu. Ionicons có sẵn cặp `-outline` / đặc cho đúng bốn
 * khái niệm cần, nên tab dùng nó.
 *
 * Cố ý KHÔNG gộp vào `GLYPH` ở trên: hai bộ icon phục vụ hai việc khác nhau và
 * không được trộn trong cùng một màn hình. Tab bar là lớp điều hướng đứng riêng,
 * cách biệt về không gian với nội dung, nên khác bộ ở đó là chấp nhận được —
 * trộn Ionicons vào các dòng form thì không.
 */
const TAB_GLYPH = {
  home: 'home',
  plan: 'checkmark-circle',
  money: 'wallet',
  docs: 'document-text',
} as const;

export type TabIconName = keyof typeof TAB_GLYPH;

export interface TabIconProps {
  name: TabIconName;
  /** Tab đang mở — đổi từ nét rỗng sang tô đặc. */
  focused: boolean;
  /**
   * `ColorValue`, không phải `string`: `tabBarIcon` của expo-router truyền kiểu
   * này (nó bao cả `OpaqueColorValue` của PlatformColor), và siết xuống `string`
   * ở đây buộc mọi chỗ gọi phải ép kiểu.
   */
  color: ColorValue;
  size?: number;
}

export function TabIcon({ name, focused, color, size = 24 }: TabIconProps) {
  const glyph = focused ? TAB_GLYPH[name] : (`${TAB_GLYPH[name]}-outline` as const);
  return <Ionicons name={glyph} size={size} color={color} allowFontScaling={false} />;
}
