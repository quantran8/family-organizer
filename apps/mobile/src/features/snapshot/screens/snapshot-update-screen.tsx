/**
 * Cập nhật tình hình — 05 §6.2. **NGHI THỨC CHÍNH của cả sản phẩm.**
 *
 * Vòng lặp thói quen DUY NHẤT có nhịp rõ: nhắc hằng tuần → mở thẳng màn này →
 * bốn con số → xong. Mục tiêu là **dưới 30 giây**, và mọi quyết định dưới đây
 * phục vụ đúng con số đó:
 *
 *   - **Điền sẵn giá trị lần trước.** Người dùng sửa hai ô rồi bấm Lưu, không
 *     phải gõ lại cả bốn. Không có mốc nào trước thì lấy `finance_metrics` —
 *     tổng đang có thật, tốt hơn bốn ô trống bắt họ tự đi cộng.
 *   - **Bàn phím số ngay từ ô đầu**, `AmountInput` lo phần đó.
 *   - **Ghi chú là tuỳ chọn và nằm cuối.** Bắt buộc giải thích mỗi lần cập nhật
 *     là cách chắc chắn để người ta thôi cập nhật.
 *   - **Không hỏi ngày.** Mốc luôn là hôm nay; một ô ngày ở đây chỉ thêm một
 *     quyết định vào thứ phải xong trong 30 giây.
 *
 * Ghi `money_snapshots`, **KHÔNG** ghi đè từng `assets` (05 §6.2) — đây là ảnh
 * chụp cả nhà tại một thời điểm, không phải lệnh sửa từng khoản. Muốn sửa một
 * khoản cụ thể thì vào danh sách tài sản.
 *
 * `status` tính Ở CLIENT bằng `computeFinanceStatus` rồi ghi kèm (02 §4), nên
 * `money/history.tsx` đọc nguyên trạng thái đã lưu chứ không tính lại trên số
 * cũ — tính lại nghĩa là lịch sử đổi nghĩa mỗi lần mình sửa ngưỡng.
 *
 * Push cho người kia: *"Tình hình tài chính gia đình vừa được cập nhật."*
 * **KHÔNG BAO GIỜ** "X đã thay đổi số tiền" — câu đó biến một việc nhà chung
 * thành một hành vi bị ghi nhận, và nó là ràng buộc sản phẩm, không phải văn phong.
 */

import { computeFinanceStatus, type FinanceMetrics } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { AmountInput, Button, Field, Sheet } from '@/design/components';
import { useFinanceMetrics } from '@/features/household/queries/use-household';
import {
  useCreateSnapshot,
  useLatestSnapshot,
} from '@/features/snapshot/queries/use-snapshots';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

/** Bốn ô, đúng thứ tự của 05 §6.2 — cũng là thứ tự bốn dòng trên màn tổng quan. */
type FieldKey = 'usable' | 'savings' | 'longTerm' | 'debt';

