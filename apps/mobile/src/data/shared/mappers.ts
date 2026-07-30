/**
 * Ánh xạ hàng DB (snake_case) → type domain (camelCase).
 *
 * Đây là SEAM giữa frontend và database (02). Ngoài thư mục repositories/,
 * không ai thấy tên cột.
 *
 * numeric của Postgres về JS có thể là string (khi vượt độ chính xác) — luôn
 * đi qua num() thay vì tin kiểu.
 */

import type {
  Asset,
  AttentionItem,
  Debt,
  FamilyDocument,
  FamilyEvent,
  FinanceMetrics,
  Goal,
  HomeFeedItem,
  Household,
  Member,
  MoneyEvent,
  MoneyFeedItem,
  MoneySnapshot,
  Recurrence,
  Task,
  TaskInstance,
  UpcomingPayment,
} from '@nhaminh/domain';

import type {
  AssetRow,
  AttentionItemRow,
  DebtRow,
  DocumentFileRow,
  DocumentRow,
  EventRow,
  FinanceMetricsRow,
  GoalRow,
  HomeFeedRow,
  HouseholdRow,
  MemberRow,
  MoneyEventRow,
  MoneyFeedRow,
  MoneySnapshotRow,
  RecurrenceRow,
  TaskInstanceRow,
  TaskRow,
  UpcomingPaymentRow,
} from '@/lib/database.types';

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return num(v);
}

export function toRecurrence(r: RecurrenceRow | null): Recurrence | null {
  if (r === null || r.freq === null || r.freq === 'none') return null;
  return {
    freq: r.freq as Recurrence['freq'],
    intervalN: r.interval_n ?? 1,
    ...(r.byweekday ? { byWeekday: r.byweekday } : {}),
    ...(r.bymonthday !== null ? { byMonthDay: r.bymonthday } : {}),
    untilDate: r.until_date,
  };
}

/** Chiều ngược lại, cho INSERT/UPDATE. */
export function fromRecurrence(r: Recurrence | null): RecurrenceRow | null {
  if (r === null || r.freq === 'none') return null;
  return {
    freq: r.freq,
    interval_n: r.intervalN,
    byweekday: r.byWeekday ?? null,
    bymonthday: r.byMonthDay ?? null,
    until_date: r.untilDate ?? null,
  };
}

export function toHousehold(r: HouseholdRow): Household {
  return {
    id: r.id,
    name: r.name,
    currency: r.currency,
    subscriptionStatus: r.subscription_status as Household['subscriptionStatus'],
    trialEndsAt: r.trial_ends_at,
    storageUsedBytes: num(r.storage_used_bytes),
    storageQuotaBytes: num(r.storage_quota_bytes),
    snapshotIntervalDays: (r.snapshot_interval_days === 30 ? 30 : 7) as 7 | 30,
  };
}

export function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    profileId: r.profile_id,
    displayName: r.display_name,
    role: r.role as Member['role'],
    birthday: r.birthday,
    isActive: r.is_active,
  };
}

export function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    assigneeId: r.assignee_id,
    dueDate: r.due_date,
    dueTime: r.due_time,
    recur: toRecurrence(r.recur),
    remindLeadDays: r.remind_lead_days,
    status: r.status as Task['status'],
    eventId: r.event_id,
  };
}

export function toTaskInstance(r: TaskInstanceRow): TaskInstance {
  return {
    id: r.id,
    taskId: r.task_id,
    dueDate: r.due_date,
    status: r.status as TaskInstance['status'],
    completedBy: r.completed_by,
    skipped: r.skipped,
  };
}

export function toEvent(r: EventRow): FamilyEvent {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind as FamilyEvent['kind'],
    side: r.side as FamilyEvent['side'],
    location: r.location,
    notes: r.notes,
    calendar: r.calendar as FamilyEvent['calendar'],
    solarDate: r.solar_date,
    lunarDay: r.lunar_day,
    lunarMonth: r.lunar_month,
    lunarLeapMonth: r.lunar_leap_month,
    startTime: r.start_time,
    isAllDay: r.is_all_day,
    recur: toRecurrence(r.recur),
    remindLeadDays: r.remind_lead_days,
    nextOccurrenceDate: r.next_occurrence_date,
    estimatedCost: numOrNull(r.estimated_cost),
  };
}

export function toAsset(r: AssetRow): Asset {
  return {
    id: r.id,
    name: r.name,
    assetKind: r.asset_kind as Asset['assetKind'],
    liquidity: r.liquidity as Asset['liquidity'],
    currentValue: num(r.current_value),
    holderMemberId: r.holder_member_id,
    institution: r.institution,
    asOfDate: r.as_of_date,
    notes: r.notes,
    isClosed: r.is_closed,
  };
}

export function toDebt(r: DebtRow): Debt {
  return {
    id: r.id,
    name: r.name,
    lender: r.lender,
    borrowerMemberId: r.borrower_member_id,
    principalAmount: numOrNull(r.principal_amount),
    remainingAmount: num(r.remaining_amount),
    interestRatePct: numOrNull(r.interest_rate_pct),
    installmentAmount: numOrNull(r.installment_amount),
    installmentRecur: toRecurrence(r.installment_recur),
    nextDueDate: r.next_due_date,
    finalDueDate: r.final_due_date,
    asOfDate: r.as_of_date,
    isSettled: r.is_settled,
  };
}

