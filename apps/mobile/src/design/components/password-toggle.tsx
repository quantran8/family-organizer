/**
 * Nút hiện/ẩn mật khẩu — nằm trong ô nhập, sát mép phải (`Field` prop `trailing`).
 *
 * Có mặt vì gõ mật khẩu trên bàn phím điện thoại sai nhiều hơn hẳn trên bàn
 * phím cứng, và ký tự bị che thì không có cách nào tự kiểm. Không có nút này,
 * đường sửa lỗi duy nhất là xoá hết gõ lại — hoặc tệ hơn ở màn Đăng ký: gõ
 * nhầm cùng một kiểu vào cả hai ô rồi tạo ra một tài khoản không mở được.
 *
 * Mặc định là ẨN, và mỗi ô tự giữ trạng thái của mình. Không nhớ lựa chọn giữa
 * các lần mở màn: mật khẩu hiện sẵn khi người khác cầm máy là thứ người dùng
 * phải chủ động chọn mỗi lần, không phải thứ app quyết hộ từ lần trước.
 */

import { Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useT } from '@/i18n';

export interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

/** `muted`, không phải `ink`: đây là nút phụ, không cạnh tranh với chữ đang gõ. */
const STROKE = '#707078';

export function PasswordToggle({ visible, onToggle }: PasswordToggleProps) {
  const { t } = useT();

  return (
    <Pressable
      accessibilityRole="button"
      // Nhãn nói VIỆC NÓ LÀM khi bấm, không phải trạng thái hiện tại.
      accessibilityLabel={visible ? t.auth.hidePassword : t.auth.showPassword}
      accessibilityState={{ selected: visible }}
      onPress={onToggle}
      className="h-touch w-touch items-center justify-center"
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        {visible ? (
          <>
            <Path
              d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
              stroke={STROKE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={12} cy={12} r={2.5} stroke={STROKE} strokeWidth={2} />
          </>
        ) : (
          <>
            <Path
              d="m3 3 18 18"
              stroke={STROKE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
              stroke={STROKE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M9.9 4.3A10.7 10.7 0 0 1 12 4c6 0 9.5 8 9.5 8a18 18 0 0 1-2.1 3.2"
              stroke={STROKE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M6.6 6.6C4 8.4 2.5 12 2.5 12S6 20 12 20a9.7 9.7 0 0 0 4.1-.9"
              stroke={STROKE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </Svg>
    </Pressable>
  );
}
