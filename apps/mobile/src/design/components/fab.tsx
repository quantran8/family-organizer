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
import { Pressable, Text } from 'react-native';

import { useT } from '@/i18n';

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
   * Không animate việc ẩn: khung của menu đã vẽ đúng hình dạng nút ở khung hình
   * đầu tiên, nên đổi chỗ tức thì là thứ mắt không bắt được.
   */
  hidden?: boolean;
}

export function FAB({ onPress, bottomOffset = 24, hidden = false }: FABProps) {
  const { t } = useT();

  if (hidden) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.tabs.addAria}
      style={{ bottom: bottomOffset }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-action shadow-action active:bg-action-pressed"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Text className="text-title1 leading-none text-white">+</Text>
    </Pressable>
  );
}
