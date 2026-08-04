/**
 * Đích của deep link `family://join/{code}` — F2, luồng SỐNG-CÒN (05 §9).
 *
 * Màn này có đúng một việc: B đã có mã, hỏi B muốn được gọi là gì, rồi đưa vào
 * nhà. KHÔNG hỏi lại mã — B vừa chạm vào một đường dẫn chứa nó, bắt gõ lại là
 * nói rằng app không tin thứ nó vừa nhận.
 *
 * Hai đường vào, cùng một màn:
 *   1. B đã đăng nhập → deep link mở thẳng vào đây.
 *   2. B chưa đăng nhập → gate đẩy sang `sign-in`, mã nằm lại ở
 *      `stores/pending-invite`; đăng nhập xong gate đưa ngược về đây.
 *
 * Vì sao mã lấy từ store khi param rỗng: ở đường (2), route bị `replace` mất
 * nên param không còn. Xem chú thích dài ở `stores/pending-invite.ts`.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button, Field, Screen } from '@/design/components';
import {
  joinHouseholdSchema,
  type JoinHouseholdValues,
} from '@/features/auth/schemas/auth-schema';
import { useRedeemInvite } from '@/features/invite/queries/use-invite';
import { useT } from '@/i18n';
import { readPendingInvite, usePendingInvite } from '@/stores/pending-invite';
import { useSessionStore } from '@/stores/session';

export function JoinScreen() {
  const { t } = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const redeem = useRedeemInvite();
  const setHousehold = useSessionStore((s) => s.setHousehold);
  const clearPendingInvite = usePendingInvite((s) => s.clear);

  // Param thắng store: nếu B chạm một lời mời MỚI trong lúc còn mã cũ trên máy,
  // thứ họ vừa chạm mới là thứ họ muốn.
  const code = params.code ?? readPendingInvite() ?? '';

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<JoinHouseholdValues>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { code, displayName: '' },
  });

  // Mã tới sau lần render đầu (store rehydrate từ AsyncStorage là bất đồng bộ).
  useEffect(() => {
    if (code) setValue('code', code);
  }, [code, setValue]);

  const onSubmit = handleSubmit((values) =>
    redeem.mutate(values, {
      onSuccess: (householdId) => {
        // Dọn mã NGAY khi dùng xong: để lại thì lần đăng nhập sau B lại bị kéo
        // về màn này với một mã đã `accepted`.
        clearPendingInvite();
        // Tên nhà và memberId chưa biết ở đây — `null`, KHÔNG phải chuỗi rỗng:
        // `memberId` đi thẳng vào `completed_by` khi B chạm ô tròn đầu tiên, và
        // `''` không phải uuid hợp lệ nên Postgres từ chối cả câu update. Gate
        // điền đủ khi `my_households` trả về ở vòng sau.
        setHousehold({ id: householdId, name: null, memberId: null });
        router.replace('/(app)/(tabs)/home');
      },
    }),
  );

  // Không có mã ở cả hai nguồn: link hỏng hoặc mã đã quá 24 giờ. Đưa về setup
  // thay vì hiện một form không điền được — ở đó vẫn có nhánh "Tôi có mã mời".
  if (!code) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6">
          <Text className="text-title2 font-semibold text-ink">{t.setup.title}</Text>
          <Text className="text-body text-muted">{t.error.inviteInvalid}</Text>
          <Button
            label={t.common.continue}
            onPress={() => router.replace('/(auth)/setup')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="flex-1 justify-center py-12">
        <Text className="text-title1 font-semibold text-ink">{t.setup.joinConfirmTitle}</Text>

        {/* Hiện mã ở dạng ĐỌC, không phải ô nhập: nó là thông tin xác nhận
            ("đúng lời mời này"), không phải thứ B phải làm gì với nó. */}
        <View className="mb-6 mt-4 self-start rounded-control bg-soft px-4 py-2">
          <Text
            className="text-title2 font-semibold tracking-[4px] text-ink"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {code}
          </Text>
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Field
              label={t.setup.displayName}
              hint={t.setup.displayNameHint}
              placeholder={t.setup.displayNamePlaceholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.displayName?.message}
              autoFocus
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          )}
        />

        {errors.code ? (
          <Text className="mb-3 text-caption text-critical">{errors.code.message}</Text>
        ) : null}
        {redeem.isError ? (
          <Text className="mb-3 text-caption text-critical">{t.error.inviteInvalid}</Text>
        ) : null}

        <Button
          label={redeem.isPending ? t.setup.joining : t.setup.joinSubmit}
          loading={redeem.isPending}
          onPress={onSubmit}
        />
      </View>
    </Screen>
  );
}
