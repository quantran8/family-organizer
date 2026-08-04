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

export interface SectionSurfaceProps extends ViewProps {
  children: ReactNode;
}

/**
 * Mảng TRẮNG của một nhóm nội dung — design.md §13.1.
 *
 * Đây là đơn vị gom nhóm của cả app kể từ bản thiết kế này: nền `canvas` gần
 * trắng ở dưới, các mảng `surface` trắng nổi lên trên, và chênh lệch giữa hai
 * màu đó làm gần hết việc tách nhóm — bóng `shadow-section` chỉ đỡ thêm.
 *
 * Phân biệt với `Card` bên dưới, vì lẫn hai thứ này là lỗi hay gặp nhất:
 *
 * - `Section` gói MỘT NHÓM (Việc cần làm, Sự kiện, Cần chú ý). Bên trong nó,
 *   từng dòng PHẲNG — không nền, không viền, không bo góc, không bóng riêng
 *   (§8). Một danh sách mà mỗi dòng là một thẻ trông gọn lúc viết và chỉ lộ ra
 *   khi có mười dòng thật.
 * - `Card` gói MỘT khối đứng riêng (thẻ mời, một ô thông tin trong form).
 *
 * Đệm trong 20px và bo 24px là số của §7.1/§8 — không nhận prop để chỉnh, vì
 * "bán kính khác một chút ở màn này" là cách một hệ thiết kế bắt đầu rời ra.
 */
export function Section({ children, className, ...rest }: SectionSurfaceProps) {
  return (
    <View
      className={['rounded-section bg-surface p-5 shadow-section', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}

export interface CardProps extends ViewProps {
  children: ReactNode;
  /**
   * Thẻ nhấn: viền accent nhạt thay vì bóng đổ nặng.
   *
   * KHÔNG tô nền accent đặc — §5.3 giữ accent ở mức tín hiệu nhỏ, và một thẻ
   * nền chanh nguyên khối một mình đã vượt ngưỡng 8–10% của một viewport.
   */
  emphasis?: 'none' | 'accent';
}

export function Card({ children, emphasis = 'none', className, ...rest }: CardProps) {
  return (
    <View
      className={[
        'rounded-status border bg-surface p-4',
        emphasis === 'accent' ? 'border-accent' : 'border-line',
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
