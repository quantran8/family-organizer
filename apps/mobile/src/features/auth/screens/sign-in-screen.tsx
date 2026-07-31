/**
 * Đăng nhập.
 *
 * ── Vì sao TÁCH khỏi Đăng ký ──
 *
 * Bản trước có MỘT nút [Tiếp tục]: email chưa tồn tại thì repository tự chuyển
 * sang `signUp`. Ý tưởng là người dùng không phải tự biết mình đã có tài khoản
 * hay chưa. Cái giá của nó là gõ nhầm email ở màn Đăng nhập sẽ IM LẶNG tạo ra
 * một tài khoản mới rỗng — người dùng nghĩ mình vừa đăng nhập, thực ra đang
 * đứng trong một cái nhà trống, và tài khoản thật vẫn còn nguyên ở địa chỉ
 * đúng. Đó là lỗi không có đường tự sửa, còn "bạn đã có tài khoản chưa" là câu
 * người dùng luôn trả lời được.
 *
 * Social đứng trước vì nhanh hơn và không phải nhớ gì; email + mật khẩu là
 * đường lui khi người dùng không có tài khoản Google/Apple hoặc không muốn dùng.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { isAppErrorException } from '@family-organizer/domain';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, Field, PasswordToggle, Screen } from '@/design/components';
import { AuthHeader } from '@/features/auth/components/auth-header';
import { SocialAuthButtons } from '@/features/auth/components/social-auth-buttons';
import { useSignInWithPassword } from '@/features/auth/queries/use-auth';
import { signInSchema, type SignInValues } from '@/features/auth/schemas/auth-schema';
import { useT } from '@/i18n';

export function SignInScreen() {
  const { t } = useT();
  const signIn = useSignInWithPassword();
  const [showPassword, setShowPassword] = useState(false);
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
        <AuthHeader
          eyebrow={t.auth.signInEyebrow}
          title={t.auth.signInTitle}
          body={t.auth.signInBody}
        />

        {/*
          Còn `disabled` cho tới khi xong cấu hình native (bundle id, URL scheme,
          provider ở Supabase) + một EAS dev build — Expo Go không đủ. Đường
          email + mật khẩu chạy được ngay nên nó mở khoá G3–G7 trong lúc chờ.
        */}
        <SocialAuthButtons />

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
              action={
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable accessibilityRole="link" hitSlop={8}>
                    <Text className="text-label font-medium text-brand-deep">
                      {t.auth.forgotPassword}
                    </Text>
                  </Pressable>
                </Link>
              }
              trailing={
                <PasswordToggle
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
              placeholder={t.auth.passwordPlaceholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry={!showPassword}
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

        <Button label={t.auth.signInSubmit} loading={signIn.isPending} onPress={onSubmit} />

        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-label text-muted">{t.auth.noAccount}</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text className="text-label font-semibold text-brand-deep">{t.auth.goSignUp}</Text>
            </Pressable>
          </Link>
        </View>
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
