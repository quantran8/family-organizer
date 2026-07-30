/**
 * Quota lưu trữ — 03 §7.
 *
 * Client dùng để hiện lỗi sớm và chặn nút. NHƯNG QUYẾT ĐỊNH THẬT NẰM Ở EDGE
 * `presign-upload` — cùng hàm này, chạy lại phía server. Client không được tin,
 * vì presigned URL là thứ cấp quyền ghi thật.
 */

import type { AppError } from '../types/errors.js';
import type { Household } from '../types/entities.js';

export const FREE_QUOTA_BYTES = 50 * 1024 * 1024;
export const PRO_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export type CanUploadResult = { ok: true } | { ok: false; reason: AppError };

/** Household có quyền lưu file hay không — 01 §9: nguồn sự thật là subscriptionStatus. */
export function hasStorageEntitlement(h: Household): boolean {
  return (
    h.subscriptionStatus === 'active' ||
    h.subscriptionStatus === 'trialing' ||
    h.subscriptionStatus === 'grace'
  );
}

export function canUpload(h: Household, fileSize: number): CanUploadResult {
  if (!hasStorageEntitlement(h)) {
    return { ok: false, reason: { kind: 'premium_required', feature: 'document_files' } };
  }

  if (fileSize > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: {
        kind: 'quota_exceeded',
        usedBytes: h.storageUsedBytes,
        quotaBytes: h.storageQuotaBytes,
      },
    };
  }

  if (h.storageUsedBytes + fileSize > h.storageQuotaBytes) {
    return {
      ok: false,
      reason: {
        kind: 'quota_exceeded',
        usedBytes: h.storageUsedBytes,
        quotaBytes: h.storageQuotaBytes,
      },
    };
  }

  return { ok: true };
}
