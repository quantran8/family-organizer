/**
 * Form Giấy tờ — 05 §7.3.
 *
 * **Hỏi đúng ba trường trước: tên · ngày hết hạn · bản giấy để đâu.** Còn lại
 * để sau. Loại giấy tờ có mặt vì nó quyết định mặc định nhắc trước (hộ chiếu
 * 180 ngày, còn lại 30 — 03 §5), nhưng nó có sẵn giá trị nên không phải một câu
 * hỏi bắt buộc trả lời.
 *
 * ── Vì sao KHÔNG có bước chọn file ở đây ──
 *
 * Spec gốc (05 §7.3) mở thẳng máy quét rồi mới hỏi ba trường. Bỏ máy quét
 * (đã chốt) làm thứ tự đó không còn nghĩa: "mở thư viện ảnh trước khi hỏi tên"
 * bắt người dùng đi tìm ảnh cho một bản ghi chưa tồn tại. Nên form này lưu
 * TRƯỚC, và việc đính file nằm ở màn chi tiết — nơi đã có một bản ghi thật để
 * đính vào.
 *
 * Đó không phải một bước lùi: giấy tờ **không có file nào vẫn là bản ghi đầy
 * đủ** (05 §7.2), và ma sát để có ảnh chụp giờ cao hơn nên đường "chỉ ghi chỗ
 * để giấy" phải là đường chính. Dòng nhắc dưới tiêu đề nói thẳng điều đó thay
 * vì để người dùng tự đoán mình đã làm thiếu.
 *
 * Dùng cho cả tạo mới lẫn sửa (`?id=`), cùng lối với `asset-form`.
 * `?eventId=` đến từ nút "Gắn giấy tờ" trên màn chi tiết sự kiện (05 §5.4).
 */

