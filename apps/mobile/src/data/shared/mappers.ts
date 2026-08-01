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
  ChildVaccineDose,
  Contact,
  Debt,
  FamilyDocument,
  EventOccurrence,
  FamilyEvent,
  FinanceMetrics,
  GiftEntry,
  GiftHistory,
  Goal,
  GrowthRecord,
  HomeFeedItem,
  IngestDraft,
  Household,
  Member,
  MoneyEvent,
  MoneyFeedItem,
  MoneySnapshot,
  Recurrence,
  ShoppingItem,
  Task,
  TaskInstance,
  UpcomingNeed,
  UpcomingPayment,
  VaccineScheduleItem,
} from '@family-organizer/domain';

import type {
  AssetRow,
  AttentionItemRow,
  ChildGrowthRecordRow,
  ChildVaccineDoseRow,
  ContactRow,
  DebtRow,
  DocumentFileRow,
  DocumentRow,
  EventOccurrenceRow,
  EventRow,
  FinanceMetricsRow,
  GiftEntryRow,
  GiftHistoryRow,
  GoalRow,
  HomeFeedRow,
  HouseholdRow,
  IngestDraftRow,
  MemberRow,
  MoneyEventRow,
  MoneyFeedRow,
  MoneySnapshotRow,
  RecurrenceRow,
  ShoppingItemRow,
  TaskInstanceRow,
  TaskRow,
  UpcomingNeedRow,
  UpcomingPaymentRow,
  VaccineScheduleItemRow,
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
    recordThresholdAmount: numOrNull(r.record_threshold_amount),
    trialMilestones: {
      reminderAcknowledged: r.trial_milestones?.reminderAcknowledged ?? false,
      eventWithCostCompleted: r.trial_milestones?.eventWithCostCompleted ?? false,
    },
  };
}

export function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    profileId: r.profile_id,
    displayName: r.display_name,
    role: r.role as Member['role'],
    birthday: r.birthday,
    schoolName: r.school_name,
    schoolClass: r.school_class,
    healthInsuranceNo: r.health_insurance_no,
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

/**
 * `doneBy` CỐ Ý không được map lên type domain: nó có trong DB để hoàn tác,
 * nhưng UI không bao giờ thấy nó — xem ShoppingItem ở packages/domain.
 */
