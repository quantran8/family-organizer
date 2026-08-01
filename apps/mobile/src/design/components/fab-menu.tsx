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
 * (rộng tối đa `PANEL_MAX_WIDTH`, neo mép phải, bo 28, nền sáng).
 *
 * Nội dung bên trong chỉ hiện ở nửa sau của chuyển động (`contentStyle`): năm ô
 * hiện lên trong lúc khung còn bé bằng nút sẽ bị bóp méo và tràn ra ngoài.
 *
 * Mỗi mục MỘT hàng, xếp dọc: nhãn nằm ngang cạnh icon nên đọc thẳng thành câu
 * ("Thêm việc") thay vì phải ghép icon với dòng chữ bé bên dưới. Vùng chạm cũng
 * chạy hết bề ngang bảng — rộng hơn hẳn một ô lưới, và cỡ ngón tay không đổi khi
 * số mục tăng.
 */

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useT } from '@/i18n';

import { Icon, ICON_COLOR, type IconName } from './icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Spring của khung lúc GIÃN RA.
 *
 * `damping: 12` — khung vọt qua kích thước thật một nhịp rồi lắng về. Trước đây
 * là 18, tức tắt dần tới hạn: đúng nghĩa `withTiming` viết bằng `withSpring`,
 * nên chiều mở không có cảm giác spring nào cả.
 *
 * `stiffness: 200` giữ tổng thời gian dưới ~350ms: chậm hơn thì một thao tác phụ
 * bắt người dùng chờ, nhanh hơn thì mắt không kịp thấy nút biến thành cái gì.
 */
const SPRING = { damping: 19, stiffness: 240, mass: 0.7 } as const;

/**
 * Spring của khung lúc THU LẠI.
 *
 * `damping: 17` — chiều này KHÔNG cần nảy, và cố cho nó nảy là phản tác dụng.
 *
 * Panel đã tan hết ở `HANDOFF_AT` (xem `frameStyle`), nên phần `progress` vượt
 * dưới 0 chẳng còn gì để hiển thị: kích thước đã chạm sàn, opacity đã bằng 0.
 * Nó chỉ kéo dài cái đuôi spring mà không ai thấy — trong khi nhịp nảy người
 * dùng thật sự nhìn là của NÚT (`SPRING_IN` ở `fab.tsx`), bắt đầu từ đúng mốc
 * bàn giao.
 *
 * Nên chiều đóng lo đúng một việc: đưa khung về hình nút nhanh và gọn, rồi trao
 * lại cho nút. `stiffness: 220` cho quãng co ngắn — người dùng đã chọn xong,
 * không có gì để họ nhìn thêm ở tấm bảng đang biến mất.
 *
 * Hai ngưỡng `rest*` siết chặt hơn mặc định vì spring này chạy trên thang 0→1,
 * không phải trên pixel: ở thang đó ngưỡng mặc định (0.01) là 1% quãng đường —
 * spring coi như đã dừng khi khung vẫn còn to hơn nút thấy rõ, và panel bị tháo
 * khỏi cây trong lúc vẫn còn nhìn thấy được.
 */
const SPRING_CLOSE = {
  damping: 17,
  stiffness: 220,
  mass: 0.8,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.01,
} as const;

/**
 * Mốc `progress` (lúc ĐÓNG) mà FAB thật được hiện lại.
 *
 * Khớp cận trên của `opacity` trong `frameStyle`: panel mờ hết ở `0.25`, nên từ
 * đó trở xuống góc màn hình không còn gì — nút phải nhận chỗ ngay tại đây. Chờ
 * tới `0` thì có một quãng trống giữa lúc panel tan và lúc nút hiện, và nhịp nảy
 * của nút đọc thành một hiệu ứng rời chứ không thành phần cuối của cùng chuyển
 * động.
 *
 * Sửa một trong hai con số thì phải sửa cả hai.
 */
const HANDOFF_AT = 0.25;

/** Kích thước FAB — khung bắt đầu từ đúng đây. Khớp `design/components/fab.tsx`. */
const FAB_SIZE = 56;

/** Lề hai bên của bảng lúc đã mở hết. */
const PANEL_MARGIN = 16;

/**
 * Trần chiều rộng của bảng.
 *
 * Bảng neo ở mép phải (`right` nội suy về `PANEL_MARGIN`), nên thu hẹp là kéo
 * mép TRÁI vào — nút vẫn giãn ra tại chỗ nó đứng, hướng biến hình không đổi.
 *
 * Nhãn dài nhất hiện tại ("Khoản sắp trả", `text-body` 15px) chiếm ~95px; cộng
 * đệm 12 + vòng tròn 44 + gap 12 + đệm phải 12 là ~175px. Phần dư còn lại là chỗ
 * cho máy đặt cỡ chữ lớn hơn mặc định, nên nhãn không xuống dòng.
 *
 * Rộng hơn nữa thì mỗi hàng thành một dải trống dài với dúm chữ nép bên trái.
 */
