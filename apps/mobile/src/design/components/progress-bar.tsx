/**
 * Thanh tiến độ — primitive.
 *
 * Chỉ nhận hai con số, không biết chúng là mục tiêu hay khoản nợ. Nhờ vậy nó
 * qua được phép thử ranh giới ở `index.ts`: ba nơi dùng (mục tiêu ở màn Tiền,
 * danh sách mục tiêu, chi tiết mục tiêu) và không có type thực thể nào lọt vào.
 *
 * Màu iris nhạt, KHÔNG phải xanh "đạt chỉ tiêu": một mục tiêu chưa xong không
 * phải lỗi cần cảnh báo, và tô màu trạng thái vào đây làm nó đọc thành điểm số.
 * Cùng lý do khiến `deltaText` không tô màu theo dấu (design.md §3.4).
 */

import { View } from 'react-native';

export interface ProgressBarProps {
  value: number;
  total: number;
}

/**
 * Phần trăm đã đạt, kẹp 0–100.
 *
 * Vượt 100% vẫn vẽ đầy thanh chứ không tràn ra ngoài: góp dư mục tiêu là chuyện
 * tốt, và một thanh tràn khung trông như lỗi giao diện.
 */
export function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function ProgressBar({ value, total }: ProgressBarProps) {
  const pct = progressPct(value, total);
  return (
    <View className="mt-2 h-2 overflow-hidden rounded-full bg-soft">
      <View className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </View>
  );
}
