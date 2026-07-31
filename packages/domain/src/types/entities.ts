/**
 * Thực thể — 02 §2.
 *
 * Tiền tệ KHÔNG xuất hiện trên từng bản ghi; nó thuộc household. `amount` là
 * number, đơn vị là đơn vị nhỏ nhất của tiền tệ đó — với VND là đồng, không có
 * phần lẻ.
 */

import type {
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
  Recurrence,
  SubscriptionStatus,
  UUID,
} from './base.ts';

export interface Household {
  id: UUID;
  name: string;
  currency: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: ISODateTime | null;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  snapshotIntervalDays: 7 | 30;
}

export interface Member {
  id: UUID;
  /** null = người trong nhà chưa/không có tài khoản (con nhỏ, bố mẹ hai bên) */
  profileId: UUID | null;
  displayName: string;
  role: MemberRole;
  birthday: ISODate | null;
  isActive: boolean;
}

export interface Task {
  id: UUID;
  title: string;
  notes: string | null;
  assigneeId: UUID | null;
  dueDate: ISODate | null;
  dueTime: string | null;
  recur: Recurrence | null;
  remindLeadDays: number;
  status: 'todo' | 'done';
  eventId: UUID | null;
}

export interface TaskInstance {
  id: UUID;
  taskId: UUID;
  dueDate: ISODate;
  status: 'todo' | 'done';
  completedBy: UUID | null;
  skipped: boolean;
}

export interface FamilyEvent {
  id: UUID;
  title: string;
  kind: EventKind;
  side: FamilySide | null;
  location: string | null;
  notes: string | null;
  calendar: CalendarType;
  solarDate: ISODate | null;
  lunarDay: number | null;
  lunarMonth: number | null;
  lunarLeapMonth: boolean;
  startTime: string | null;
  isAllDay: boolean;
  recur: Recurrence | null;
  remindLeadDays: number;
  /** Đọc-only. Chỉ Edge `refresh-lunar-dates` được ghi — 02 §7. */
  nextOccurrenceDate: ISODate | null;
  estimatedCost: number | null;
}

export interface Asset {
  id: UUID;
  name: string;
  assetKind: AssetKind;
  liquidity: Liquidity;
  currentValue: number;
  holderMemberId: UUID | null;
  institution: string | null;
  asOfDate: ISODate;
  notes: string | null;
  isClosed: boolean;
}

export interface Debt {
  id: UUID;
  name: string;
  lender: string | null;
  borrowerMemberId: UUID | null;
  principalAmount: number | null;
  /** Đọc-only. Chỉ RPC `settle_payment` được ghi — 02 §7. */
  remainingAmount: number;
  interestRatePct: number | null;
  installmentAmount: number | null;
  installmentRecur: Recurrence | null;
  nextDueDate: ISODate | null;
  finalDueDate: ISODate | null;
  asOfDate: ISODate;
  isSettled: boolean;
}

export interface UpcomingPayment {
  id: UUID;
  name: string;
  amount: number;
  dueDate: ISODate | null;
  dueMonth: ISODate | null;
  recur: Recurrence | null;
  state: PaymentState;
  sourceDebtId: UUID | null;
  eventId: UUID | null;
  notes: string | null;
}

export interface Goal {
  id: UUID;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: ISODate | null;
  isArchived: boolean;
}

export interface DocumentFile {
  id: UUID;
  filename: string;
  mime: string;
  sizeBytes: number;
  pageOrder: number;
  /** presigned, TTL ngắn */
  thumbUrl: string | null;
  /** chỉ lấy khi mở xem — danh sách không bao giờ tải bản gốc (01 §6) */
  fileUrl: string | null;
}

export interface FamilyDocument {
  id: UUID;
  title: string;
  type: DocType;
  ownerMemberId: UUID | null;
  issuedDate: ISODate | null;
  expiryDate: ISODate | null;
  remindLeadDays: number;
  /** Trường quan trọng nhất trên màn chi tiết — 05 §7.2. */
  physicalLocation: string | null;
  externalLink: string | null;
  /**
   * Thiếu ở G2 (cột `documents.notes` có, `DocumentInput` có, mapper cũng ghi
   * xuống — chỉ entity là không khai). Bốn thực thể khác đều có `notes`, nên
   * đây là một chỗ sót chứ không phải một quyết định.
   */
  notes: string | null;
  renewalCost: number | null;
  eventId: UUID | null;
  debtId: UUID | null;
  extra: Record<string, unknown>;
  files: DocumentFile[];
}

export interface AttentionItem {
  id: UUID;
  entityType: EntityType;
  entityId: UUID;
  note: string | null;
  createdBy: UUID;
  createdAt: ISODateTime;
  /** Tự hết hiệu lực sau 14 ngày để trạng thái không mắc kẹt ở `watch` — 05 §6.7. */
  expiresAt: ISODateTime;
}

/**
 * Lịch sử TỪNG KHOẢN — schema.sql §5.5, append-only.
 *
 * 02 §2 không khai báo type này dù SnapshotRepo đã tham chiếu MoneySnapshot;
 * bổ sung ở đây, ánh xạ thẳng từ cột schema.
 *
 * Lưu cả valueBefore/valueAfter/delta để đọc lịch sử vẫn đúng khi entity gốc
 * bị xoá mềm.
 */
export interface MoneyEvent {
  id: number;
  entityType: MoneyEntityType;
  entityId: UUID;
  eventType: MoneyEventType;
  valueBefore: number | null;
  valueAfter: number | null;
  delta: number | null;
  occurredOn: ISODate;
  note: string | null;
  actorProfileId: UUID | null;
  createdAt: ISODateTime;
  /** Tên khoản, join từ entity gốc lúc đọc. null nếu entity đã bị xoá cứng. */
  entityTitle?: string | null;
  /** Tên hiển thị của người thực hiện, join từ members. */
  actorDisplayName?: string | null;
}

/**
 * Ảnh chụp TỔNG của cả nhà theo thời điểm — schema.sql §5.7.
 * Khác MoneyEvent: hai tầng lịch sử khác nhau, cần cả hai.
 */
export interface MoneySnapshot {
  id: UUID;
  asOfDate: ISODate;
  totalUsable: number;
  totalSavings: number;
  totalLongTerm: number;
  totalDebt: number;
  /** Trạng thái ĐÃ LƯU tại thời điểm đó — không tính lại trên số cũ. */
  status: FinanceStatus;
  /** false = cron cuối tháng tự tổng hợp, không phải ai nhập. */
  isManual: boolean;
  note: string | null;
  createdBy: UUID | null;
  createdAt: ISODateTime;
}
