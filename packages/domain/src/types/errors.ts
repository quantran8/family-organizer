/**
 * Lỗi — 02 §6.
 *
 * Nằm ở domain (không phải mobile) vì canUpload() trả về nó, mà hàm đó chạy ở
 * cả client lẫn Edge.
 *
 * Repository ném AppError, không bao giờ để lộ lỗi Postgres thô lên UI.
 * Bản đồ mã PostgREST → AppError đặt ở repositories/errors.ts, một chỗ duy nhất.
 */

export type AppError =
  | { kind: 'offline' }
  | { kind: 'auth' }
  | { kind: 'quota_exceeded'; usedBytes: number; quotaBytes: number }
  | { kind: 'premium_required'; feature: string }
  | { kind: 'not_found' }
  | { kind: 'conflict'; message: string }
  | { kind: 'unknown'; cause: unknown };

/** Để `throw` được mà vẫn giữ nguyên hình dạng AppError khi bắt. */
export class AppErrorException extends Error {
  readonly error: AppError;

  constructor(error: AppError) {
    super(error.kind);
    this.name = 'AppErrorException';
    this.error = error;
  }
}

export function isAppErrorException(e: unknown): e is AppErrorException {
  return e instanceof AppErrorException;
}
