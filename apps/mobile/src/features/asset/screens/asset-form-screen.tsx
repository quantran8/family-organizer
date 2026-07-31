/**
 * Form Tài sản — 05 §6.3.
 *
 * Năm trường: tên · loại · giá trị · nơi giữ · người giữ.
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

import { ASSET_KINDS, inferLiquidity, LIQUIDITIES, type AssetKind, type Liquidity, type UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { AmountInput, Button, ChipSelect, Field, Sheet } from '@/design/components';
import {
  useAsset,
  useCreateAsset,
  useUpdateAsset,
} from '@/features/asset/queries/use-assets';
import { useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function AssetFormScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string }>();
  const assetId = (params.id ?? null) as UUID | null;
  const isEdit = assetId !== null;

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

  /**
   * Thanh khoản: `null` = "cứ suy ra từ loại". Người dùng chạm vào một lần thì
   * nó thành một giá trị thật và thôi bị đoán lại.
   */
  const [liquidityOverride, setLiquidityOverride] = useState<Liquidity | null>(null);
  const [showLiquidity, setShowLiquidity] = useState(false);
  const liquidity = liquidityOverride ?? inferLiquidity(assetKind);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setName(existing.name);
    setAssetKind(existing.assetKind);
    setValue(existing.currentValue);
    setInstitution(existing.institution ?? '');
    setHolderMemberId(existing.holderMemberId);
    setNotes(existing.notes ?? '');
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
    trimmed !== '' || value !== null || institution !== '' || holderMemberId !== null || notes !== '';

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

    const input = {
      name: trimmed,
      assetKind,
      liquidity,
      currentValue: value ?? 0,
      holderMemberId,
      institution: institution.trim() === '' ? null : institution.trim(),
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
        autoFocus={!isEdit}
        maxLength={120}
      />

      <Field label={t.asset.fieldKind}>
        <ChipSelect
          scroll
          value={assetKind}
          onChange={setAssetKind}
          options={ASSET_KINDS.map((k) => ({ value: k, label: t.assetKind[k] }))}
        />
      </Field>

      <Field label={t.asset.fieldValue}>
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
            <Text className="text-brand">{t.asset.changeLiquidity}</Text>
          </Text>
        </Pressable>
      )}

      <Field
        label={t.asset.fieldInstitution}
        value={institution}
        onChangeText={setInstitution}
        maxLength={120}
      />

      {/* Người giữ — "tiền đang ở đâu", KHÔNG phải "ai chịu trách nhiệm"
          (ràng buộc #1). "Chưa phân" là một lựa chọn thật, không phải trạng
          thái ẩn: rất nhiều khoản là của chung và không ai "giữ" cả. */}
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

      {createAsset.isError || updateAsset.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
