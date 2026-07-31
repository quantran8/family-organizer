/**
 * Sheet — vỏ nội dung cho các route trong `(modals)/` (04 §6, 05 §Quy ước điều hướng).
 *
 * Không tự dựng overlay và animation: `(modals)/_layout.tsx` đã đặt
 * `presentation: 'formSheet'`, nên hệ điều hành lo phần trượt lên, cử chỉ vuốt
 * xuống, VÀ thanh nắm (`sheetGrabberVisible`). Một overlay tự vẽ chồng lên đó sẽ
 * có hai lớp nền và cử chỉ vuốt không còn đóng được. Ở đây chỉ còn: tiêu đề,
 * nút đóng, và tránh bàn phím.
 *
 * KHÔNG `flex-1` ở gốc: `sheetAllowedDetents: 'fitToContents'` đo chiều cao
 * nội dung để quyết định sheet cao bao nhiêu, mà `flex-1` nghĩa là "chiếm hết
 * chỗ cha cho" — đo một thứ co giãn vô định thì ra chiều cao vô định. Sheet co
 * theo nội dung, và nội dung dài thì `scroll` lo phần còn lại.
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

export interface SheetProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Vùng nút ghim đáy — không cuộn cùng nội dung. */
  actions?: ReactNode;
  /** Nội dung ngắn (một ô nhập) thì không cần cuộn. */
  scroll?: boolean;
}

export function Sheet({ title, children, onClose, actions, scroll = true }: SheetProps) {
  const { t } = useT();

  const body = scroll ? (
    // `bounces={false}`: sheet đã vuốt-xuống-để-đóng, nên nội dung nảy thêm một
    // nhịp nữa làm hai cử chỉ tranh nhau và người dùng không biết mình đang kéo
    // cái gì. `maxHeight` chặn sheet cao quá màn hình khi nội dung dài.
    <ScrollView
      style={{ maxHeight: '100%' }}
      contentContainerClassName="px-4 pb-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="px-4">{children}</View>
  );

  return (
    <SafeAreaView className="bg-white" edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Thanh nắm do hệ điều hành vẽ — xem `(modals)/_layout.tsx`. Vẽ thêm
            một cái ở đây là hai thanh nắm chồng nhau. */}
        <View className="flex-row items-center justify-between px-4 pb-4 pt-6">
          <Text className="text-title2 font-semibold text-ink">{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.a11y.close}
            hitSlop={12}
            onPress={onClose}
            className="min-h-touch min-w-touch items-end justify-center"
          >
            <Text className="text-body text-muted">{t.common.close}</Text>
          </Pressable>
        </View>

        {body}

        {actions ? (
          <View className="border-t border-line px-4 pb-2 pt-3">{actions}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
