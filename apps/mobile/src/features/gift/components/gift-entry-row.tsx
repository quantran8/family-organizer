/**
 * Một dòng trong sổ mừng — 07 §3.
 *
 * Tên nhà · chiều · số tiền · dịp và ngày. Chiều đọc bằng CHỮ ("Nhà mình nhận"
 * / "Nhà mình đi"), không bằng mũi tên hay dấu +/−: một dấu cộng cạnh số tiền
 * biến quyển sổ thành một bảng kế toán, và đó đúng là thứ module này tránh.
 *
 * Số tiền KHÔNG tô màu theo chiều. Hai chiều song song, không bên nào tốt hơn
 * bên nào — xem 07 §3.4.
 */

import { Pressable, Text, View } from 'react-native';

import type { GiftDirection, GiftOccasion } from '@family-organizer/domain';
import { giftDirectionLabel, giftOccasionLabel, moneyText, shortSolarDate } from '@/i18n';

export interface GiftEntryRowProps {
  contactName: string;
  direction: GiftDirection;
  occasion: GiftOccasion;
  amount: number;
  occurredOn: string;
  /** Quà hiện vật — hiện chữ thay cho số tiền. */
  inKindNote?: string | null;
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
  currency,
  onPress,
}: GiftEntryRowProps) {
  // amount = 0 kèm ghi chú hiện vật: hiện "một cây vàng", không hiện "0 ₫".
  const isInKind = amount <= 0 && inKindNote !== null && inKindNote.length > 0;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line bg-white py-3"
    >
      <View className="flex-1">
        <Text className="text-body text-ink" numberOfLines={1}>
          {contactName}
        </Text>
        <Text className="text-caption text-subtle" numberOfLines={1}>
          {`${giftDirectionLabel(direction)} · ${giftOccasionLabel(occasion)} · ${shortSolarDate(occurredOn)}`}
        </Text>
      </View>

      <Text className="text-body text-ink" numberOfLines={1}>
        {isInKind ? inKindNote : moneyText(amount, currency)}
      </Text>
    </Pressable>
  );
}
