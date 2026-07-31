/**
 * Stack cho các route trong `(modals)/`.
 *
 * `formSheet` chứ không phải `modal`: `modal` trượt lên gần kín màn hình và che
 * mất chỗ người dùng đang đứng, trong khi thêm một thứ là thao tác PHỤ
 * (design.md §9). `formSheet` chỉ cao bằng nội dung, nền phía sau còn thấy —
 * đúng nghĩa "không rời khỏi chỗ đang đứng".
 *
 * `fitToContents` chứ không phải một mảng tỉ lệ cứng: menu Thêm nhanh chỉ có 5
 * dòng, còn form sự kiện dài gấp ba. Ghim `[0.5, 0.9]` sẽ làm cái này hụt và
 * cái kia thừa một khoảng trắng lớn ở đáy.
 *
 * Thanh nắm do HỆ ĐIỀU HÀNH vẽ (`sheetGrabberVisible`), nên `Sheet` không tự vẽ
 * nữa — hai thanh nắm chồng nhau là lỗi thị giác rõ nhất của bố cục này.
 */

import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'formSheet',
        headerShown: false,
        sheetAllowedDetents: 'fitToContents',
        sheetGrabberVisible: true,
        // Cùng bán kính với `rounded-status` của Card (04 §6): sheet đọc như một
        // thẻ lớn trượt lên, không phải một cửa sổ của hệ điều hành khác.
        sheetCornerRadius: 24,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    />
  );
}
