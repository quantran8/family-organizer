/**
 * Một dòng Cần mua — 05 §5.3.
 *
 * Ô tròn · tên món. HẾT.
 *
 * CỐ Ý KHÔNG CÓ: số lượng, giá, phân loại, cửa hàng, chip người mua, nhãn "ai
 * thêm". Mỗi thứ trong số đó biến một tờ giấy dán tủ lạnh thành một hàng đợi
 * công việc — và mất đúng lý do module này tồn tại (06 §4).
 *
 * Khác `TaskRow`: KHÔNG có `onPress` mở chi tiết, vì không có màn chi tiết. Một
 * món cần mua không có gì để xem thêm.
 *
 * Mục đã tick MỜ ĐI chứ không biến mất — cron dọn sau 24h. Tick nhầm là chuyện
 * thường xuyên khi vừa đẩy xe vừa cầm điện thoại.
 */

// Đường con, không phải export gốc của package — xem chú thích ở `task-row.tsx`.
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Pressable, Text, View } from 'react-native';

import { Checkbox } from '@/design/components';
import { useT } from '@/i18n';

export interface ShoppingRowProps {
  title: string;
  note?: string | null;
  done: boolean;
  onToggle: (next: boolean) => void;
  onDelete?: () => void;
}

export function ShoppingRow({ title, note = null, done, onToggle, onDelete }: ShoppingRowProps) {
  const { t } = useT();

  const row = (
    // Dòng PHẲNG: không nền, không `py` riêng (§8, §13.3). Mảng trắng của
    // section bên ngoài đã gom nhóm, và khoảng cách giữa hai dòng do chỗ gọi
    // đặt (`gap-5`) — để `py` ở đây thì dòng cuối thừa một khoảng đệm sát mép
    // dưới section. `bg-surface` cũ là tô trắng lên trắng, trừ đúng một lúc:
    // lúc `Swipeable` kéo dòng sang ngang và nền đỏ phải bị che. Nền đó giờ do
    // nhánh vuốt bên dưới tự lo.
    <View className="min-h-touch flex-row items-center gap-3">
      <Checkbox checked={done} onToggle={onToggle} />
      <View className="flex-1">
        <Text
          className={done ? 'text-body text-subtle line-through' : 'text-body text-ink'}
          numberOfLines={1}
        >
          {title}
        </Text>
        {note ? (
          <Text className="text-caption text-subtle" numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onDelete) return row;

  // Chỉ vuốt PHẢI để xoá. Không có "hoãn sang mai" như TaskRow: một món cần mua
  // không có hạn, nên hoãn nó không có nghĩa gì.
  //
  // `bg-surface` nằm ở ĐÂY chứ không trên chính dòng: nó chỉ tồn tại để che nền
  // đỏ của nút xoá trong lúc dòng đang bị kéo ngang. Đặt nó trên dòng phẳng là
  // tô trắng lên trắng ở mọi lúc khác, và nó sẽ đi theo dòng vào bất cứ nền nào
  // khác trắng mà ai đó đặt nó lên sau này.
  return (
    <ReanimatedSwipeable
      // `childrenContainerStyle`, KHÔNG phải `containerStyle`: cái sau tô cả
      // vùng chứa — bao gồm chỗ nút xoá đứng — nên nền đỏ sẽ bị phủ trắng và
      // cử chỉ vuốt trông như không có gì hiện ra.
      childrenContainerStyle={{ backgroundColor: '#FFFFFF' }}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.delete}
          onPress={onDelete}
          className="min-h-touch justify-center bg-critical-soft px-5"
        >
          <Text className="text-label font-medium text-critical">{t.common.delete}</Text>
        </Pressable>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}
