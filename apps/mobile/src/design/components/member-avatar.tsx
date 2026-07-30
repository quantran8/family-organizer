/**
 * Ảnh đại diện thành viên — 04 §6.
 *
 * Chưa có ảnh thì hiện chữ cái đầu của tên hiển thị. KHÔNG dùng màu để phân
 * biệt "vợ" / "chồng": gán màu theo vai trò là bước đầu tiên tới việc so sánh
 * hai người, và checklist thiết kế yêu cầu **hai thành viên được thể hiện ngang
 * nhau** (design.md §17). Màu ở đây sinh từ tên, ổn định, và không mang ý nghĩa
 * nào ngoài việc dễ nhận ra.
 */

import { Text, View } from 'react-native';

import { useT } from '@/i18n';

/** Bảng màu trung tính ấm, không trùng màu trạng thái để không đọc nhầm. */
const TONES = ['bg-iris-100', 'bg-task-soft', 'bg-event-soft', 'bg-document-soft'] as const;

function toneFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return TONES[sum % TONES.length] ?? TONES[0];
}

/** Chữ cái đầu — lấy theo ký tự Unicode để "Đ" không vỡ thành "D". */
function initial(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? '?';
}

export interface MemberAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { box: 'h-6 w-6', text: 'text-micro' },
  md: { box: 'h-9 w-9', text: 'text-label' },
  lg: { box: 'h-12 w-12', text: 'text-heading' },
} as const;

export function MemberAvatar({ name, size = 'md' }: MemberAvatarProps) {
  const { t, f } = useT();
  const s = SIZE[size];
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={f(t.a11y.avatar, { name })}
      className={`${s.box} items-center justify-center rounded-full ${toneFor(name)}`}
    >
      <Text className={`${s.text} font-semibold text-ink`}>{initial(name)}</Text>
    </View>
  );
}
