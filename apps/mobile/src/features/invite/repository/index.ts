export type { InviteRepository } from './invite-repository.interface';
export { inviteRepository } from './invite-repository';
// `normalizeInviteCode`/`CODE_LENGTH` chuyển sang `features/invite/code.ts`:
// tầng UI cần chúng để bóc mã từ deep link, mà eslint chặn UI import từ
// `repository/` (01 §2). Import thẳng từ `@/features/invite/code`.
