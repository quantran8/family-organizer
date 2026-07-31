/**
 * Sheet — vỏ nội dung cho các route trong `(modals)/` (04 §6, 05 §Quy ước điều hướng).
 *
 * Không tự dựng overlay và animation: `(modals)/_layout.tsx` đã đặt
 * `presentation: 'modal'`, nên hệ điều hành lo phần trượt lên và cử chỉ vuốt
 * xuống. Một overlay tự vẽ chồng lên đó sẽ có hai lớp nền và cử chỉ vuốt không
 * còn đóng được. Ở đây chỉ còn: thanh nắm, tiêu đề, nút đóng, và tránh bàn phím.
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
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-4">{children}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Thanh nắm: dấu hiệu thị giác duy nhất cho biết vuốt xuống là đóng được. */}
        <View className="items-center pt-3">
          <View className="h-1 w-9 rounded-full bg-subtle" />
        </View>

        <View className="flex-row items-center justify-between px-4 py-4">
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
