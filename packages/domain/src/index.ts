/**
 * @family-organizer/domain — package dùng chung DUY NHẤT.
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
  Basis,
  CalendarType,
  ContactSide,
  DocType,
  DoseStatus,
  EntityType,
  EventKind,
  FamilySide,
  FinanceStatus,
  Freshness,
  GiftDirection,
  GiftOccasion,
  IngestSource,
  IngestStatus,
  ISODate,
  ISODateTime,
  Liquidity,
  MemberRole,
  MoneyEntityType,
  MoneyEventType,
  NeedSource,
  PaymentState,
  RecurFreq,
  Recurrence,
  SubscriptionStatus,
  UUID,
} from './types/base.ts';
export {
  ASSET_KINDS,
  CONTACT_SIDES,
  DOC_TYPES,
  DOSE_STATUSES,
  EVENT_KINDS,
  FAMILY_SIDES,
  FINANCE_STATUSES,
  GIFT_DIRECTIONS,
  GIFT_OCCASIONS,
  INGEST_SOURCES,
  LIQUIDITIES,
} from './types/base.ts';

export type {
  Asset,
  AttentionItem,
  ChildVaccineDose,
  Contact,
  Debt,
  DocumentFile,
  EventOccurrence,
  FamilyDocument,
  FamilyEvent,
  GiftEntry,
  GiftHistory,
  Goal,
  GrowthRecord,
  Household,
  IngestDraft,
  Member,
  MoneyEvent,
  MoneySnapshot,
  ReciprocityStatus,
  ShoppingItem,
  Task,
  TaskInstance,
  UpcomingPayment,
  VaccineScheduleItem,
} from './types/entities.ts';

export type {
  FinanceMetrics,
  HomeFeedItem,
  MoneyFeedItem,
  RunwayProjection,
  UpcomingNeed,
} from './types/views.ts';

export type { AppError } from './types/errors.ts';
export { AppErrorException, isAppErrorException } from './types/errors.ts';

// Ngày dương
export type { CivilDate } from './date/civil.ts';
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
} from './date/civil.ts';

// Tài chính
export type { FinanceReason } from './finance/status.ts';
export { computeFinanceStatus, explainFinanceStatus } from './finance/status.ts';
export { inferLiquidity } from './finance/liquidity.ts';
export { debtPaidAmount, progressPct } from './finance/progress.ts';
export {
  DEFAULT_RECORD_THRESHOLD,
  projectRunway,
  RUNWAY_HORIZON_DAYS,
  shouldAskForRefresh,
} from './finance/runway.ts';

// Lịch âm
export type { LunarDate } from './lunar/convert.ts';
export {
  lunarMonthLength,
  lunarToSolar,
  lunarToSolarClamped,
  solarToLunar,
} from './lunar/convert.ts';
export type { LunarAnniversary } from './lunar/occurrence.ts';
export { nextLunarOccurrence, previousLunarOccurrence } from './lunar/occurrence.ts';

// Lặp lại
export { expandRecurrence, nextDue } from './recurrence/expand.ts';

// Gom việc theo hạn
export type { TaskGroup, TaskGroupKey } from './tasks/group.ts';
export { endOfWeek, groupTasksByDue, TASK_GROUP_ORDER, taskGroupOf } from './tasks/group.ts';

// Gom sự kiện theo tháng
export type { EventMonthGroup } from './events/group.ts';
export { groupEventsByMonth } from './events/group.ts';

// Trí nhớ năm ngoái
export { lastYearFor } from './events/last-year.ts';

// Sổ hiếu hỉ
export type { GiftSuggestion } from './gifts/suggest.ts';
export {
  listOutstandingObligations,
  reciprocityStatus,
  suggestGiftAmount,
  summarizeOccasion,
} from './gifts/suggest.ts';

// Hồ sơ con — lịch tiêm
export type { DoseLabel } from './child/vaccine.ts';
export {
  buildVaccineSchedule,
  DOSE_REMIND_LEAD_DAYS,
  doseStatus,
  formatDoseLabel,
} from './child/vaccine.ts';

// Nhắc nhở
export type { BuildRemindersInput, ReminderDraft, ReminderSource } from './reminders/build.ts';
export {
  buildReminders,
  capPerDay,
  DEFAULT_LEAD_DAYS,
  DEFAULT_REMIND_HOUR,
  defaultLeadDaysForDocument,
  MAX_REMINDERS_PER_DAY,
} from './reminders/build.ts';

// Quota
export type { CanUploadResult } from './quota/upload.ts';
export {
  canUpload,
  FREE_QUOTA_BYTES,
  hasStorageEntitlement,
  MAX_FILE_BYTES,
  PRO_QUOTA_BYTES,
} from './quota/upload.ts';
export type { CanUseCaptureResult } from './quota/capture.ts';
export {
  canUseCapture,
  captureQuotaFor,
  FREE_CAPTURES_PER_MONTH,
  hasCaptureEntitlement,
  PRO_CAPTURES_PER_MONTH,
} from './quota/capture.ts';

// Gợi ý gắn cờ
export type { AttentionSuggestion } from './attention/suggest.ts';
export { suggestAttention } from './attention/suggest.ts';

// Lịch sử tiền
export type {
  DayBucket,
  EventDayGroup,
  MoneyEventShape,
  MonthlyHistoryGroup,
  SnapshotDiff,
} from './history/snapshots.ts';
export {
  describeMoneyEvent,
  diffSnapshots,
  filterByEntityType,
  groupEventsByDay,
  groupHistoryByMonth,
  withDiffs,
} from './history/snapshots.ts';

// Định dạng
export { formatMoney, formatMoneyShort } from './format/money.ts';
export type { DueLabel, LunarLabel } from './format/dates.ts';
export { formatDueLabel, formatLunarLabel, lunarLabelOfDate } from './format/dates.ts';
export type { DeclaredLabel } from './format/declared.ts';
export { computeFreshness, formatDeclaredAt } from './format/declared.ts';

// Gói khởi tạo (05 §3.4)
export type {
  StarterPackDraft,
  StarterPackItem,
  StarterPackKey,
} from './onboarding/starter-pack.ts';
export {
  buildStarterPack,
  defaultCheckedKeys,
  STARTER_PACK_ITEMS,
  starterPackItem,
} from './onboarding/starter-pack.ts';
