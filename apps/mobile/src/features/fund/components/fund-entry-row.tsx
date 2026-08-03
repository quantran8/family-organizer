/**
 * Một dòng nạp/rút quỹ — 09 §E.9.
 *
 * ```
 * 5/9    Bỏ vào              +10.000.000 ₫
 *        tiền nhà tháng 9              Anh
 * ```
 *
 * HAI QUYẾT ĐỊNH VỀ MÀU, cả hai đều là quyết định sản phẩm:
 *
 *   1. Khoản RÚT dùng `default` (đen), KHÔNG dùng `danger` (đỏ). Rút tiền khỏi
 *      quỹ chung không phải một lỗi lầm — đó là quỹ để tiêu. Tô đỏ mọi lần chi
 *      tiền nhà là app đang cau mày với việc trả tiền nhà.
 *   2. Khoản NẠP dùng `ok` (xanh). Đây là ngoại lệ hẹp của luật "số tiền không
 *      tự đổi màu theo dấu" (04 §3.4): ở màn này hai loại khoản nằm xen kẽ
 *      nhau, và dấu +/− một mình quá nhỏ để quét bằng mắt.
 *
 * Tên người bỏ vào chỉ hiện Ở KHOẢN NẠP. Khoản rút không ghi ai rút — tiền đã
 * vào quỹ là tiền chung, và ghi tên người rút là mở đúng cánh cửa mà cả module
 * này đóng (03 §9 ngoại lệ 2).
 */

import type { FundEntry } from '@family-organizer/domain';
import { Swipeable } from 'react-native-gesture-handler';
import { Pressable, Text, View } from 'react-native';

import { MoneyText } from '@/design/components';
import { useT } from '@/i18n';

export interface FundEntryRowProps {
  entry: FundEntry;
  /** Nhãn ngày đã định dạng sẵn — dựng câu chữ là việc của màn hình. */
  dateLabel: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export function FundEntryRow({ entry, dateLabel, onPress, onDelete }: FundEntryRowProps) {
  const { t } = useT();
  const isDeposit = entry.kind === 'deposit';

  const row = (
    <View className="min-h-touch flex-row items-start gap-3 bg-surface py-3">
      {/* Bề ngang cố định để cột ngày thẳng hàng khi quét dọc. */}
      <Text className="w-12 text-caption text-subtle">{dateLabel}</Text>

      <View className="flex-1">
        <Text className="text-body text-ink">
          {isDeposit ? t.fund.deposit : t.fund.withdraw}
        </Text>
        {entry.purpose ? (
          <Text className="text-caption text-subtle" numberOfLines={1}>
            {entry.purpose}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <MoneyText
          amount={isDeposit ? entry.amount : -entry.amount}
          size="body"
          tone={isDeposit ? 'ok' : 'default'}
        />
        {isDeposit && entry.contributorName ? (
          <Text className="text-caption text-subtle" numberOfLines={1}>
            {entry.contributorName}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const pressable = onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {row}
    </Pressable>
  ) : (
    row
  );

  if (!onDelete) return pressable;

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          className="justify-center bg-critical-soft px-5"
          onPress={onDelete}
        >
          <Text className="text-label font-medium text-critical">{t.common.delete}</Text>
        </Pressable>
      )}
    >
      {pressable}
    </Swipeable>
  );
}
