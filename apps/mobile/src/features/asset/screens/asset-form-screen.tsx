/**
 * Form Tài sản — 05 §6.3.
 *
 * **Hình dạng form đổi theo loại** (03 §2b, `assetShape()`). Một form chung cho
 * tám loại là một form đúng cho không loại nào: ô "Nơi giữ" mang nghĩa tên ngân
 * hàng với sổ tiết kiệm, chỗ cất với vàng, địa chỉ với nhà đất, và TÊN MỘT
 * NGƯỜI với khoản cho vay. Cùng một ô, bốn câu hỏi — người dùng phải tự dịch
 * mỗi lần, và mỗi người dịch một kiểu.
 *
 * Ba thứ đổi theo loại:
 *   · nhãn + placeholder của `institution` (hoặc ẩn hẳn — tiền mặt không có)
 *   · số lượng + đơn vị, chỉ vàng
 *   · ngày hẹn trả + ẩn "người giữ", chỉ khoản cho vay
 *
 * Bốn trường CHUNG cho mọi loại — tên · loại · giá trị · ghi chú — vẫn giữ
 * nguyên thứ tự và vị trí khi đổi loại, nên đổi loại không làm form nhảy chỗ.
 *
 * **Thanh khoản KHÔNG hỏi** (03 §2). Nó được suy ra bằng `inferLiquidity(kind)`
 * và ẩn sau dòng nhỏ "Đổi cách phân loại". Hỏi thẳng *"khoản này dùng ngay được
 * không?"* là mất nguyên tắc nhập-vài-giây, mà nó lại là điều kiện bắt buộc để
 * tính được trạng thái tài chính. Suy ra đúng gần hết trường hợp, và phần còn
 * lại sửa được — nhưng chỉ khi người dùng chủ động đi tìm.
 *
 * Một khi họ đã tự chọn thanh khoản, đổi loại tài sản KHÔNG đè lên lựa chọn đó
 * nữa. Cùng nguyên tắc với form sự kiện ở G6 (người dùng chọn lịch một lần thì
 * mặc định thôi đè lên): một trường đã được người dùng chạm vào là một quyết
 * định, không phải một giá trị đang chờ được đoán lại.
 *
 * Dùng cho CẢ tạo mới lẫn sửa (`?id=`). Khác `task-form` — việc nhà sửa tại chỗ
 * được vì nó có hai trường; một khoản tiền có năm trường và một lựa chọn ẩn.
 *
 * **Giá trị ở đây KHÔNG ghi lịch sử.** Sửa `currentValue` qua form này là sửa
 * một con số nhập sai; ghi nhận giá trị MỚI theo thời gian là việc của
 * `update-asset-value` (RPC + `money_events`). Trộn hai thứ đó làm lịch sử đầy
 * những "thay đổi" vốn chỉ là sửa lỗi chính tả.
 */

