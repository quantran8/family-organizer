/**
 * Ngưỡng ghi — 05 §3.3, 06 §2.
 *
 * MỘT câu, BỐN nút, bỏ qua được. Dưới 15 giây.
 *
 * Đây không phải cài đặt kỹ thuật — đây là **hai người tự chốt một quy ước**,
 * app chỉ lưu lại kết quả. Nhờ nó, việc người kia không ghi gì có nghĩa rõ ràng:
 * nếu mỗi người có một ngưỡng riêng trong đầu, hai người sẽ **đọc sai sự im
 * lặng của nhau**.
 *
 * Sau đó KHÔNG BAO GIỜ hỏi lại, và KHÔNG BAO GIỜ chặn ai ghi khoản nhỏ hơn
 * ngưỡng. Nó chỉ làm hai việc: một dòng gợi ý dưới ô nhập tiền, và một đầu vào
 * của `shouldAskForRefresh()`.
 *
 * Người vào bằng MÃ MỜI không thấy màn này (05 §3.2) — họ vào thẳng dữ liệu đã
 * có, và quy ước thì nhà đã chốt rồi.
 */

import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUpdateHousehold } from '@/features/household/queries/use-household';
import { useT } from '@/i18n';

/**
 * Bốn lựa chọn. `null` = "tự quyết" — một giá trị HỢP LỆ, không phải bỏ qua.
 *
 * Ba mốc tiền là ba mức quy ước thật của các gia đình Việt; không có ô nhập tự
 * do vì một con số lẻ (750k) không phải một quy ước dễ nhớ, và cái này chỉ có
 * ích khi cả hai người nhớ được nó.
 */
export const THRESHOLD_OPTIONS: readonly {
  value: number | null;
  labelKey: 'k500' | 'm1' | 'm2' | 'own';
}[] = [
  { value: 500_000, labelKey: 'k500' },
  { value: 1_000_000, labelKey: 'm1' },
  { value: 2_000_000, labelKey: 'm2' },
  { value: null, labelKey: 'own' },
];

export function ThresholdScreen() {
  const { t } = useT();
  const router = useRouter();
  const update = useUpdateHousehold();

  // Bước tiếp theo là gói khởi tạo (05 §3.4), KHÔNG phải vào thẳng app. Cả hai
  // đường (chọn một ngưỡng và bỏ qua) đều đi tiếp như nhau: bỏ qua ngưỡng ghi
  // không có nghĩa là bỏ qua cả onboarding còn lại.
  const finish = () => router.replace('/(auth)/seed');

  const choose = (value: number | null) => {
    // Đi tiếp NGAY, không chờ round-trip. Đây là bước onboarding và người dùng
    // đang muốn vào app; giữ họ lại nhìn một spinner cho một giá trị không chặn
    // gì cả là mâu thuẫn với chính điều màn này nói ("đổi lúc nào cũng được").
    update.mutate({ recordThresholdAmount: value });
    finish();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="text-title1 font-semibold text-ink">{t.threshold.question}</Text>
        <Text className="mt-3 text-body text-subtle">{t.threshold.body}</Text>

        <View className="mt-8 flex-row flex-wrap gap-3">
          {THRESHOLD_OPTIONS.map((o) => (
            <Pressable
              key={o.labelKey}
              accessibilityRole="button"
              onPress={() => choose(o.value)}
              className="min-h-touch min-w-[46%] flex-1 items-center justify-center rounded-control border border-line bg-soft px-4 py-4"
            >
              <Text className="text-body font-medium text-ink">{t.threshold[o.labelKey]}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-6 text-caption text-subtle">{t.threshold.changeable}</Text>

        {/* Bỏ qua = không ghi gì cả, KHÁC với chọn "Tự quyết" (ghi null tường
            minh). Hai thứ này trông giống nhau trên màn hình nhưng khác nhau ở
            chỗ: một cái là quyết định, một cái là chưa quyết định. */}
        <Pressable
          accessibilityRole="button"
          onPress={finish}
          className="mt-8 min-h-touch items-center justify-center"
        >
          <Text className="text-label font-medium text-muted">{t.threshold.skip}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
