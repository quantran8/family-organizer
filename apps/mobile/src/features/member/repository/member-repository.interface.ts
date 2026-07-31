/**
 * Thành viên gia đình.
 *
 * KHÔNG nhất thiết có tài khoản: con nhỏ, bố mẹ hai bên là member nhưng
 * profile_id = null (schema §1). Đó là lý do members tách khỏi profiles.
 */

import type { ISODate, Member, MemberRole, UUID } from '@family-organizer/domain';

export interface MemberInput {
  displayName: string;
  role: MemberRole;
  birthday: ISODate | null;
}

export interface MemberRepository {
  list(hh: UUID): Promise<Member[]>;
  create(hh: UUID, input: MemberInput): Promise<Member>;
  update(hh: UUID, id: UUID, patch: Partial<MemberInput>): Promise<Member>;
  /** Member ứng với người đang đăng nhập. */
  me(hh: UUID): Promise<Member | null>;
}