import {
  ASSET_KINDS,
  assetShape,
  inferLiquidity,
  LIQUIDITIES,
  QUANTITY_UNITS,
  type AssetKind,
  type ISODate,
  type Liquidity,
  type QuantityUnit,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { AmountInput, Button, ChipSelect, DatePicker, Field, Sheet } from '@/design/components';
import {
  useAsset,
  useCreateAsset,
  useUpdateAsset,
} from '@/features/asset/queries/use-assets';
import { useRecordThresholdHint } from '@/features/household/queries/use-record-threshold';
import { useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';
import { useSheetAutoFocus } from '@/lib/use-sheet-autofocus';
import { useToday } from '@/lib/use-today';

export function AssetFormScreen() {
  const { t } = useT();
  const thresholdHint = useRecordThresholdHint();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string }>();
  const assetId = (params.id ?? null) as UUID | null;
  const isEdit = assetId !== null;
  // Bàn phím bật SAU khi sheet trượt xong — xem `use-sheet-autofocus`.
  const titleRef = useSheetAutoFocus(!isEdit);

  const { data: existing } = useAsset(assetId);
  const { data: members } = useMembers();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const [name, setName] = useState('');
  const [assetKind, setAssetKind] = useState<AssetKind>('bank_account');
  const [value, setValue] = useState<number | null>(null);
  const [institution, setInstitution] = useState('');
  const [holderMemberId, setHolderMemberId] = useState<UUID | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Trường riêng theo loại — xem `assetShape()`. Loại nào không có thì chúng
  // được dọn về null lúc đổi loại (`changeKind`), không phải chỉ ẩn đi.
  const [quantity, setQuantity] = useState<number | null>(null);
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('chi');
  const [dueDate, setDueDate] = useState<ISODate | null>(null);

  const shape = assetShape(assetKind);

  /**
   * Thanh khoản: `null` = "cứ suy ra từ loại". Người dùng chạm vào một lần thì
   * nó thành một giá trị thật và thôi bị đoán lại.
   */
  const [liquidityOverride, setLiquidityOverride] = useState<Liquidity | null>(null);
  const [showLiquidity, setShowLiquidity] = useState(false);
  const liquidity = liquidityOverride ?? inferLiquidity(assetKind);

  /**
   * Đổi loại thì DỌN những trường loại mới không có, không chỉ ẩn chúng đi.
   *
   * Ẩn mà vẫn giữ giá trị sẽ ghi xuống DB một hàng "tiền mặt" mang số lượng
   * vàng — vô hình trên màn hình nên không ai sửa được, và CHECK ở migration
   * 0010 sẽ từ chối nó bằng một câu lỗi mà người dùng không nối được với thao
   * tác nào của mình.
   *
   * `institution` KHÔNG bị dọn khi cả hai loại đều có ô đó: gõ nhầm loại rồi
   * sửa lại là chuyện thường, và xoá chữ người ta vừa gõ là mất dữ liệu chứ
   * không phải dọn dẹp. Chỉ dọn khi loại mới thật sự không có chỗ chứa nó.
   */
  const changeKind = (next: AssetKind): void => {
    const nextShape = assetShape(next);
    setAssetKind(next);
    if (nextShape.placeLabel === null) setInstitution('');
    if (!nextShape.hasQuantity) setQuantity(null);
    if (!nextShape.hasHolder) setHolderMemberId(null);
    if (!nextShape.hasDueDate) setDueDate(null);
  };

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setName(existing.name);
    setAssetKind(existing.assetKind);
    setValue(existing.currentValue);
    setInstitution(existing.institution ?? '');
    setHolderMemberId(existing.holderMemberId);
    setNotes(existing.notes ?? '');
    setQuantity(existing.quantity);
    if (existing.quantityUnit) setQuantityUnit(existing.quantityUnit);
    setDueDate(existing.dueDate);
    // Khoản đang sửa đã có thanh khoản đã lưu. Nếu nó khác giá trị suy ra thì
    // đó là một lựa chọn người dùng từng cân nhắc — giữ nguyên và hiện ra, đừng
    // âm thầm kéo nó về giá trị mặc định.
    if (existing.liquidity !== inferLiquidity(existing.assetKind)) {
      setLiquidityOverride(existing.liquidity);
      setShowLiquidity(true);
    }
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  const trimmed = name.trim();
  const dirty =
    trimmed !== '' ||
    value !== null ||
    institution !== '' ||
    holderMemberId !== null ||
    notes !== '' ||
    quantity !== null ||
    dueDate !== null;

  const close = (): void => {
    if (!dirty || isEdit) {
      router.back();
      return;
    }
    Alert.alert(t.asset.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pending = createAsset.isPending || updateAsset.isPending;

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || pending) return;

    // Trường riêng theo loại đi qua `shape`, KHÔNG đi thẳng từ state: state có
    // thể còn giữ giá trị cũ nếu đường nào đó đổi loại mà không qua
    // `changeKind`. Lọc ở đây là chốt chặn cuối trước khi chạm DB.
    const input = {
      name: trimmed,
      assetKind,
      liquidity,
      currentValue: value ?? 0,
      holderMemberId: shape.hasHolder ? holderMemberId : null,
      institution:
        shape.placeLabel === null || institution.trim() === '' ? null : institution.trim(),
      // Hai trường đi liền nhau — có số thì có đơn vị, không số thì cả hai null.
      quantity: shape.hasQuantity ? quantity : null,
      quantityUnit: shape.hasQuantity && quantity !== null ? quantityUnit : null,
      dueDate: shape.hasDueDate ? dueDate : null,
      asOfDate: today,
      notes: notes.trim() === '' ? null : notes.trim(),
    };

    if (isEdit && assetId) {
      updateAsset.mutate(
        { id: assetId, patch: input },
        { onSuccess: () => router.back() },
      );
      return;
    }
    createAsset.mutate(input, { onSuccess: () => router.back() });
  };

  const nameError = submitted && trimmed === '' ? t.validation.assetName : undefined;

  return (
    <Sheet
      title={isEdit ? t.asset.formEditTitle : t.asset.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      <Field
        label={t.asset.fieldName}
        error={nameError}
        value={name}
        onChangeText={setName}
        placeholder={t.asset.fieldNamePlaceholder}
        ref={titleRef}
        maxLength={120}
      />

      {/* Loại đứng TRƯỚC giá trị và nơi giữ, vì nó quyết định hai khối bên
          dưới hỏi gì. Đổi loại ở cuối form sẽ làm những ô vừa điền biến mất. */}
      <Field label={t.asset.fieldKind}>
        <ChipSelect
          scroll
          value={assetKind}
          onChange={changeKind}
          options={ASSET_KINDS.map((k) => ({ value: k, label: t.assetKind[k] }))}
        />
      </Field>

      {/* ── SỐ LƯỢNG: chỉ vàng ──
          Đặt TRƯỚC ô giá trị vì nó là dữ liệu gốc: "2 chỉ" đúng mãi mãi, còn
          "15 triệu" chỉ đúng đến lần giá vàng đổi tiếp theo. App không tra giá
          và không nhân hộ — một con số tiền tự đổi mà không ai khai là đúng thứ
          ràng buộc #4 cấm. */}
      {shape.hasQuantity ? (
        <Field label={t.asset.fieldQuantity} hint={t.asset.quantityHint}>
          <View className="flex-row items-center gap-3">
            <TextInput
              value={quantity === null ? '' : String(quantity)}
              onChangeText={(s) => {
                // Dấu phẩy là cách người Việt gõ số lẻ; parseFloat chỉ hiểu dấu
                // chấm. Không đổi thì "1,5 chỉ" thành NaN rồi âm thầm về null.
                const n = Number.parseFloat(s.replace(',', '.'));
                setQuantity(s.trim() === '' || Number.isNaN(n) ? null : n);
              }}
              keyboardType="decimal-pad"
              accessibilityLabel={t.asset.fieldQuantity}
              maxLength={10}
              className="min-h-touch flex-1 rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
            />
            <ChipSelect
              value={quantityUnit}
              onChange={setQuantityUnit}
              options={QUANTITY_UNITS.map((u) => ({ value: u, label: t.quantityUnit[u] }))}
            />
          </View>
        </Field>
      ) : null}

      {/* `hint` là DÒNG NHẮC, không phải cảnh báo (06 §2): nó không đổi màu,
          không chặn lưu, và không xuất hiện khi nhà chọn "tự quyết". */}
      <Field label={t.asset.fieldValue} hint={thresholdHint ?? undefined}>
        <AmountInput
          value={value}
          onChangeValue={setValue}
          accessibilityLabel={t.asset.fieldValue}
        />
      </Field>

      {/* ── THANH KHOẢN: ẩn sau một dòng nhỏ ──
          Dòng này cố ý mờ và nhỏ. Nó phải TỒN TẠI (10% trường hợp suy sai cần
          sửa được) nhưng không được mời gọi — mỗi người mở nó ra là một người
          vừa phải nghĩ về một khái niệm mà app hứa sẽ không bắt họ nghĩ. */}
      {showLiquidity ? (
        <Field label={t.asset.changeLiquidity} hint={t.liquidity[liquidity]}>
          <ChipSelect
            scroll
            value={liquidity}
            onChange={setLiquidityOverride}
            options={LIQUIDITIES.map((l) => ({ value: l, label: t.liquidity[l] }))}
          />
        </Field>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.asset.changeLiquidity}
          hitSlop={8}
          onPress={() => setShowLiquidity(true)}
          className="mb-4 min-h-touch justify-center"
        >
          <Text className="text-caption text-subtle">
            {`${t.liquidity[liquidity]} · `}
            <Text className="text-ink">{t.asset.changeLiquidity}</Text>
          </Text>
        </Pressable>
      )}

      {/* ── NƠI GIỮ: nhãn đổi theo loại, tiền mặt thì không có ──
          Cùng một cột `institution`, năm câu hỏi khác nhau. Tiền mặt là `null`
          có chủ ý: "nơi giữ" của tiền mặt hoặc hiển nhiên (trong nhà) hoặc là
          thứ không nên ghi vào một app đồng bộ lên mây. */}
      {shape.placeLabel !== null ? (
        <Field
          label={t.asset.place[shape.placeLabel]}
          placeholder={t.asset.placePlaceholder[shape.placeLabel]}
          value={institution}
          onChangeText={setInstitution}
          maxLength={120}
        />
      ) : null}

      {/* ── NGÀY HẸN TRẢ: chỉ khoản cho vay ──
          Ngày này để NGƯỜI GHI tự nhớ mình đã hẹn bao giờ. Nó KHÔNG sinh nhắc
          và KHÔNG vào `upcoming_needs`: app đi đòi hộ là ràng buộc #6, còn cộng
          tiền-sắp-nhận vào "cần chuẩn bị" làm con số hero nhỏ đi dựa trên một
          lời hứa của người khác. */}
      {shape.hasDueDate ? (
        <Field label={t.asset.fieldDueDate} hint={t.asset.dueDateHint}>
          <DatePicker value={dueDate} onChange={setDueDate} today={today} />
        </Field>
      ) : null}

      {/* Người giữ — "tiền đang ở đâu", KHÔNG phải "ai chịu trách nhiệm"
          (ràng buộc #1). "Chưa phân" là một lựa chọn thật, không phải trạng
          thái ẩn: rất nhiều khoản là của chung và không ai "giữ" cả.

          Ẩn với khoản cho vay: tiền đang ở chỗ NGƯỜI VAY, mà người đó đã được
          ghi ở ô trên rồi. Hỏi thêm "người giữ" ở đây tạo ra đúng thứ ràng buộc
          #1 cấm — một cái tên gắn vào một con số tiền mà không trả lời câu hỏi
          nào cả. */}
      {shape.hasHolder ? (
        <Field label={t.asset.fieldHolder}>
          <ChipSelect
            scroll
            value={holderMemberId}
            onChange={setHolderMemberId}
            options={[
              { value: null, label: t.task.fieldAssigneeNone },
              ...(members ?? []).map((m) => ({ value: m.id as UUID | null, label: m.displayName })),
            ]}
          />
        </Field>
      ) : null}

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

      {createAsset.isError || updateAsset.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
