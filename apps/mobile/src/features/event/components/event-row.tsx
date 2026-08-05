/**
 * Một dòng Sự kiện — 05 §5.3, 09 §D.3.
 *
 * ```
 * ┌────┐
 * │ T6 │  Giỗ ông ngoại
 * │ 30 │  15/8 âm · Cả ngày · Nhà ngoại
 * └────┘  🏷 3 triệu   ⏱ 3 việc cần chuẩn bị           ›
 * ```
 *
 * **Ngày là mốc quét, không phải một thuộc tính nằm cuối dòng.** Ô ngày đứng
 * đầu và mọi dòng xếp nó thẳng cột: câu hỏi người ta mang tới màn này là *"sắp
 * tới nhà mình có dịp gì"*, và câu trả lời được đọc theo trục thời gian. Bản
 * trước đặt ngày ở mép phải, nên mắt phải quét ngang từng dòng để dựng lại thứ
 * tự vốn đã có sẵn.
 *
 * Ngày âm hiện **CẢ HAI** và ngày âm đứng đầu dòng phụ: *"Đây là điểm khác biệt
 * bản địa rõ nhất — đừng giấu."* Ngày dương là ngày người ta thật sự đến (nên nó
 * ở trong ô ngày), ngày âm là ngày người ta NHỚ — thiếu vế nào cũng bắt họ tự
 * quy đổi trong đầu.
 *
 * Sự kiện dương lịch chỉ có một ngày, và đó là chuyện bình thường — không hiện
 * ô trống hay dấu gạch ở chỗ đáng lẽ là ngày âm.
 */

import { formatLunarLabel, type FamilyEvent } from '@family-organizer/domain';
import { Pressable, Text, View } from 'react-native';

import { DateTile, Icon, ICON_COLOR, MoneyText } from '@/design/components';
import { useT, weekdayShort } from '@/i18n';

export interface EventRowProps {
  event: FamilyEvent;
  onPress: () => void;
  /** Số việc cần chuẩn bị — hiện ở dòng chi tiết khi > 0 (05 §5.3). */
  prepCount?: number;
  /**
   * Sự kiện gần nhất trong danh sách — ô ngày mang accent.
   *
   * ĐÚNG MỘT dòng được đặt cờ này, và chỗ gọi chịu trách nhiệm đảm bảo điều đó.
   * Accent ở đây là "cái tiếp theo", nên hai ô chanh trong một màn làm chữ "gần
   * nhất" mất nghĩa (§5.3).
   */
  isNext?: boolean;
}

export function EventRow({ event, onPress, prepCount = 0, isNext = false }: EventRowProps) {
  const { t, f } = useT();
  const lunar = formatLunarLabel(event);
  const solar = event.nextOccurrenceDate;

  // Dòng phụ: ngày âm · giờ · bên gia đình · địa điểm. Ghép bằng mảng rồi `join`
  // để không có dấu `·` mồ côi khi một vế vắng mặt — sự kiện dương lịch không
  // có vế ngày âm, và phần lớn sự kiện không có giờ cụ thể.
  const metaParts: string[] = [];
  if (lunar) {
    metaParts.push(
      `${lunar.lunarDay}/${lunar.lunarMonth}${lunar.isLeapMonth ? ' N' : ''} ${t.event.lunarSuffix}`,
    );
  }
  // `isAllDay` là cờ chính thức; `startTime` chỉ được đọc khi cờ đó tắt. Suy ra
  // "cả ngày" từ việc `startTime` rỗng sẽ sai với sự kiện có giờ mà chưa nhập.
  metaParts.push(
    !event.isAllDay && event.startTime ? event.startTime.slice(0, 5) : t.event.allDay,
  );
  if (event.side) metaParts.push(t.familySide[event.side]);
  if (event.location) metaParts.push(event.location);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-4 active:opacity-70"
    >
      {solar ? (
        <DateTile
          day={Number(solar.slice(8, 10))}
          weekdayLabel={weekdayShort(new Date(`${solar}T00:00:00Z`).getUTCDay())}
          tone={isNext ? 'event' : 'default'}
        />
      ) : (
        // Sự kiện âm lịch vừa tạo, Edge `refresh-lunar-dates` chưa tính xong.
        // Ô giữ NGUYÊN kích thước để cột neo không gãy, nhưng nói thẳng là chưa
        // có ngày — bỏ trống ở đúng vị trí ngày trông như dữ liệu hỏng.
        <View className="h-16 w-14 items-center justify-center rounded-weekday bg-soft px-1">
          <Text className="text-center text-micro font-medium text-subtle">
            {t.event.pendingDate}
          </Text>
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-body font-medium text-ink">
          {event.title}
        </Text>

        {metaParts.length > 0 ? (
          <Text numberOfLines={1} className="mt-1 text-caption text-muted">
            {metaParts.join(' · ')}
          </Text>
        ) : null}

        {/* Dòng thứ ba: chi phí và số việc cần chuẩn bị — hai thứ ĐÒI HÀNH ĐỘNG,
            tách khỏi dòng mô tả bên trên vốn chỉ để nhận ra sự kiện. Có icon vì
            đây là hai loại thông tin khác nhau nằm cạnh nhau, và §15 không cho
            phân biệt chúng chỉ bằng vị trí. */}
        {event.estimatedCost !== null || prepCount > 0 ? (
          <View className="mt-2 flex-row items-center gap-4">
            {event.estimatedCost !== null ? (
              <View className="flex-row items-center gap-1.5">
                <Icon name="money" size={13} color={ICON_COLOR.muted} />
                <MoneyText amount={event.estimatedCost} size="caption" tone="muted" short />
              </View>
            ) : null}

            {prepCount > 0 ? (
              // Màu `attention`, không phải `muted`: việc cần chuẩn bị là thứ
              // có hạn và chưa xong. KHÔNG phải `critical` — chưa chuẩn bị xong
              // một cái giỗ còn ba tuần nữa không phải một lỗi (§5.4).
              <View className="flex-row items-center gap-1.5">
                <Icon name="declaredAt" size={13} color={ICON_COLOR.attention} />
                <Text className="text-caption font-medium text-attention">
                  {f(t.event.prepCount, { count: prepCount })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <Icon name="chevron" size={18} color={ICON_COLOR.subtle} />
    </Pressable>
  );
}
