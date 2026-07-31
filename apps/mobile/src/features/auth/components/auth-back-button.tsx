/**
 * Nút quay lại ở ĐẦU màn auth.
 *
 * Ở đầu màn chứ không phải một nút [Quay lại] rộng hết chiều ngang ở cuối như
 * `forgot-password`: màn Đăng ký có bốn ô nhập, nút cuối màn nằm dưới đường
 * gấp và người dùng phải cuộn qua cả form mới thoát được. Nút góc trên trái là
 * chỗ tay cái tìm tới theo phản xạ, và nó thấy được ngay khi mở màn.
 *
 * Cố ý KHÔNG bật `headerShown` của Stack: header gốc mang theo cả nền, đường kẻ
 * dưới và khoảng đệm riêng, phá bố cục căn giữa của các màn auth.
 */

import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useT } from '@/i18n';

export interface AuthBackButtonProps {
  /** Nơi quay về khi màn này được mở thẳng bằng deep link (không có gì để `back`). */
  fallback: '/(auth)/sign-in';
}

export function AuthBackButton({ fallback }: AuthBackButtonProps) {
  const { t } = useT();
  const router = useRouter();

  return (
    // Bọc trong View căn trái: Pressable để trần sẽ giãn hết chiều ngang và
    // biến cả dải trên cùng thành vùng bấm.
    <View className="items-start">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.back}
        hitSlop={8}
        // `canGoBack()` sai khi màn là điểm vào đầu tiên — lúc đó `back()`
        // không làm gì và người dùng kẹt lại với một nút chết.
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
        className="h-touch w-touch items-center justify-center -ml-3"
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
            d="m15 18-6-6 6-6"
            stroke="#101014"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}
