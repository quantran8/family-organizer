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
 *
 * ## Nút «Nhận» — 09 §D.1b
 *
 * Ngoại lệ DUY NHẤT của đoạn trên, và chỉ ở danh sách Linh hoạt: dòng chưa gán
 * ai hiện nút «Nhận» thay cho chỗ trống. Nó gán việc cho **chính người đang
 * chạm**, không mở danh sách người để chọn.
 *
 * Khác biệt đó là toàn bộ vấn đề. Xoay vòng người (`onCycleAssignee`) đặt được
 * tên người kia lên một dòng việc; «Nhận» thì không — nó chỉ nói *"cái này để
 * tôi"*. Ở danh sách định kỳ, nơi việc đã là thoả thuận sẵn có, xoay vòng là
 * đúng; ở danh sách việc phát sinh thì nó biến thành đường giao việc, nên chỗ
 * đó chỉ có «Nhận».
 */

// `ReanimatedSwipeable`, KHÔNG phải `Swipeable` từ gốc package — bản gốc đã
// deprecated (nó dựng trên Animated API cũ). Import phải qua ĐƯỜNG CON này:
// package chưa re-export bản Reanimated ở index, nên
// `import { Swipeable } from 'react-native-gesture-handler'` vẫn trỏ về bản cũ.
//
// Đổi được thẳng vì mọi prop app dùng (`overshootLeft/Right`,
// `renderLeftActions`, `renderRightActions`, `childrenContainerStyle`) trùng tên
// và trùng nghĩa. Hai hàm render nhận tham số kiểu khác (`SharedValue` thay cho
// `AnimatedInterpolation`) nhưng app không đọc tham số nào cả.
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Pressable, Text, View } from 'react-native';

