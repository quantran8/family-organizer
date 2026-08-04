/**
 * Đăng ký.
 *
 * Hỏi ĐÚNG ba ô: email, mật khẩu, nhập lại mật khẩu. Tên hiển thị KHÔNG hỏi ở
 * đây — nó thuộc về màn Khởi tạo (`setup`), nơi nó có ngữ cảnh ("bạn là ai
 * trong nhà này") thay vì là một ô trống giữa hai ô mật khẩu. Mục tiêu F1 vẫn
 * là dưới 90 giây tới bản ghi đầu tiên, nên mỗi ô thêm vào đây phải tự trả giá.
 *
 * KHÔNG có checkbox điều khoản như bản HTML mẫu: chưa có trang Điều khoản và
 * Quyền riêng tư thật để trỏ tới, và một ô tick bắt buộc dẫn tới hai link chết
 * chỉ là một bước chắn thêm không bảo vệ được ai. Thêm lại khi có nội dung thật.
 *
 * Cũng KHÔNG có thanh đo độ mạnh mật khẩu: nó chấm điểm hình dạng chuỗi chứ
 * không phải khả năng bị đoán, và "Mật khẩu mạnh" cho `Nhaminh2024!` là một lời
 * trấn an sai. Luật tối thiểu 8 ký tự nằm ở schema và nói thẳng khi chưa đạt.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { isAppErrorException } from '@family-organizer/domain';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { Button, Field, PasswordToggle, Screen } from '@/design/components';
import { AuthBackButton } from '@/features/auth/components/auth-back-button';
import { AuthHeader } from '@/features/auth/components/auth-header';
import { useSignUpWithPassword } from '@/features/auth/queries/use-auth';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas/auth-schema';
import { useT } from '@/i18n';

export function SignUpScreen() {
  const { t } = useT();
  const signUp = useSignUpWithPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(({ email, password }) => signUp.mutate({ email, password }));

  /*
    Bật xác minh email ở Supabase thì `signUp` KHÔNG tạo phiên — không có gate
    nào chuyển màn, và người dùng sẽ ngồi nhìn một form đã gửi xong mà không
    biết chuyện gì đang xảy ra. Trường hợp KHÔNG cần xác minh thì phiên có ngay
    và gate ở `app/_layout.tsx` tự đưa sang `setup`; màn này không tự điều hướng.
  */
  if (signUp.isSuccess && signUp.data.needsVerification) {
    return (
      <Screen scroll>
        <View className="flex-1 justify-center py-12">
          <AuthHeader
            eyebrow={t.auth.signUpEyebrow}
            title={t.auth.signUpTitle}
            body={t.auth.signUpCheckInbox}
          />
          {/*
            Ở đây KHÔNG dùng `AuthBackButton`: tài khoản đã tạo xong, quay lại
            form đăng ký chỉ dẫn tới một lần gửi trùng. Việc tiếp theo đúng là
            sang Đăng nhập, nên nó là nút rõ ràng chứ không phải mũi tên góc.
          */}
          <Link href="/(auth)/sign-in" asChild>
            <Button label={t.auth.goSignIn} variant="secondary" />
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {/*
        Nút quay lại nằm NGOÀI khối căn giữa: để trong thì nó trôi theo chiều
        cao form và không còn ở góc trên — chỗ duy nhất người dùng tìm nó.
      */}
      <View className="pt-2">
        <AuthBackButton fallback="/(auth)/sign-in" />
      </View>

      <View className="flex-1 justify-center pb-12 pt-4">
        <AuthHeader
          eyebrow={t.auth.signUpEyebrow}
          title={t.auth.signUpTitle}
          body={t.auth.signUpBody}
        />

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
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Field
              label={t.auth.confirmPassword}
              trailing={
                <PasswordToggle visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
              }
              placeholder={t.auth.confirmPasswordPlaceholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          )}
        />

        {signUp.isError ? (
          <Text className="mb-3 text-caption text-critical">{signUpErrorText(signUp.error, t)}</Text>
        ) : null}

        <Button label={t.auth.signUpSubmit} loading={signUp.isPending} onPress={onSubmit} />

        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-label text-muted">{t.auth.haveAccount}</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text className="text-label font-semibold text-ink">{t.auth.goSignIn}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

/**
 * Khác màn Đăng nhập: ở đây email đã có tài khoản thì nói THẲNG.
 *
 * Người dùng đang tự khai một địa chỉ của chính mình nên không lộ thêm gì, còn
 * im lặng thì họ đứng lại ở một form không bao giờ chạy được.
 */
function signUpErrorText(e: unknown, t: ReturnType<typeof useT>['t']): string {
  if (isAppErrorException(e) && e.error.kind === 'conflict') return t.error.emailTaken;
  if (isAppErrorException(e) && e.error.kind === 'offline') return t.error.offlineWrite;
  return t.error.unknown;
}
