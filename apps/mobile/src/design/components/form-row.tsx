/**
 * Một dòng trong form — chạm để mở bộ chọn, giá trị hiện ngay trên dòng.
 *
 * Khác `NavRow` (dùng ở Cài đặt) ở chỗ nó dựng cho FORM: có ô icon dẫn đầu, nhãn
 * nằm TRÊN giá trị chứ không cùng hàng, và một dòng phụ tuỳ chọn. Bố cục đó cho
 * giá trị chỗ để thở — "Thứ Bảy, 09/08" không bị ép vào 55% bề ngang như
 * `NavRow.value`, mà đó lại là thứ người dùng đang muốn đọc.
 *
 * Vì sao là dòng chạm mở sheet chứ không phải chip/picker hiện ngay trên form:
 * mỗi dòng chỉ chiếm một chiều cao cố định dù bộ chọn bên trong to đến đâu, nên
 * cả form đọc thành một danh sách đều nhịp. Chip trải ngang làm chiều cao form
 * nhảy theo số lựa chọn, và với ba trường trở lên thì không còn nhìn ra đâu là
 * trường nào.
 *
 * `icon` nhận `IconName` chứ không `ReactNode`: tập icon là đóng (xem `icon.tsx`),
 * nên dòng form không thể vô tình mang một hình lạc khỏi ngôn ngữ chung.
 */

import { Pressable, Text, View } from 'react-native';

import { Icon, ICON_COLOR, type IconName } from './icon';

export interface FormRowProps {
  /** Icon dẫn đầu dòng. */
  icon: IconName;
  label: string;
  /** Giá trị hiện tại. Chưa chọn thì truyền `placeholder` thay vì để rỗng. */
  value: string;
  /** Dòng phụ dưới giá trị — ngày dạng đầy đủ, ghi chú ngắn. */
  hint?: string;
  /**
   * Giá trị đang là "chưa chọn" — hiện mờ đi.
   *
   * Cờ riêng chứ không suy từ `value === ''`: dòng luôn có chữ (chưa chọn thì là
   * "Chưa phân"), nên chuỗi rỗng không phân biệt được hai trạng thái.
   */
  muted?: boolean;
  onPress: () => void;
  /** Dòng cuối nhóm thì bỏ đường kẻ. */
  last?: boolean;
}

export function FormRow({
  icon,
  label,
  value,
  hint,
  muted = false,
  onPress,
  last = false,
}: FormRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      className={`min-h-[72px] flex-row items-center gap-3 py-3 active:bg-soft ${
        last ? '' : 'border-b border-line'
      }`}
    >
      <View className="w-8 items-center">
        <Icon name={icon} />
      </View>

      <View className="flex-1">
        <Text className="text-label font-medium text-muted">{label}</Text>
        <Text
          numberOfLines={1}
          className={`mt-1 text-body font-medium ${muted ? 'text-subtle' : 'text-ink'}`}
        >
          {value}
        </Text>
        {hint ? (
          <Text numberOfLines={1} className="mt-0.5 text-caption text-muted">
            {hint}
          </Text>
        ) : null}
      </View>

      <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
    </Pressable>
  );
}
