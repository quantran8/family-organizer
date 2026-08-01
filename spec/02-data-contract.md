# 02 — Hợp đồng dữ liệu

Seam giữa frontend và database. Đây là **thứ duy nhất** tầng UI được phép biết về dữ liệu.

Tài liệu này mô tả hai nhóm nằm ở hai chỗ khác nhau, theo tiêu chí ở `01 §1`:

| Phần | Ở đâu | Vì sao |
|---|---|---|
| Type thực thể (§1–3) | `packages/domain` | Edge cũng cần — chúng là tham số của các hàm nghiệp vụ |
| Repository interface (§4) | `apps/mobile/src/data/repositories` | Chỉ mobile dùng; Edge ghi bằng service role, không qua PostgREST |
| zod input schema (§5) | `apps/mobile/src/data/schemas` | Form người dùng; xem ngoại lệ ở §5 |
| `AppError` (§6) | `packages/domain` | `canUpload` trả về nó, mà hàm đó chạy ở cả hai nơi |

> Phiên bản v2.1 — đã hợp nhất concept v2, hai module bản địa, và addendum. Lịch sử thay đổi ở `06`, `07`, `08`.

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

/**
 * Trục là "nhà ai", không phải "nội/ngoại".
 * Bản trước dùng paternal/maternal trong DB và husband/wife ở TS — hai trục
 * khác nhau, không ánh xạ được (bên nội của vợ tồn tại). Đã thống nhất theo
 * thứ người dùng thật sự nghĩ và thứ UI hiển thị.
 */
export type FamilySide = 'husband_family' | 'wife_family' | 'both' | 'own';

export type EventKind =
  | 'death_anniversary' | 'wedding' | 'birthday' | 'holiday'
  | 'medical' | 'trip' | 'school' | 'other';
export type EntityType =
  | 'task' | 'event' | 'document'
  | 'asset' | 'debt' | 'goal' | 'upcoming_payment' | 'shopping_item';

export type RecurFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface Recurrence {
  freq: RecurFreq;
  intervalN: number;
  byWeekday?: number[];    // 0 = CN
  byMonthDay?: number;
  untilDate?: ISODate | null;
}

/** Độ mới của số khai. Chỉ dùng cho NHÃN, không bao giờ đổi FinanceStatus. */
export type Freshness = 'fresh' | 'aging' | 'stale';

/** Mọi con số dẫn xuất phải mang cờ này. UI in kèm "theo những khoản đã ghi". */
export type Basis = 'declared';
```

**Tiền tệ không xuất hiện trên từng bản ghi.** Nó thuộc household. `amount` là `number`, đơn vị là đơn vị nhỏ nhất của tiền tệ đó — với VND là đồng, không có phần lẻ. UI format bằng `Intl.NumberFormat('vi-VN')`.

**Số khai, không phải số đo.** Mọi giá trị tiền do người dùng nhập đều đi kèm `asOfDate` và người nhập. UI không được hiển thị số tổng nào mà thiếu nhãn thời gian — xem `03 §8` `formatDeclaredAt`.

---

## 2. Thực thể

```ts
export interface Household {
  id: UUID;
  name: string;
  currency: string;
  subscriptionStatus: 'trialing' | 'active' | 'grace' | 'expired' | 'none';
  trialEndsAt: ISODateTime | null;
  /** Cột mốc để kết thúc trial. Trial không hết theo ngày đơn thuần. */
  trialMilestones: {
    reminderAcknowledged: boolean;
    eventWithCostCompleted: boolean;
  };
  storageUsedBytes: number;
  storageQuotaBytes: number;
  /**
   * Ngưỡng hai người tự chốt lúc onboarding. null = "tự quyết".
   * KHÔNG PHẢI VALIDATION: không chặn form, không cảnh báo, không constraint.
   * Chỉ dùng cho dòng gợi ý dưới ô nhập và cho shouldAskForRefresh().
   */
  recordThresholdAmount: number | null;
}

