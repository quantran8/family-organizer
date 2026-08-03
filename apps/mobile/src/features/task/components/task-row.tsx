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
 *
 * ## Chip người phụ trách chạm-đổi-ngay — 06 §7, G14
 *
 * Chạm chip là đổi người **ngay tại chỗ**: không sheet, không hỏi lại, không
 * thông báo cho ai. Bất kỳ ai cũng đổi được, bất cứ lúc nào.
 *
 * Quyền sửa tự do đó là toàn bộ điểm của tính năng: nó khiến cái tên trên việc
 * là một **thỏa thuận** chứ không phải một mệnh lệnh. Thêm bước xác nhận —
 * "Bạn có chắc muốn giao việc này cho Vợ?" — sẽ biến nó ngược lại thành hành vi
 * giao việc, và một app giao việc giữa hai vợ chồng là thứ `06 §7` cấm.
 *
 * Không có thông báo khi đổi, và đó **không phải** thiếu sót: một push dạng
 * "Chồng vừa giao cho bạn việc Đổ rác" chính là thông báo "X chưa làm Y" mặc
 * áo khác — ranh giới thứ nhất của ba ranh giới bất biến.
 *
 * Dòng chưa gán ai thì **không có chip** — không có ô trống mời gán người. Mặc
 * định của form việc cũng là không gán ai (06 §7): gán tên là hành động phụ,
 * có ý thức. Muốn gán lần đầu thì vào chi tiết việc.
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
  /**
   * Chạm chip → đổi người ngay. Không truyền thì chip chỉ để đọc.
   *
   * Màn hình gọi quyết định người kế tiếp là ai (nó biết danh sách thành viên);
   * dòng này chỉ biết "có người vừa chạm vào chip".
   */
  onCycleAssignee?: () => void;
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
  onCycleAssignee,
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
      className="min-h-touch flex-row items-center gap-3 border-b border-line bg-surface py-4 active:bg-soft"
    >
      <Checkbox checked={done} onToggle={onToggle} />

      <View className="flex-1">
        <Text
          numberOfLines={2}
          className={`text-heading font-medium ${done ? 'text-subtle line-through' : 'text-ink'}`}
        >
          {title}
        </Text>
        {/* Nhãn phụ xuống DÒNG DƯỚI thay vì nằm cuối dòng chính: "Hôm nay ·
            Trước 20:00" là hai mẩu thông tin, và nhét chúng vào cùng một hàng
            với tên việc làm tên việc bị cắt trước trên máy hẹp. */}
        {meta ? <Text className="mt-1 text-label text-muted">{meta}</Text> : null}
      </View>

      {repeats ? <Text className="text-caption text-subtle">↻</Text> : null}

      {assigneeName ? (
        onCycleAssignee ? (
          // `hitSlop`: chip cao ~22px, dưới ngưỡng 44px của 04 §5. Nới vùng chạm
          // thay vì nới chính cái chip — một chip to bằng nút bấm sẽ đọc như một
          // hành động chính, mà nó là hành động phụ.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.task.fieldAssignee}: ${assigneeName}`}
            accessibilityHint={t.task.cycleAssigneeHint}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            onPress={onCycleAssignee}
            className="rounded-full bg-soft px-2 py-1 active:bg-line"
          >
            <Text className="text-micro font-medium text-muted">{assigneeName}</Text>
          </Pressable>
        ) : (
          <View className="rounded-full bg-soft px-2 py-1">
            <Text className="text-micro font-medium text-muted">{assigneeName}</Text>
          </View>
        )
      ) : null}
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
  const box = tone === 'danger' ? 'bg-critical-soft' : 'bg-soft';
  const text = tone === 'danger' ? 'text-critical' : 'text-muted';
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
