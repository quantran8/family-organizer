/**
 * Nút [+] kèm menu năm lựa chọn — 05 §5.1, F1.
 *
 * Gộp `FAB` + `FabMenu` + danh sách loại vào MỘT component vì cả bốn tab đều
 * render nó y hệt nhau. Để mỗi màn tự dựng cặp này nghĩa là bốn chỗ giữ cùng một
 * `useState`, bốn chỗ khai cùng năm route — và chỗ thứ năm sẽ quên một mục.
 *
 * Nằm ở `features/home/` chứ không ở `design/components/`: nó biết năm loại thực
 * thể của app và biết route của từng form. Đó là nghiệp vụ, không phải hình
 * khối — `design/` chỉ giữ `FAB` và `FabMenu` trơn (xem phép thử ở
 * `design/components/index.ts`).
 *
 * `push` chứ không `replace`: menu không phải một bước trong lịch sử điều hướng,
 * nó đóng lại trước khi form mở ra.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { FAB, FabMenu, type FabMenuItem } from '@/design/components';
import { useT } from '@/i18n';

export function AddFab() {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  /**
   * FAB thật có đang ẩn không — trạng thái RIÊNG, không suy ra từ `open`.
   *
   * `open` thành false ngay lúc bấm đóng, nhưng panel còn cả một nhịp spring nữa
   * mới co hết về hình dạng nút. Nếu FAB hiện lại theo `open` thì suốt nhịp đó có
   * hai vật đen tròn ở cùng một góc, và cảm giác "panel thu lại thành nút" vỡ —
   * đúng triệu chứng nút bật ra tức thì. Nên: ẩn NGAY khi mở, chỉ hiện lại khi
   * `FabMenu` báo đã co xong.
   *
   * Đây cũng là thứ xâu chuỗi hai chuyển động: `onClosed` bắn lúc panel về đúng
   * hình nút, nút mount lại ngay tại đó và nảy lên bằng spring của riêng nó, nên
   * mắt đọc thành một mạch liên tục chứ không thành hai hiệu ứng rời.
   */
  const [fabHidden, setFabHidden] = useState(false);

  // Nút back của Android đóng menu thay vì thoát màn hình. Không có nhánh này
  // thì một menu đang mở làm nút back rời hẳn tab — người dùng mất chỗ đang
  // đứng vì một thao tác họ tưởng chỉ là huỷ.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  // Lưới đọc từ trái sang, nên mục đầu mảng nằm ở ô trên-trái — chỗ mắt chạm
  // trước. Thứ tự theo tần suất thêm, không theo thứ tự tab: việc → sự kiện →
  // khoản sắp trả → khoản tiền → giấy tờ. Giấy tờ đứng cuối vì nó là thứ thêm
  // thưa nhất, vài lần một năm chứ không phải vài lần một tuần.
  const items: FabMenuItem[] = [
    { key: 'task', label: t.quickAdd.task, icon: 'task', onPress: () => router.push('/(modals)/task-form') },
    {
      key: 'event',
      label: t.quickAdd.event,
      icon: 'event',
      onPress: () => router.push('/(modals)/event-form'),
    },
    {
      key: 'payment',
      label: t.quickAdd.payment,
      icon: 'bell',
      onPress: () => router.push('/(modals)/payment-form'),
    },
    {
      key: 'asset',
      label: t.quickAdd.asset,
      icon: 'money',
      onPress: () => router.push('/(modals)/asset-form'),
    },
    { key: 'doc', label: t.quickAdd.doc, icon: 'doc', onPress: () => router.push('/(modals)/doc-form') },
  ];

  return (
    <>
      <FabMenu
        open={open}
        items={items}
        onClose={() => setOpen(false)}
        // Nút hiện lại lúc panel vừa co TỚI hình nút — không đợi panel tháo hẳn.
        // Đoạn chồng lấn ngắn sau đó là chủ ý: panel mờ đi trong khi nút nảy lên,
        // nên mắt đọc thành một mạch. Xem `frameStyle` trong `fab-menu.tsx`.
        onClosed={() => setFabHidden(false)}
        bottomOffset={FAB_BOTTOM}
      />
      <FAB
        hidden={fabHidden}
        onPress={() => {
          // Ẩn nút TRƯỚC khi mở, cùng một nhịp render: panel vẽ đè lên đúng chỗ
          // nút vừa đứng, nên mắt thấy một vật liền mạch chứ không thấy nút
          // biến mất rồi panel mới xuất hiện.
          setFabHidden(true);
          setOpen(true);
        }}
        bottomOffset={FAB_BOTTOM}
      />
    </>
  );
}

/**
 * Một hằng cho CẢ HAI, không để mỗi bên tự dùng mặc định của nó.
 *
 * Khung của menu bắt đầu từ đúng vị trí này để trùng khít với nút lúc mới giãn.
 * Hai giá trị mặc định trùng nhau chỉ là may mắn: sửa `bottomOffset` ở một bên
 * sẽ làm hình bắt đầu lệch khỏi nút, và cảm giác "nút giãn ra" thành "một hộp
 * nhảy ra từ chỗ khác" — không có gì báo lỗi.
 */
const FAB_BOTTOM = 24;
