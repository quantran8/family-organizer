/**
 * Đặt mật khẩu mới — đích của deep link `family://reset-password`.
 *
 * Supabase đã đổi phiên sang trạng thái recovery khi người dùng mở link, nên ở
 * đây chỉ cần `updateUser({ password })`.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button, Field, Screen } from '@/design/components';
import { useUpdatePassword } from '@/features/auth/queries/use-auth';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/features/auth/schemas/auth-schema';
import { useT } from '@/i18n';

export default function ResetPasswordScreen() {
  const { t } = useT();
  const router = useRouter();
  const update = useUpdatePassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = handleSubmit(({ password }) =>
    update.mutate(password, {
      // Phiên đã hợp lệ sau khi đổi mật khẩu — gate ở _layout sẽ tự đưa vào app.
      onSuccess: () => router.replace('/(app)/home'),
    }),
  );

  return (
    <Screen scroll>
      <View className="flex-1 justify-center py-12">
        <Text className="mb-8 text-title1 font-semibold text-ink">{t.auth.resetTitle}</Text>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Field
              label={t.auth.password}
              placeholder={t.auth.passwordPlaceholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          )}
        />

        {update.isError ? (
          <Text className="mb-3 text-caption text-danger">{t.error.unknown}</Text>
        ) : null}

        <Button label={t.auth.resetSave} loading={update.isPending} onPress={onSubmit} />
      </View>
    </Screen>
  );
}
