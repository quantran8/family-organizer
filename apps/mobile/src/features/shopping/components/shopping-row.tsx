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

import { Swipeable } from 'react-native-gesture-handler';
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
    <View className="min-h-touch flex-row items-center gap-3 bg-surface py-3">
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
  return (
    <Swipeable
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
    </Swipeable>
  );
}
