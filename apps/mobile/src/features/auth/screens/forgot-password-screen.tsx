/**
 * Quên mật khẩu → gửi đường dẫn đặt lại, deep link `family://reset-password`.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button, Field, Screen } from '@/design/components';
import { useResetPassword } from '@/features/auth/queries/use-auth';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/features/auth/schemas/auth-schema';
import { useT } from '@/i18n';

export function ForgotPasswordScreen() {
  const { t } = useT();
  const router = useRouter();
  const reset = useResetPassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) =>
    reset.mutate({ email, redirectTo: Linking.createURL('/reset-password') }),
  );

  return (
    <Screen scroll>
      <View className="flex-1 justify-center py-12">
        <Text className="text-title1 font-semibold text-ink">{t.auth.forgotTitle}</Text>
        <Text className="mb-8 mt-3 text-body text-muted">{t.auth.forgotBody}</Text>

        {reset.isSuccess ? (
          <>
            <Text className="mb-6 text-body text-positive">{t.auth.forgotSent}</Text>
            <Button label={t.common.back} variant="secondary" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Field
                  label={t.auth.email}
                  placeholder={t.auth.emailPlaceholder}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onSubmitEditing={onSubmit}
                  returnKeyType="send"
                />
              )}
            />
            <Button
              label={t.auth.forgotSend}
              loading={reset.isPending}
              onPress={onSubmit}
            />
            <Button
              label={t.common.back}
              variant="ghost"
              onPress={() => router.back()}
              className="mt-2"
            />
          </>
        )}
      </View>
    </Screen>
  );
}
