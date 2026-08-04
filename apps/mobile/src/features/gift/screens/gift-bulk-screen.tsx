/**
 * Nhập nhanh — 07 §3.3.
 *
 * Ngày cưới nhận 100 phong bì. Vòng lặp phải là: tên → Tab → số tiền → Enter →
 * dòng mới, và BÀN PHÍM KHÔNG ĐƯỢC TẮT giữa chừng. Mỗi lần bàn phím đóng lại
 * là một lần người nhập phải chạm lại vào màn hình trong lúc tay đang cầm một
 * chồng phong bì.
 *
 * ── KHÔNG HỎI GÌ THÊM ──
 *
 * Chiều và dịp chọn MỘT LẦN ở đầu màn, áp cho cả mẻ: 100 cái phong bì trong một
 * ngày cưới đều cùng chiều và cùng dịp. Ngày cũng vậy. Hỏi lại ở từng dòng là
 * hỏi cùng một câu 100 lần.
 *
 * Không có dòng gợi ý ở đây, dù dữ liệu có sẵn. Nhập nhanh là lúc GHI LẠI
 * chuyện đã xảy ra, không phải lúc quyết định đi bao nhiêu — gợi ý ở đây chỉ
 * làm chậm một luồng mà cả màn hình này tồn tại để giữ cho nhanh.
 */

import { GIFT_DIRECTIONS, GIFT_OCCASIONS } from '@family-organizer/domain';
import type { GiftDirection, GiftOccasion, UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, ChipSelect, DatePicker, Field } from '@/design/components';
import { useCreateGiftEntriesBulk } from '@/features/gift/queries/use-gifts';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

interface DraftRow {
  /** Khoá cục bộ để React theo dõi dòng — KHÔNG phải id trong DB. */
  key: number;
  name: string;
  amount: string;
}

function emptyRow(key: number): DraftRow {
  return { key, name: '', amount: '' };
}

