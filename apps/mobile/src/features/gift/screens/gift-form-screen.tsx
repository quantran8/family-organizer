/**
 * Form khoản mừng — 05 F12, 07 §3.3.
 *
 * Đây là màn hình mà cả module tồn tại vì nó: chọn tên nhà xong, DÒNG GỢI Ý
 * hiện ra ngay bên dưới ô số tiền và nói nhà đó đã mừng nhà mình bao nhiêu, khi
 * nào. Không có dòng đó thì đây chỉ là một cái Excel có màu.
 *
 * Tên nhà nhập bằng ô CHỮ TỰ DO chứ không phải một danh sách chọn: người dùng
 * đang cầm cái phong bì và đọc tên trên đó, họ chưa biết tên ấy đã có trong sổ
 * hay chưa. Gõ xong, nếu tên khớp một nhà đã có thì gợi ý hiện ra; nếu chưa có
 * thì `findOrCreateContact` tạo lúc lưu. Bắt họ dừng lại để "chọn có sẵn hay
 * tạo mới" là chèn một quyết định vào giữa một việc vốn không có quyết định
 * nào.
 */

import { GIFT_DIRECTIONS, GIFT_OCCASIONS, suggestGiftAmount } from '@family-organizer/domain';
import type { GiftDirection, GiftOccasion, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import {
  AmountInput,
  Button,
  ChipSelect,
  DatePicker,
  Field,
  Sheet,
} from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { GiftSuggestion } from '@/features/gift/components';
import {
  useCreateGiftEntryByName,
  useGiftEntries,
  useGiftHistory,
} from '@/features/gift/queries/use-gifts';
import { useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

/** Cùng quy tắc chuẩn hoá với `findOrCreateContact` ở repository. */
function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

export function GiftFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();
  const currency = useCurrency();

  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = (params.eventId ?? null) as UUID | null;

  const nameRef = useSheetAutoFocus(true);

  const { data: history } = useGiftHistory();
  const { data: allEntries } = useGiftEntries();
  const create = useCreateGiftEntryByName();

  const [name, setName] = useState('');
  const [direction, setDirection] = useState<GiftDirection>('given');
  const [occasion, setOccasion] = useState<GiftOccasion>('wedding');
  const [amount, setAmount] = useState<number | null>(null);
  // Nullable vì `DatePicker` cho bỏ chọn; một khoản mừng luôn cần ngày nên
  // `save` chặn khi null.
  const [occurredOn, setOccurredOn] = useState<string | null>(today);
  const [inKindNote, setInKindNote] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  /**
   * Nhà đang gõ, khớp theo tên đã chuẩn hoá.
   *
   * Khớp CHÍNH XÁC, không khớp mờ: gợi ý sai nhà là đưa ra một dữ kiện về người
   * khác, và người dùng không có cách nào biết nó sai.
   */
  const matched = useMemo(() => {
    const wanted = normalizeName(name);
    if (wanted === '') return null;
    return (history ?? []).find((h) => normalizeName(h.displayName) === wanted) ?? null;
  }, [history, name]);

  /**
   * TOÀN BỘ lý do module này tồn tại (07 §3.3).
   *
   * Chỉ hiện khi đang ghi chiều `given` — câu hỏi mà nó trả lời là "nhà mình đi
   * bao nhiêu?". Lúc ghi một khoản NHẬN thì không có câu hỏi nào cần trả lời,
   * và hiện số nhà đó từng mừng mình lúc đang ghi họ vừa mừng tiếp là thừa.
   */
  const suggestion = useMemo(() => {
    if (direction !== 'given' || matched === null) return null;
    return suggestGiftAmount(matched, allEntries ?? []);
  }, [direction, matched, allEntries]);

  const trimmedName = name.trim();
  const pending = create.isPending;

  const save = (): void => {
    setSubmitted(true);
    if (trimmedName === '' || occurredOn === null || pending) return;

    // Hook lo việc tra tên và tạo nhà nếu chưa có — người dùng không phải quyết
    // định chuyện đó, và màn hình không phải biết tới repository.
    create.mutate(
      {
        name: trimmedName,
        direction,
        occasion,
        amount: amount ?? 0,
        occurredOn,
        eventId,
        inKindNote: inKindNote.trim() === '' ? null : inKindNote.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
      },
      { onSuccess: () => router.back() },
    );
  };

  const nameError = submitted && trimmedName === '' ? t.validation.displayName : undefined;

  return (
    <Sheet
      title={t.gift.formTitle}
      onClose={() => router.back()}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field
        label={t.gift.fieldContact}
        error={nameError}
        value={name}
        onChangeText={setName}
        placeholder={t.gift.fieldContactPlaceholder}
        ref={nameRef}
        maxLength={120}
      />

      <Field label={t.gift.fieldDirection}>
        <ChipSelect
          value={direction}
          onChange={setDirection}
          options={GIFT_DIRECTIONS.map((d) => ({ value: d, label: t.giftDirection[d] }))}
        />
      </Field>

      <Field label={t.gift.fieldOccasion}>
        <ChipSelect
          scroll
          value={occasion}
          onChange={setOccasion}
          options={GIFT_OCCASIONS.map((o) => ({ value: o, label: t.giftOccasion[o] }))}
        />
      </Field>

      <Field label={t.gift.fieldAmount}>
        <AmountInput
          value={amount}
          onChangeValue={setAmount}
          accessibilityLabel={t.gift.fieldAmount}
        />
        {/* Dòng gợi ý nằm NGAY DƯỚI ô số tiền — đúng chỗ câu hỏi đang được hỏi.
            Nó KHÔNG tự điền số: người dùng phải chạm "Dùng số này". */}
        <GiftSuggestion
          contactName={matched?.displayName ?? trimmedName}
          suggestion={suggestion}
          currency={currency}
          onUse={setAmount}
        />
      </Field>

      <Field label={t.gift.fieldDate}>
        <DatePicker value={occurredOn} onChange={setOccurredOn} today={today} />
      </Field>

      {/* Quà hiện vật: khi có chữ ở đây thì số tiền để 0 và dòng gợi ý không
          hiện số nào (suggestGiftAmount trả null với amount = 0). */}
      <Field
        label={t.gift.fieldInKind}
        value={inKindNote}
        onChangeText={setInKindNote}
        placeholder={t.gift.fieldInKindPlaceholder}
        maxLength={200}
      />

      <Field label={t.common.note}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t.common.notePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.common.note}
          multiline
          numberOfLines={2}
          maxLength={2000}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      {create.isError ? (
        <View>
          <Text className="text-caption text-critical">{t.error.unknown}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}
