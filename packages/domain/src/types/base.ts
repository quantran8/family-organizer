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
 * Bên gia đình. Nguồn: migration 0004 §1 enum `family_side`.
 *
 * TRỤC LÀ "NHÀ AI", KHÔNG PHẢI "NỘI/NGOẠI" (06 §0.1). Bản trước dùng
 * paternal/maternal trong DB và husband/wife ở tài liệu 02 — hai trục KHÁC
 * NHAU, không ánh xạ được: với một cặp vợ chồng "nhà nội" là nhà chồng, nhưng
 * "bên nội của vợ" cũng tồn tại.
 *
 * Chọn trục theo UI, vì đó là thứ người dùng thật sự nghĩ. Nhãn hiển thị nằm ở
 * apps/mobile/src/i18n, không nằm ở đây — domain không biết gì về UI.
 */
export type FamilySide = 'husband_family' | 'wife_family' | 'both' | 'own';

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
  | 'upcoming_payment'
  | 'shopping_item'
  /** Cờ/nhắc nói về CẢ NHÀ, không thuộc bản ghi nào. Migration 0004 §2. */
  | 'household';

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

/**
 * Độ mới của một số khai — 03 §1b.
 *
 * CHỈ dùng cho NHÃN. Không bao giờ đổi FinanceStatus, không sinh badge, không
 * sinh thông báo. Một chấm vàng vì "bạn chưa cập nhật" là một LỜI THÚC, và
 * KHÔNG BIẾT TÌNH HÌNH khác với TÌNH HÌNH KHÔNG ỔN.
 */
export type Freshness = 'fresh' | 'aging' | 'stale';

/**
 * Mọi con số DẪN XUẤT phải mang cờ này — 02 §1.
 *
 * UI in kèm câu "theo những khoản nhà mình đã ghi". Đây là một dự tính, không
 * phải một báo cáo, và phải nói đúng như vậy.
 */
export type Basis = 'declared';

/** Nguồn của một khoản cần chuẩn bị. Nhóm con của EntityType — view upcoming_needs. */
export type NeedSource = 'upcoming_payment' | 'event' | 'document';

// --- Sổ hiếu hỉ (07 §3) ---

export type ContactSide = 'husband_family' | 'wife_family' | 'shared' | 'other';

export type GiftDirection = 'received' | 'given';

export type GiftOccasion =
  | 'wedding'
  | 'engagement'
  | 'funeral'
  | 'death_anniversary'
  | 'full_month'
  | 'birthday'
  | 'housewarming'
  | 'other';

// --- Hồ sơ con (07 §4) ---

/**
 * CHỈ BA TRẠNG THÁI. Không có 'skipped', không có 'postponed' — app không bao
 * giờ gợi ý hoãn, bỏ, hay đổi thứ tự mũi tiêm. Xem 07 §4.2.
 */
export type DoseStatus = 'planned' | 'done' | 'overdue';

// --- Nhập liệu bằng AI (06 §6) ---

export type IngestSource = 'screenshot' | 'photo' | 'text';

export type IngestStatus = 'pending' | 'confirmed' | 'discarded';

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
  'husband_family',
  'wife_family',
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

export const CONTACT_SIDES = [
  'husband_family',
  'wife_family',
  'shared',
  'other',
] as const satisfies readonly ContactSide[];

export const GIFT_DIRECTIONS = [
  'received',
  'given',
] as const satisfies readonly GiftDirection[];

export const GIFT_OCCASIONS = [
  'wedding',
  'engagement',
  'funeral',
  'death_anniversary',
  'full_month',
  'birthday',
  'housewarming',
  'other',
] as const satisfies readonly GiftOccasion[];

export const DOSE_STATUSES = [
  'planned',
  'done',
  'overdue',
] as const satisfies readonly DoseStatus[];

export const INGEST_SOURCES = [
  'screenshot',
  'photo',
  'text',
] as const satisfies readonly IngestSource[];