export function GiftBulkScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = (params.eventId ?? null) as UUID | null;

  const bulk = useCreateGiftEntriesBulk();

  // Chọn MỘT LẦN cho cả mẻ.
  const [direction, setDirection] = useState<GiftDirection>('received');
  /**
   * KHÔNG MẶC ĐỊNH 'wedding' — 07 §3.
   *
   * Ở đây hậu quả nặng hơn form đơn: một mẻ là 100 phong bì, và chip "Cưới"
   * sáng sẵn trong lúc người nhập đang tập trung gõ tên với số tiền sẽ ghi sai
   * dịp cho CẢ MẺ mà không ai nhìn lại.
   */
  const [occasion, setOccasion] = useState<GiftOccasion | null>(null);
  // Nullable vì `DatePicker` cho bỏ chọn — `save` chặn khi null.
  const [occurredOn, setOccurredOn] = useState<string | null>(today);

  const nextKey = useRef(1);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(0)]);
  /** Ô tên của từng dòng, để `focus()` được dòng vừa thêm. */
  const nameRefs = useRef<Record<number, TextInput | null>>({});

  const setRow = (key: number, patch: Partial<DraftRow>): void => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  /**
   * Thêm dòng mới và nhảy con trỏ sang đó ngay.
   *
   * `setTimeout(0)` để `focus()` chạy SAU khi React dựng xong ô nhập mới — gọi
   * thẳng thì ref của dòng vừa thêm còn null và con trỏ ở lại dòng cũ, làm
   * người nhập gõ đè lên số tiền vừa nhập.
   */
  const addRow = (): void => {
    const key = nextKey.current++;
    setRows((prev) => [...prev, emptyRow(key)]);
    setTimeout(() => nameRefs.current[key]?.focus(), 0);
  };

  const removeRow = (key: number): void => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  /** Dòng có tên VÀ có số tiền đọc được. Dòng trống cuối cùng bị bỏ qua. */
  const filled = rows.filter((r) => r.name.trim() !== '' && Number(r.amount) > 0);

  const save = (): void => {
    if (filled.length === 0 || occurredOn === null || occasion === null || bulk.isPending) return;
    bulk.mutate(
      filled.map((r) => ({
        name: r.name.trim(),
        direction,
        occasion,
        amount: Number(r.amount),
        occurredOn,
        eventId,
      })),
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-32 pt-4"
        // Chạm ra ngoài KHÔNG đóng bàn phím giữa chừng — `handled` để nút xoá
        // dòng vẫn bấm được.
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-caption text-muted">{t.gift.bulkHint}</Text>

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

        {/* CỐ Ý KHÔNG CÓ ô "không cần đáp lễ" cho cả mẻ — 07 §3.4b.
            Một mẻ 100 phong bì ở đám cưới mình gồm cả bố mẹ (không cần đáp) lẫn
            họ hàng bạn bè (có nghĩa vụ). Một cái tích cho cả mẻ sẽ tắt sạch
            nghĩa vụ của 99 nhà để đúng cho một nhà, và không ai đi kiểm lại 100
            dòng. Tắt từng khoản ở màn chi tiết từng nhà — chậm hơn nhưng đúng. */}

        <Field label={t.gift.fieldDate}>
          <DatePicker value={occurredOn} onChange={setOccurredOn} today={today} />
        </Field>

        {rows.map((r, i) => (
          <View key={r.key} className="mb-2 flex-row items-center gap-2">
            <TextInput
              ref={(el) => {
                nameRefs.current[r.key] = el;
              }}
              value={r.name}
              onChangeText={(v) => setRow(r.key, { name: v })}
              placeholder={t.gift.bulkName}
              placeholderTextColor="#A4A4AD"
              accessibilityLabel={t.gift.bulkName}
              maxLength={120}
              blurOnSubmit={false}
              className="min-h-touch flex-1 rounded-control border border-line px-4 text-body text-ink"
            />
            <TextInput
              value={r.amount}
              onChangeText={(v) => setRow(r.key, { amount: v.replace(/[^0-9]/g, '') })}
              placeholder={t.gift.bulkAmount}
              placeholderTextColor="#A4A4AD"
              accessibilityLabel={t.gift.bulkAmount}
              keyboardType="number-pad"
              returnKeyType="next"
              // Enter ở ô số tiền = xong một phong bì → dòng mới, bàn phím ở lại.
              blurOnSubmit={false}
              onSubmitEditing={addRow}
              className="min-h-touch w-32 rounded-control border border-line px-4 text-body text-ink"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.delete}
              hitSlop={8}
              onPress={() => removeRow(r.key)}
              className="min-h-touch justify-center px-2"
            >
              <Text className="text-body text-subtle">{i === 0 && rows.length === 1 ? '' : '×'}</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={addRow}
          className="mt-2 min-h-touch justify-center"
        >
          <Text className="text-label font-medium text-ink">{t.gift.bulkAdd}</Text>
        </Pressable>

        {bulk.isError ? (
          <Text className="mt-4 text-caption text-critical">{t.error.unknown}</Text>
        ) : null}
      </ScrollView>

      <View className="border-t border-line bg-surface px-4 py-3">
        {/* Nút NÓI RA vì sao chưa lưu được, thay vì mờ đi không lý do. Thiếu dịp
            xét trước thiếu dòng: người nhập gõ dòng trước rồi mới ngước lên chọn
            dịp, nên khi cả hai cùng thiếu thì "Chọn dịp" là việc còn lại. */}
        <Button
          label={
            occasion === null
              ? t.validation.giftOccasion
              : filled.length === 0
                ? t.gift.bulkEmpty
                : f(t.gift.bulkSave, { count: filled.length })
          }
          loading={bulk.isPending}
          disabled={filled.length === 0 || occasion === null}
          onPress={save}
        />
      </View>
    </View>
  );
}