import { useT } from '@/i18n';
import { Checkbox, Icon, ICON_COLOR, MemberAvatar } from '@/design/components';

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
  /**
   * Chạm «Nhận» → gán việc cho chính mình. Không truyền thì dòng chưa gán ai
   * không hiện gì cả (hành vi cũ).
   *
   * Chỉ dùng ở danh sách Linh hoạt. Nút này KHÔNG mở danh sách người để chọn —
   * xem chú thích đầu file.
   */
  onClaim?: () => void;
  /** Chạm chip của chính mình → bỏ nhận. Chỉ có nghĩa khi dòng đã gán cho mình. */
  onUnclaim?: () => void;
  /** Việc lặp: hiện biểu tượng để phân biệt với việc một lần. */
  repeats?: boolean;
  /** Nhãn phụ bên phải: giờ, hoặc ngày với nhóm "Sau đó". */
  meta?: string | null;
  /**
   * Nhãn phụ mang màu `attention` thay vì `muted` — dành cho việc quá hạn.
   *
   * Màu, KHÔNG phải một icon cảnh báo hay nền đỏ cả dòng: quá hạn ở đây là một
   * việc nhà chưa làm, không phải một lỗi. §15 đòi màu không đứng một mình nên
   * chính chữ đã nói ("Quá hạn"), màu chỉ giúp mắt tìm ra nó nhanh hơn.
   */
  metaTone?: 'muted' | 'attention';
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
  onClaim,
  onUnclaim,
  repeats = false,
  meta = null,
  metaTone = 'muted',
  onSnooze,
  onDelete,
}: TaskRowProps) {
  const { t } = useT();

  const row = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      // Dòng PHẲNG: không nền, không viền, không bo góc, không bóng (§8, §13.3).
      // Mảng trắng của section bên ngoài đã gom nhóm rồi; thêm `border-b` ở đây
      // là vẽ lưới bên trong một cái hộp, và `bg-surface` là tô trắng lên trắng.
      // Khoảng cách giữa hai dòng do chỗ gọi đặt (`gap-5`), không do `py` —
      // để dòng cuối không thừa một khoảng đệm sát mép dưới section.
      className="min-h-touch flex-row items-center gap-3 active:opacity-70"
    >
      <Checkbox checked={done} onToggle={onToggle} />

      <View className="min-w-0 flex-1">
        {/* Tên việc và chip người nằm CÙNG một hàng, nhãn ngày xuống dòng dưới.
            Chip là thuộc tính của việc nên nó đi cạnh tên; nhãn ngày là thông
            tin thứ hai nên nó xuống dưới — "Hôm nay · Trước 20:00" nhét chung
            hàng với tên việc làm tên bị cắt trước trên máy hẹp. */}
        <View className="flex-row items-center gap-2">
          <Text
            numberOfLines={1}
            className={`min-w-0 flex-1 text-body font-medium ${
              done ? 'text-subtle line-through' : 'text-ink'
            }`}
          >
            {title}
          </Text>

          {repeats ? <Icon name="repeat" size={14} color={ICON_COLOR.subtle} /> : null}

          <AssigneeControl
            assigneeName={assigneeName}
            {...(onCycleAssignee ? { onCycleAssignee } : {})}
            {...(onClaim ? { onClaim } : {})}
            {...(onUnclaim ? { onUnclaim } : {})}
          />
        </View>

        {meta ? (
          <Text
            className={`mt-1 text-caption ${
              metaTone === 'attention' ? 'font-medium text-attention' : 'text-muted'
            }`}
          >
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  if (!onSnooze && !onDelete) return row;

  return (
    <ReanimatedSwipeable
      overshootLeft={false}
      overshootRight={false}
      // Dòng phẳng không có nền riêng, nên khi bị kéo ngang nó để lộ nút hành
      // động NẰM DƯỚI nó. Nền trắng đặt ở `childrenContainerStyle` (chỉ bọc
      // dòng) chứ không `containerStyle` (bọc cả chỗ nút đứng, sẽ phủ mất nút).
      childrenContainerStyle={{ backgroundColor: '#FFFFFF' }}
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
    </ReanimatedSwipeable>
  );
}

/**
 * Chỗ bên phải tên việc — ba trạng thái loại trừ nhau.
 *
 * 1. Đã gán ai đó → chip avatar + tên. Bấm được nếu chỗ gọi cho phép đổi
 *    (`onCycleAssignee` ở danh sách định kỳ) hoặc bỏ nhận (`onUnclaim` ở danh
 *    sách linh hoạt, chỉ khi việc đang thuộc về chính mình).
 * 2. Chưa gán ai, chỗ gọi có `onClaim` → nút «Nhận».
 * 3. Chưa gán ai, không có `onClaim` → **không hiện gì**. Không có ô trống mời
 *    gán người (06 §7).
 *
 * Tách khỏi thân `TaskRow` vì ba nhánh lồng nhau trong JSX là chỗ dễ nối nhầm
 * một `onPress` sang nhánh khác — và nối nhầm ở đây nghĩa là một cử chỉ "nhận
 * việc" bỗng gán tên người kia.
 */
function AssigneeControl({
  assigneeName,
  onCycleAssignee,
  onClaim,
  onUnclaim,
}: {
  assigneeName: string | null;
  onCycleAssignee?: () => void;
  onClaim?: () => void;
  onUnclaim?: () => void;
}) {
  const { t } = useT();

  if (assigneeName) {
    // Xoay vòng thắng bỏ-nhận khi cả hai cùng có: danh sách định kỳ truyền
    // `onCycleAssignee`, danh sách linh hoạt truyền `onUnclaim`, không màn nào
    // truyền cả hai — nhưng thứ tự phải xác định để hành vi không đổi theo thứ
    // tự prop nếu sau này có chỗ thứ ba.
    const press = onCycleAssignee ?? onUnclaim;
    const hint = onCycleAssignee ? t.task.cycleAssigneeHint : t.task.unclaimHint;

    const chip = (
      // Chip cao 28px chứa avatar 24px: đủ để đọc tên, chưa tới mức đọc như một
      // nút bấm chính. Vùng chạm 44px do `hitSlop` lo, không do chính chip —
      // một chip to bằng nút bấm sẽ tranh chú ý với ô tròn đánh dấu xong.
      <View className="h-7 flex-row items-center gap-2 rounded-full bg-soft pl-1 pr-3">
        <MemberAvatar name={assigneeName} size="sm" />
        <Text numberOfLines={1} className="text-micro font-medium text-ink">
          {assigneeName}
        </Text>
      </View>
    );

    if (!press) return chip;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.task.fieldAssignee}: ${assigneeName}`}
        accessibilityHint={hint}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        onPress={press}
        className="active:opacity-60"
      >
        {chip}
      </Pressable>
    );
  }

  if (!onClaim) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.task.claim}
      accessibilityHint={t.task.claimHint}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      onPress={onClaim}
      // Nền `accent-soft` chứ không `accent` đặc: đây là hành động phụ, và một
      // nút chanh nguyên khối trên mỗi dòng chưa gán ai sẽ vượt ngưỡng 8–10%
      // của §5.3 ngay khi danh sách có bốn dòng.
      className="h-7 flex-row items-center gap-1 rounded-full bg-accent-soft px-3 active:opacity-60"
    >
      <Icon name="plus" size={13} color={ICON_COLOR.accentInk} />
      <Text className="text-micro font-semibold text-ink">{t.task.claim}</Text>
    </Pressable>
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
