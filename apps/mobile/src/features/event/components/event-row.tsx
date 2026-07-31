/**
 * Một dòng Sự kiện — 05 §5.3.
 *
 * ```
 * ◆ Giỗ ông ngoại          15/8 âm — CN 5/10
 *   Nhà ngoại · ~1.000.000 ₫
 * ```
 *
 * Ngày âm hiện **CẢ HAI** và ngày âm mang màu riêng: *"Đây là điểm khác biệt
 * bản địa rõ nhất — đừng giấu."* Ngày dương là ngày người ta thật sự đến, ngày
 * âm là ngày người ta NHỚ — thiếu vế nào cũng bắt họ tự quy đổi trong đầu.
 *
 * Sự kiện dương lịch chỉ có một ngày, và đó là chuyện bình thường — không hiện
 * ô trống hay dấu gạch ở chỗ đáng lẽ là ngày âm.
 */

import { formatLunarLabel, type FamilyEvent } from '@nhaminh/domain';
import { Pressable, Text, View } from 'react-native';

import { shortSolarDate, useT, weekdayShort } from '@/i18n';
import { MoneyText } from '@/design/components';

export interface EventRowProps {
  event: FamilyEvent;
  onPress: () => void;
  /** Số việc cần chuẩn bị — hiện ở dòng phụ khi > 0 (05 §5.3). */
  prepCount?: number;
}

export function EventRow({ event, onPress, prepCount = 0 }: EventRowProps) {
  const { t, f } = useT();
  const lunar = formatLunarLabel(event);
  const solar = event.nextOccurrenceDate;

  // Dòng phụ: bên gia đình · chi phí dự kiến · số việc. Ghép bằng mảng rồi
  // `join` để không có dấu `·` mồ côi khi một vế vắng mặt.
  const subParts: string[] = [];
  if (event.side) subParts.push(t.familySide[event.side]);
  if (prepCount > 0) subParts.push(f(t.event.prepCount, { count: prepCount }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      className="min-h-touch flex-row items-start gap-3 py-3 active:bg-subtle"
    >
      {/* Dấu ◆ nhận diện "đây là sự kiện", cùng màu module sự kiện. */}
      <Text className="mt-0.5 text-caption text-event">◆</Text>

      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text numberOfLines={2} className="flex-1 text-body text-ink">
            {event.title}
          </Text>

          <View className="items-end">
            {lunar ? (
              <Text className="text-caption font-medium text-event">
                {`${lunar.lunarDay}/${lunar.lunarMonth}${lunar.isLeapMonth ? ' N' : ''} ${t.event.lunarSuffix}`}
              </Text>
            ) : null}
            {solar ? (
              <Text className="text-caption text-muted">
                {`${weekdayShort(new Date(`${solar}T00:00:00Z`).getUTCDay())} ${shortSolarDate(solar)}`}
              </Text>
            ) : (
              // Sự kiện âm lịch vừa tạo, Edge chưa tính xong. Nói thẳng thay vì
              // để trống — chỗ trống ở đúng vị trí ngày trông như dữ liệu hỏng.
              <Text className="text-caption text-tertiary">{t.event.pendingDate}</Text>
            )}
          </View>
        </View>

        {subParts.length > 0 || event.estimatedCost !== null ? (
          <View className="mt-0.5 flex-row items-center gap-2">
            {subParts.length > 0 ? (
              <Text className="text-caption text-tertiary">{subParts.join(' · ')}</Text>
            ) : null}
            {event.estimatedCost !== null ? (
              <MoneyText amount={event.estimatedCost} size="caption" tone="muted" short />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
