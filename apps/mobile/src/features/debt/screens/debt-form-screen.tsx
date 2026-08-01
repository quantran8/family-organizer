/**
 * Form Nợ — 05 §6.5.
 *
 * ── **Dư nợ chỉ hỏi MỘT LẦN, lúc tạo** (02 §7) ──
 *
 * Đây là ràng buộc quan trọng nhất của màn này, và nó được ép ở **tầng type**
 * chứ không chỉ ở runtime: `DebtPatch = Partial<Omit<DebtInput,
 * 'remainingAmount'>>`, nên một ô nhập dư nợ ở chế độ sửa sẽ không biên dịch
 * được.
 *
 * Lý do: dư nợ giảm qua RPC `settle_payment`, cùng transaction với việc chốt
 * một kỳ trả và ghi `money_events`. Cho sửa tay thì lịch sử và số dư lệch nhau,
 * và **không có cách nào biết cái nào đúng** — `money_events` là append-only,
 * không sửa lại được.
 *
 * Ở chế độ sửa, chỗ đó là một dòng chữ nói dư nợ tự giảm thế nào. Ẩn hẳn thì
 * người dùng đi tìm; nói ra thì họ biết phải làm gì thay thế.
 *
 * ── Chỉ `name` và `remainingAmount` là bắt buộc ──
 *
 * Phần lớn khoản vay người thân không có lãi suất, không có lịch trả cố định,
 * và không ai nhớ chính xác gốc ban đầu. Bắt điền đủ sẽ khiến người dùng gõ
 * bừa — và một con số bừa trong app tiền còn tệ hơn một ô trống.
 */