import {
  defaultLeadDaysForDocument,
  DOC_TYPES,
  type DocType,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { AmountInput, Button, ChipSelect, DatePicker, Field, Sheet } from '@/design/components';
import {
  useCreateDocument,
  useDocument,
  useUpdateDocument,
} from '@/features/document/queries/use-documents';
import { useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';
import { showToast } from '@/stores/toast';
import { useToday } from '@/lib/use-today';

export function DocumentFormScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const docId = (params.id ?? null) as UUID | null;
  const eventId = (params.eventId ?? null) as UUID | null;
  const isEdit = docId !== null;

  const { data: existing } = useDocument(docId);
  const { data: members } = useMembers();
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocType>('other');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [physicalLocation, setPhysicalLocation] = useState('');
  const [ownerMemberId, setOwnerMemberId] = useState<UUID | null>(null);
  const [issuedDate, setIssuedDate] = useState<string | null>(null);
  const [renewalCost, setRenewalCost] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  /**
   * Nhắc trước: `null` = "cứ suy ra từ loại". Cùng nguyên tắc với thanh khoản ở
   * `asset-form` và với lịch ở `event-form` — một trường người dùng đã chạm vào
   * là một quyết định, không phải một giá trị đang chờ được đoán lại.
   */
  const [leadOverride, setLeadOverride] = useState<number | null>(null);
  const remindLeadDays = leadOverride ?? defaultLeadDaysForDocument(type);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!isEdit || loaded || !existing) return;
    setTitle(existing.title);
    setType(existing.type);
    setExpiryDate(existing.expiryDate);
    setPhysicalLocation(existing.physicalLocation ?? '');
    setOwnerMemberId(existing.ownerMemberId);
    setIssuedDate(existing.issuedDate);
    setRenewalCost(existing.renewalCost);
    // Lead đã lưu khác giá trị suy ra nghĩa là người dùng từng tự chọn — giữ
    // nguyên, đừng âm thầm kéo về mặc định khi họ đổi loại giấy tờ.
    if (existing.remindLeadDays !== defaultLeadDaysForDocument(existing.type)) {
      setLeadOverride(existing.remindLeadDays);
    }
    setLoaded(true);
  }, [isEdit, loaded, existing]);

  const trimmed = title.trim();
  const dirty =
    trimmed !== '' || expiryDate !== null || physicalLocation !== '' || notes !== '';

  const close = (): void => {
    if (!dirty || isEdit) {
      router.back();
      return;
    }
    Alert.alert(t.doc.formTitle, t.common.cancel, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.close, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pending = createDoc.isPending || updateDoc.isPending;

  const save = (): void => {
    setSubmitted(true);
    if (trimmed === '' || pending) return;

    const input = {
      title: trimmed,
      type,
      ownerMemberId,
      issuedDate,
      expiryDate,
      remindLeadDays,
      physicalLocation: physicalLocation.trim() === '' ? null : physicalLocation.trim(),
      externalLink: null,
      notes: notes.trim() === '' ? null : notes.trim(),
      renewalCost,
      eventId,
      debtId: null,
      extra: {},
    };

    if (isEdit && docId) {
      updateDoc.mutate(
        { id: docId, patch: input },
        {
          onSuccess: () => {
            showToast(t.doc.savedToast);
            router.back();
          },
        },
      );
      return;
    }
    // Tạo mới đi THẲNG vào màn chi tiết chứ không quay lại danh sách: đó là nơi
    // đính file, và người vừa lưu một giấy tờ có ảnh chụp sẵn trong máy sẽ phải
    // tự đi tìm lại bản ghi mình vừa tạo nếu bị trả về danh sách.
    createDoc.mutate(input, {
      onSuccess: (doc) => {
        showToast(t.doc.savedToast);
        router.replace({ pathname: '/(app)/docs/[id]', params: { id: doc.id } });
      },
    });
  };

  const titleError = submitted && trimmed === '' ? t.validation.docTitle : undefined;

  return (
    <Sheet
      title={isEdit ? t.doc.formEditTitle : t.doc.formTitle}
      onClose={close}
      actions={<Button label={t.common.save} loading={pending} onPress={save} />}
    >
      {/* Nói trước rằng file là bước sau. Không có dòng này, người dùng mở form
          ra tìm nút "thêm ảnh", không thấy, và tưởng mình đang dùng sai. */}
      {!isEdit ? (
        <Text className="mb-4 text-caption text-subtle">{t.doc.formFilesLater}</Text>
      ) : null}

      {/* ── Ba trường chính, đúng thứ tự 05 §7.3 ── */}
      <Field
        label={t.doc.fieldTitle}
        error={titleError}
        value={title}
        onChangeText={setTitle}
        placeholder={t.doc.fieldTitlePlaceholder}
        autoFocus={!isEdit}
        maxLength={120}
      />

      <Field label={t.doc.fieldExpiry} hint={t.common.optional}>
        <DatePicker value={expiryDate} onChange={setExpiryDate} today={today} />
      </Field>

      {/* Trường quan trọng NHẤT trên màn chi tiết (05 §7.2) — thứ Google Drive
          không làm được. Vẫn không bắt buộc: "chưa biết để đâu" là câu trả lời
          thật, và chặn lưu vì nó thì người dùng sẽ không lưu gì cả. */}
      <Field
        label={t.doc.fieldPhysical}
        value={physicalLocation}
        onChangeText={setPhysicalLocation}
        placeholder={t.doc.fieldPhysicalPlaceholder}
        maxLength={200}
      />

      {/* ── Còn lại: có sẵn giá trị, không phải câu hỏi ── */}
      {/* Nhắc trước hiện ở `hint` chứ không phải một ô nhập: nó là hệ quả của
          loại giấy tờ (hộ chiếu 180 ngày, còn lại 30 — 03 §5), và hỏi thẳng
          "muốn nhắc trước bao nhiêu ngày" là bắt người dùng quyết một thứ họ
          chưa có cơ sở nào để quyết. `leadOverride` giữ nguyên khi đổi loại, nên
          ai đã tự chọn một lần thì không bị đoán lại. */}
      <Field label={t.doc.fieldType} hint={f(t.doc.remindLeadDays, { days: remindLeadDays })}>
        <ChipSelect
          scroll
          value={type}
          onChange={setType}
          options={DOC_TYPES.map((k) => ({ value: k, label: t.docType[k] }))}
        />
      </Field>

      <Field label={t.doc.fieldOwner}>
        <ChipSelect
          scroll
          value={ownerMemberId}
          onChange={setOwnerMemberId}
          options={[
            { value: null, label: t.task.fieldAssigneeNone },
            ...(members ?? []).map((m) => ({ value: m.id as UUID | null, label: m.displayName })),
          ]}
        />
      </Field>

      <Field label={t.doc.fieldIssued} hint={t.common.optional}>
        <DatePicker value={issuedDate} onChange={setIssuedDate} today={today} />
      </Field>

      <Field label={t.doc.fieldRenewalCost} hint={t.common.optional}>
        <AmountInput
          value={renewalCost}
          onChangeValue={setRenewalCost}
          accessibilityLabel={t.doc.fieldRenewalCost}
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

      {createDoc.isError || updateDoc.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-4" />
    </Sheet>
  );
}
