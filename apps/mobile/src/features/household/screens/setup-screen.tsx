/**
 * Khởi tạo — 05 §3.2.
 *
 * `[Tạo nhà mới]` hỏi ĐÚNG MỘT trường: tên hiển thị. Tên nhà mặc định "Nhà mình",
 * đổi được ở Cài đặt. Mỗi ô thêm ở đây là một chỗ dừng lại suy nghĩ, mà mục tiêu
 * F1 là dưới 90 giây tới bản ghi đầu tiên.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, Field, Screen } from '@/design/components';
import { useCreateHousehold } from '@/features/auth/queries/use-auth';
import { useRedeemInvite } from '@/features/invite/queries/use-invite';
import {
  createHouseholdSchema,
  joinHouseholdSchema,
  type CreateHouseholdValues,
  type JoinHouseholdValues,
} from '@/features/auth/schemas/auth-schema';
import { useT } from '@/i18n';
import { useSessionStore } from '@/stores/session';

type Mode = 'choose' | 'create' | 'join';

export function SetupScreen() {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('choose');

  return (
    <Screen scroll>
      <View className="flex-1 justify-center py-12">
        <Text className="mb-8 text-title1 font-semibold text-ink">{t.setup.title}</Text>

        {mode === 'choose' ? (
          <View className="gap-3">
            <Button label={t.setup.createHousehold} onPress={() => setMode('create')} />
            <Button
              label={t.setup.joinHousehold}
              variant="secondary"
              onPress={() => setMode('join')}
            />
          </View>
        ) : mode === 'create' ? (
          <CreateHouseholdForm onBack={() => setMode('choose')} />
        ) : (
          <JoinHouseholdForm onBack={() => setMode('choose')} />
        )}
      </View>
    </Screen>
  );
}

function CreateHouseholdForm({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const create = useCreateHousehold();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateHouseholdValues>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { displayName: '' },
  });

  const onSubmit = handleSubmit(({ displayName }) =>
    create.mutate(
      { displayName },
      // Gate ở _layout nạp lại `my_households` rồi tự đưa vào (app); đẩy thẳng
      // ở đây để không phải chờ thêm một vòng render.
      { onSuccess: () => router.replace('/(app)/home') },
    ),
  );

  return (
    <>
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
      {create.isError ? (
        <Text className="mb-3 text-caption text-danger">{t.error.unknown}</Text>
      ) : null}
      <Button label={t.setup.createSubmit} loading={create.isPending} onPress={onSubmit} />
      <BackLink onPress={onBack} />
    </>
  );
}

function JoinHouseholdForm({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const redeem = useRedeemInvite();
  const setHousehold = useSessionStore((s) => s.setHousehold);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinHouseholdValues>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { code: '', displayName: '' },
  });

  const onSubmit = handleSubmit((values) =>
    redeem.mutate(values, {
      onSuccess: (householdId) => {
        // `null`, KHÔNG phải chuỗi rỗng — xem chú thích ở `stores/session.ts`:
        // `''` đi vào `completed_by` sẽ làm Postgres từ chối câu update mà
        // không có lỗi nào hiện lên màn hình.
        setHousehold({ id: householdId, name: null, memberId: null });
        router.replace('/(app)/home');
      },
    }),
  );

  return (
    <>
      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <Field
            label={t.setup.inviteCode}
            hint={t.setup.inviteCodeHint}
            value={value}
            // Viết hoa ngay khi gõ: mã luôn là chữ hoa, và để người dùng nhìn
            // thấy chữ thường rồi mới lặng lẽ đổi lúc gửi là gây bối rối.
            onChangeText={(s) => onChange(s.toUpperCase())}
            onBlur={onBlur}
            error={errors.code?.message}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            autoFocus
          />
        )}
      />
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
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />
        )}
      />
      {redeem.isError ? (
        <Text className="mb-3 text-caption text-danger">{t.error.inviteInvalid}</Text>
      ) : null}
      <Button label={t.setup.joinSubmit} loading={redeem.isPending} onPress={onSubmit} />
      <BackLink onPress={onBack} />
    </>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  return (
    <Pressable onPress={onPress} className="mt-4 min-h-touch items-center justify-center">
      <Text className="text-label font-medium text-muted">{t.common.back}</Text>
    </Pressable>
  );
}