export function SnapshotUpdateScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: latest } = useLatestSnapshot();
  const { data: metrics } = useFinanceMetrics();
  const createSnapshot = useCreateSnapshot();

  const [values, setValues] = useState<Record<FieldKey, number | null>>({
    usable: null,
    savings: null,
    longTerm: null,
    debt: null,
  });
  const [note, setNote] = useState('');
  /**
   * Đã điền sẵn chưa.
   *
   * Cần cờ riêng vì hai nguồn điền sẵn (`latest`, `metrics`) về không cùng lúc:
   * không có cờ thì lần thứ hai về sẽ ghi đè đúng thứ người dùng vừa gõ.
   */
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled) return;
    // Ưu tiên mốc trước — đó là "lần trước mình khai bao nhiêu", con số người
    // dùng nhớ. `finance_metrics` là phương án hai: tổng đang có thật, dùng khi
    // chưa có mốc nào (lần cập nhật đầu tiên).
    const source = latest ?? metricsAsSeed(metrics);
    if (!source) return;
    setValues({
      usable: source.totalUsable,
      savings: source.totalSavings,
      longTerm: source.totalLongTerm,
      debt: source.totalDebt,
    });
    setPrefilled(true);
  }, [latest, metrics, prefilled]);

  const set = (key: FieldKey) => (v: number | null) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const dirty =
    note.trim() !== '' ||
    (prefilled &&
      (values.usable !== (latest?.totalUsable ?? null) ||
        values.savings !== (latest?.totalSavings ?? null) ||
        values.longTerm !== (latest?.totalLongTerm ?? null) ||
        values.debt !== (latest?.totalDebt ?? null)));

  const close = (): void => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(t.money.snapshotTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = (): void => {
    if (createSnapshot.isPending) return;

    // Ô để trống = 0, KHÔNG phải "bỏ qua trường này". Một ảnh chụp thiếu một
    // trong bốn con số thì không so được với mốc nào, và `withDiffs` sẽ hiện
    // một chênh lệch bịa ra. Người dùng xoá trắng ô "Đang nợ" nghĩa là nhà mình
    // hết nợ — đó là một thông tin thật, không phải thiếu dữ liệu.
    const totals = {
      totalUsable: values.usable ?? 0,
      totalSavings: values.savings ?? 0,
      totalLongTerm: values.longTerm ?? 0,
      totalDebt: values.debt ?? 0,
    };

    createSnapshot.mutate(
      {
        asOfDate: today,
        ...totals,
        // Trạng thái tại THỜI ĐIỂM NÀY, với bốn con số vừa nhập chứ không phải
        // với `metrics` cũ trong cache. Phần còn lại của FinanceMetrics (khoản
        // đến hạn, cờ) lấy từ view — chúng không nằm trong bốn ô này.
        status: computeFinanceStatus(
          { ...fallbackMetrics(metrics), ...totals },
          today,
        ),
        note: note.trim() === '' ? null : note.trim(),
      },
      {
        onSuccess: () => {
          // Toast bắn TRƯỚC khi đóng: nó sống trong store, nên nó hiện trên màn
          // hình phía dưới sau khi modal này bị gỡ (xem stores/toast.ts).
          //
          // Push cho người kia (`vi.money.snapshotPush` — câu chữ đã chốt) CHƯA
          // gửi ở đây, và cố ý không gửi từ client: máy vừa ghi xong có thể tắt
          // mạng ngay, và người kia sẽ không bao giờ biết. Nó thuộc tầng
          // notification chạy trên Edge (schema §11), lên cùng G9 với các cron
          // nhắc khác. Thiếu nó, nghi thức vẫn đúng cho người đang cập nhật.
          showToast(t.money.snapshotSaved);
          router.back();
        },
      },
    );
  };

  return (
    <Sheet
      title={t.money.snapshotTitle}
      onClose={close}
      actions={
        <Button
          label={t.money.snapshotSave}
          loading={createSnapshot.isPending}
          onPress={save}
        />
      }
    >
      <Field label={t.money.usable}>
        <AmountInput
          value={values.usable}
          onChangeValue={set('usable')}
          accessibilityLabel={t.money.usable}
        />
      </Field>

      <Field label={t.money.savings}>
        <AmountInput
          value={values.savings}
          onChangeValue={set('savings')}
          accessibilityLabel={t.money.savings}
        />
      </Field>

      <Field label={t.money.longTerm}>
        <AmountInput
          value={values.longTerm}
          onChangeValue={set('longTerm')}
          accessibilityLabel={t.money.longTerm}
        />
      </Field>

      <Field label={t.money.debt}>
        <AmountInput
          value={values.debt}
          onChangeValue={set('debt')}
          accessibilityLabel={t.money.debt}
        />
      </Field>

      {/* Ghi chú TUỲ CHỌN, đặt cuối. Câu hỏi là "Có gì cần ghi lại không?" —
          không phải "Vì sao số tiền thay đổi?". Khác biệt đó là toàn bộ khoảng
          cách giữa một cuốn sổ chung và một bản giải trình. */}
      <Field label={t.common.note}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.common.note}
          multiline
          numberOfLines={2}
          maxLength={500}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {createSnapshot.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}

/** Bốn tổng từ view, dùng làm giá trị điền sẵn khi chưa có mốc nào. */
function metricsAsSeed(m: FinanceMetrics | null | undefined) {
  if (!m) return null;
  return {
    totalUsable: m.totalUsable,
    totalSavings: m.totalSavings,
    totalLongTerm: m.totalLongTerm,
    totalDebt: m.totalDebt,
  };
}

/**
 * Nền để tính trạng thái khi `finance_metrics` chưa về.
 *
 * Bốn con số tổng sẽ bị đè bởi giá trị người dùng vừa nhập; phần còn lại để 0
 * nghĩa là "không có khoản đến hạn, không có cờ" — kết quả là `ok` thay vì một
 * `tight` bịa ra từ dữ liệu chưa tải xong.
 */
function fallbackMetrics(m: FinanceMetrics | null | undefined): FinanceMetrics {
  return (
    m ?? {
      totalUsable: 0,
      totalSavings: 0,
      totalLongTerm: 0,
      totalDebt: 0,
      dueNext30d: 0,
      dueNext7dCount: 0,
      overdueCount: 0,
      attentionCount: 0,
      lastUpdatedOn: null,
      lastSnapshotOn: null,
      snapshotIntervalDays: 7,
      currency: 'VND',
    }
  );
}
