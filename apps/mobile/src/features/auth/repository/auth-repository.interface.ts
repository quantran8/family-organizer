/**
 * Hợp đồng Đăng nhập và khởi tạo — 01 §8 + G3.
 *
 * Ba đường: Google · Apple · email+mật khẩu. KHÔNG dùng OTP SMS (tốn tiền thật
 * mỗi tin). Ba đường đều đổ về cùng một chuỗi khởi tạo — `profiles` không quan
 * tâm provider nào.
 */

import type { UUID } from '@family-organizer/domain';
import type { Session } from '@supabase/supabase-js';

export interface HouseholdSummary {
  householdId: UUID;
  householdName: string;
  memberId: UUID;
}

export interface AuthRepository {
  getSession(): Promise<Session | null>;
  onAuthStateChange(cb: (session: Session | null) => void): () => void;

  /**
   * MỘT nút [Tiếp tục] duy nhất cho email + mật khẩu.
   *
   * Không tách "Đăng nhập" / "Đăng ký" thành hai màn: email chưa tồn tại thì
   * tự chuyển sang đăng ký. Người dùng không phải tự biết mình đã có tài khoản
   * hay chưa — đó là thứ app biết được, không phải họ.
   */
  signInOrSignUpWithPassword(email: string, password: string): Promise<void>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signInWithIdToken(provider: 'google' | 'apple', idToken: string, nonce?: string): Promise<void>;
  signOut(): Promise<void>;
  resendVerification(email: string): Promise<void>;

  /** Household của người đang đăng nhập — dùng ở gate app/_layout.tsx. */
  myHouseholds(): Promise<HouseholdSummary[]>;
  /** Tạo nhà mới + member cho chính mình, MỘT transaction. */
  createHousehold(displayName: string, householdName?: string): Promise<UUID>;
}
