/**
 * Một dòng trong sổ hiếu hỉ — 07 §3.
 *
 * Tên nhà · chiều · số tiền · dịp và ngày. Chiều đọc bằng CHỮ ("Nhà mình nhận"
 * / "Nhà mình đi"), không bằng mũi tên hay dấu +/−: một dấu cộng cạnh số tiền
 * biến quyển sổ thành một bảng kế toán, và đó đúng là thứ module này tránh.
 *
 * Số tiền KHÔNG tô màu theo chiều. Hai chiều song song, không bên nào tốt hơn
 * bên nào — xem 07 §3.6.
 *
 * Trạng thái đáp lễ hiện bằng CHỮ, không bằng màu hay chấm đỏ: "chưa đáp lễ" là
 * một việc chưa có dịp làm, không phải một cảnh báo. Một chấm đỏ ở đây biến
 * quyển sổ họ hàng thành một danh sách nợ quá hạn (07 §3.6).
 */

import { Pressable, Text, View } from 'react-native';

import type {
  GiftDirection,
  GiftOccasion,
  ReciprocityStatus,
} from '@family-organizer/domain';
import { giftDirectionLabel, giftOccasionLabel, moneyText, shortSolarDate, useT } from '@/i18n';

export interface GiftEntryRowProps {
  contactName: string;
  direction: GiftDirection;
  occasion: GiftOccasion;
  amount: number;
  occurredOn: string;
  /** Quà hiện vật — hiện chữ thay cho số tiền. */
  inKindNote?: string | null;
  /**
   * Trạng thái đáp lễ — chỉ có nghĩa ở khoản NHẬN. `undefined` = không hiện
   * dòng nào, dùng ở những chỗ trạng thái không liên quan (tổng của một đám).
   */
  status?: ReciprocityStatus;
  currency: string;
  onPress?: () => void;
}

export function GiftEntryRow({
  contactName,
  direction,
  occasion,
  amount,
  occurredOn,
  inKindNote = null,
  status,
  currency,
  onPress,
}: GiftEntryRowProps) {
  const { t } = useT();
  // amount = 0 kèm ghi chú hiện vật: hiện "một cây vàng", không hiện "0 ₫".
  const isInKind = amount <= 0 && inKindNote !== null && inKindNote.length > 0;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line bg-surface py-3"
    >
      <View className="flex-1">
        <Text className="text-body text-ink" numberOfLines={1}>
          {contactName}
        </Text>
        <Text className="text-caption text-subtle" numberOfLines={1}>
          {`${giftDirectionLabel(direction)} · ${giftOccasionLabel(occasion)} · ${shortSolarDate(occurredOn)}`}
        </Text>
        {/* Chữ thường, màu `muted` như mọi dòng phụ khác — không màu cảnh báo,
            không chấm, không đậm. Nghĩa vụ đáp lễ KHÔNG CÓ HẠN. */}
        {status === undefined || status === 'reciprocated' ? null : (
          <Text className="text-caption text-muted" numberOfLines={1}>
            {status === 'outstanding' ? t.gift.outstanding : t.gift.notNeeded}
          </Text>
        )}
      </View>

      <Text className="text-body text-ink" numberOfLines={1}>
        {isInKind ? inKindNote : moneyText(amount, currency)}
      </Text>
    </Pressable>
  );
}
