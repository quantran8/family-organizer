/**
 * Nút [+] nổi.
 *
 * 56×56, có mặt trên CẢ BỐN tab. Một chỗ duy nhất để thêm bất cứ thứ gì: người
 * dùng không phải nhớ "thêm việc thì vào tab nào" — sheet Thêm nhanh hỏi họ
 * đang muốn thêm gì.
 *
 * Màu ĐEN chứ không phải brand: đây là hành động chính của cả app, và
 * design.md §5.2 nói CTA chính màu đen, brand không được cạnh tranh với nó.
 * Trên tab bar thì brand đang là màu của tab đang mở (§5.3) — một nút [+] cùng
 * màu nằm ngay trên đó sẽ đọc như một tab thứ năm.
 */

import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useT } from '@/i18n';

import { Icon, ICON_COLOR } from './icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Spring lúc nút HIỆN LẠI sau khi menu co xong.
 *
 * `damping: 10` — vọt qua cỡ thật rồi về, một nhịp rõ nhưng không lắc dây dưa.
 * Đây là nút 56px nên biên độ phải tính theo kích thước vật thể, không theo con
 * số damping nghe hợp lý: 12+ thì cả quãng nảy chỉ còn vài pixel (đúng bằng
 * không có gì), 9 thì bắt đầu đọc thành lò xo.
 */
const SPRING_IN = { damping: 10, stiffness: 200, mass: 0.7 } as const;

export interface FABProps {
  onPress: () => void;
  /** Đẩy lên khi có tab bar bên dưới. */
  bottomOffset?: number;
  /**
   * Ẩn hẳn khi `FabMenu` đang mở.
   *
   * Menu KHÔNG nở ra cạnh nút — nó là chính cái nút này giãn ra (xem
   * `fab-menu.tsx`). Nên trong lúc đó nút thật phải biến mất, nếu không sẽ có
   * hai vật đen tròn chồng nhau ở cùng một góc màn hình và ảo giác "một hình
   * biến dạng" vỡ ngay lập tức.
   *
   * Chiều ẩn không animate (khung menu đã vẽ đúng hình dạng nút ở khung hình đầu
   * tiên, nên đổi chỗ tức thì là thứ mắt không bắt được); chiều hiện lại thì có
   * — xem `SPRING_IN`.
   */
  hidden?: boolean;
}

export function FAB({ onPress, bottomOffset = 24, hidden = false }: FABProps) {
  const { t } = useT();

  /**
   * Hai chiều KHÔNG đối xứng, và đó là chủ ý.
   *
   * Ẩn: gán thẳng 0, không animate — khung menu đã vẽ đúng hình dạng nút ở khung
   * hình kế tiếp, nên nút phải biến mất trong cùng nhịp đó. Một cú thu nhỏ dù
   * ngắn cũng để lộ hai vật chồng nhau đúng lúc ảo giác "một hình biến dạng" cần
   * chúng là một.
   *
   * Hiện: spring — lúc này panel đã co hết và góc màn hình đang TRỐNG, không còn
   * gì để chồng lên. Chỗ gọi chỉ bỏ `hidden` sau khi `FabMenu` báo đã đóng xong
   * (`onClosed`), nên nhịp nảy này nối tiếp chuyển động của panel chứ không chạy
   * đè lên nó.
   */
  // Khởi tạo 0 chứ không theo `hidden`: nút bị THÁO khỏi cây lúc ẩn (xem dưới),
  // nên mỗi lần hiện lại là một lần mount mới. Khởi tạo 1 thì `scale` đã ở đích
  // ngay từ khung hình đầu, effect gọi `withSpring(1)` từ 1 tới 1 và không có
  // nhịp nảy nào — nút chỉ đơn giản xuất hiện, đúng thứ đang muốn thay.
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, SPRING_IN);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  /**
   * Bóng đi theo nhịp RIÊNG, không scale cùng nút.
   *
   * `shadow-action` là `0 8px 22px`: quanh một nút 56px thì vệt bóng ấy gần bằng
   * chính cái nút, mềm hơn và lệch xuống dưới. Để nó scale 0→1 chung với nút thì
   * thứ nảy rõ nhất trong khung hình là mảng bóng chứ không phải nút — nhìn ra
   * đúng như "spring diễn ra ở một lớp bên dưới button".
   *
   * Nên: bóng chỉ mờ vào ở đoạn cuối, khi nút đã gần đúng cỡ và đang lắng lại.
   * Nút nảy trên nền phẳng, bóng đọng xuống sau — thứ tự đó cũng đúng vật lý hơn
   * là bóng nảy cùng vật.
   */
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [0.75, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Tháo hẳn khỏi cây khi ẩn thay vì để scale 0: một nút vô hình vẫn chắn chạm
  // ngay trên vùng người dùng đang thao tác — và ở đây còn là hai view, cả bóng
  // nữa. Cũng nhờ vậy chiều ẩn không cần animate — không còn gì để animate.
  if (hidden) return null;

  return (
    <>
      {/* Bóng tách khỏi nút: cùng hình tròn, cùng chỗ, nhưng opacity theo nhịp
          riêng (xem `shadowStyle`). `pointerEvents="none"` để nó không cướp cú
          chạm của nút nằm ngay trên. */}
      <Animated.View
        style={[{ bottom: bottomOffset }, style, shadowStyle]}
        className="absolute right-5 h-14 w-14 rounded-full bg-action shadow-action"
        pointerEvents="none"
      />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t.tabs.addAria}
        style={[{ bottom: bottomOffset }, style]}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-action active:bg-action-pressed"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <Icon name="plus" size={26} color={ICON_COLOR.white} />
      </AnimatedPressable>
    </>
  );
}
