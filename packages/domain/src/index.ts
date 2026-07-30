/**
 * @nhaminh/domain — package dùng chung DUY NHẤT.
 *
 * Hai người tiêu thụ, hai runtime: Hermes (apps/mobile) và Deno
 * (supabase/functions). Ràng buộc ở 01 §1:
 *   - Không import React, Supabase, hay bất cứ I/O nào.
 *   - KHÔNG có dependency runtime nào cả — kể cả zod.
 *   - TypeScript thuần, target ES2022.
 *   - Không `Date.now()` ẩn: thời gian LUÔN là tham số.
 *
 * Không chứa chuỗi hiển thị. Mọi hàm "format"/"explain" trả về nguyên liệu có
 * tham số; câu chữ dựng ở apps/mobile/src/i18n.
 */

// Type
export type {
  AssetKind,
  CalendarType,
  DocType,
  EntityType,
  EventKind,
  FamilySide,
  FinanceStatus,
  ISODate,
  ISODateTime,
  Liquidity,
  MemberRole,
  MoneyEntityType,
  MoneyEventType,
  PaymentState,
  RecurFreq,
  Recurrence,
  SubscriptionStatus,
  UUID,
} from './types/base.js';
export {
  ASSET_KINDS,
  DOC_TYPES,
  EVENT_KINDS,
  FAMILY_SIDES,
  FINANCE_STATUSES,
  LIQUIDITIES,
} from './types/base.js';

export type {
  Asset,
  AttentionItem,
  Debt,
  DocumentFile,
  FamilyDocument,
  FamilyEvent,
  Goal,
  Household,
  Member,
  MoneyEvent,
  MoneySnapshot,
  Task,
  TaskInstance,
  UpcomingPayment,
} from './types/entities.js';

export type { FinanceMetrics, HomeFeedItem, MoneyFeedItem } from './types/views.js';

export type { AppError } from './types/errors.js';
export { AppErrorException, isAppErrorException } from './types/errors.js';

// Ngày dương
export type { CivilDate } from './date/civil.js';
export {
  addDays,
  addMonthsClamped,
  addYearsClamped,
  compareISODate,
  daysBetween,
  daysInMonth,
  formatISODate,
  isLeapYear,
  maxISODate,
  minISODate,
  parseISODate,
  weekdayOf,
} from './date/civil.js';

// Tài chính
export type { FinanceReason } from './finance/status.js';
export { computeFinanceStatus, explainFinanceStatus } from './finance/status.js';
export { inferLiquidity } from './finance/liquidity.js';

// Lịch âm
export type { LunarDate } from './lunar/convert.js';
export {
  lunarMonthLength,
  lunarToSolar,
  lunarToSolarClamped,
  solarToLunar,
} from './lunar/convert.js';
export type { LunarAnniversary } from './lunar/occurrence.js';
export { nextLunarOccurrence, previousLunarOccurrence } from './lunar/occurrence.js';

// Lặp lại
export { expandRecurrence, nextDue } from './recurrence/expand.js';

// Nhắc nhở
export type { BuildRemindersInput, ReminderDraft, ReminderSource } from './reminders/build.js';
export {
  buildReminders,
  capPerDay,
  DEFAULT_LEAD_DAYS,
  DEFAULT_REMIND_HOUR,
  defaultLeadDaysForDocument,
  MAX_REMINDERS_PER_DAY,
} from './reminders/build.js';

// Quota
export type { CanUploadResult } from './quota/upload.js';
export {
  canUpload,
  FREE_QUOTA_BYTES,
  hasStorageEntitlement,
  MAX_FILE_BYTES,
  PRO_QUOTA_BYTES,
} from './quota/upload.js';

// Gợi ý gắn cờ
export type { AttentionSuggestion } from './attention/suggest.js';
export { suggestAttention } from './attention/suggest.js';

// Lịch sử tiền
export type {
  DayBucket,
  EventDayGroup,
  MoneyEventShape,
  SnapshotDiff,
} from './history/snapshots.js';
export {
  describeMoneyEvent,
  diffSnapshots,
  filterByEntityType,
  groupEventsByDay,
  withDiffs,
} from './history/snapshots.js';

// Định dạng
export { formatMoney, formatMoneyShort } from './format/money.js';
export type { DueLabel, LunarLabel } from './format/dates.js';
export { formatDueLabel, formatLunarLabel, lunarLabelOfDate } from './format/dates.js';
