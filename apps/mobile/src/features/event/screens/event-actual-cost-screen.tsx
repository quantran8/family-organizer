/**
 * Hỏi chi phí thực tế — 05 §5.7.
 *
 * **Chỗ DUY NHẤT app hỏi về một con số đã qua.** Mọi màn hình khác nhìn về phía
 * trước; màn này quay lại một lần, và nó tồn tại chỉ để nuôi trí nhớ năm sau
 * (06 §5). Nếu có lúc nào thấy cần hỏi thêm về quá khứ, câu trả lời là không —
 * app này không phải sổ kế toán.
 *
 * ## Hỏi MỘT LẦN, và "bỏ qua" là một câu trả lời
 *
 * Cả `[Lưu]` lẫn `[Bỏ qua]` đều đặt `cost_asked = true`. Hai nút, một hệ quả về
 * việc có hỏi lại hay không — đó không phải cẩu thả mà là toàn bộ thiết kế: hỏi
 * lần thứ hai về một chuyện đã qua là phiền, không phải chu đáo. Người dùng bỏ
 * qua vì họ không nhớ, không muốn nói, hoặc dịp đó chẳng tốn gì; cả ba lý do
 * đều không khá hơn sau một tuần.
 *
 * Vuốt xuống để đóng sheet KHÔNG đóng câu hỏi — xem ghi chú ở `dismiss()`.
 *
 * ## Không có ô ghi chú
 *
 * `event_occurrences.notes` có trong schema nhưng không có ô nhập ở đây. Sheet
 * này bật lên **không mời mà tới**, ngay lúc người dùng mở app định làm việc
 * khác. Một ô số điền được trong ba giây thì họ trả lời; thêm một ô chữ thì họ
 * bấm Bỏ qua, và ta mất luôn con số.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AmountInput, Button, Field, Sheet } from '@/design/components';
import { usePendingCostAsk, useRecordActualCost } from '@/features/event/queries/use-events';
import { useT } from '@/i18n';

export function EventActualCostScreen() {
  const { t, f } = useT();
  const router = useRouter();

  const { data: pending } = usePendingCostAsk();
  const record = useRecordActualCost();

  const [amount, setAmount] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  /**
   * Điền sẵn số DỰ KIẾN, không để trống.
   *
   * Phần lớn dịp diễn ra gần đúng như đã liệu, nên người dùng chỉ cần sửa vài
   * chữ số — cùng lý do với `update-asset-value`. Ô trống còn làm mất mốc để
   * nhớ: không thấy "1.000.000" trước mặt thì họ gõ một con số tròn hơn thực tế.
   */
  useEffect(() => {
    if (prefilled || !pending) return;
    setAmount(pending.estimatedCost);
    setPrefilled(true);
  }, [pending, prefilled]);

  /**
   * Đóng sheet mà KHÔNG trả lời — vuốt xuống, hoặc nút X.
   *
   * Cố ý không đặt `cost_asked`: vuốt xuống là một cử chỉ điều hướng, không
   * phải một quyết định. Người dùng vuốt vì đang vội, vì bấm nhầm, vì muốn xem
   * lại sự kiện trước đã. Coi đó là "bỏ qua vĩnh viễn" là diễn giải im lặng
   * thành đồng ý, ở đúng thứ dữ liệu mà cả tính năng này dựa vào.
   *
   * Hệ quả: câu hỏi sẽ bật lại ở lần mở app kế tiếp. Đó là ĐÚNG — `[Bỏ qua]`
   * nằm ngay cạnh `[Lưu]` và tốn đúng một chạm, nên người thật sự không muốn
   * trả lời có một đường thoát rõ ràng, được ghi lại.
   */
  const dismiss = (): void => router.back();

  const save = (): void => {
    if (!pending || record.isPending) return;
    record.mutate(
      { occurrenceId: pending.occurrence.id, amount },
      { onSuccess: () => router.back() },
    );
  };

  const skip = (): void => {
    if (!pending || record.isPending) return;
    record.mutate(
      { occurrenceId: pending.occurrence.id, amount: null },
      { onSuccess: () => router.back() },
    );
  };

  // Cache đã bị dọn (người dùng vừa trả lời ở một tab khác) — không còn gì để hỏi.
  if (!pending) return null;

  return (
    <Sheet
      title={f(t.event.costAskTitle, { title: pending.eventTitle })}
      onClose={dismiss}
      scroll={false}
      actions={
        <View className="gap-3">
          <Button
            label={t.event.costAskSave}
            loading={record.isPending}
            // Không nhập gì mà bấm Lưu thì không khác gì Bỏ qua — chặn để hai
            // nút giữ đúng nghĩa của chúng.
            disabled={amount === null}
            onPress={save}
          />
          <Button
            label={t.event.costAskSkip}
            variant="secondary"
            disabled={record.isPending}
            onPress={skip}
          />
        </View>
      }
    >
      <Text className="mb-4 text-body text-muted">{t.event.costAskBody}</Text>

      <Field label={t.event.costAskField}>
        <AmountInput
          value={amount}
          onChangeValue={setAmount}
          autoFocus
          accessibilityLabel={t.event.costAskField}
        />
      </Field>

      {/* Nói trước hệ quả để "Bỏ qua" là lựa chọn có hiểu biết, không phải một
          cái bẫy nhỏ. */}
      <Text className="text-caption text-subtle">{t.event.costAskOnce}</Text>

      {record.isError ? (
        <Text className="mt-2 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}
    </Sheet>
  );
}
