/**
 * Form nạp/rút quỹ — 05 §6.9.
 *
 * Cùng một màn cho cả hai chiều, phân biệt bằng tham số `kind`. Hai chiều khác
 * nhau đúng ở HAI chỗ, và cả hai đều là quyết định sản phẩm:
 *
 *   1. **Mục đích bắt buộc khi RÚT**, tuỳ chọn khi bỏ vào. Rút mà không ghi để
 *      làm gì thì tháng sau không ai nhớ — và một khoản rút không giải thích
 *      được là đúng thứ sinh ra câu hỏi khó chịu vào cuối tháng.
 *
 *   2. **"Ai bỏ vào" CHỈ hỏi khi NẠP.** Rút thì không hỏi ai rút: tiền đã vào
 *      quỹ là tiền chung, và ghi tên người rút là mở đúng cánh cửa mà ngoại lệ
 *      03 §9 đóng lại. Đây không phải tiết kiệm một trường — đây là ranh giới.
 *
 * Ô "ai bỏ vào" là CHỮ TỰ DO có chip bấm nhanh, không phải bộ chọn member: người
 * bỏ tiền vào quỹ không nhất thiết là thành viên household (bố mẹ đưa, em ruột
 * góp). Ép chọn từ danh sách là ép người dùng tạo một member giả cho mỗi người
 * từng đưa tiền.
 */

import type { FundEntry, ISODate, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AmountInput, Button, DatePicker, Field, Sheet } from '@/design/components';
import { useRecordFundEntry } from '@/features/fund/queries/use-funds';
import { useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function FundEntryFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ fundId: string; kind?: string }>();
  const fundId = params.fundId as UUID;
  const kind: FundEntry['kind'] = params.kind === 'withdrawal' ? 'withdrawal' : 'deposit';
  const isDeposit = kind === 'deposit';

  const { data: members } = useMembers();
  const recordEntry = useRecordFundEntry();

  const [amount, setAmount] = useState<number | null>(null);
  const [occurredOn, setOccurredOn] = useState<ISODate>(today);
  const [purpose, setPurpose] = useState('');
  const [contributor, setContributor] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const trimmedPurpose = purpose.trim();
  const dirty = amount !== null || trimmedPurpose !== '' || contributor.trim() !== '';
  const pending = recordEntry.isPending;

  const close = (): void => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(isDeposit ? t.fund.depositTitle : t.fund.withdrawTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const purposeMissing = !isDeposit && trimmedPurpose === '';

  const save = (): void => {
    setSubmitted(true);
    if (amount === null || amount <= 0 || purposeMissing || pending) return;

    recordEntry.mutate(
      {
        fundId,
        input: {
          kind,
          amount,
          occurredOn,
          purpose: trimmedPurpose === '' ? null : trimmedPurpose,
          // Repository cũng bỏ trường này khi rút — hai lớp chặn cùng chiều.
          contributorName: isDeposit && contributor.trim() !== '' ? contributor.trim() : null,
          note: null,
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  const amountError =
    submitted && (amount === null || amount <= 0) ? t.validation.amountPositive : undefined;
  const purposeError = submitted && purposeMissing ? t.validation.fundPurpose : undefined;

  // Chip bấm nhanh: hai người lớn trong nhà. Vẫn gõ tay được tên khác.
  const adults = (members ?? []).filter((m) => m.role === 'owner' || m.role === 'partner');

  return (
    <Sheet
      title={isDeposit ? t.fund.depositTitle : t.fund.withdrawTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field label={t.fund.fieldAmount} error={amountError}>
        <AmountInput
          value={amount}
          onChangeValue={setAmount}
          hasError={amountError !== undefined}
          accessibilityLabel={t.fund.fieldAmount}
        />
      </Field>

      <Field label={t.fund.fieldDate}>
        <DatePicker value={occurredOn} onChange={(d) => setOccurredOn(d ?? today)} today={today} />
      </Field>

      <Field
        label={t.fund.fieldPurpose}
        error={purposeError}
        value={purpose}
        onChangeText={setPurpose}
        placeholder={t.fund.fieldPurposePlaceholder}
        maxLength={200}
      />

      {/* CHỈ khi nạp — xem chú thích đầu file. */}
      {isDeposit ? (
        <Field
          label={t.fund.fieldContributor}
          value={contributor}
          onChangeText={setContributor}
          placeholder={t.fund.fieldContributorPlaceholder}
          maxLength={60}
        />
      ) : null}

      {isDeposit && adults.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {adults.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              className="rounded-full bg-soft px-3 py-2 active:bg-line"
              onPress={() => setContributor(m.displayName)}
            >
              <Text className="text-micro font-medium text-muted">{m.displayName}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}
