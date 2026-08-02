/**
 * Primitive bố cục — `Screen` · `Card` · `SectionHeader` · `Row` (04 §6).
 */

import { forwardRef, type ReactNode } from 'react';
import { ScrollView, Text, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  children: ReactNode;
  /** Nội dung dài thì cuộn; danh sách dài dùng FlashList riêng, KHÔNG bọc trong đây. */
  scroll?: boolean;
  /**
   * Nền: `surface` cho màn nội dung, `canvas` cho màn có nhiều thẻ nổi lên
   * trên. design.md §2.1 — trắng là mặc định, không phải màu nhấn.
   *
   * Tên hai giá trị là tên token, không phải tên màu: `bg-surface` của Tailwind
   * không tra được về design.md, nên nó không được xuất hiện ở đâu cả.
   */
  surface?: 'surface' | 'canvas';
}

export function Screen({ children, scroll = false, surface = 'surface', className, ...rest }: ScreenProps) {
  const bg = surface === 'surface' ? 'bg-surface' : 'bg-canvas';
  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-12"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={['flex-1 px-4', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </View>
  );

  return <SafeAreaView className={`flex-1 ${bg}`} edges={['top']}>{body}</SafeAreaView>;
}

export interface CardProps extends ViewProps {
  children: ReactNode;
  /** Thẻ nhấn: viền iris nhạt thay vì bóng đổ nặng (design.md §2.2). */
  emphasis?: 'none' | 'brand';
}

export function Card({ children, emphasis = 'none', className, ...rest }: CardProps) {
  return (
    <View
      className={[
        'rounded-status border bg-surface p-4',
        emphasis === 'brand' ? 'border-brand-soft' : 'border-line',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}

export interface SectionHeaderProps {
  title: string;
  /** Hành động phụ bên phải: "Xem tất cả". Không phải nút chính. */
  action?: ReactNode;
}

/**
 * Tiêu đề nhóm.
 *
 * KHÔNG viết hoa toàn bộ bằng CSS: tiếng Việt có dấu, và `uppercase` làm dấu
 * chồng lên nhau khó đọc. Nhóm nào cần chữ hoa thì viết hoa thẳng trong `vi.ts`.
 */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-heading font-semibold text-ink">{title}</Text>
      {action}
    </View>
  );
}

export interface RowProps extends ViewProps {
  children: ReactNode;
}

/** Một dòng trong danh sách. Vùng chạm ≥ 44px (design.md §14). */
export const Row = forwardRef<View, RowProps>(function Row({ children, className, ...rest }, ref) {
  return (
    <View
      ref={ref}
      className={['min-h-touch flex-row items-center gap-3 py-3', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
});

/** Đường kẻ giữa các dòng. Mảnh, ấm, không phải xám-xanh. */
export function Divider() {
  return <View className="h-px bg-line" />;
}
