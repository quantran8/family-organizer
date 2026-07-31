/**
 * Nhãn trạng thái tài chính — 04 §6.
 *
 * LUÔN kèm chữ, không bao giờ chỉ dùng màu (design.md §14, 04 §10). Đây là mức
 * sàn tiếp cận, không phải tuỳ chọn thẩm mỹ: một phần người dùng không phân biệt
 * được xanh/đỏ, và một chấm màu không chữ với họ là không có thông tin.
 */

import type { FinanceStatus } from '@family-organizer/domain';
import { Text, View } from 'react-native';

import { useT } from '@/i18n';

/** design.md §3.4 — thay bảng màu ở 04 §2 (đã lỗi thời). */
const STATUS_CLASS: Record<FinanceStatus, { bg: string; text: string; dot: string }> = {
  ok: { bg: 'bg-positive-soft', text: 'text-positive', dot: 'bg-positive' },
  watch: { bg: 'bg-attention-soft', text: 'text-attention', dot: 'bg-attention' },
  tight: { bg: 'bg-critical-soft', text: 'text-critical', dot: 'bg-critical' },
  no_data: { bg: 'bg-soft', text: 'text-muted', dot: 'bg-subtle' },
};

export interface StatusPillProps {
  status: FinanceStatus;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const { t } = useT();
  const c = STATUS_CLASS[status];
  const pad = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  const font = size === 'sm' ? 'text-micro' : 'text-caption';

  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full ${c.bg} ${pad}`}>
      <View className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      <Text className={`${font} font-semibold ${c.text}`}>{t.financeStatus[status]}</Text>
    </View>
  );
}
