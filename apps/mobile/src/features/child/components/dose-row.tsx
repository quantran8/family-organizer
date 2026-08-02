/**
 * Một mũi tiêm — 07 §4.2, §4.5.
 *
 * ── BA RÀNG BUỘC VỀ CHỮ VÀ MÀU ──
 *
 * 1. Mũi quá lịch dùng `attention`, KHÔNG dùng `critical`. `critical` chỉ dành
 *    cho lỗi và hậu quả không hoàn tác được (tailwind.config §5.4); một mũi trễ
 *    là chuyện tiêm bù được, không phải một thảm hoạ. Màu đỏ ở đây làm bố mẹ
 *    hoảng mà không giúp được gì.
 *
 * 2. Trạng thái KHÔNG chỉ nói bằng màu (04 §10): mỗi mũi luôn có CHỮ nói rõ
 *    "còn 9 ngày" hay "quá lịch 12 ngày".
 *
 * 3. Mũi trễ kèm một VIỆC LÀM ĐƯỢC — liên hệ cơ sở tiêm — chứ không phải một
 *    lời trách. Không có chữ "bạn đã bỏ lỡ" ở bất cứ đâu.
 *
 * KHÔNG CÓ nút hoãn hay bỏ mũi. App không bao giờ gợi ý hoãn, bỏ, hay đổi thứ
 * tự mũi tiêm (07 §4.2) — không phải vì chưa làm, mà vì sẽ không làm.
 */

import { Pressable, Text, View } from 'react-native';

import type { ChildVaccineDose, DoseStatus } from '@family-organizer/domain';
import { doseLabelText, useT } from '@/i18n';
import { Checkbox } from '@/design/components';

export interface DoseRowProps {
  dose: ChildVaccineDose;
  status: DoseStatus;
  /** Kết quả `formatDoseLabel()` đã dựng thành câu. */
  label: ReturnType<typeof doseLabelText>;
  onMarkDone?: () => void;
  onUndo?: () => void;
}

export function DoseRow({ dose, status, label, onMarkDone, onUndo }: DoseRowProps) {
  const { t } = useT();
  const done = status === 'done';
  const overdue = status === 'overdue';

  return (
    <View className="border-b border-line bg-surface py-3">
      <View className="min-h-touch flex-row items-center gap-3">
        <Checkbox
          checked={done}
          onToggle={(next) => (next ? onMarkDone?.() : onUndo?.())}
        />
        <View className="flex-1">
          <Text className={done ? 'text-body text-muted' : 'text-body text-ink'} numberOfLines={2}>
            {dose.displayName}
          </Text>
          {/* Chữ, không chỉ màu — trạng thái phải đọc được khi không phân biệt
              được màu sắc. */}
          <Text
            className={overdue ? 'text-caption text-attention' : 'text-caption text-subtle'}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>

      {/* Một việc LÀM ĐƯỢC, không phải một lời trách. */}
      {overdue ? (
        <Text className="ml-9 mt-1 text-caption text-muted">{t.child.overdueHint}</Text>
      ) : null}
    </View>
  );
}

/** Dòng gọn cho danh sách "Sắp tới" trên màn Nhà mình. */
export function UpcomingDoseRow({
  dose,
  label,
  onPress,
}: {
  dose: ChildVaccineDose;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className="min-h-touch flex-row items-center justify-between gap-3 py-2"
    >
      <Text className="flex-1 text-body text-ink" numberOfLines={1}>
        {dose.displayName}
      </Text>
      <Text className="text-caption text-subtle">{label}</Text>
    </Pressable>
  );
}
