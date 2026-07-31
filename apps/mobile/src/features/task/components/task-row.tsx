/**
 * Một dòng Việc — 05 §5.1.
 *
 * Ô tròn · tên việc · chip người phụ trách · biểu tượng lặp.
 *
 * Ô tròn KHÔNG nằm trong vùng chạm của cả dòng: chạm dòng là mở chi tiết, chạm ô
 * tròn là đánh dấu xong, và hai thứ đó phải không bao giờ nhầm nhau. `Checkbox`
 * tự có hitSlop 44px và `Pressable` lồng trong nhau ở React Native thì con thắng.
 *
 * Vuốt trái → hoãn sang mai. Vuốt phải → xoá (có hoàn tác 5 giây, do màn hình
 * gọi lo). Cả hai đều không có hộp xác nhận — hoàn tác rẻ hơn xác nhận, và đây
 * là thao tác hằng ngày.
 */

import { Swipeable } from 'react-native-gesture-handler';
import { Pressable, Text, View } from 'react-native';

import { useT } from '@/i18n';
import { Checkbox } from '@/design/components';

export interface TaskRowProps {
  title: string;
  done: boolean;
  onToggle: (next: boolean) => void;
  onPress: () => void;
  /** Tên người phụ trách. `null` = chưa phân — KHÔNG hiện chip trống. */
  assigneeName?: string | null;
  /** Việc lặp: hiện biểu tượng để phân biệt với việc một lần. */
  repeats?: boolean;
  /** Nhãn phụ bên phải: giờ, hoặc ngày với nhóm "Sau đó". */
  meta?: string | null;
  onSnooze?: () => void;
  onDelete?: () => void;
}

export function TaskRow({
  title,
  done,
  onToggle,
  onPress,
  assigneeName = null,
  repeats = false,
  meta = null,
  onSnooze,
  onDelete,
}: TaskRowProps) {
  const { t } = useT();

  const row = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 bg-white py-3 active:bg-subtle"
    >
      <Checkbox checked={done} onToggle={onToggle} />

      <View className="flex-1">
        <Text
          numberOfLines={2}
          className={`text-body ${done ? 'text-tertiary line-through' : 'text-ink'}`}
        >
          {title}
        </Text>
      </View>

      {repeats ? <Text className="text-caption text-tertiary">↻</Text> : null}

      {assigneeName ? (
        <View className="rounded-full bg-subtle px-2 py-1">
          <Text className="text-micro font-medium text-muted">{assigneeName}</Text>
        </View>
      ) : null}

      {meta ? <Text className="text-caption text-tertiary">{meta}</Text> : null}
    </Pressable>
  );

  if (!onSnooze && !onDelete) return row;

  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={
        onSnooze
          ? () => <SwipeAction label={t.task.snooze} tone="neutral" onPress={onSnooze} />
          : undefined
      }
      renderRightActions={
        onDelete
          ? () => <SwipeAction label={t.common.delete} tone="danger" onPress={onDelete} />
          : undefined
      }
    >
      {row}
    </Swipeable>
  );
}

function SwipeAction({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'neutral' | 'danger';
  onPress: () => void;
}) {
  const box = tone === 'danger' ? 'bg-danger-soft' : 'bg-subtle';
  const text = tone === 'danger' ? 'text-danger' : 'text-muted';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-touch justify-center px-5 ${box}`}
    >
      <Text className={`text-label font-medium ${text}`}>{label}</Text>
    </Pressable>
  );
}