export interface Member {
  id: UUID;
  profileId: UUID | null;      // null = người trong nhà chưa/không có tài khoản
  displayName: string;
  /**
   * 'child' và 'relative' là đối tượng ĐƯỢC GHI NHẬN, không phải người dùng app.
   * Không có luồng mời cho hai role này. Household thực tế = 2 người lớn.
   */
  role: 'owner' | 'partner' | 'child' | 'relative';
  birthday: ISODate | null;
  isActive: boolean;
}

export interface Task {
  id: UUID;
  title: string;
  notes: string | null;
  /**
   * MẶC ĐỊNH null. Việc không gán ai là việc của nhà.
   * Bất kỳ thành viên nào cũng đổi được, bất cứ lúc nào, không cần xác nhận
   * và không sinh thông báo. Xem 06 §7.
   */
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
  /** Ghi để hoàn tác. KHÔNG BAO GIỜ hiển thị trên UI. Xem 06 §7. */
  completedBy: UUID | null;
  skipped: boolean;
}

/** Bề mặt hằng ngày duy nhất của app. Cố ý thiếu trường. */
export interface ShoppingItem {
  id: UUID;
  title: string;
  note: string | null;
  isDone: boolean;
  addedBy: UUID;
  doneAt: ISODateTime | null;
  // KHÔNG có: quantity, price, category, store, assigneeId.
  // Thêm bất kỳ trường nào trong số đó là biến danh sách thành việc được giao.
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

/** Lần diễn ra đã qua của sự kiện lặp. Nguồn của "trí nhớ năm ngoái". */
export interface EventOccurrence {
  id: UUID;
  eventId: UUID;
  occurredOn: ISODate;
  actualCost: number | null;     // hỏi một lần, bỏ qua được
  notes: string | null;
}

export interface Asset {
  id: UUID;
  name: string;
  assetKind: AssetKind;
  liquidity: Liquidity;
  currentValue: number;
  holderMemberId: UUID | null;
  institution: string | null;
  asOfDate: ISODate;             // bắt buộc hiển thị kèm giá trị
  updatedByMemberId: UUID | null;// để render "Anh cập nhật 6 tuần trước"
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

/**
 * P0. Mục tiêu NHÌN VỀ PHÍA TRƯỚC — cùng hướng với trái tim sản phẩm.
 * Ba ranh giới (08 §2.3):
 *   1. KHÔNG chảy vào UpcomingNeed — nghĩa vụ khác nguyện vọng.
 *   2. Không tiến độ theo thời gian, không lời khuyên góp bao nhiêu mỗi tháng.
 *   3. Không đóng góp theo người.
 */
export interface Goal {
  id: UUID;
  name: string;
  targetAmount: number;
  /** SỐ KHAI, y hệt Asset.currentValue. Luôn hiển thị kèm asOfDate. */
  currentAmount: number;
  asOfDate: ISODate;
  updatedByMemberId: UUID | null;
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

/** Một lần giá trị thay đổi. Nguồn của màn hình lịch sử. */
export interface MoneyEvent {
  id: number;
  entityType: 'asset' | 'debt' | 'goal' | 'upcoming_payment';
  entityId: UUID;
  entityTitle: string;          // '(đã xoá)' nếu entity đã soft-delete
  eventType: 'created' | 'value_updated' | 'contribution'
           | 'withdrawal' | 'settled' | 'reopened' | 'closed';
  valueBefore: number | null;
  valueAfter: number | null;
  delta: number | null;
  occurredOn: ISODate;
  note: string | null;
  /** Trả lời "ai khai con số này" trong lịch sử CỦA MỘT KHOẢN.
   *  KHÔNG BAO GIỜ được nhóm lại thành tổng theo người. */
  actorDisplayName: string | null;
}

// --- Sổ mừng cưới (07 §3) ---

/** Họ hàng và bạn bè. KHÔNG PHẢI Member: không tài khoản, không thông báo. */
export interface Contact {
  id: UUID;
  displayName: string;
  /** Chữ tự do: "chú ruột bên nội". Không enum hoá quan hệ họ hàng VN. */
  relationNote: string | null;
  side: 'husband_family' | 'wife_family' | 'shared' | 'other';
  // KHÔNG có: phone, address, avatar, birthday, group. Đây không phải danh bạ.
}

export interface GiftEntry {
  id: UUID;
  contactId: UUID;
  direction: 'received' | 'given';
  occasion: 'wedding' | 'engagement' | 'funeral' | 'death_anniversary'
          | 'full_month' | 'birthday' | 'housewarming' | 'other';
  amount: number;
  occurredOn: ISODate;
  eventId: UUID | null;
  /** Quà không phải tiền: "một cây vàng". amount = 0 khi đó. */
  inKindNote: string | null;
  notes: string | null;
}

/** Nguồn của dòng gợi ý — toàn bộ lý do module này tồn tại. */
export interface GiftHistory {
  contactId: UUID;
  displayName: string;
  timesReceived: number;
  timesGiven: number;
  totalReceived: number;
  totalGiven: number;
  lastReceivedOn: ISODate | null;
  lastGivenOn: ISODate | null;
  // CỐ Ý KHÔNG CÓ cột chênh lệch. Xem 07 §3.4.
}

// --- Hồ sơ con (07 §4) ---

/** Dữ liệu tham chiếu, seed từ file có phiên bản. Xem 07 §4.2. */
export interface VaccineScheduleItem {
  code: string;
  displayName: string;
  doseLabel: string | null;
  dueAgeMonths: number;
  sortOrder: number;
  sourceName: string;
  sourceDate: ISODate;
  scheduleVersion: string;
}

export interface ChildVaccineDose {
  id: UUID;
  memberId: UUID;
  scheduleCode: string | null;
  customName: string | null;
  displayName: string;
  dueDate: ISODate | null;
  /** KHÔNG có 'skipped' hay 'postponed'. Xem 07 §4.2. */
  status: 'planned' | 'done' | 'overdue';
  administeredOn: ISODate | null;
  facility: string | null;
  notes: string | null;
}

export interface GrowthRecord {
  id: UUID;
  memberId: UUID;
  measuredOn: ISODate;
  heightCm: number | null;
  weightKg: number | null;
  notes: string | null;
  // KHÔNG có percentile, z-score, hay đánh giá. App ghi và vẽ, không diễn giải.
}

/** Bản nháp do AI đọc từ ảnh chụp màn hình hoặc ảnh giấy tờ. */
export interface IngestDraft {
  id: UUID;
  source: 'screenshot' | 'photo' | 'text';
  rawText: string | null;
  imagePath: string | null;
  suggestedEntityType: 'event' | 'task' | 'upcoming_payment' | 'document' | null;
  /** Payload đã parse, hình dạng tuỳ suggestedEntityType. Luôn phải qua zod
   *  ở client trước khi đổ vào form — AI không được tin. */
  parsed: Record<string, unknown> | null;
  status: 'pending' | 'confirmed' | 'discarded';
  createdAt: ISODateTime;
}
```

---

## 3. View đọc

Các view trong DB ánh xạ thẳng sang type. UI **chỉ đọc từ đây** cho màn hình tổng hợp — không tự ghép nhiều query.

```ts
export interface HomeFeedItem {
  /** shopping_item CỐ Ý không có ở đây: nó không có ngày, sẽ phá cách nhóm
   *  theo ngày của feed. Card CẦN MUA query thẳng ShoppingRepo. */
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
  /** Chỉ upcoming_payments. Chi phí sự kiện và gia hạn giấy tờ nằm ở
   *  UpcomingNeed — xem ghi chú dưới. */
  dueNext30d: number;
  dueNext7dCount: number;
  overdueCount: number;
  attentionCount: number;
  /** Ngày khai gần nhất của bất kỳ tài sản nào. Dùng cho nhãn, không cho status. */
  lastUsableUpdatedOn: ISODate | null;
  lastUpdatedOn: ISODate | null;
  currency: string;
  recordThresholdAmount: number | null;
}
```

> **Đã bỏ** `snapshotIntervalDays` và `lastSnapshotOn`. Không còn nghi thức cập nhật định kỳ — xem `06 §1`.

```ts
/** Một khoản tiền sắp phải chuẩn bị, bất kể nó sinh ra từ đâu. */
export interface UpcomingNeed {
  source: 'upcoming_payment' | 'event' | 'document';
  id: UUID;
  title: string;
  amount: number;
  onDate: ISODate;
}

/** Kết quả của projectRunway(). Mọi con số đều là dự tính từ số đã khai. */
export interface RunwayProjection {
  basis: Basis;
  horizonDays: number;              // 90
  total: number;
  byMonth: { month: ISODate; total: number; items: UpcomingNeed[] }[];
  /** totalUsable − total. Âm = thiếu. */
  projectedRemaining: number;
  shortfall: number | null;
  /** Ngày khai của totalUsable, để UI in nhãn thời gian. */
  usableAsOf: ISODate | null;
  freshness: Freshness;
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
  /** RPC nguyên tử: cập nhật giá trị + as_of_date + updated_by + money_events */
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

/** Nguồn duy nhất cho màn hình "Sắp tới nhà mình cần bao nhiêu". */
export interface UpcomingNeedsRepo {
  list(hh: UUID, horizonDays: number): Promise<UpcomingNeed[]>;
}

export interface ShoppingRepo {
  list(hh: UUID): Promise<ShoppingItem[]>;
  add(hh: UUID, title: string, note?: string): Promise<ShoppingItem>;
  toggle(hh: UUID, id: UUID, isDone: boolean): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface EventRepo {
  // … list / get / create / update / softDelete
  /** Trí nhớ năm ngoái. Trả rỗng nếu household free và bản ghi > 12 tháng. */
  occurrences(hh: UUID, eventId: UUID, limit: number): Promise<EventOccurrence[]>;
  recordActualCost(hh: UUID, occurrenceId: UUID, amount: number | null): Promise<void>;
}

export interface IngestRepo {
  /** Gửi ảnh/text lên Edge parse-capture. Ném premium_required nếu hết quota. */
  submit(hh: UUID, input: { source: IngestDraft['source'];
                            text?: string; localImage?: LocalFile }): Promise<IngestDraft>;
  get(hh: UUID, id: UUID): Promise<IngestDraft | null>;
  discard(hh: UUID, id: UUID): Promise<void>;
  /** Đánh dấu đã dùng để tạo bản ghi thật. Không tự tạo — UI tạo qua repo tương ứng. */
  confirm(hh: UUID, id: UUID, createdEntityId: UUID): Promise<void>;
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

export interface MoneyEventsRepo {
  /** Lịch sử của một khoản — khối LỊCH SỬ trong chi tiết tài sản. */
  forEntity(hh: UUID, entityType: MoneyEvent['entityType'],
            entityId: UUID, limit: number): Promise<MoneyEvent[]>;
  /** Dòng thời gian cả nhà — màn hình money/history.tsx. */
  timeline(hh: UUID, filter?: { from?: ISODate; to?: ISODate;
                                entityId?: UUID }): Promise<MoneyEvent[]>;
  // KHÔNG CÓ: byMonth(), byCategory(), byActor(). Xem 03 §9.
}

export interface GoalRepo {
  list(hh: UUID): Promise<Goal[]>;
  get(hh: UUID, id: UUID): Promise<Goal | null>;
  create(hh: UUID, input: GoalInput): Promise<Goal>;
  update(hh: UUID, id: UUID, patch: Partial<GoalInput>): Promise<Goal>;
  /** RPC nguyên tử: cộng vào current_amount + as_of_date + money_events */
  contribute(hh: UUID, id: UUID, amount: number,
             asOf: ISODate, note?: string): Promise<void>;
  archive(hh: UUID, id: UUID): Promise<void>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface ContactRepo {
  list(hh: UUID, search?: string): Promise<Contact[]>;
  create(hh: UUID, input: ContactInput): Promise<Contact>;
  update(hh: UUID, id: UUID, patch: Partial<ContactInput>): Promise<Contact>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface GiftRepo {
  /** Mặc định sắp theo NGÀY. Sắp theo tiền là tuỳ chọn, và không bao giờ
   *  kèm nhãn kiểu "mừng nhiều nhất". Xem 07 §3.4. */
  list(hh: UUID, filter?: { contactId?: UUID; eventId?: UUID;
                            direction?: GiftEntry['direction'] }): Promise<GiftEntry[]>;
  /** Nguồn của dòng gợi ý khi tạo khoản mừng. */
  historyFor(hh: UUID, contactId: UUID): Promise<GiftHistory | null>;
  create(hh: UUID, input: GiftInput): Promise<GiftEntry>;
  /** Nhập hàng loạt sau đám cưới. Một transaction. */
  createMany(hh: UUID, inputs: GiftInput[]): Promise<GiftEntry[]>;
  update(hh: UUID, id: UUID, patch: Partial<GiftInput>): Promise<GiftEntry>;
  softDelete(hh: UUID, id: UUID): Promise<void>;
}

export interface ChildRepo {
  doses(hh: UUID, memberId: UUID): Promise<ChildVaccineDose[]>;
  upcomingDoses(hh: UUID, withinDays: number): Promise<ChildVaccineDose[]>;
  markDose(hh: UUID, doseId: UUID,
           administeredOn: ISODate, facility?: string): Promise<void>;
  addCustomDose(hh: UUID, memberId: UUID, input: CustomDoseInput): Promise<ChildVaccineDose>;
  growth(hh: UUID, memberId: UUID): Promise<GrowthRecord[]>;
  addGrowth(hh: UUID, memberId: UUID, input: GrowthInput): Promise<GrowthRecord>;
  // KHÔNG CÓ: assessGrowth(), comparePercentile(), compareChildren().
}

export interface SnapshotRepo {
  /** Chỉ đọc. Snapshot do cron ghi, người dùng không tạo. Xem 06 §1. */
  latest(hh: UUID): Promise<MoneySnapshot | null>;
  history(hh: UUID, limit: number): Promise<MoneySnapshot[]>;
}
```

Tương tự: `TaskRepo`, `DebtRepo`, `HouseholdRepo`, `MemberRepo`, `InviteRepo`.

> `SnapshotRepo.create()` không tồn tại: snapshot do cron ghi.

---

## 5. Input schema (zod)

Nguồn sự thật cho form validation ở client.

**Ngoại lệ mới:** Edge Function `parse-capture` là chỗ **đầu tiên** nhận input người dùng (ảnh và text). Nó phải có schema validation riêng phía server. Mọi Edge Function khác vẫn chỉ ghi trường dẫn xuất.

Chiều ngược lại cũng cần validate: output của AI **không được tin**. `IngestDraft.parsed` phải chạy qua đúng zod schema của entity tương ứng trước khi đổ vào form. Một ngày giỗ do AI đoán sai sẽ phá niềm tin ở đúng tính năng khác biệt nhất.

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

export const shoppingInput = z.object({
  title: z.string().trim().min(1).max(120),
  note: z.string().max(200).nullable(),
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

```ts
export const giftInput = z.object({
  contactId: z.string().uuid(),
  direction: z.enum(['received', 'given']),
  occasion: z.enum(GIFT_OCCASIONS),
  amount: z.number().int().nonnegative(),
  occurredOn: isoDate,
  eventId: z.string().uuid().nullable(),
  inKindNote: z.string().max(200).nullable(),
});

export const growthInput = z.object({
  measuredOn: isoDate,
  heightCm: z.number().positive().max(250).nullable(),
  weightKg: z.number().positive().max(200).nullable(),
  notes: z.string().max(500).nullable(),
}).refine(v => v.heightCm !== null || v.weightKg !== null,
  { message: 'Nhập ít nhất một số đo' });
```

**`recordThresholdAmount` không xuất hiện trong bất kỳ input schema nào của tiền.** Nó không phải ràng buộc — chỉ là dòng gợi ý dưới ô nhập.

**Không có input schema cho `VaccineScheduleItem`.** Đó là dữ liệu tham chiếu, seed từ file có phiên bản, client không bao giờ ghi.

---

## 6. Lỗi

```ts
export type AppError =
  | { kind: 'offline' }
  | { kind: 'auth' }
  | { kind: 'quota_exceeded'; usedBytes: number; quotaBytes: number }
  | { kind: 'premium_required'; feature: 'ai_capture' | 'storage' | 'history' }
  | { kind: 'not_found' }
  | { kind: 'conflict'; message: string }
  | { kind: 'unknown'; cause: unknown };
```

`feature` được thu hẹp thành union đóng. Ba giá trị này là **toàn bộ** những thứ nằm sau paywall. Quyền xem và quyền dùng chung không bao giờ bị khóa — người thứ hai gặp paywall là app chết.

Repository ném `AppError`, không bao giờ để lộ lỗi Postgres thô lên UI. Bản đồ mã lỗi PostgREST → `AppError` đặt trong `repositories/errors.ts`, một chỗ duy nhất.

---

## 7. Trường chỉ đọc

UI không bao giờ được ghi các trường sau. Nếu có form nào chạm tới, đó là bug:

| Trường | Ai ghi |
|---|---|
| `events.nextOccurrenceDate` | Edge `refresh-lunar-dates` |
| `event_occurrences.occurredOn` | Edge cron (chỉ `actualCost` là UI ghi) |
| `households.storageUsedBytes` | trigger DB |
| `households.subscriptionStatus` | Edge `revenuecat-webhook` |
| `households.trialMilestones` | Edge cron + trigger |
| `debts.remainingAmount` | RPC `settle_payment` |
| `assets.asOfDate`, `assets.updatedByMemberId` | RPC `update_asset_value` |
| `documentFiles.isConfirmed` | Edge `confirm-upload` |
| `ingestDrafts.parsed` | Edge `parse-capture` |
| `goals.currentAmount`, `goals.asOfDate` | RPC `contribute_to_goal` |
| `childVaccineDoses.dueDate` | Edge `seed-vaccine-doses` (từ `birthday`) |
| `childVaccineDoses.status` khi thành `overdue` | Edge cron |
| toàn bộ `vaccineScheduleItems` | seed script, service role |
| toàn bộ `money_events` | RPC (append-only, DB chặn sửa/xoá) |
| toàn bộ `money_snapshots` | Edge cron |

---

## 8. Type không bao giờ được tồn tại

Đây là ràng buộc sản phẩm. Nếu thấy trong PR thì reject, kể cả khi dữ liệu đã có sẵn để tính.

```ts
// KHÔNG BAO GIỜ:
interface SpendingByMonth   { … }   // khoảng trống ghi chép ≠ thay đổi chi tiêu
interface SpendingByCategory{ … }   // ranh giới với app thu chi
interface ContributionByMember { … }// bảng điểm trông như minh bạch
interface TaskStatsByMember { … }   // bảng điểm giữa hai vợ chồng
interface GiftBalance       { … }   // biến họ hàng thành sổ nợ
interface GrowthAssessment  { … }   // chẩn đoán y tế
```

Danh sách đầy đủ kèm lý do ở `03 §9`.