const PANEL_MAX_WIDTH = 280;

/**
 * Kích thước một hàng mục — phải KHỚP class của `MenuTile` (`h-14`), vì chiều
 * cao bảng nội suy tới một con số tính từ đây. Lệch nhau thì hàng cuối bị cắt
 * hoặc bảng thừa một dải trống, và không có gì báo lỗi.
 */
const ROW_HEIGHT = 56;
const ROW_GAP = 8;

/** Đệm trên/dưới của bảng — khớp `py-3` ở khung nội dung. */
const PANEL_PADDING_Y = 12;

/** Màu nền hai đầu: `bg-action` của FAB → trắng của bảng (tailwind.config.js). */
const COLOR_FAB = '#111114';
const COLOR_PANEL = '#FFFFFF';

export interface FabMenuItem {
  key: string;
  label: string;
  icon: IconName;
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

  // Tháo panel và hiện lại FAB là HAI thời điểm khác nhau.
  // FAB nhận chỗ ngay khi panel về tới hình nút (`handoff`), nhưng panel còn nảy
  // thêm một nhịp nữa mới tháo (`handleClosed`, ở callback hoàn tất của spring).
  // Gộp làm một thì hoặc mất nhịp nảy của panel, hoặc nút hiện trễ hẳn sau nó.
  const handoff = useCallback(() => {
    onClosed?.();
  }, [onClosed]);

