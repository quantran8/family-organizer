/**
 * Ô tròn đánh dấu xong — 04 §6.
 *
 * Thao tác được dùng nhiều nhất trong cả app (F3). Yêu cầu: MỘT CHẠM là xong.
 * Không hộp xác nhận, không màn trung gian, không ăn mừng, không điểm, không
 * chuỗi ngày (05 §5.2) — đây là việc nhà, không phải trò chơi.
 *
 * Vùng chạm mở rộng bằng `hitSlop`: ô vẽ 24px cho gọn mắt, nhưng vùng bấm vẫn
 * đủ 44px (design.md §14).
 */

import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { useT } from '@/i18n';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ checked, onToggle, disabled = false }: CheckboxProps) {
  const { t } = useT();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={checked ? t.a11y.checkboxDone : t.a11y.checkboxTodo}
      disabled={disabled}
      // 10px mỗi phía quanh ô 24px → vùng chạm 44px.
      hitSlop={10}
      onPress={() => {
        // Phản hồi rung NHẸ, không phải thông báo thành công. Việc nhà xong là
        // chuyện thường ngày, không phải thành tích.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(!checked);
      }}
    >
      {/* Xong = nền accent + dấu tick ĐEN (§13.3). Accent là màu sáng nên dấu
          tick phải là `accent-ink`; tick trắng trên chanh thì mất hẳn. */}
      <View
        className={[
          'h-6 w-6 items-center justify-center rounded-full border-2',
          checked ? 'border-accent bg-accent' : 'border-subtle bg-surface',
        ].join(' ')}
      >
        {checked ? <Text className="text-caption font-semibold text-accent-ink">✓</Text> : null}
      </View>
    </Pressable>
  );
}
