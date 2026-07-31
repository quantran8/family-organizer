/**
 * Nút [+] BIẾN HÌNH thành bảng lựa chọn — 05 §5.1.
 *
 * Chạm [+] không mở thẳng một form nữa mà chính nút đó giãn ra thành một bảng
 * chứa năm ô: vòng tròn icon + nhãn dưới. Lý do: [+] có mặt trên cả bốn tab nên
 * người dùng không phải nhớ "thêm khoản tiền thì vào tab nào" — nhưng cũng vì
 * thế [+] một mình không nói được nó sẽ thêm CÁI GÌ. Năm ô hiện ra trả lời câu
 * đó trước khi họ phải đoán.
 *
 * ── Vì sao là MỘT hình biến dạng, không phải hai thành phần ──
 *
 * Nút không đứng yên rồi bảng nở ra cạnh nó: nút BIẾN THÀNH bảng. Người dùng
 * nhìn thấy đúng một vật thể suốt quá trình, nên không phải hỏi "cái panel này
 * đến từ đâu" hay "nút vừa rồi đi đâu mất". Đó cũng là lý do `FAB` bị ẩn hẳn khi
 * menu mở (`hidden` prop) thay vì xoay 45° — hai vật cùng lúc ở cùng một chỗ là
 * hai vật, dù một cái đang xoay.
 *
 * Kỹ thuật: MỘT `Animated.View` nội suy đồng thời vị trí (`right`/`bottom`),
 * kích thước (`width`/`height`), bo góc (`borderRadius`) và màu nền — từ đúng
 * hình dạng của FAB (56×56, tròn hoàn toàn, nền `action`) tới hình dạng bảng
 * (rộng hết khung trừ lề, bo 28, nền sáng).
 *
 * Nội dung bên trong chỉ hiện ở nửa sau của chuyển động (`contentStyle`): năm ô
 * hiện lên trong lúc khung còn bé bằng nút sẽ bị bóp méo và tràn ra ngoài.
 *
 * Lưới 3 cột chứ không phải danh sách dọc: năm mục vừa đúng hai hàng, và mắt
 * quét một lưới nhanh hơn quét một cột — người dùng thấy TOÀN BỘ lựa chọn trong
 * một nhịp thay vì đọc lần lượt từ trên xuống.
 */

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useT } from '@/i18n';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Spring của khung.
 *
 * `damping: 18` cho một nhịp dừng chắc, không nảy ngược — một khung đang giãn ra
 * mà còn nảy lại trông như nó bị bật ra chứ không như nó được mở. `stiffness:
 * 200` giữ tổng thời gian dưới ~350ms: chậm hơn thì một thao tác phụ bắt người
 * dùng chờ, nhanh hơn thì mắt không kịp thấy nút biến thành cái gì.
 */
const SPRING = { damping: 18, stiffness: 200, mass: 0.7 } as const;

/** Kích thước FAB — khung bắt đầu từ đúng đây. Khớp `design/components/fab.tsx`. */
const FAB_SIZE = 56;

/** Lề hai bên của bảng lúc đã mở hết. */
const PANEL_MARGIN = 16;

/** Màu nền hai đầu: `bg-action` của FAB → trắng của bảng (tailwind.config.js). */
const COLOR_FAB = '#111114';
const COLOR_PANEL = '#FFFFFF';

export interface FabMenuItem {
  key: string;
  label: string;
  glyph: string;
  onPress: () => void;
}

export interface FabMenuProps {
  open: boolean;
  items: FabMenuItem[];
  onClose: () => void;
  /** Khớp `bottomOffset` của FAB — khung bắt đầu từ đúng chỗ nút đang đứng. */
  bottomOffset?: number;
  /** Khớp lề phải của FAB (`right-5` = 20px). */
  rightOffset?: number;
  /**
   * Panel đã co hết về hình dạng nút và tháo khỏi cây.
   *
   * Đây là tín hiệu để chỗ gọi hiện lại FAB thật. Không có nó thì FAB phải đoán
   * theo `open`, mà `open` thành false NGAY lúc bấm đóng — nút sẽ hiện lại tức
   * thì trong khi panel còn đang co, thành hai vật chồng nhau đúng cái ảo giác
   * "một hình biến dạng" đang cố dựng.
   */
  onClosed?: () => void;
}

