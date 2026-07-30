/**
 * Type nền — 02 §1.
 *
 * Mọi union ở đây ánh xạ 1-1 với enum trong schema.sql §0. Khi schema đổi,
 * đây là chỗ đầu tiên phải đổi theo.
 */

export type UUID = string;
/** 'YYYY-MM-DD' */
export type ISODate = string;
export type ISODateTime = string;

export type Liquidity = 'usable_now' | 'not_immediate' | 'long_term';

export type AssetKind =
  | 'cash'
  | 'bank_account'
  | 'savings'
  | 'gold'
  | 'real_estate'
  | 'investment'
  | 'receivable'
  | 'other';

export type PaymentState = 'unpaid' | 'paid';

export type FinanceStatus = 'ok' | 'watch' | 'tight' | 'no_data';

export type CalendarType = 'solar' | 'lunar';

/**
 * Bên gia đình. Nguồn: schema.sql §0 enum `family_side`.
 *
 * CỐ Ý khác 02 §1 (viết 'husband_family' | 'wife_family'): schema là bất biến,
 * tài liệu 02 đã lỗi thời ở chỗ này. Nhãn hiển thị nằm ở apps/mobile/src/i18n,
 * không nằm ở đây — domain không biết gì về UI.
 *   paternal = bên nội · maternal = bên ngoại
 *   both     = cả hai bên
 *   own      = gia đình nhỏ của hai vợ chồng
 */
export type FamilySide = 'paternal' | 'maternal' | 'both' | 'own';

export type EventKind =
  | 'death_anniversary'
  | 'wedding'
  | 'birthday'
  | 'holiday'
  | 'medical'
  | 'trip'
  | 'school'
  | 'other';

export type EntityType =
  | 'task'
  | 'event'
  | 'document'
  | 'asset'
  | 'debt'
  | 'goal'
  | 'upcoming_payment';

/** Nhóm con của EntityType mà money_events chấp nhận — schema.sql §5.5 check constraint. */
export type MoneyEntityType = 'asset' | 'debt' | 'goal' | 'upcoming_payment';

export type MoneyEventType =
  | 'created'
  | 'value_updated'
  | 'contribution'
  | 'withdrawal'
  | 'settled'
  | 'reopened'
  | 'closed';

export type DocType =
  | 'marriage_cert'
  | 'birth_cert'
  | 'id_card'
  | 'passport'
  | 'insurance'
  | 'vehicle'
  | 'housing_contract'
  | 'loan_contract'
  | 'medical'
  | 'vaccination'
  | 'school'
  | 'invoice_warranty'
  | 'asset'
  | 'tax_admin'
  | 'other';

export type MemberRole = 'owner' | 'partner' | 'child' | 'relative';

export type SubscriptionStatus = 'trialing' | 'active' | 'grace' | 'expired' | 'none';

export type RecurFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  freq: RecurFreq;
  intervalN: number;
  /** 0 = Chủ nhật … 6 = Thứ Bảy. Dùng khi freq='weekly'. */
  byWeekday?: number[];
  /** 1..31. Dùng khi freq='monthly'. */
  byMonthDay?: number;
  untilDate?: ISODate | null;
}

/**
 * Danh sách runtime để lặp — union type không lặp được ở runtime.
 * Dùng cho zod enum ở mobile và cho test phủ hết nhánh.
 */
export const ASSET_KINDS = [
  'cash',
  'bank_account',
  'savings',
  'gold',
  'real_estate',
  'investment',
  'receivable',
  'other',
] as const satisfies readonly AssetKind[];

export const LIQUIDITIES = [
  'usable_now',
  'not_immediate',
  'long_term',
] as const satisfies readonly Liquidity[];

export const FAMILY_SIDES = [
  'paternal',
  'maternal',
  'both',
  'own',
] as const satisfies readonly FamilySide[];

export const EVENT_KINDS = [
  'death_anniversary',
  'wedding',
  'birthday',
  'holiday',
  'medical',
  'trip',
  'school',
  'other',
] as const satisfies readonly EventKind[];

export const FINANCE_STATUSES = [
  'ok',
  'watch',
  'tight',
  'no_data',
] as const satisfies readonly FinanceStatus[];

export const DOC_TYPES = [
  'marriage_cert',
  'birth_cert',
  'id_card',
  'passport',
  'insurance',
  'vehicle',
  'housing_contract',
  'loan_contract',
  'medical',
  'vaccination',
  'school',
  'invoice_warranty',
  'asset',
  'tax_admin',
  'other',
] as const satisfies readonly DocType[];
