/**
 * Form khoản mừng — 05 F12, 07 §3.4.
 *
 * Đây là màn hình mà cả module tồn tại vì nó: chọn tên nhà xong, DÒNG GỢI Ý
 * hiện ra ngay bên dưới ô số tiền và nói nhà đó đã mừng nhà mình bao nhiêu, khi
 * nào. Không có dòng đó thì đây chỉ là một cái Excel có màu.
 *
 * Đây cũng là CHỖ DUY NHẤT app nhắc nghĩa vụ đáp lễ (07 §3.4). Người dùng đang
 * mở form để ghi một khoản đi cho nhà này, nên đây là khoảnh khắc duy nhất mà
 * "nhà này còn khoản chưa đáp lễ" hành động được. Không có màn hình nào khác
 * đẩy thông tin đó ra, và không có thông báo nào cả.
 *
 * Tên nhà nhập bằng ô CHỮ TỰ DO chứ không phải một danh sách chọn: người dùng
 * đang cầm cái phong bì và đọc tên trên đó, họ chưa biết tên ấy đã có trong sổ
 * hay chưa. Gõ xong, nếu tên khớp một nhà đã có thì gợi ý hiện ra; nếu chưa có
 * thì `findOrCreateContact` tạo lúc lưu. Bắt họ dừng lại để "chọn có sẵn hay
 * tạo mới" là chèn một quyết định vào giữa một việc vốn không có quyết định
 * nào.
 */

