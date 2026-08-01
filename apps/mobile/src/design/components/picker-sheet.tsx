/**
 * Sheet bật lên từ một `FormRow` để chọn một giá trị.
 *
 * Dùng `Modal` của React Native chứ không phải một route trong `(modals)/`: đây
 * là bộ chọn NẰM TRONG một form đang mở dở. Đẩy nó thành route nghĩa là chồng
 * một `formSheet` lên một `formSheet` — hai lớp bo góc, hai thanh nắm, và cử chỉ
 * vuốt xuống không rõ đang đóng cái nào. `Modal` vẽ đè lên toàn màn hình, độc
 * lập với ngăn xếp điều hướng, nên form phía dưới giữ nguyên trạng thái.
 *
 * `animationType="slide"`: cùng hướng chuyển động với sheet cha (trượt từ đáy),
 * nên hai lớp đọc như cùng một hệ thống chứ không như hai cơ chế khác nhau.
 *
 * Chiều cao theo nội dung, KHÔNG cố định: bộ chọn ngày cao gấp đôi bộ chọn người
 * làm, và ghim một tỉ lệ chung sẽ làm cái này chật, cái kia thừa khoảng trắng.
 * Trần `max-h-[80%]` chặn trường hợp danh sách thành viên dài bất thường.
 */

import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

import { Icon, ICON_COLOR } from './icon';

export interface PickerSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function PickerSheet({ open, title, onClose, children }: PickerSheetProps) {
  const { t } = useT();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      // Nút back Android đóng bộ chọn, không thoát cả form. Thiếu prop này thì
      // back xuyên qua và người dùng mất luôn những gì đã nhập.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Vùng chạm-để-đóng KHÔNG tô màu.

            Không có nền mờ vì đây là sheet cấp hai: form phía dưới đã nằm trong
            một sheet có nền mờ của riêng nó, và phủ thêm một lớp nữa làm màn
            hình tối dần theo từng cấp — người dùng đọc ra là "đã đi sâu ba tầng"
            trong khi họ chỉ đang chọn một ngày.

            Nhưng vẫn phải chạm-ngoài-để-đóng, nên `Pressable` ở lại, chỉ bỏ
            `bg-ink/30`. Bóng của panel là thứ tách hai lớp thay cho nền mờ. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.a11y.close}
          onPress={onClose}
          className="absolute inset-0"
        />

        {/* `shadow-sheet` (`0 -16px 48px`) hắt LÊN trên: không có nền mờ thì đây
            là thứ duy nhất tách panel khỏi form phía dưới. */}
        <SafeAreaView
          edges={['bottom']}
          className="max-h-[80%] rounded-t-sheet bg-white shadow-sheet"
        >
          {/* Thanh nắm tự vẽ — khác `Sheet`, `Modal` không được hệ điều hành
              trang trí, nên ở đây KHÔNG có chuyện hai thanh nắm chồng nhau. */}
          <View className="items-center pt-2.5">
            <View className="h-1.5 w-9 rounded-full bg-line" />
          </View>

          {/* Ba cột để tiêu đề căn giữa màn hình, không phải giữa phần còn lại —
              cùng bố cục với header của `Sheet`. */}
          <View className="flex-row items-center px-4 pb-2 pt-3">
            <View className="min-w-touch" />
            <Text numberOfLines={1} className="flex-1 text-center text-title2 font-semibold text-ink">
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.a11y.close}
              hitSlop={12}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-soft active:bg-line"
            >
              <Icon name="close" size={18} color={ICON_COLOR.ink} />
            </Pressable>
          </View>

          <View className="px-4 pb-4">{children}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
