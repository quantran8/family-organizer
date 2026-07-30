import { describe, expect, it } from 'vitest';

import {
  canUpload,
  FREE_QUOTA_BYTES,
  hasStorageEntitlement,
  MAX_FILE_BYTES,
  PRO_QUOTA_BYTES,
} from '../src/quota/upload.js';
import type { Household } from '../src/types/entities.js';

const MB = 1024 * 1024;

function household(over: Partial<Household> = {}): Household {
  return {
    id: 'h1',
    name: 'Nhà mình',
    currency: 'VND',
    subscriptionStatus: 'active',
    trialEndsAt: null,
    storageUsedBytes: 0,
    storageQuotaBytes: PRO_QUOTA_BYTES,
    snapshotIntervalDays: 7,
    ...over,
  };
}

describe('hằng số quota (03 §7)', () => {
  it('Free 50MB · Pro 10GB · tối đa 100MB mỗi file', () => {
    expect(FREE_QUOTA_BYTES).toBe(50 * MB);
    expect(PRO_QUOTA_BYTES).toBe(10 * 1024 * MB);
    expect(MAX_FILE_BYTES).toBe(100 * MB);
  });
});

describe('hasStorageEntitlement — nguồn sự thật là subscriptionStatus (01 §9)', () => {
  it.each(['active', 'trialing', 'grace'] as const)('%s được lưu file', (s) => {
    expect(hasStorageEntitlement(household({ subscriptionStatus: s }))).toBe(true);
  });

  it.each(['expired', 'none'] as const)('%s KHÔNG được lưu file', (s) => {
    expect(hasStorageEntitlement(household({ subscriptionStatus: s }))).toBe(false);
  });
});

describe('canUpload', () => {
  it('còn chỗ và có quyền → ok', () => {
    expect(canUpload(household(), 5 * MB)).toEqual({ ok: true });
  });

  it('chưa trả phí → premium_required, không phải quota_exceeded', () => {
    // 04 §8: "Lưu file cần bản Pro. Bạn vẫn ghi được thông tin và vị trí bản giấy."
    const result = canUpload(household({ subscriptionStatus: 'none' }), 1 * MB);
    expect(result).toEqual({
      ok: false,
      reason: { kind: 'premium_required', feature: 'document_files' },
    });
  });

  it('file lớn hơn 100MB → chặn dù còn thừa dung lượng', () => {
    const result = canUpload(household(), 101 * MB);
    expect(result.ok).toBe(false);
  });

  it('đúng 100MB thì vẫn cho — điều kiện là ">"', () => {
    expect(canUpload(household(), MAX_FILE_BYTES)).toEqual({ ok: true });
  });

  it('vượt quota → quota_exceeded kèm số liệu để dựng câu 04 §8', () => {
    const h = household({
      subscriptionStatus: 'trialing',
      storageUsedBytes: 48 * MB,
      storageQuotaBytes: FREE_QUOTA_BYTES,
    });
    const result = canUpload(h, 5 * MB);
    expect(result).toEqual({
      ok: false,
      reason: { kind: 'quota_exceeded', usedBytes: 48 * MB, quotaBytes: 50 * MB },
    });
  });

  it('vừa khít quota thì cho qua', () => {
    const h = household({
      storageUsedBytes: 45 * MB,
      storageQuotaBytes: FREE_QUOTA_BYTES,
    });
    expect(canUpload(h, 5 * MB)).toEqual({ ok: true });
  });

  it('quá 1 byte thì chặn', () => {
    const h = household({
      storageUsedBytes: 45 * MB,
      storageQuotaBytes: FREE_QUOTA_BYTES,
    });
    expect(canUpload(h, 5 * MB + 1).ok).toBe(false);
  });
});