import type { RecurFreq, Recurrence, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AmountInput, Button, ChipSelect, DatePicker, Field, Sheet } from '@/design/components';
import {
  useCreateDebt,
  useDebt,
  useUpdateDebt,
} from '@/features/debt/queries/use-debts';
import { useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

/**
 * Kỳ trả nợ chỉ có ba lựa chọn, không phải năm như việc nhà.
 *
 * Không có khoản vay nào trả hằng ngày hay hằng tuần. Bày ra hai lựa chọn không
 * ai chọn làm hàng chip dài thêm và làm hai lựa chọn thật khó thấy hơn.
 *
 * `'none'` là lựa chọn THẬT, không phải trạng thái chưa chọn: vay người thân,
 * trả một lần khi có tiền là ca rất phổ biến ở đây.
 */
const DEBT_FREQS: readonly (RecurFreq | 'none')[] = ['monthly', 'yearly', 'none'];

export function DebtFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string }>();
  const debtId = (params.id ?? null) as UUID | null;
  const isEdit = debtId !== null;
  // Bàn phím bật SAU khi sheet trượt xong — xem `use-sheet-autofocus`.
  const titleRef = useSheetAutoFocus(!isEdit);

  const { data: existing } = useDebt(debtId);
  const { data: members } = useMembers();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();

  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [principalAmount, setPrincipalAmount] = useState<number | null>(null);
  const [remainingAmount, setRemainingAmount] = useState<number | null>(null);
  const [interestRatePct, setInterestRatePct] = useState<number | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number | null>(null);
  const [freq, setFreq] = useState<RecurFreq | 'none'>('monthly');
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [finalDueDate, setFinalDueDate] = useState<string | null>(null);
  const [borrowerMemberId, setBorrowerMemberId] = useState<UUID | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setName(existing.name);
    setLender(existing.lender ?? '');
    setPrincipalAmount(existing.principalAmount);
    setInterestRatePct(existing.interestRatePct);
    setInstallmentAmount(existing.installmentAmount);
    setNextDueDate(existing.nextDueDate);
    setFinalDueDate(existing.finalDueDate);
    setBorrowerMemberId(existing.borrowerMemberId);
    setFreq(existing.installmentRecur?.freq ?? 'none');
    // `remainingAmount` CỐ Ý không nạp — form sửa không có ô đó.
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  const trimmed = name.trim();
  const dirty = trimmed !== '' || remainingAmount !== null || lender !== '';

  const close = (): void => {
    if (!dirty || isEdit) {
      router.back();
      return;
    }
    Alert.alert(t.debt.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pending = createDebt.isPending || updateDebt.isPending;

  // Kỳ trả cần một mốc neo, cùng lý do với việc lặp ở `task-form`: không có
  // `nextDueDate` thì "hằng tháng" không nói được kỳ tới rơi vào ngày nào, và
  // `spawn-debt-installments` sẽ không có gì để cộng thêm một tháng vào.
  const installmentRecur: Recurrence | null =
    freq === 'none' || nextDueDate === null ? null : { freq, intervalN: 1 };

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || pending) return;
    // Tạo mới BẮT BUỘC có dư nợ: đó là con số duy nhất khoản nợ này tồn tại để
    // trả lời. Sửa thì không — ô đó không có mặt.
    if (!isEdit && remainingAmount === null) return;

    const shared = {
      name: trimmed,
      lender: lender.trim() === '' ? null : lender.trim(),
      borrowerMemberId,
      principalAmount,
      interestRatePct,
      installmentAmount,
      installmentRecur,
      nextDueDate,
      finalDueDate,
      asOfDate: today,
    };

    if (isEdit && debtId) {
      updateDebt.mutate(
        { id: debtId, patch: shared },
        {
          onSuccess: () => {
            showToast(t.debt.savedToast);
            router.back();
          },
        },
      );
      return;
    }

    createDebt.mutate(
      { ...shared, remainingAmount: remainingAmount ?? 0 },
      {
        onSuccess: () => {
          showToast(t.debt.savedToast);
          router.back();
        },
      },
    );
  };

  const nameError = submitted && trimmed === '' ? t.validation.debtName : undefined;
  const remainingError =
    submitted && !isEdit && remainingAmount === null ? t.validation.amountPositive : undefined;

  return (
    <Sheet
      title={isEdit ? t.debt.formEditTitle : t.debt.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field
        label={t.debt.fieldName}
        error={nameError}
        value={name}
        onChangeText={setName}
        placeholder={t.debt.fieldNamePlaceholder}
        ref={titleRef}
        maxLength={120}
      />

      {/* Dư nợ: ô nhập khi tạo, một dòng chữ khi sửa (xem đầu file). */}
      {isEdit ? (
        <View className="mb-4 rounded-control bg-soft px-4 py-3">
          <Text className="text-caption text-muted">{t.debt.remainingReadonly}</Text>
        </View>
      ) : (
        <Field label={t.debt.fieldRemaining} error={remainingError}>
          <AmountInput
            value={remainingAmount}
            onChangeValue={setRemainingAmount}
            accessibilityLabel={t.debt.fieldRemaining}
          />
        </Field>
      )}

      <Field label={t.debt.fieldLender} value={lender} onChangeText={setLender} maxLength={120} />

      <Field label={t.debt.fieldPrincipal} hint={t.common.optional}>
        <AmountInput
          value={principalAmount}
          onChangeValue={setPrincipalAmount}
          accessibilityLabel={t.debt.fieldPrincipal}
        />
      </Field>

      <Field label={t.debt.fieldInstallment} hint={t.common.optional}>
        <AmountInput
          value={installmentAmount}
          onChangeValue={setInstallmentAmount}
          accessibilityLabel={t.debt.fieldInstallment}
        />
      </Field>

      {/* Kỳ trả tiếp theo đứng TRƯỚC lựa chọn lặp: lặp chỉ có nghĩa khi đã có
          mốc neo (xem `installmentRecur` ở trên), và hỏi ngược thứ tự sẽ để
          người dùng chọn "hằng tháng" rồi âm thầm bị bỏ qua. */}
      <Field label={t.debt.fieldNextDue} hint={t.common.optional}>
        <DatePicker value={nextDueDate} onChange={setNextDueDate} today={today} />
      </Field>

      {nextDueDate !== null ? (
        <Field label={t.task.fieldRecur}>
          <ChipSelect
            value={freq}
            onChange={setFreq}
            options={DEBT_FREQS.map((v) => ({ value: v, label: t.recur[v] }))}
          />
        </Field>
      ) : null}

      <Field label={t.debt.fieldFinalDue} hint={t.common.optional}>
        <DatePicker value={finalDueDate} onChange={setFinalDueDate} today={today} />
      </Field>

      {/* Người vay — NGỮ CẢNH ở cấp từng khoản (ràng buộc #1), không bao giờ
          xuất hiện ở danh sách hay trong một tổng nào. */}
      <Field label={t.debt.fieldBorrower}>
        <ChipSelect
          scroll
          value={borrowerMemberId}
          onChange={setBorrowerMemberId}
          options={[
            { value: null, label: t.task.fieldAssigneeNone },
            ...(members ?? []).map((m) => ({ value: m.id as UUID | null, label: m.displayName })),
          ]}
        />
      </Field>

      {createDebt.isError || updateDebt.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
