/**
 * Một nhà trong danh sách người quen — 07 §3.
 *
 * Hai chiều hiện SONG SONG, mỗi chiều một dòng riêng, cùng cỡ chữ và cùng màu.
 * KHÔNG có dòng thứ ba nào tính chênh lệch giữa chúng, và không có mũi tên hay
 * màu nào gợi ý bên nào "nhiều hơn" — 07 §3.4.
 *
 * Dữ liệu ở đây đủ để tính "nhà này mình còn đi thiếu 500k". Đó chính là lý do
 * phải nói rõ là không tính: nó biến quan hệ họ hàng thành sổ nợ.
 */

import { Pressable, Text, View } from 'react-native';

import type { GiftHistory } from '@family-organizer/domain';
import { moneyText, useT } from '@/i18n';

export interface ContactRowProps {
  history: GiftHistory;
  relationNote?: string | null;
  currency: string;
  onPress?: () => void;
}

export function ContactRow({ history, relationNote = null, currency, onPress }: ContactRowProps) {
  const { t } = useT();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className="min-h-touch border-b border-line bg-surface py-3"
    >
      <Text className="text-body text-ink" numberOfLines={1}>
        {history.displayName}
      </Text>
      {relationNote ? (
        <Text className="text-caption text-subtle" numberOfLines={1}>
          {relationNote}
        </Text>
      ) : null}

      {/* Hai dòng CÂN NHAU: cùng cỡ, cùng màu, cùng bố cục. */}
      <View className="mt-2 gap-1">
        <View className="flex-row justify-between">
          <Text className="text-caption text-muted">{t.gift.received}</Text>
          <Text className="text-caption text-ink">
            {history.timesReceived === 0
              ? t.gift.neverReceived
              : moneyText(history.totalReceived, currency)}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-caption text-muted">{t.gift.given}</Text>
          <Text className="text-caption text-ink">
            {history.timesGiven === 0
              ? t.gift.neverReceived
              : moneyText(history.totalGiven, currency)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
