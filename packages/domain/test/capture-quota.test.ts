import { describe, expect, it } from 'vitest';

import {
  canUseCapture,
  captureQuotaFor,
  FREE_CAPTURES_PER_MONTH,
  hasCaptureEntitlement,
  PRO_CAPTURES_PER_MONTH,
} from '../src/quota/capture.js';
import { PRO_QUOTA_BYTES } from '../src/quota/upload.js';
import type { Household } from '../src/types/entities.js';

function household(over: Partial<Household> = {}): Household {
  return {
    id: 'h1',
    name: 'Nhà mình',
    currency: 'VND',
    subscriptionStatus: 'active',
    trialEndsAt: null,
    storageUsedBytes: 0,
    storageQuotaBytes: PRO_QUOTA_BYTES,
    trialMilestones: { reminderAcknowledged: false, eventWithCostCompleted: false },
    recordThresholdAmount: null,
    ...over,
  };
}

describe('hằng số quota AI (03 §7, 06 §6)', () => {
  it('free 5 lần/tháng', () => {
    expect(FREE_CAPTURES_PER_MONTH).toBe(5);
  });

  it('pro có trần, không phải vô hạn thật', () => {
    // "Không giới hạn thực dụng" ≠ không có trần: thiếu trần thì một vòng lặp
    // hỏng ở client tiêu tiền model không giới hạn.
    expect(PRO_CAPTURES_PER_MONTH).toBeGreaterThan(FREE_CAPTURES_PER_MONTH);
    expect(Number.isFinite(PRO_CAPTURES_PER_MONTH)).toBe(true);
  });
});

describe('hasCaptureEntitlement', () => {
  it.each(['active', 'trialing', 'grace'] as const)('%s được mức Pro', (s) => {
    expect(hasCaptureEntitlement(household({ subscriptionStatus: s }))).toBe(true);
  });

  it.each(['expired', 'none'] as const)('%s chỉ được mức free', (s) => {
    expect(hasCaptureEntitlement(household({ subscriptionStatus: s }))).toBe(false);
  });
});

describe('canUseCapture — free tier phải có lượng dùng THẬT', () => {
  it('lần đầu của một nhà chưa trả phí vẫn được', () => {
    // Đây là ca quan trọng nhất của cả file: chặn ngay từ lần đầu thì người
    // dùng không bao giờ cảm nhận được thứ đang bán (03 §7).
    expect(canUseCapture(household({ subscriptionStatus: 'none' }), 0)).toEqual({ ok: true });
  });

  it('dùng hết 5 lần → premium_required kèm feature ai_capture', () => {
    const result = canUseCapture(household({ subscriptionStatus: 'none' }), 5);
    expect(result).toEqual({
      ok: false,
      reason: { kind: 'premium_required', feature: 'ai_capture' },
    });
  });

  it('lần thứ 5 (đã dùng 4) vẫn được — điều kiện là ">="', () => {
    expect(canUseCapture(household({ subscriptionStatus: 'none' }), 4)).toEqual({ ok: true });
  });

  it('nhà trả phí không bị chặn ở mốc free', () => {
    expect(canUseCapture(household(), FREE_CAPTURES_PER_MONTH)).toEqual({ ok: true });
  });

  it('nhà trả phí vẫn bị chặn ở trần Pro', () => {
    expect(canUseCapture(household(), PRO_CAPTURES_PER_MONTH).ok).toBe(false);
  });
});

describe('captureQuotaFor', () => {
  it('trả trần theo gói', () => {
    expect(captureQuotaFor(household())).toBe(PRO_CAPTURES_PER_MONTH);
    expect(captureQuotaFor(household({ subscriptionStatus: 'none' }))).toBe(
      FREE_CAPTURES_PER_MONTH,
    );
  });
});
