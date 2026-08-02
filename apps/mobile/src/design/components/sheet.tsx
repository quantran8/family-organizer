/**
 * Sheet — vỏ nội dung cho các route trong `(modals)/` (04 §6, 05 §Quy ước điều hướng).
 *
 * Không tự dựng overlay và animation: `(modals)/_layout.tsx` đã đặt
 * `presentation: 'formSheet'`, nên hệ điều hành lo phần trượt lên, cử chỉ vuốt
 * xuống, VÀ thanh nắm (`sheetGrabberVisible`). Một overlay tự vẽ chồng lên đó sẽ
 * có hai lớp nền và cử chỉ vuốt không còn đóng được. Ở đây chỉ còn: tiêu đề,
 * nút đóng, và tránh bàn phím.
 *
 * `flex-1` ở gốc: navigator ghim detent theo từng form, tức hệ điều hành
 * đã quyết chiều cao — việc của sheet là LẤP ĐẦY chỗ được cấp.
 * Không có nó thì cả khối co theo nội dung và nằm lửng ở trên, phần dưới hở ra
 * nền trắng, còn `actions` trôi lên giữa màn hình thay vì ghim đáy.
 *
 * (Trước đây là `fitToContents` nên đúng luật ngược lại — `flex-1` khi ấy làm hệ
 * điều hành đo phải một thứ co giãn vô định. Đổi detent thì phải đổi cả chỗ này.)
 *
 * `SheetActions` ghim ở đáy chứ không cuộn cùng nội dung — nút chính của một
 * sheet phải luôn với tới được, kể cả khi bàn phím đang che nửa màn hình.
 */

import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

import { Icon, ICON_COLOR } from './icon';

export interface SheetProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Vùng nút ghim đáy — không cuộn cùng nội dung. */
  actions?: ReactNode;
  /** Nội dung ngắn (một ô nhập) thì không cần cuộn. */
  scroll?: boolean;
  /** Form nhập nhanh chỉ cần nút đóng; tiêu đề đã nằm trong ngữ cảnh mở sheet. */
  header?: 'title' | 'close';
  /** Nền canvas dành cho form được chia thành các card trắng. */
  background?: 'surface' | 'canvas';
}

export function Sheet({
  title,
  children,
  onClose,
  actions,
  scroll = true,
  header = 'title',
  background = 'surface',
}: SheetProps) {
  const { t } = useT();
  const backgroundClass = background === 'canvas' ? 'bg-canvas' : 'bg-surface';

  const body = scroll ? (
    // `bounces={false}`: sheet đã vuốt-xuống-để-đóng, nên nội dung nảy thêm một
    // nhịp nữa làm hai cử chỉ tranh nhau và người dùng không biết mình đang kéo
    // cái gì.
    //
    // `flex-1` để vùng cuộn ăn hết phần giữa: chiều cao sheet đã do
    // detent cố định, nên phần nào không phải tiêu đề hay `actions` đều thuộc về
    // nội dung. Thiếu nó thì `ScrollView` co theo nội dung, form ngắn để lại một
    // mảng trắng giữa nội dung và cụm nút.
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-4">{children}</View>
  );

  return (
    <SafeAreaView className={`flex-1 ${backgroundClass}`} edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Thanh nắm do hệ điều hành vẽ — xem `(modals)/_layout.tsx`. Vẽ thêm
            một cái ở đây là hai thanh nắm chồng nhau.

            Ba cột chứ không phải `justify-between`: tiêu đề căn giữa MÀN HÌNH,
            không phải giữa khoảng trống còn lại. Ô rỗng bên trái rộng đúng bằng
            nút bên phải, nên tiêu đề không bị nút đẩy lệch — và nó vẫn ở đúng
            chỗ khi nhãn dài ngắn khác nhau. */}
        {header === 'title' ? (
          <View className="flex-row items-center px-4 pb-4 pt-6">
            <View className="min-w-touch" />

            {/* `flex-1` + `text-center`: tiêu đề chiếm hết phần giữa rồi tự căn
                giữa trong đó. `numberOfLines` giữ header luôn một dòng — tiêu đề
                dài xuống hai dòng sẽ đẩy lệch chiều cao header giữa các form. */}
            <Text
              numberOfLines={1}
              className="flex-1 text-center text-title2 font-semibold text-ink"
            >
              {title}
            </Text>

            {/* Nền tròn `bg-soft`: một icon ✕ trần trên nền trắng là vùng chạm vô
                hình — người dùng phải đoán nó bắt đầu và kết thúc ở đâu. Vòng tròn
                nói rõ ranh giới mà không cần thêm viền. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.a11y.close}
              hitSlop={12}
              onPress={onClose}
              className={`h-11 w-11 items-center justify-center rounded-full active:bg-line ${
                background === 'canvas' ? 'bg-surface' : 'bg-soft'
              }`}
            >
              <Icon name="close" size={18} color={ICON_COLOR.ink} />
            </Pressable>
          </View>
        ) : (
          <View className="items-end px-4 pb-2 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.a11y.close}
              hitSlop={12}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-soft"
            >
              <Icon name="close" size={20} color={ICON_COLOR.muted} />
            </Pressable>
          </View>
        )}

        {body}

        {/* Không viền trên, không nền riêng: nút Lưu đã là một khối đen đặc,
            tự nó đủ nặng để đọc ra là hành động chính. Thêm một đường kẻ và một
            dải nền phía sau là dựng một thanh công cụ quanh một nút duy nhất —
            design.md §8 nói dùng khoảng trắng trước khi thêm container. */}
        {actions ? <View className="px-4 pb-2 pt-3">{actions}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
