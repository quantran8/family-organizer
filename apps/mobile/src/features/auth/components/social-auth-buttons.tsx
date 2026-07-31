/**
 * Google · Apple — hai nút cạnh nhau.
 *
 * ── Vì sao nằm ngang, không xếp chồng ──
 *
 * Hai nút rộng hết chiều ngang xếp chồng chiếm gần một phần ba màn và đẩy ô
 * Email xuống dưới đường gấp. Chúng là đường PHỤ (đường chính là email + mật
 * khẩu, xem `sign-in-screen`), nên chúng không được chiếm chỗ như đường chính.
 * Nằm ngang thì cả hai vẫn giữ đủ vùng chạm 44px.
 *
 * ── Vì sao có logo thật ──
 *
 * Nút đăng nhập mạng xã hội được nhận ra bằng LOGO trước khi chữ được đọc. Một
 * nút chỉ có chữ "Tiếp tục với Google" mất đúng cái tín hiệu khiến nó nhanh hơn
 * đường email — mà nhanh hơn là lý do duy nhất nó đứng trước.
 *
 * Logo Google giữ NGUYÊN bốn màu chính thức: nhãn hiệu của bên thứ ba không
 * phải chỗ áp bảng màu của mình, và một chữ G đơn sắc trông như hàng nhái. Đây
 * là ngoại lệ có chủ đích với luật "một mảng màu mỗi màn" (design.md §5.5) —
 * ô logo 20px không phải một mảng màu.
 *
 * ── Trạng thái `disabled` ──
 *
 * Google/Apple cần cấu hình native (bundle id, URL scheme, provider ở Supabase)
 * và một EAS dev build — Expo Go không đủ. Trong lúc chờ, nút hiện mờ VÀ có
 * `accessibilityState.disabled` để trình đọc màn hình nói rõ là chưa dùng được,
 * thay vì để người dùng bấm vào một nút im lặng.
 */

import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useT } from '@/i18n';

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </Svg>
  );
}

function AppleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#101014"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.28-.08 2.17.7 2.91.76 1.11-.23 2.17-.89 3.36-.8 1.43.12 2.51.68 3.22 1.7-2.95 1.77-2.25 5.66.46 6.75-.54 1.42-1.25 2.83-1.95 4.56ZM12.03 7.25C11.88 5.14 13.6 3.4 15.57 3.23c.27 2.44-2.22 4.26-3.54 4.02Z"
      />
    </Svg>
  );
}

interface SocialButtonProps {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}

function SocialButton({ label, icon, disabled = false, onPress }: SocialButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={[
        'min-h-touch flex-1 flex-row items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-3',
        disabled ? 'opacity-40' : 'active:bg-soft',
      ].join(' ')}
    >
      {icon}
      <Text className="text-body font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

export function SocialAuthButtons() {
  const { t } = useT();

  return (
    <View className="flex-row gap-3">
      <SocialButton label={t.auth.google} icon={<GoogleMark />} disabled />
      <SocialButton label={t.auth.apple} icon={<AppleMark />} disabled />
    </View>
  );
}