  const handleClosed = useCallback(() => {
    setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withSpring(1, SPRING);
      return;
    }
    // Chiều đóng dứt khoát, không nảy (xem `SPRING_CLOSE`) — nhịp nảy để dành
    // cho nút lúc nó nhận chỗ.
    //
    // Tháo panel ở callback hoàn tất — tức SAU cả nhịp nảy. Việc bàn giao cho
    // FAB thì sớm hơn, ở `useAnimatedReaction` bên dưới.
    progress.value = withSpring(0, SPRING_CLOSE, (finished) => {
      // `finished` false nghĩa là có animation khác chen vào (mở lại giữa chừng)
      // — lúc đó KHÔNG tháo, vì panel đang trên đường giãn trở lại.
      if (finished) runOnJS(handleClosed)();
    });
  }, [open, progress, handleClosed]);

  /**
   * Bàn giao cho FAB ngay khi panel CHẠM hình nút, không đợi spring dừng hẳn.
   *
   * Cắt ở `HANDOFF_AT`, tức lúc panel vừa mờ hết — không đợi spring dừng hẳn.
   * Cái đuôi spring cuối cùng dài và gần như đứng yên với mắt; chờ nó nghĩa là
   * nút chỉ hiện sau khi panel đã trông như xong từ lâu, và nhịp nảy của nút
   * chạy một mình ở cuối thay vì nối tiếp chuyển động của panel.
   *
   * Panel vẫn còn trong cây thêm một lúc sau mốc này (nó chỉ tháo ở callback
   * hoàn tất), nhưng đã trong suốt nên không tranh chấp thị giác với nút.
   *
   * Điều kiện có `mounted` vì trạng thái ĐẦU TIÊN của component đã thoả
   * `!open && progress <= HANDOFF_AT` (panel chưa từng mở, `progress` vẫn là 0).
   * Không chặn thì reaction bắn `handoff` ngay lúc mount, tức `onClosed` chạy dù
   * chẳng có gì đóng cả.
   *
   * `open` và `mounted` bắt thẳng từ JS, KHÔNG qua shared value: mảng deps ở cuối
   * làm worklet được dựng lại mỗi lần hai giá trị này đổi, nên nó không bao giờ
   * giữ bản sao cũ. Bản trước gán `sharedValue.value = …` ngay trong thân render
   * để né chuyện đó — đó chính là thứ Reanimated cảnh báo, vì ghi vào shared
   * value lúc React đang render là tác dụng phụ giữa chừng một lần render.
   */
  useAnimatedReaction(
    () => mounted && !open && progress.value <= HANDOFF_AT,
    (reachedButton, prev) => {
      if (reachedButton && !prev) runOnJS(handoff)();
    },
    [mounted, open],
  );

  // Kẹp vì cả hai spring đều vượt đích: `progress` ra ngoài [0,1] ở cả hai đầu,
  // và opacity âm là giá trị không hợp lệ.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], 'clamp'),
  }));

  // Chiều cao bảng lúc mở, tính từ SỐ MỤC chứ không phải hằng số: mỗi mục một
  // hàng `ROW_HEIGHT`, cách nhau `ROW_GAP`, cộng đệm trên dưới. Một con số cứng
  // sẽ đúng cho đúng năm mục hiện tại rồi âm thầm cắt cụt hoặc chừa khoảng trống
  // ở mục thứ sáu — mà `items` là prop, chỗ gọi đổi lúc nào cũng được.
  //
  // Vẫn phải tính sẵn ở JS vì `height` cần một con số để nội suy tới; `auto`
  // không nội suy được.
  // Hẹp hơn bề ngang màn hình: các hàng chỉ có icon + một nhãn ngắn, kéo bảng
  // rộng hết khung thì phần lớn mỗi hàng là khoảng trống, và mắt phải quét qua
  // vùng rỗng đó mới tới chữ. `PANEL_MAX_WIDTH` là trần; máy hẹp hơn thì vẫn co
  // theo lề để bảng không bao giờ chạm mép.
  const panelWidth = Math.min(PANEL_MAX_WIDTH, width - PANEL_MARGIN * 2);
  const panelHeight =
    items.length * ROW_HEIGHT + Math.max(0, items.length - 1) * ROW_GAP + PANEL_PADDING_Y * 2;

  const frameStyle = useAnimatedStyle(() => ({
    // Chặn phía DƯỚI, thả phía trên — hai đầu cần hai cách xử lý khác nhau.
    //
    // Cả hai spring đều vượt đích, nhưng chỉ đầu dưới là nguy hiểm: `progress`
    // xuống dưới 0 mà ngoại suy thì `width`/`height` tiến tới số âm và layout vỡ.
    // Đầu trên (`progress > 1` lúc mở) ngoại suy ra khung hơi to hơn kích thước
    // thật rồi lắng về — đó CHÍNH LÀ phần nảy, `clamp` ở đây là cắt mất nó.
    //
    // `Math.max(0, …)` thay cho `'clamp'`: giữ ngoại suy đầu trên, chỉ đặt sàn.
    width: Math.max(0, interpolate(progress.value, [0, 1], [FAB_SIZE, panelWidth])),
    height: Math.max(0, interpolate(progress.value, [0, 1], [FAB_SIZE, panelHeight])),
    // Từ tròn hoàn toàn (nửa cạnh) về bo 28 của bảng.
    borderRadius: Math.max(0, interpolate(progress.value, [0, 1], [FAB_SIZE / 2, 28])),
    // Tan trong lúc CÒN ĐANG CO, không đợi co xong.
    //
    // Panel đục suốt quãng co là một vật to, tối, đang chuyển động — mắt bám vào
    // nó, và nhịp nảy của nút (một vật 56px phía sau) không ai để ý. Cho nó mờ
    // hết từ `0.25` trở xuống thì cái người dùng nhìn theo về cuối chuyển động
    // là NÚT, đúng chỗ nhịp nảy diễn ra.
    //
    // Cận trên là `HANDOFF_AT` chứ không phải 1: mờ sớm hơn nữa thì bảng biến
    // mất trong khi còn to, thành "bảng tắt đèn" chứ không thành "bảng thu về
    // nút". Dùng chung hằng với chỗ bàn giao để hai mốc không thể lệch nhau.
    opacity: interpolate(progress.value, [0, HANDOFF_AT], [0, 1], 'clamp'),
    // Lề phải co từ chỗ FAB đứng về lề bảng; đáy nhích lên khỏi nút một chút.
    right: interpolate(progress.value, [0, 1], [rightOffset, PANEL_MARGIN]),
    bottom: interpolate(progress.value, [0, 1], [bottomOffset, bottomOffset + 8]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [COLOR_FAB, COLOR_PANEL]),
  }));

  /**
   * Bóng của bảng — cùng hình dạng khung, nhưng tan SỚM hơn hẳn phần thân.
   *
   * `shadow-frame` là `0 24px 80px`: một vệt tối toả rộng, lệch xuống 24px, vẽ
   * ngoài biên view. Ở cuối chuyển động đóng, khi khung đã co gần bằng nút, cái
   * vệt ấy vẫn lớn hơn nút nhiều lần — nó trở thành vật nổi bật nhất trong khung
   * hình, và nhịp nảy đọc thành "một lớp ở dưới đang nảy" chứ không phải nút.
   *
   * Cận dưới `0.55` (so với `HANDOFF_AT` = 0.25 của thân): bóng biến mất khi
   * bảng còn khá to, nên cả đoạn cuối chỉ còn hình khối đặc thu về nút. Bảng mất
   * bóng lúc còn to thì không ai để ý — mắt đang bám theo hình đang co.
   */
  const shadowStyle = useAnimatedStyle(() => ({
    width: Math.max(0, interpolate(progress.value, [0, 1], [FAB_SIZE, panelWidth])),
    height: Math.max(0, interpolate(progress.value, [0, 1], [FAB_SIZE, panelHeight])),
    borderRadius: Math.max(0, interpolate(progress.value, [0, 1], [FAB_SIZE / 2, 28])),
    right: interpolate(progress.value, [0, 1], [rightOffset, PANEL_MARGIN]),
    bottom: interpolate(progress.value, [0, 1], [bottomOffset, bottomOffset + 8]),
    opacity: interpolate(progress.value, [0.55, 0.8], [0, 1], 'clamp'),
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

      {/* Bóng của bảng, tách khỏi khung để tan theo nhịp riêng — xem
          `shadowStyle`. Cùng hình dạng, cùng vị trí, chỉ khác opacity. */}
      <Animated.View style={shadowStyle} className="absolute shadow-frame" pointerEvents="none" />

      <Animated.View
        style={frameStyle}
        // `overflow-hidden`: nội dung phải bị cắt theo khung đang giãn, nếu
        // không thì năm ô hiện đầy đủ ngay từ lúc khung còn bé bằng nút.
        //
        // KHÔNG có `shadow-frame` ở đây: bóng `0 24px 80px` là một vệt tối lớn
        // vẽ NGOÀI biên view, lệch hẳn xuống dưới. Nó co và nảy theo khung, nên
        // ở cuối chuyển động cái nhìn thấy rõ nhất không phải cái nút 56px mà là
        // mảng bóng bên dưới nó — animation đọc thành "một lớp ở dưới đang nảy".
        // Bóng chuyển sang view riêng bên dưới để tan sớm hơn phần thân.
        className="absolute overflow-hidden"
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Dấu [+] của trạng thái nút — cùng vị trí, cùng cỡ với FAB thật, nên
            lúc khung mới bắt đầu giãn nó trùng khít với nút vừa biến mất. */}
        <Animated.View
          style={plusStyle}
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <Icon name="plus" size={26} color={ICON_COLOR.white} />
        </Animated.View>

        <Animated.View style={contentStyle} className="flex-1 justify-center px-3 py-3">
          <View className="gap-2">
            {items.map((item, i) => (
              <MenuTile
                key={item.key}
                item={item}
                progress={progress}
                order={i}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Điều hướng TRƯỚC, đóng menu sau — thứ tự này quan trọng.
                  //
                  // Ngược lại thì `onClose()` khởi động spring đóng, và ngay sau
                  // đó `router.push` dựng cả màn hình form trên cùng JS thread.
                  // Animation đang cần thread đó cho `runOnJS(handoff)` và
                  // `setMounted(false)`, nên hai bên giành nhau: sheet đứng im
                  // một nhịp rồi mới bung ra.
                  //
                  // Đẩy route trước thì màn hình mới nhận trọn phần đầu của
                  // thread, còn menu co lại phía sau nó — người dùng đang nhìn
                  // sheet trượt lên nên không ai để ý panel đóng lúc nào.
                  item.onPress();
                  onClose();
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
    // `contentStyle` bắt đầu hiện. `0.06` mỗi bậc — đủ để thấy tuần tự từ trên
    // xuống, chưa đủ để hàng cuối thấy chậm.
    const start = 0.5 + order * 0.06;
    const p = interpolate(progress.value, [start, start + 0.35], [0, 1], 'clamp');
    return {
      opacity: p,
      // Nở từ 0.85 chứ không từ 0: nở từ 0 làm chữ méo lúc đang phóng to.
      transform: [{ scale: interpolate(p, [0, 1], [0.85, 1]) }],
    };
  });

  return (
    <Animated.View style={style}>
      {/* Vùng chạm chạy hết bề ngang bảng, không bó quanh icon: hàng dọc thì
          khoảng trống bên phải nhãn không thuộc về mục nào khác, để nó trơ ra
          chỉ tạo ra những cú chạm hụt ngay cạnh thứ người dùng đang nhắm. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={onPress}
        style={{ height: ROW_HEIGHT }}
        className="flex-row items-center gap-3 rounded-2xl px-2 active:bg-ink/[0.06]"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-ink/[0.06]">
          <Icon name={item.icon} size={20} />
        </View>
        <Text className="text-body font-medium text-ink">{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}
