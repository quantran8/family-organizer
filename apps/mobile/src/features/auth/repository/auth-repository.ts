/**
 * Hiện thực AuthRepository.
 */

import { AppErrorException } from '@family-organizer/domain';
import type { AuthError } from '@supabase/supabase-js';

import { throwAppError } from '@/data/shared/errors';
import { clearProfileCache } from '@/data/shared/session';
import { supabase } from '@/lib/supabase';
import type { AuthRepository } from './auth-repository.interface';

function mapAuthError(e: AuthError): never {
  // Không nói rõ email hay mật khẩu sai — chỉ nói "chưa đúng".
  if (e.message.toLowerCase().includes('invalid login credentials')) {
    throw new AppErrorException({ kind: 'conflict', message: 'invalid_credentials' });
  }
  if (e.status === 401 || e.status === 403) {
    throw new AppErrorException({ kind: 'auth' });
  }
  throw new AppErrorException({ kind: 'unknown', cause: e });
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

  /**
   * Một nút [Tiếp tục] duy nhất cho email + mật khẩu.
   *
   * Không tách "Đăng nhập" / "Đăng ký" thành hai màn: email chưa tồn tại thì
   * tự chuyển sang signUp. Người dùng không phải tự biết mình đã có tài khoản
   * hay chưa — đó là thứ app biết được, không phải họ.
   */
  async signInOrSignUpWithPassword(email, password) {
    const trimmed = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (!error) return;

    const isUnknownAccount = error.message.toLowerCase().includes('invalid login credentials');
    if (!isUnknownAccount) mapAuthError(error);

    const { error: signUpError } = await supabase.auth.signUp({ email: trimmed, password });
    if (signUpError) {
      // Email ĐÃ tồn tại nhưng mật khẩu sai → signUp cũng lỗi. Lúc này mới
      // chắc chắn là sai mật khẩu.
      mapAuthError(error);
    }
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
