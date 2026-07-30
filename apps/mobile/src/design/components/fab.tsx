/**
 * Nút [+] nổi — design.md §9.7.
 *
 * 56×56, tím iris, có mặt trên CẢ BỐN tab. Một chỗ duy nhất để thêm bất cứ thứ
 * gì: người dùng không phải nhớ "thêm việc thì vào tab nào" — sheet Thêm nhanh
 * hỏi họ đang muốn thêm gì.
 */

import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';

import { useT } from '@/i18n';

export interface FABProps {
  onPress: () => void;
  /** Đẩy lên khi có tab bar bên dưới. */
  bottomOffset?: number;
}

export function FAB({ onPress, bottomOffset = 24 }: FABProps) {
  const { t } = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.tabs.addAria}
      style={{ bottom: bottomOffset }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-iris-500 shadow-soft active:bg-iris-600"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Text className="text-title1 leading-none text-white">+</Text>
    </Pressable>
  );
}
