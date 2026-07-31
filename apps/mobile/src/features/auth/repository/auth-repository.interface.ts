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
   * Đăng nhập bằng email + mật khẩu.
   *
   * Email chưa tồn tại và mật khẩu sai đều trả về CÙNG một lỗi
   * (`invalid_credentials`) — phân biệt hai cái ở đây là cho bất cứ ai gõ thử
   * một địa chỉ biết được ai có tài khoản.
   */
  signInWithPassword(email: string, password: string): Promise<void>;

  /**
   * Tạo tài khoản mới.
   *
   * Trả về `needsVerification` để màn Đăng ký biết nên báo "kiểm tra hộp thư"
   * hay đi thẳng vào app: bật xác minh email ở Supabase thì `signUp` KHÔNG tạo
   * phiên, và điều hướng như đã đăng nhập sẽ đưa người dùng vào một màn trống.
   */
  signUpWithPassword(email: string, password: string): Promise<{ needsVerification: boolean }>;
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