export function FabMenu({
  open,
  items,
  onClose,
  bottomOffset = 24,
  rightOffset = 20,
  onClosed,
}: FabMenuProps) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  /**
   * Giữ khung trong cây cho tới khi animation ĐÓNG chạy xong.
   *
   * Tháo ngay lúc `open` thành false thì bảng biến mất tức thì và cả đoạn co lại
   * không ai thấy — nút sẽ nhảy về chỗ cũ thay vì hình bảng thu lại thành nút.
   * Cờ này do worklet tắt qua `runOnJS` ở callback hoàn tất, không đọc
   * `progress.value` lúc render: giá trị đọc ở luồng JS không đảm bảo là giá trị
   * mới nhất của luồng UI.
   */
  const [mounted, setMounted] = useState(false);

  // Một hàm cho cả hai việc phải xảy ra CÙNG khung hình: tháo panel khỏi cây và
  // báo cho chỗ gọi hiện lại FAB. Tách làm hai lời gọi `runOnJS` thì chúng rơi
  // vào hai lần render và có đúng một khung hình không có vật nào ở góc đó.
  const handleClosed = useCallback(() => {
    setMounted(false);
    onClosed?.();
  }, [onClosed]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withSpring(1, SPRING);
      return;
    }
    // Đóng bằng `timing` chứ không `spring`: một bảng đang thu lại mà còn nảy
    // trông như nó lưỡng lự, trong khi người dùng đã chọn xong.
    progress.value = withTiming(0, { duration: 180 }, (finished) => {
      // `finished` false nghĩa là có animation khác chen vào (mở lại giữa chừng)
      // — lúc đó KHÔNG báo đã đóng, vì panel đang trên đường giãn trở lại.
      if (finished) runOnJS(handleClosed)();
    });
  }, [open, progress, handleClosed]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  // Chiều cao bảng lúc mở: hai hàng ô (96px mỗi hàng gồm vòng tròn 64 + nhãn) +
  // đệm trên dưới. Tính sẵn ở JS vì `height` cần một con số để nội suy tới —
  // `auto` không nội suy được.
  const panelWidth = width - PANEL_MARGIN * 2;
  const panelHeight = 2 * 96 + 24 + 56;

  const frameStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [FAB_SIZE, panelWidth]),
    height: interpolate(progress.value, [0, 1], [FAB_SIZE, panelHeight]),
    // Từ tròn hoàn toàn (nửa cạnh) về bo 28 của bảng.
    borderRadius: interpolate(progress.value, [0, 1], [FAB_SIZE / 2, 28]),
    // Lề phải co từ chỗ FAB đứng về lề bảng; đáy nhích lên khỏi nút một chút.
    right: interpolate(progress.value, [0, 1], [rightOffset, PANEL_MARGIN]),
    bottom: interpolate(progress.value, [0, 1], [bottomOffset, bottomOffset + 8]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [COLOR_FAB, COLOR_PANEL]),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    // Chỉ hiện ở nửa sau: nội dung hiện lúc khung còn bằng nút sẽ tràn ra ngoài
    // và bị bóp méo theo khung đang giãn.
    opacity: interpolate(progress.value, [0.45, 0.85], [0, 1], 'clamp'),
  }));

  const plusStyle = useAnimatedStyle(() => ({
    // Dấu [+] tan đi ngay đầu chuyển động — nó thuộc về hình dạng NÚT, và giữ
    // nó lâu hơn sẽ thành một dấu cộng lơ lửng giữa tấm bảng đang mở.
    opacity: interpolate(progress.value, [0, 0.25], [1, 0], 'clamp'),
  }));

  if (!mounted) return null;

  return (
    <>
      {/* Nền mờ: chạm bất cứ đâu ngoài bảng là đóng. Không có nút [×] riêng —
          nền mờ đã là vùng chạm lớn nhất có thể, và một nút nhỏ ở góc thì khó
          trúng hơn hẳn. */}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t.common.close}
        onPress={onClose}
        style={backdropStyle}
        // Ngừng bắt chạm NGAY khi bắt đầu đóng, không đợi mờ hết: một backdrop
        // trong suốt còn nhận chạm sẽ nuốt cú chạm đầu tiên của người dùng lên
        // nội dung phía dưới, và họ phải chạm lại mà không hiểu vì sao.
        pointerEvents={open ? 'auto' : 'none'}
        className="absolute inset-0 bg-ink/30"
      />

      <Animated.View
        style={frameStyle}
        // `overflow-hidden`: nội dung phải bị cắt theo khung đang giãn, nếu
        // không thì năm ô hiện đầy đủ ngay từ lúc khung còn bé bằng nút.
        className="absolute overflow-hidden shadow-frame"
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Dấu [+] của trạng thái nút — cùng vị trí, cùng cỡ với FAB thật, nên
            lúc khung mới bắt đầu giãn nó trùng khít với nút vừa biến mất. */}
        <Animated.View
          style={plusStyle}
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <Text className="text-title1 leading-none text-white">+</Text>
        </Animated.View>

        <Animated.View style={contentStyle} className="flex-1 justify-center px-5 py-7">
          <View className="flex-row flex-wrap justify-center gap-y-6">
            {items.map((item, i) => (
              <MenuTile
                key={item.key}
                item={item}
                progress={progress}
                order={i}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                  item.onPress();
                }}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </>
  );
}

function MenuTile({
  item,
  progress,
  order,
  onPress,
}: {
  item: FabMenuItem;
  progress: SharedValue<number>;
  order: number;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    // Cửa sổ so le nằm TRONG nửa sau của chuyển động (0.5 → 1), khớp với lúc
    // `contentStyle` bắt đầu hiện. `0.06` mỗi bậc — đủ để thấy tuần tự từ trái
    // sang, chưa đủ để ô cuối thấy chậm.
    const start = 0.5 + order * 0.06;
    const p = interpolate(progress.value, [start, start + 0.35], [0, 1], 'clamp');
    return {
      opacity: p,
      // Nở từ 0.85 chứ không từ 0: nở từ 0 làm chữ méo lúc đang phóng to.
      transform: [{ scale: interpolate(p, [0, 1], [0.85, 1]) }],
    };
  });

  return (
    // `w-1/3`: ba cột, năm mục thành hai hàng (3 + 2). Hàng cuối căn giữa nhờ
    // `justify-center` ở cha — hai ô lệch trái trông như thiếu mục thứ ba.
    <Animated.View style={style} className="w-1/3 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={onPress}
        className="items-center gap-2"
      >
        <View className="h-16 w-16 items-center justify-center rounded-full bg-ink/[0.06] active:bg-ink/[0.12]">
          <Text className="text-title1 leading-none text-ink">{item.glyph}</Text>
        </View>
        <Text className="text-caption font-medium text-ink">{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}
