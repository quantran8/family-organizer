# 02 — Hợp đồng dữ liệu

Seam giữa frontend và database. Đây là **thứ duy nhất** tầng UI được phép biết về dữ liệu.

Tài liệu này mô tả hai nhóm nằm ở hai chỗ khác nhau, theo tiêu chí ở `01 §1`:

| Phần | Ở đâu | Vì sao |
|---|---|---|
| Type thực thể (§1–3) | `packages/domain` | Edge cũng cần — chúng là tham số của các hàm nghiệp vụ |
| Repository interface (§4) | `apps/mobile/src/data/repositories` | Chỉ mobile dùng; Edge ghi bằng service role, không qua PostgREST |
| zod input schema (§5) | `apps/mobile/src/data/schemas` | Chỉ mobile dùng; không form nào của người dùng đi qua Edge |
| `AppError` (§6) | `packages/domain` | `canUpload` trả về nó, mà hàm đó chạy ở cả hai nơi |

---

## 1. Type nền

```ts
export type UUID = string;
export type ISODate = string;      // 'YYYY-MM-DD'
export type ISODateTime = string;

export type Liquidity = 'usable_now' | 'not_immediate' | 'long_term';
export type AssetKind =
  | 'cash' | 'bank_account' | 'savings' | 'gold'
  | 'real_estate' | 'investment' | 'receivable' | 'other';
export type PaymentState = 'unpaid' | 'paid';
export type FinanceStatus = 'ok' | 'watch' | 'tight' | 'no_data';
export type CalendarType = 'solar' | 'lunar';
export type FamilySide = 'husband_family' | 'wife_family' | 'both' | 'own';
export type EventKind =
  | 'death_anniversary' | 'wedding' | 'birthday' | 'holiday'
  | 'medical' | 'trip' | 'school' | 'other';
export type EntityType =
  | 'task' | 'event' | 'document'
  | 'asset' | 'debt' | 'goal' | 'upcoming_payment';

export type RecurFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface Recurrence {
  freq: RecurFreq;
  intervalN: number;
  byWeekday?: number[];    // 0 = CN
  byMonthDay?: number;
  untilDate?: ISODate | null;
}
```

**Tiền tệ không xuất hiện trên từng bản ghi.** Nó thuộc household. `amount` là `number`, đơn vị là đơn vị nhỏ nhất của tiền tệ đó — với VND là đồng, không có phần lẻ. UI format bằng `Intl.NumberFormat('vi-VN')`.

---

## 2. Thực thể

```ts
export interface Household {
  id: UUID;
  name: string;
  currency: string;
  subscriptionStatus: 'trialing' | 'active' | 'grace' | 'expired' | 'none';
  trialEndsAt: ISODateTime | null;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  snapshotIntervalDays: 7 | 30;
}

export interface Member {
  id: UUID;
  profileId: UUID | null;      // null = người trong nhà chưa/không có tài khoản
  displayName: string;
  role: 'owner' | 'partner' | 'child' | 'relative';
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
  nextOccurrenceDate: ISODate | null;   // đọc-only, do Edge tính
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

export interface FamilyDocument {
  id: UUID;
  title: string;
  type: DocType;
  ownerMemberId: UUID | null;
  issuedDate: ISODate | null;
  expiryDate: ISODate | null;
  remindLeadDays: number;
  physicalLocation: string | null;
  externalLink: string | null;
  renewalCost: number | null;
  eventId: UUID | null;
  debtId: UUID | null;
  extra: Record<string, unknown>;
  files: DocumentFile[];
}

export interface DocumentFile {
  id: UUID;
  filename: string;
  mime: string;
  sizeBytes: number;
  pageOrder: number;
  thumbUrl: string | null;   // presigned, TTL ngắn
  fileUrl: string | null;    // chỉ lấy khi mở xem
}

export interface AttentionItem {
  id: UUID;
  entityType: EntityType;
  entityId: UUID;
  note: string | null;
  createdBy: UUID;
  createdAt: ISODateTime;
  expiresAt: ISODateTime;
}
```

---

## 3. View đọc

Ba view trong DB ánh xạ thẳng sang ba type. UI **chỉ đọc từ đây** cho các màn hình tổng hợp — không tự ghép nhiều query.

```ts
export interface HomeFeedItem {
  source: 'task' | 'event' | 'upcoming_payment' | 'document';
  id: UUID;
  title: string;
  onDate: ISODate | null;
  memberId: UUID | null;
  amount: number | null;
  isDone: boolean;
}

/** Nguyên liệu thô. KHÔNG chứa status — status tính ở packages/domain. */
export interface FinanceMetrics {
  totalUsable: number;
  totalSavings: number;
  totalLongTerm: number;
  totalDebt: number;
  dueNext30d: number;
  dueNext7dCount: number;
  overdueCount: number;
  attentionCount: number;
  lastUpdatedOn: ISODate | null;
  lastSnapshotOn: ISODate | null;
  snapshotIntervalDays: number;
  currency: string;
}

export interface MoneyFeedItem {
  kind: 'asset' | 'debt' | 'upcoming_payment' | 'goal';
  id: UUID;
  title: string;
  amount: number;
  onDate: ISODate | null;
  memberId: UUID | null;
  isClosed: boolean;
}
```

---

## 4. Repository interface

Mọi phương thức nhận `householdId` tường minh. Không có repository nào tự lấy household từ biến toàn cục.

