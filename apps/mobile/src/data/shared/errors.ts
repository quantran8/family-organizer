/**
 * Bản đồ mã lỗi PostgREST → AppError — 02 §6.
 *
 * MỘT CHỖ DUY NHẤT. Repository ném AppError, không bao giờ để lộ lỗi Postgres
 * thô lên UI: "duplicate key value violates unique constraint
 * attention_one_open_per_entity" không nói gì với người dùng.
 */

import { AppErrorException, type AppError } from '@nhaminh/domain';
import type { PostgrestError } from '@supabase/supabase-js';

/** Mã PostgREST/Postgres → AppError. */
export function mapPostgrestError(e: PostgrestError): AppError {
  switch (e.code) {
    // PostgREST: .single() không tìm thấy hàng nào.
    case 'PGRST116':
      return { kind: 'not_found' };
    // RLS chặn, hoặc thiếu quyền.
    case '42501':
    case 'PGRST301':
      return { kind: 'auth' };
    // unique_violation — hai người cùng gắn cờ một khoản, chẳng hạn.
    case '23505':
      return { kind: 'conflict', message: e.message };
    // check_violation / foreign_key_violation: dữ liệu không hợp lệ.
    case '23514':
    case '23503':
      return { kind: 'conflict', message: e.message };
    default:
      return { kind: 'unknown', cause: e };
  }
}

/** Lỗi mạng của fetch — mất mạng KHÔNG PHẢI lỗi, thao tác nằm trong hàng đợi. */
export function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    return (
      m.includes('network request failed') ||
      m.includes('failed to fetch') ||
      m.includes('network error')
    );
  }
  return false;
}

/** Bọc mọi thứ không rõ nguồn gốc thành AppError. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppErrorException) return e.error;
  if (isNetworkError(e)) return { kind: 'offline' };
  if (isPostgrestError(e)) return mapPostgrestError(e);
  return { kind: 'unknown', cause: e };
}

function isPostgrestError(e: unknown): e is PostgrestError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'message' in e &&
    'details' in e
  );
}

/** Ném AppError, dùng ở mọi repository. */
export function throwAppError(e: unknown): never {
  throw new AppErrorException(toAppError(e));
}

/**
 * Bọc một lời gọi PostgREST: ném AppError nếu lỗi, trả data nếu không.
 * Rút gọn `if (error) throwAppError(error)` lặp ở mọi phương thức.
 */
export async function unwrap<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) throw new AppErrorException(mapPostgrestError(error));
    if (data === null) throw new AppErrorException({ kind: 'not_found' });
    return data;
  } catch (e) {
    throwAppError(e);
  }
}

/** Như unwrap nhưng cho phép null (get() trả null khi không tìm thấy). */
export async function unwrapMaybe<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T | null> {
  try {
    const { data, error } = await promise;
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new AppErrorException(mapPostgrestError(error));
    }
    return data;
  } catch (e) {
    throwAppError(e);
  }
}

/** Cho lệnh ghi không trả dữ liệu (RPC void, delete). */
export async function unwrapVoid(
  promise: PromiseLike<{ error: PostgrestError | null }>,
): Promise<void> {
  try {
    const { error } = await promise;
    if (error) throw new AppErrorException(mapPostgrestError(error));
  } catch (e) {
    throwAppError(e);
  }
}

/** TanStack Query dùng để quyết định có retry không (01 §3). */
export function isAuthError(e: unknown): boolean {
  return toAppError(e).kind === 'auth';
}
