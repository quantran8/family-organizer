/**
 * Primitive — 04 §6.
 *
 * Màn hình chỉ import từ đây, không import thẳng từng file: đổi hình dạng một
 * primitive thì chỉ phải sửa một chỗ.
 *
 * ── RANH GIỚI: cái gì được nằm ở đây ──
 *
 * Primitive **không biết gì về nghiệp vụ**. Nó nhận giá trị nguyên thuỷ và trả
 * về hình khối; nó không import type thực thể từ `@family-organizer/domain`, không đọc
 * bảng chữ của một feature cụ thể.
 *
 * Component biết về một thực thể (`FamilyEvent`, `Task`, một khoản tài sản)
 * thuộc về `features/<feat>/components/`. Phép thử nhanh khi phân vân:
 *
 *   *Feature thứ hai có dùng nó không?* Không → nó thuộc về feature đó.
 *
 * Ba thứ đã chuyển đi theo phép thử này: `TaskRow` → `features/task/components/`,
 * `EventRow` + `LunarDatePicker` → `features/event/components/`.
 *
 * `StatusPill` ở LẠI dù nó nhận `FinanceStatus`, vì cả `home` lẫn `money` đều
 * dùng — nó là ngôn ngữ chung giữa hai feature, và nhét nó vào một trong hai sẽ
 * làm feature kia phải import chéo. `FinanceStatus` cũng là một enum bốn giá
 * trị, không phải một thực thể có cấu trúc.
 *
 * ── Còn thiếu / còn nợ ──
 *
 * `FeaturedEventCard` (G6) — sẽ thêm đúng lúc cần thay vì dựng sẵn.
 *
 * `DateTile` hiện KHÔNG ai render (chỉ được export). Nó là tàn dư từ G4/G6;
 * để lại vì việc dọn nó nằm ngoài phạm vi đợt tái cấu trúc này, nhưng đừng dựng
 * màn mới quanh nó trước khi kiểm lại nó còn đúng với design.md không.
 *
 * `AttentionRow` đã cân nhắc ở G7 và BỎ: cờ "cần trao đổi" hiện ở ba chỗ với ba
 * hình dạng khác nhau (một dòng tóm tắt trên màn Tiền, một nút trong màn chi
 * tiết khoản, một dòng đầy đủ ở `attention.tsx` của G9). Một primitive gánh cả
 * ba sẽ có nhiều prop điều kiện hơn là code nó tiết kiệm được.
 */

export { AmountInput, type AmountInputProps } from './amount-input';
export { Button, type ButtonProps, type ButtonVariant } from './button';
export { Checkbox, type CheckboxProps } from './checkbox';
export { ChipSelect, type ChipOption, type ChipSelectProps } from './chip-select';
export { DatePicker, type DatePickerProps } from './date-picker';
export { DateTile, type DateTileProps } from './date-tile';
export { FAB, type FABProps } from './fab';
export { Field, type FieldProps } from './field';
export { Card, Divider, Row, Screen, SectionHeader } from './layout';
export type { CardProps, RowProps, ScreenProps, SectionHeaderProps } from './layout';
export { MemberAvatar, type MemberAvatarProps } from './member-avatar';
export { NavRow, type NavRowProps } from './nav-row';
export { MoneyText, type MoneySize, type MoneyTextProps, type MoneyTone } from './money-text';
export { Segmented, type SegmentedOption, type SegmentedProps } from './segmented';
export { Sheet, type SheetProps } from './sheet';
export { EmptyState, ErrorState, ListSkeleton, Skeleton } from './states';
export type { EmptyStateProps, ErrorStateProps } from './states';
export { StatusPill, type StatusPillProps } from './status-pill';
export { Toast } from './toast';
export { UndoToast, useUndo, type PendingUndo, type UndoToastProps } from './undo-toast';