export function toShoppingItem(r: ShoppingItemRow): ShoppingItem {
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    isDone: r.is_done,
    addedBy: r.added_by,
    doneAt: r.done_at,
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

export function toEventOccurrence(r: EventOccurrenceRow): EventOccurrence {
  return {
    id: r.id,
    eventId: r.event_id,
    occurredOn: r.occurred_on,
    actualCost: numOrNull(r.actual_cost),
    notes: r.notes,
    costAsked: r.cost_asked,
  };
}

/**
 * Bản nháp AI — 06 §6.
 *
 * `parsed` được ép về `Record<string, unknown> | null` chứ KHÔNG về hình dạng
 * của một entity nào: nội dung đến từ model và chưa qua kiểm. Nơi kiểm là zod
 * schema của entity tương ứng, chạy ngay trước khi đổ vào form (02 §5).
 *
 * `unknown` từ jsonb có thể là số, chuỗi, hay mảng nếu model trả sai hình
 * dạng — không phải lúc nào cũng là object. Kiểm tường minh thay vì ép kiểu,
 * nếu không một mảng sẽ lọt qua và form nhận `parsed.title === undefined` mà
 * không ai biết vì sao.
 */
export function toIngestDraft(r: IngestDraftRow): IngestDraft {
  const parsed =
    typeof r.parsed === 'object' && r.parsed !== null && !Array.isArray(r.parsed)
      ? (r.parsed as Record<string, unknown>)
      : null;

  return {
    id: r.id,
    source: r.source as IngestDraft['source'],
    rawText: r.raw_text,
    imagePath: r.image_path,
    suggestedEntityType: r.suggested_entity_type as IngestDraft['suggestedEntityType'],
    parsed,
    status: r.status as IngestDraft['status'],
    createdAt: r.created_at,
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
    updatedByMemberId: r.updated_by_member_id,
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
    asOfDate: r.as_of_date,
    updatedByMemberId: r.updated_by_member_id,
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
    notes: r.notes,
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
    lastUsableUpdatedOn: r.last_usable_updated_on,
    lastUpdatedOn: r.last_updated_on,
    currency: r.currency,
    recordThresholdAmount: numOrNull(r.record_threshold_amount),
  };
}

/**
 * View `upcoming_needs` — ba nguồn tiền gộp làm một (06 §3).
 *
 * `source` narrow từ `entity_type` (9 giá trị) xuống đúng ba nguồn thật sự
 * xuất hiện trong union của view.
 */
export function toUpcomingNeed(r: UpcomingNeedRow): UpcomingNeed {
  return {
    source: r.source as UpcomingNeed['source'],
    id: r.id,
    title: r.title,
    amount: num(r.amount),
    onDate: r.on_date,
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

// --- Sổ mừng cưới (07 §3) ---

export function toContact(r: ContactRow): Contact {
  return {
    id: r.id,
    displayName: r.display_name,
    relationNote: r.relation_note,
    side: r.side as Contact['side'],
  };
}

export function toGiftEntry(r: GiftEntryRow): GiftEntry {
  return {
    id: r.id,
    contactId: r.contact_id,
    direction: r.direction as GiftEntry['direction'],
    occasion: r.occasion as GiftEntry['occasion'],
    amount: num(r.amount),
    occurredOn: r.occurred_on,
    eventId: r.event_id,
    inKindNote: r.in_kind_note,
    notes: r.notes,
  };
}

/**
 * View `gift_history`. `count(*)` của Postgres là bigint → về JS có thể là
 * string, nên `timesReceived`/`timesGiven` cũng phải đi qua num() chứ không
 * chỉ các cột tiền.
 */
export function toGiftHistory(r: GiftHistoryRow): GiftHistory {
  return {
    contactId: r.contact_id,
    displayName: r.display_name,
    timesReceived: num(r.times_received),
    timesGiven: num(r.times_given),
    totalReceived: num(r.total_received),
    totalGiven: num(r.total_given),
    lastReceivedOn: r.last_received_on,
    lastGivenOn: r.last_given_on,
  };
}

// --- Hồ sơ con (07 §4) ---

export function toVaccineScheduleItem(r: VaccineScheduleItemRow): VaccineScheduleItem {
  return {
    code: r.code,
    displayName: r.display_name,
    doseLabel: r.dose_label,
    dueAgeMonths: num(r.due_age_months),
    sortOrder: num(r.sort_order),
    sourceName: r.source_name,
    sourceDate: r.source_date,
    scheduleVersion: r.schedule_version,
  };
}

/**
 * `displayName` KHÔNG có trong bảng — nó được ghép từ hàng tham chiếu
 * (`vaccine_schedule_items`) cho mũi trong lịch, hoặc lấy `custom_name` cho mũi
 * ngoài lịch.
 *
 * Cố ý không denormalize tên xuống `child_vaccine_doses`: khi lịch được cập
 * nhật (một phiên bản mới được người có chuyên môn xác nhận), tên phải đổi theo
 * ở mọi hàng cũ. Một bản sao trong hàng của người dùng sẽ đóng băng tên của
 * phiên bản lịch đã bị thay — và không có gì báo cho ai biết.
 *
 * `names` rỗng (chưa seed) → rơi về `custom_name`, rồi về `schedule_code`. Mã
 * thô xấu nhưng THẬT; bịa ra một cái tên ở đây là bịa dữ liệu y tế.
 */
export function toChildVaccineDose(
  r: ChildVaccineDoseRow,
  names: ReadonlyMap<string, string>,
): ChildVaccineDose {
  const fromSchedule = r.schedule_code === null ? null : (names.get(r.schedule_code) ?? null);
  return {
    id: r.id,
    memberId: r.member_id,
    scheduleCode: r.schedule_code,
    customName: r.custom_name,
    displayName: fromSchedule ?? r.custom_name ?? r.schedule_code ?? '',
    dueDate: r.due_date,
    status: r.status as ChildVaccineDose['status'],
    administeredOn: r.administered_on,
    facility: r.facility,
    notes: r.notes,
  };
}

export function toGrowthRecord(r: ChildGrowthRecordRow): GrowthRecord {
  return {
    id: r.id,
    memberId: r.member_id,
    measuredOn: r.measured_on,
    heightCm: numOrNull(r.height_cm),
    weightKg: numOrNull(r.weight_kg),
    notes: r.notes,
  };
}
