/**
 * Xác nhận kết quả AI đọc — 05 §5 (capture-review), 06 §6, F4.
 *
 * ── Ràng buộc trung tâm: NGƯỜI DÙNG LUÔN XÁC NHẬN ──
 *
 * Màn này không bao giờ tự ghi bất cứ thứ gì. Nó làm đúng ba việc:
 *   1. gửi ảnh/text lên Edge `parse-capture`,
 *   2. chạy kết quả qua zod của entity tương ứng (`schemas/parsed-schema`),
 *   3. mở form của entity đó với các trường đã điền sẵn.
 *
 * Bản ghi thật chỉ ra đời khi người dùng bấm Lưu **trong form đó**. Một đường
 * tắt "AI chắc rồi, ghi luôn" ở đây sẽ phá niềm tin ở đúng tính năng khác biệt
 * nhất của app — một ngày giỗ sai do AI đoán không phải một ô cần sửa, nó là
 * một lời nhắc sai vào một ngày quan trọng.
 *
 * ── Hết quota KHÔNG chặn đường vào ──
 *
 * `05 F4`: hết lượt free thì nói cụ thể, **và vẫn cho nhập tay từ chính màn
 * hình này**. Đường AI là đường tắt; đường nhập tay là đường luôn có. Cùng lý
 * do cho `capture_not_configured` — chưa cắm model là chuyện của app, không
 * phải lỗi của người dùng, nên nó cũng không được biến thành một bức tường.
 */

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { isAppErrorException } from '@family-organizer/domain';

import { Button, Field, Screen } from '@/design/components';
import { useSubmitCapture, useCapturesLeft } from '@/features/ingest/queries/use-ingest';
import { validateParsed, type ValidatedDraft } from '@/features/ingest/schemas/parsed-schema';
import { useT } from '@/i18n';

/** Vì sao đường AI không dùng được lúc này. Cả hai đều KHÔNG chặn nhập tay. */
type Blocked = 'quota' | 'not_configured' | null;

export function CaptureReviewScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const submit = useSubmitCapture();
  const capturesLeft = useCapturesLeft();

  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState<Blocked>(null);
  const [nothingFound, setNothingFound] = useState(false);

  /**
   * Mở form của entity với dữ liệu đã điền sẵn.
   *
   * Truyền qua params chứ không qua store: form là một route riêng và người
   * dùng có thể quay lại, nên trạng thái phải sống trong URL. Một store toàn
   * cục ở đây sẽ giữ lại bản nháp cũ khi họ mở form lần thứ hai bằng tay.
   */
  const openForm = (draft: ValidatedDraft) => {
    switch (draft.entity) {
      case 'event':
        router.replace({
          pathname: '/(modals)/event-form',
          params: prefillParams({
            title: draft.value.title,
            kind: draft.value.kind,
            calendar: draft.value.calendar,
            solarDate: draft.value.solarDate,
            lunarDay: draft.value.lunarDay,
            lunarMonth: draft.value.lunarMonth,
            estimatedCost: draft.value.estimatedCost,
          }),
        });
        return;
      case 'task':
        router.replace({
          pathname: '/(modals)/task-form',
          params: prefillParams({ title: draft.value.title, dueDate: draft.value.dueDate }),
        });
        return;
      case 'upcoming_payment':
        router.replace({
          pathname: '/(modals)/payment-form',
          params: prefillParams({
            title: draft.value.title,
            amount: draft.value.amount,
            dueDate: draft.value.dueDate,
          }),
        });
        return;
      case 'document':
        router.replace({
          pathname: '/(modals)/doc-form',
          params: prefillParams({
            title: draft.value.title,
            expiryDate: draft.value.expiryDate,
          }),
        });
        return;
    }
  };

  const run = async (input: { source: 'screenshot' | 'photo' | 'text'; text?: string; imagePath?: string }) => {
    setBlocked(null);
    setNothingFound(false);
    try {
      const draft = await submit.mutateAsync(input);
      const validated = validateParsed(draft.suggestedEntityType, draft.parsed);
      if (!validated) {
        // KHÔNG mở một form trống có vẻ như AI đã điền — nói thẳng là chưa đọc
        // được gì rồi để người dùng chọn nhập tay.
        setNothingFound(true);
        return;
      }
      openForm(validated);
    } catch (e) {
      if (isAppErrorException(e)) {
        if (e.error.kind === 'premium_required') {
          setBlocked('quota');
          return;
        }
        if (e.error.kind === 'conflict' && e.error.message === 'capture_not_configured') {
          setBlocked('not_configured');
          return;
        }
      }
      setNothingFound(true);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    // TODO(G17): upload ảnh lên R2 rồi truyền `imagePath`. Đường text đã chạy
    // đầy đủ; đường ảnh chờ cùng lúc với việc nối model (xem `model.ts`).
    await run({ source: 'screenshot', imagePath: result.assets[0].uri });
  };

  return (
    <Screen scroll>
      <View className="py-6">
        <Text className="text-title2 font-semibold text-ink">{t.capture.title}</Text>
        <Text className="mt-2 text-body text-subtle">{t.capture.body}</Text>

        {capturesLeft !== null && blocked === null ? (
          <Text className="mt-2 text-caption text-muted">
            {f(t.capture.left, { count: capturesLeft })}
          </Text>
        ) : null}

        <View className="mt-6 gap-3">
          <Button
            label={t.capture.pickImage}
            onPress={() => void pickImage()}
            disabled={submit.isPending}
          />
          <Field
            label={t.capture.fromText}
            placeholder={t.capture.textPlaceholder}
            value={text}
            onChangeText={setText}
            multiline
          />
          <Button
            label={t.capture.reading}
            variant="secondary"
            loading={submit.isPending}
            disabled={text.trim() === '' || submit.isPending}
            onPress={() => void run({ source: 'text', text: text.trim() })}
          />
        </View>

        {submit.isPending ? (
          <View className="mt-6 items-center">
            <ActivityIndicator />
          </View>
        ) : null}

        {/* Ba câu này nói ba chuyện KHÁC nhau và cố ý không gộp: hết lượt, chưa
            bật, và đọc không ra. Gộp thành một câu chung ("chưa dùng được")
            khiến người dùng không biết chờ tháng sau, chờ bản cập nhật, hay
            chụp lại tấm ảnh rõ hơn. */}
        {blocked === 'quota' ? (
          <Text className="mt-6 text-body text-ink">{t.capture.outOfQuota}</Text>
        ) : null}
        {blocked === 'not_configured' ? (
          <Text className="mt-6 text-body text-ink">{t.capture.notConfigured}</Text>
        ) : null}
        {nothingFound ? (
          <Text className="mt-6 text-body text-ink">{t.capture.nothingFound}</Text>
        ) : null}

        {/* Đường nhập tay LUÔN hiện, không phụ thuộc trạng thái nào ở trên. Đó
            là điểm của cả màn này: AI là đường tắt, nhập tay là đường luôn có. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(modals)/event-form')}
          className="mt-8 min-h-touch items-center justify-center"
        >
          <Text className="text-label font-medium text-muted">{t.capture.manualEntry}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/**
 * Bỏ mọi trường `undefined` trước khi đưa vào params.
 *
 * Expo Router serialize `undefined` thành chuỗi `"undefined"`, và form nhận
 * được một tiêu đề có chữ "undefined" trong ô — trông y hệt như AI đã đọc ra
 * chữ đó.
 */
function prefillParams(v: Record<string, string | number | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val !== undefined) out[k] = String(val);
  }
  return out;
}
