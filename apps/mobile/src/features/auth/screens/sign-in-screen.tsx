/**
 * Đăng nhập — MỘT màn hình (05 §3.1).
 *
 * Không có màn giới thiệu nhiều trang: mục tiêu F1 là dưới 90 giây từ lúc mở
 * app tới bản ghi đầu tiên, và mỗi màn giới thiệu là một chỗ để bỏ cuộc.
 *
 * Social đứng trước vì nhanh hơn và không phải nhớ gì; email + mật khẩu là
 * đường lui khi người dùng không có tài khoản Google/Apple hoặc không muốn dùng.
 *
 * MỘT nút [Tiếp tục] duy nhất, không tách "Đăng nhập" / "Đăng ký": Supabase báo
 * `invalid_credentials` với email chưa tồn tại thì repository tự chuyển sang
 * `signUp`. Người dùng không phải tự biết mình đã có tài khoản hay chưa — đó là
 * thứ app biết được, không phải họ.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { isAppErrorException } from '@family-organizer/domain';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { Button, Field, Screen } from '@/design/components';
import { useSignInWithPassword } from '@/features/auth/queries/use-auth';
import { signInSchema, type SignInValues } from '@/features/auth/schemas/auth-schema';
import { useT } from '@/i18n';

export function SignInScreen() {
  const { t } = useT();
  const signIn = useSignInWithPassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => signIn.mutate(values));

  return (
    <Screen scroll>
      <View className="flex-1 justify-center py-12">
        <Text className="text-display font-semibold text-ink">{t.app.name}</Text>
        <Text className="mt-3 text-body text-muted">{t.app.tagline}</Text>

        <View className="mt-10 gap-3">
          {/*
            Google/Apple cần cấu hình native (bundle id, URL scheme, provider ở
            Supabase) và một EAS dev build — Expo Go không đủ. Nối ở cuối G3;
            đường email + mật khẩu chạy được ngay nên nó mở khoá G3–G7 trong lúc
            native config chưa xong.
          */}
          <Button label={t.auth.google} variant="secondary" disabled />
          <Button label={t.auth.apple} variant="secondary" disabled />
        </View>

        <View className="my-6 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-line" />
          <Text className="text-caption text-subtle">{t.auth.or}</Text>
          <View className="h-px flex-1 bg-line" />
        </View>

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
              textContentType="emailAddress"
            />
          )}
        />

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
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          )}
        />

        {signIn.isError ? (
          <Text className="mb-3 text-caption text-critical">{signInErrorText(signIn.error, t)}</Text>
        ) : null}

        <Button label={t.common.continue} loading={signIn.isPending} onPress={onSubmit} />

        <Link href="/(auth)/forgot-password" asChild>
          <Text className="mt-5 self-center text-label font-medium text-brand">
            {t.auth.forgotPassword}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

/**
 * Sai mật khẩu KHÔNG nói rõ cái nào sai — nói "email này chưa đăng ký" là để lộ
 * ai có tài khoản với bất cứ ai gõ thử một địa chỉ.
 */
function signInErrorText(e: unknown, t: ReturnType<typeof useT>['t']): string {
  if (isAppErrorException(e) && e.error.kind === 'auth') return t.error.invalidCredentials;
  if (isAppErrorException(e) && e.error.kind === 'offline') return t.error.offlineWrite;
  return t.error.unknown;
}