import {
  GIFT_DIRECTIONS,
  GIFT_OCCASIONS,
  listOutstandingObligations,
  suggestGiftAmount,
} from '@family-organizer/domain';
import type { GiftDirection, GiftOccasion, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

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
import { shortSolarDate, useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

/** Cùng quy tắc chuẩn hoá với `findOrCreateContact` ở repository. */
function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

/** Hằng vì `react/jsx-no-literals` chặn chuỗi viết thẳng trong JSX. */
const CHECK_MARK = '✓';

export function GiftFormScreen() {
  const { t, f } = useT();
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
  /**
   * KHÔNG MẶC ĐỊNH 'wedding'. Cưới chỉ là một trong tám dịp; để nó làm mặc định
   * là biến bảy dịp còn lại thành ngoại lệ, và người nhập một khoản mừng tân
   * gia sẽ ghi nhầm thành cưới vì chip đã chọn sẵn (07 §3).
   */
  const [occasion, setOccasion] = useState<GiftOccasion | null>(null);
  /** Khoản nhận mà khoản đi này đáp lại — 07 §3.3. */
  const [reciprocatesId, setReciprocatesId] = useState<UUID | null>(null);
  /** Khoản nhận này không sinh nghĩa vụ — 07 §3.4b. Mặc định LÀ CÓ nghĩa vụ. */
  const [noReciprocityNeeded, setNoReciprocityNeeded] = useState(false);
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
   * TOÀN BỘ lý do module này tồn tại (07 §3.4).
   *
   * Chỉ hiện khi đang ghi chiều `given` — câu hỏi mà nó trả lời là "nhà mình đi
   * bao nhiêu?". Lúc ghi một khoản NHẬN thì không có câu hỏi nào cần trả lời,
   * và hiện số nhà đó từng mừng mình lúc đang ghi họ vừa mừng tiếp là thừa.
   *
   * `occasion` vào đây vì mức tiền gắn với DỊP: cùng dịp thì có nút "Dùng số
   * này", khác dịp thì chỉ có dữ kiện. Đổi chip dịp là gợi ý đổi theo.
   */
  const suggestion = useMemo(() => {
    if (direction !== 'given' || matched === null || occasion === null) return null;
    return suggestGiftAmount(matched, allEntries ?? [], occasion);
  }, [direction, matched, allEntries, occasion]);

  /**
   * Nhà này còn khoản nào chưa đáp lễ — 07 §3.4.
   *
   * Nhắc ĐÚNG LÚC CÓ DỊP: người dùng đang mở form để ghi một khoản đi cho nhà
   * này, nên đây là khoảnh khắc duy nhất mà thông tin "còn nợ nhà này một lần"
   * hành động được. App không nhắc định kỳ và không đẩy thông báo — không có
   * dịp thì không làm gì được, và một lời nhắc không hành động được chỉ tạo
   * áy náy.
   */
  const outstanding = useMemo(() => {
    if (direction !== 'given' || matched === null) return [];
    return listOutstandingObligations(allEntries ?? [], matched.contactId);
  }, [direction, matched, allEntries]);

  const trimmedName = name.trim();
  const pending = create.isPending;

  const save = (): void => {
    setSubmitted(true);
    if (trimmedName === '' || occurredOn === null || occasion === null || pending) return;

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
        // Chỉ chiều `given` mới đáp lễ được; trigger ở 0006 chặn nốt nếu lọt.
        reciprocatesId: direction === 'given' ? reciprocatesId : null,
        // Đối xứng: cờ miễn nghĩa vụ chỉ có nghĩa ở chiều `received`, và tang lễ
        // vốn không sinh nghĩa vụ nên không bao giờ gửi cờ này (07 §3.5).
        noReciprocityNeeded:
          direction === 'received' && occasion !== 'funeral' && noReciprocityNeeded,
      },
      { onSuccess: () => router.back() },
    );
  };

  const nameError = submitted && trimmedName === '' ? t.validation.displayName : undefined;
  const occasionError = submitted && occasion === null ? t.validation.giftOccasion : undefined;

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
          onChange={(next) => {
            setDirection(next);
            // Hai trạng thái dưới đây thuộc về hai chiều KHÁC NHAU; đổi chiều mà
            // giữ lại thì ô tích vẫn hiện đã bật trong khi `save` đã lọc nó đi —
            // người dùng thấy một thứ và app ghi một thứ khác.
            setReciprocatesId(null);
            setNoReciprocityNeeded(false);
          }}
          options={GIFT_DIRECTIONS.map((d) => ({ value: d, label: t.giftDirection[d] }))}
        />
      </Field>

      {/* Dịp là một TRỤC, không phải một trường có mặc định: tân gia, đầy
          tháng, giỗ là những dịp ngang hàng với cưới, không phải ngoại lệ của
          nó (07 §3). Vì thế không chip nào được chọn sẵn. */}
      <Field label={t.gift.fieldOccasion} error={occasionError}>
        <ChipSelect
          scroll
          value={occasion}
          onChange={(next) => {
            setOccasion(next);
            // Tang lễ không sinh nghĩa vụ (07 §3.5): bỏ cờ miễn nghĩa vụ đang
            // bật, nếu không ô tích vẫn hiện trong khi trường điều kiện bên dưới
            // đã ẩn đi.
            if (next === 'funeral') setNoReciprocityNeeded(false);
          }}
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

      {/* NGHĨA VỤ ĐÁP LỄ — 07 §3.2.
          Chỉ hiện khi nhà này còn khoản chưa đáp và đang ghi chiều `given`.

          Nằm SAU ô số tiền, không phải trước: dòng gợi ý ở trên vừa nói nhà này
          đã mừng mình bao nhiêu và chưa đáp lễ. Hỏi "đáp khoản nào" trước khi
          người dùng đọc được điều đó là hỏi một câu chưa có ngữ cảnh.

          Ghép cặp là TUỲ CHỌN: bỏ qua vẫn lưu bình thường, vì không phải lần đi
          nào cũng để đáp một lần nhận cụ thể. */}
      {outstanding.length > 0 ? (
        <Field label={t.gift.linkPick}>
          <Text className="mb-2 text-caption text-muted">
            {f(t.gift.outstandingHint, { count: outstanding.length })}
          </Text>
          <ChipSelect
            scroll
            value={reciprocatesId}
            onChange={(next) =>
              // Chạm lại chip đang chọn để BỎ CHỌN. `ChipSelect` không có khái
              // niệm bỏ chọn, và không có đường này thì một cú chạm nhầm bị kẹt
              // cho tới khi đóng sheet — trong khi ghép cặp vốn là tuỳ chọn.
              setReciprocatesId((cur) => (cur === next ? null : next))
            }
            options={outstanding.map((g) => ({
              value: g.id,
              // Nhãn KHÔNG CÓ SỐ TIỀN: đây là chọn "đáp lần nào", không phải
              // chọn "trả bao nhiêu" (07 §3.6).
              label: `${t.giftOccasion[g.occasion]} · ${shortSolarDate(g.occurredOn)}`,
            }))}
          />
        </Field>
      ) : null}

      {/* KHOẢN CHỈ NHẬN, KHÔNG CẦN TRẢ — 07 §3.4b.
          Chỉ hiện ở chiều `received`, và không hiện với tang lễ (dịp đó vốn
          không sinh nghĩa vụ nên không có gì để miễn — 07 §3.5).

          Đặt ở form tạo chứ không chỉ ở màn chi tiết: người ghi BIẾT NGAY LÚC
          NHẬP rằng đây là bố mẹ mừng con. Bắt họ lưu xong rồi đi tìm khoản đó
          để tắt là ba bước cho một điều họ đã biết từ đầu. */}
      {direction === 'received' && occasion !== null && occasion !== 'funeral' ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: noReciprocityNeeded }}
          accessibilityLabel={t.gift.markNotNeeded}
          onPress={() => setNoReciprocityNeeded((v) => !v)}
          className="min-h-touch flex-row items-center gap-3 border-b border-line py-3"
        >
          <View
            className={`h-6 w-6 items-center justify-center rounded-control border-2 ${
              noReciprocityNeeded ? 'border-brand bg-brand' : 'border-subtle bg-surface'
            }`}
          >
            {noReciprocityNeeded ? (
              <Text className="text-caption font-semibold text-on-brand">{CHECK_MARK}</Text>
            ) : null}
          </View>

          <View className="flex-1">
            <Text className="text-body text-ink">{t.gift.markNotNeeded}</Text>
            <Text className="mt-0.5 text-caption text-muted">{t.gift.notNeededHint}</Text>
          </View>
        </Pressable>
      ) : null}

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
          className="min-h-touch rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
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
