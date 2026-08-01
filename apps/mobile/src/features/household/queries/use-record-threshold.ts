/**
 * Dòng gợi ý dưới ô nhập tiền — 06 §2.
 *
 * *"Nhà mình ghi từ 2 triệu trở lên"* — MỘT dòng nhắc nhẹ.
 *
 * **ĐÂY KHÔNG PHẢI VALIDATION.** Không chặn form, không đổi màu, không cảnh báo
 * khi người dùng ghi khoản nhỏ hơn. Nếu biến nó thành ràng buộc, nó thành quy
 * định của app áp lên gia đình — trong khi nó phải giữ nguyên nghĩa: một quy ước
 * hai người tự chốt, app chỉ lưu lại.
 *
 * Trả `null` khi nhà chọn "tự quyết" hoặc chưa chốt. Khi đó form KHÔNG hiện gì
 * cả — không hiện "chưa đặt ngưỡng", vì đó là một lời nhắc làm một việc mà màn
 * onboarding đã nói rõ là bỏ qua được.
 */

import { formatMoney } from '@family-organizer/domain';

import { useHousehold } from '@/features/household/queries/use-household';
import { interpolate, vi } from '@/i18n';

export function useRecordThresholdHint(): string | null {
  const { data: household } = useHousehold();

  const amount = household?.recordThresholdAmount ?? null;
  if (amount === null) return null;

  return interpolate(vi.threshold.hint, {
    amount: formatMoney(amount, household?.currency ?? 'VND'),
  });
}