export function toPayment(r: UpcomingPaymentRow): UpcomingPayment {
  return {
    id: r.id,
    name: r.name,
    amount: num(r.amount),
    dueDate: r.due_date,
    dueMonth: r.due_month,
    recur: toRecurrence(r.recur),
    state: r.state as UpcomingPayment['state'],
    sourceDebtId: r.source_debt_id,
    eventId: r.event_id,
    notes: r.notes,
  };
}

export function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    targetAmount: num(r.target_amount),
    currentAmount: num(r.current_amount),
    targetDate: r.target_date,
    isArchived: r.is_archived,
  };
}

export function toAttentionItem(r: AttentionItemRow): AttentionItem {
  return {
    id: r.id,
    entityType: r.entity_type as AttentionItem['entityType'],
    entityId: r.entity_id,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  };
}

export function toMoneyEvent(
  r: MoneyEventRow,
  extra?: { entityTitle?: string | null; actorDisplayName?: string | null },
): MoneyEvent {
  return {
    id: r.id,
    entityType: r.entity_type as MoneyEvent['entityType'],
    entityId: r.entity_id,
    eventType: r.event_type as MoneyEvent['eventType'],
    valueBefore: numOrNull(r.value_before),
    valueAfter: numOrNull(r.value_after),
    delta: numOrNull(r.delta),
    occurredOn: r.occurred_on,
    note: r.note,
    actorProfileId: r.actor_profile_id,
    createdAt: r.created_at,
    entityTitle: extra?.entityTitle ?? null,
    actorDisplayName: extra?.actorDisplayName ?? null,
  };
}

export function toMoneySnapshot(r: MoneySnapshotRow): MoneySnapshot {
  return {
    id: r.id,
    asOfDate: r.as_of_date,
    totalUsable: num(r.total_usable),
    totalSavings: num(r.total_savings),
    totalLongTerm: num(r.total_long_term),
    totalDebt: num(r.total_debt),
    status: r.status as MoneySnapshot['status'],
    isManual: r.is_manual,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

/**
 * Chỉ những cột `toDocument` thật sự đọc.
 *
 * Danh sách giấy tờ select ÍT cột hơn màn chi tiết (không lấy `r2_key` — 01 §6),
 * nên nhận `DocumentFileRow` đầy đủ ở đây sẽ ép chỗ gọi phải select thừa. Khai
 * đúng phần mình dùng để cả hai câu select cùng khớp.
 */
export type DocumentFileFields = Pick<
  DocumentFileRow,
  'id' | 'filename' | 'mime' | 'size_bytes' | 'page_order' | 'is_confirmed' | 'deleted_at'
>;

export function toDocument(
  r: DocumentRow,
  files: DocumentFileFields[] = [],
  urls: Record<string, { thumbUrl: string | null; fileUrl: string | null }> = {},
): FamilyDocument {
  return {
    id: r.id,
    title: r.title,
    type: r.type as FamilyDocument['type'],
    ownerMemberId: r.owner_member_id,
    issuedDate: r.issued_date,
    expiryDate: r.expiry_date,
    remindLeadDays: r.remind_lead_days,
    physicalLocation: r.physical_location,
    externalLink: r.external_link,
    renewalCost: numOrNull(r.renewal_cost),
    eventId: r.event_id,
    debtId: r.debt_id,
    extra: (r.extra as Record<string, unknown>) ?? {},
    files: files
      .filter((f) => f.deleted_at === null && f.is_confirmed)
      .sort((a, b) => a.page_order - b.page_order)
      .map((f) => ({
        id: f.id,
        filename: f.filename,
        mime: f.mime,
        sizeBytes: num(f.size_bytes),
        pageOrder: f.page_order,
        thumbUrl: urls[f.id]?.thumbUrl ?? null,
        fileUrl: urls[f.id]?.fileUrl ?? null,
      })),
  };
}

/**
 * View home_feed. Cột `source` là entity_type (7 giá trị) nhưng chỉ 4 nguồn
 * thật sự xuất hiện trong union — narrow ở đây (mismatch #2 trong kế hoạch).
 */
const HOME_FEED_SOURCES = new Set(['task', 'event', 'upcoming_payment', 'document']);

export function toHomeFeedItem(r: HomeFeedRow): HomeFeedItem | null {
  if (!HOME_FEED_SOURCES.has(r.source)) return null;
  return {
    source: r.source as HomeFeedItem['source'],
    id: r.id,
    title: r.title,
    onDate: r.on_date,
    memberId: r.member_id,
    amount: numOrNull(r.amount),
    isDone: r.is_done,
  };
}

export function toFinanceMetrics(r: FinanceMetricsRow): FinanceMetrics {
  return {
    totalUsable: num(r.total_usable),
    totalSavings: num(r.total_savings),
    totalLongTerm: num(r.total_long_term),
    totalDebt: num(r.total_debt),
    dueNext30d: num(r.due_next_30d),
    dueNext7dCount: num(r.due_next_7d_count),
    overdueCount: num(r.overdue_count),
    attentionCount: num(r.attention_count),
    lastUpdatedOn: r.last_updated_on,
    lastSnapshotOn: r.last_snapshot_on,
    snapshotIntervalDays: num(r.snapshot_interval_days),
    currency: r.currency,
  };
}

export function toMoneyFeedItem(r: MoneyFeedRow): MoneyFeedItem {
  return {
    kind: r.kind as MoneyFeedItem['kind'],
    id: r.id,
    title: r.title,
    amount: num(r.amount),
    onDate: r.on_date,
    memberId: r.member_id,
    isClosed: r.is_closed,
  };
}
