/**
 * Stack cho các route trong `(modals)/`.
 *
 * KHÔNG khai `presentation` ở đây. Nhóm `(modals)` được present như `formSheet`
 * ở cấp CHA — trong `AuthGate`, nơi ba nhóm `(app)` / `(auth)` / `(modals)` là
 * anh em cùng một `Stack`. Đó là cấp duy nhất có navigator đọc được `presentation`
 * của cả nhóm.
 *
 * Khai lại `formSheet` ở đây thì mỗi form thành một sheet CON nằm trong sheet
 * cha — hai lớp bo góc, hai thanh nắm, và detent của lớp trong tính theo lớp
 * ngoài chứ không theo màn hình. Stack này chỉ còn lo việc điều hướng giữa các
 * form và nền trắng.
 *
 * `flex: 1` ở `contentStyle`: detent đã ghim chiều cao, nên `Sheet` phải có chỗ
 * thật mà lấp đầy. Thiếu nó thì `flex-1` bên trong `Sheet` không có gì để bám và
 * cụm nút trôi khỏi đáy.
 *
 * Thanh nắm do HỆ ĐIỀU HÀNH vẽ (`sheetGrabberVisible`, khai ở cấp cha), nên
 * `Sheet` không tự vẽ nữa — hai thanh nắm chồng nhau là lỗi thị giác rõ nhất của
 * bố cục này.
 */

import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF', flex: 1 },
      }}
    />
  );
}
