/**
 * Hiện thực AuthRepository.
 */

import { AppErrorException } from '@family-organizer/domain';
import type { AuthError } from '@supabase/supabase-js';

import { throwAppError } from '@/data/shared/errors';
import { clearProfileCache } from '@/data/shared/session';
import { supabase } from '@/lib/supabase';
import type { AuthRepository } from './auth-repository.interface';

/**
 * `kind: 'auth'` cho sai thông tin đăng nhập, KHÔNG phải `'conflict'`.
 *
 * Bản trước dùng `'conflict'` trong khi màn hình lại kiểm tra `'auth'` để chọn
 * câu "Email hoặc mật khẩu chưa đúng." — nên câu đó chưa bao giờ hiện, người
 * gõ sai mật khẩu chỉ nhận được "Chưa làm được. Thử lại giúp mình nhé.".
 * `'conflict'` nghĩa là hai người cùng sửa một bản ghi; nó không mô tả việc này.
 *
 * `'auth'` không mang `message` (02 §6) — không cần: màn hình chọn câu theo
 * `kind`, và chuỗi hiển thị thuộc về `vi.ts` chứ không phải repository.
 */
function mapAuthError(e: AuthError): never {
  // Không nói rõ email hay mật khẩu sai — chỉ nói "chưa đúng".
  if (e.message.toLowerCase().includes('invalid login credentials')) {
    throw new AppErrorException({ kind: 'auth' });
  }
  if (e.status === 401 || e.status === 403) {
    throw new AppErrorException({ kind: 'auth' });
  }
  throw new AppErrorException({ kind: 'unknown', cause: e });
}

/** Supabase báo email trùng bằng vài câu khác nhau tuỳ phiên bản. */
function isEmailTaken(e: AuthError): boolean {
  const m = e.message.toLowerCase();
  return (
    e.code === 'user_already_exists' ||
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists')
  );
}

export const authRepository: AuthRepository = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
    return () => data.subscription.unsubscribe();
  },

  async signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) mapAuthError(error);
  },

  /**
   * Tạo tài khoản mới.
   *
   * `needsVerification` đọc từ `session`, KHÔNG phải từ `user`: khi bật xác
   * minh email, Supabase vẫn trả về một `user` đầy đủ nhưng `session` là null.
   * Lấy `user` làm dấu hiệu thành công sẽ cho ra một app tưởng mình đã đăng
   * nhập trong khi mọi truy vấn sau đó đều bị RLS chặn.
   */
  async signUpWithPassword(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      console.log('signUpWithPassword error', error);
      if (isEmailTaken(error)) {
        throw new AppErrorException({ kind: 'conflict', message: 'email_taken' });
      }
      mapAuthError(error);
    }
    return { needsVerification: data.session === null };
  },

  async resetPassword(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });
    if (error) mapAuthError(error);
  },

  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) mapAuthError(error);
  },

  async signInWithIdToken(provider, idToken, nonce) {
    const { error } = await supabase.auth.signInWithIdToken({
      provider,
      token: idToken,
      ...(nonce ? { nonce } : {}),
    });
    if (error) mapAuthError(error);
  },

  async signOut() {
    await supabase.auth.signOut();
    // Phiên sau có thể là người khác — không được để lại profileId cũ.
    clearProfileCache();
  },

  async resendVerification(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) mapAuthError(error);
  },

  /**
   * Household của người đang đăng nhập.
   *
   * Qua RPC `my_households` (SECURITY DEFINER) chứ không SELECT thẳng: gate ở
   * app/_layout.tsx chạy TRƯỚC khi biết household nào, mà RLS lại cần biết
   * household để cho đọc.
   */
  async myHouseholds() {
    try {
      const { data, error } = await supabase.rpc('my_households');
      if (error) throwAppError(error);
      const rows = (data ?? []) as Array<{
        household_id: string;
        household_name: string;
        member_id: string;
      }>;
      return rows.map((r) => ({
        householdId: r.household_id,
        householdName: r.household_name,
        memberId: r.member_id,
      }));
    } catch (e) {
      throwAppError(e);
    }
  },

  /**
   * Tạo nhà mới + member cho chính mình, MỘT transaction.
   * RLS không cho INSERT household khi chưa là member — xem 0002_onboarding_rpc.sql.
   */
  async createHousehold(displayName, householdName) {
    try {
      const { data, error } = await supabase.rpc('create_household', {
        p_display_name: displayName.trim(),
        p_household_name: householdName?.trim() ?? 'Nhà mình',
      });
      if (error) throwAppError(error);
      return data;
    } catch (e) {
      throwAppError(e);
    }
  },
};