```ts
export interface AssetRepo {
  list(hh: UUID): Promise<Asset[]>;
  get(hh: UUID, id: UUID): Promise<Asset | null>;
  create(hh: UUID, input: AssetInput): Promise<Asset>;
  update(hh: UUID, id: UUID, patch: Partial<AssetInput>): Promise<Asset>;
  /** RPC nguyên tử: cập nhật giá trị + ghi money_events trong một transaction */
  updateValue(hh: UUID, id: UUID, value: number,
              asOf: ISODate, note?: string): Promise<void>;
  close(hh: UUID, id: UUID): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface PaymentRepo {
  list(hh: UUID, window: '7d' | '30d' | 'overdue' | 'paid' | 'all'): Promise<UpcomingPayment[]>;
  create(hh: UUID, input: PaymentInput): Promise<UpcomingPayment>;
  update(hh: UUID, id: UUID, patch: Partial<PaymentInput>): Promise<UpcomingPayment>;
  /** RPC nguyên tử: đánh dấu paid + giảm dư nợ + ghi money_events */
  settle(hh: UUID, id: UUID, paidOn: ISODate, note?: string): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface DocumentRepo {
  list(hh: UUID, filter?: { expiringWithinDays?: number;
                            ownerMemberId?: UUID }): Promise<FamilyDocument[]>;
  get(hh: UUID, id: UUID): Promise<FamilyDocument | null>;
  create(hh: UUID, input: DocumentInput): Promise<FamilyDocument>;
  update(hh: UUID, id: UUID, patch: Partial<DocumentInput>): Promise<FamilyDocument>;
  /** Ba pha: presign → PUT lên R2 → confirm. Xem 01 §6. */
  attachFile(hh: UUID, docId: UUID, file: LocalFile,
             onProgress?: (pct: number) => void): Promise<DocumentFile>;
  removeFile(hh: UUID, fileId: UUID): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface AttentionRepo {
  listOpen(hh: UUID): Promise<AttentionItem[]>;
  flag(hh: UUID, entityType: EntityType, entityId: UUID, note?: string): Promise<AttentionItem>;
  resolve(hh: UUID, id: UUID, resolutionNote?: string): Promise<void>;
}

export interface SnapshotRepo {
  latest(hh: UUID): Promise<MoneySnapshot | null>;
  history(hh: UUID, limit: number): Promise<MoneySnapshot[]>;
  /** Flow cập nhật tuần: 4 con số + trạng thái tính sẵn ở client */
  create(hh: UUID, input: SnapshotInput): Promise<MoneySnapshot>;
}
```

Tương tự: `TaskRepo`, `EventRepo`, `DebtRepo`, `GoalRepo`, `HouseholdRepo`, `MemberRepo`, `InviteRepo`.

---

## 5. Input schema (zod)

Nguồn sự thật cho form validation ở client. Nằm trong `apps/mobile`, **không** dùng chung với Edge: không có input nào của người dùng đi qua Edge Function, nên không có validation nào bị lặp.

(Edge chỉ ghi các trường dẫn xuất — `nextOccurrenceDate`, snapshot, reminder, trạng thái đăng ký — và tự kiểm tra payload hẹp của riêng nó.)

```ts
export const assetInput = z.object({
  name: z.string().trim().min(1, 'Nhập tên khoản').max(120),
  assetKind: z.enum(ASSET_KINDS),
  // suy ra từ assetKind, người dùng không phải trả lời — xem 03 §2
  liquidity: z.enum(LIQUIDITIES),
  currentValue: z.number().int().nonnegative(),
  holderMemberId: z.string().uuid().nullable(),
  institution: z.string().max(120).nullable(),
  asOfDate: isoDate,
  notes: z.string().max(2000).nullable(),
});

export const eventInput = z.object({
  title: z.string().trim().min(1, 'Nhập tên sự kiện').max(160),
  kind: z.enum(EVENT_KINDS),
  side: z.enum(FAMILY_SIDES).nullable(),
  calendar: z.enum(['solar', 'lunar']),
  solarDate: isoDate.nullable(),
  lunarDay: z.number().int().min(1).max(30).nullable(),
  lunarMonth: z.number().int().min(1).max(12).nullable(),
  lunarLeapMonth: z.boolean().default(false),
  // …
}).refine(
  v => v.calendar === 'solar' ? !!v.solarDate : (!!v.lunarDay && !!v.lunarMonth),
  { message: 'Chọn ngày cho sự kiện' },
);
```

`nextOccurrenceDate` **không có** trong input schema. Nó là giá trị dẫn xuất, chỉ Edge Function `refresh-lunar-dates` được ghi.

---

## 6. Lỗi

```ts
export type AppError =
  | { kind: 'offline' }
  | { kind: 'auth' }
  | { kind: 'quota_exceeded'; usedBytes: number; quotaBytes: number }
  | { kind: 'premium_required'; feature: string }
  | { kind: 'not_found' }
  | { kind: 'conflict'; message: string }
  | { kind: 'unknown'; cause: unknown };
```

Repository ném `AppError`, không bao giờ để lộ lỗi Postgres thô lên UI. Bản đồ mã lỗi PostgREST → `AppError` đặt trong `repositories/errors.ts`, một chỗ duy nhất.

---

## 7. Trường chỉ đọc

UI không bao giờ được ghi các trường sau. Nếu có form nào chạm tới, đó là bug:

| Trường | Ai ghi |
|---|---|
| `events.nextOccurrenceDate` | Edge `refresh-lunar-dates` |
| `households.storageUsedBytes` | trigger DB |
| `households.subscriptionStatus` | Edge `revenuecat-webhook` |
| `debts.remainingAmount` | RPC `settle_payment` |
| `documentFiles.isConfirmed` | Edge `confirm-upload` |
| toàn bộ `money_events` | RPC (append-only, DB chặn sửa/xoá) |
