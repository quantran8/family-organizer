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
  ContactSide,
  DocType,
  DoseStatus,
  EntityType,
  EventKind,
  FamilySide,
  FinanceStatus,
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
  /**
   * Cột mốc để kết thúc trial. Trial KHÔNG hết theo ngày đơn thuần: 30 ngày có
   * thể trôi qua mà không có hạn nào tới, khi đó người dùng chưa từng nhìn
   * thấy sản phẩm hoạt động. Trần cứng 90 ngày. Xem 06 §9.
   */
  trialMilestones: {
    reminderAcknowledged: boolean;
    eventWithCostCompleted: boolean;
  };
  storageUsedBytes: number;
  storageQuotaBytes: number;
  /**
   * Ngưỡng hai người tự chốt lúc onboarding. null = "tự quyết".
   *
   * KHÔNG PHẢI VALIDATION: không chặn form, không cảnh báo, không constraint.
   * Chỉ dùng cho dòng gợi ý dưới ô nhập tiền và cho shouldAskForRefresh().
   * Biến nó thành ràng buộc là biến một quy ước của hai vợ chồng thành quy
   * định của app. Xem 06 §2.
   */
  recordThresholdAmount: number | null;
}

export interface Member {
  id: UUID;
  /** null = người trong nhà chưa/không có tài khoản (con nhỏ, bố mẹ hai bên) */
  profileId: UUID | null;
  displayName: string;
  role: MemberRole;
  /**
   * Với `role='child'` đây là ĐẦU VÀO của buildVaccineSchedule(). null nghĩa là
   * chưa sinh được lịch nào — màn hồ sơ con hỏi ngày sinh trước, không đoán.
   */
  birthday: ISODate | null;
  /**
   * Ba trường của hồ sơ con (07 §4.4), treo vào member thay vì bảng riêng.
   * Chúng là chữ để hiện lại, không phải thứ app tính toán gì trên đó.
   */
  schoolName: string | null;
  schoolClass: string | null;
  healthInsuranceNo: string | null;
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
  /** BẮT BUỘC hiển thị kèm giá trị qua formatDeclaredAt() — 03 §8. */
  asOfDate: ISODate;
  /** Để render "Anh cập nhật 6 tuần trước". Ghi bởi RPC update_asset_value. */
  updatedByMemberId: UUID | null;
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

/**
 * P0 trở lại ở 08 §2 (bản 06 §8 hạ xuống P2 là nhầm — mục tiêu NHÌN VỀ PHÍA
 * TRƯỚC, cùng hướng với trái tim sản phẩm).
 *
 * Ba ranh giới (08 §2.3):
 *   1. KHÔNG chảy vào UpcomingNeed — nghĩa vụ khác nguyện vọng.
 *   2. Không tiến độ theo thời gian, không lời khuyên góp bao nhiêu mỗi tháng.
 *   3. Không đóng góp theo người.
 */
export interface Goal {
  id: UUID;
  name: string;
  targetAmount: number;
  /**
   * SỐ KHAI, y hệt Asset.currentValue. Luôn hiển thị kèm asOfDate.
   * Đọc-only: chỉ RPC `contribute_to_goal` được ghi — 02 §7.
   */
  currentAmount: number;
  asOfDate: ISODate;
  updatedByMemberId: UUID | null;
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
 *
 * ĐỔI VAI ở 06 §1: không còn là vòng lặp thói quen do người dùng chạy, mà là
 * LỊCH SỬ DẪN XUẤT do cron ghi hằng tháng. Người dùng không bao giờ nhìn thấy
 * hành động tạo snapshot, nên `isManual` đã bị bỏ — nó chỉ có nghĩa khi tồn
 * tại cả hai đường tạo.
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
  note: string | null;
  createdBy: UUID | null;
  createdAt: ISODateTime;
}

/**
 * Bề mặt hằng ngày DUY NHẤT của app — 06 §4.
 *
 * CỐ Ý THIẾU TRƯỜNG: không quantity, không price, không category, không store,
 * không assigneeId. Thêm bất kỳ trường nào trong số đó là biến danh sách thành
 * VIỆC ĐƯỢC GIAO — và mất đúng lý do module này tồn tại.
 */
export interface ShoppingItem {
  id: UUID;
  title: string;
  note: string | null;
  isDone: boolean;
  addedBy: UUID | null;
  doneAt: ISODateTime | null;
}

/**
 * Lần diễn ra ĐÃ QUA của một sự kiện lặp. Nguồn của "trí nhớ năm ngoái" (06 §5).
 *
 * occurredOn do Edge cron ghi; chỉ actualCost là UI ghi — 02 §7.
 */
export interface EventOccurrence {
  id: UUID;
  eventId: UUID;
  occurredOn: ISODate;
  /** Hỏi MỘT LẦN, bỏ qua được. null = chưa trả lời hoặc đã bỏ qua. */
  actualCost: number | null;
  notes: string | null;
  /** true sau khi đã hỏi, dù người dùng có trả lời hay không. */
  costAsked: boolean;
}

/**
 * Bản nháp do AI đọc từ ảnh chụp màn hình hoặc ảnh giấy tờ — 06 §6.
 *
 * Người dùng LUÔN xác nhận trước khi ghi. Không bao giờ tự tạo bản ghi từ AI:
 * một ngày giỗ sai do AI đoán sẽ phá niềm tin ở đúng tính năng khác biệt nhất.
 */
export interface IngestDraft {
  id: UUID;
  source: IngestSource;
  rawText: string | null;
  imagePath: string | null;
  suggestedEntityType: EntityType | null;
  /**
   * Payload đã parse, hình dạng tuỳ suggestedEntityType.
   * KHÔNG ĐƯỢC TIN: luôn phải qua zod schema của entity tương ứng ở client
   * trước khi đổ vào form.
   */
  parsed: Record<string, unknown> | null;
  status: IngestStatus;
  createdAt: ISODateTime;
}

// --- Sổ hiếu hỉ (07 §3) ---

/**
 * Họ hàng và bạn bè. KHÔNG PHẢI Member: không tài khoản, không thông báo,
 * không thấy dữ liệu.
 *
 * CỐ Ý THIẾU TRƯỜNG: không phone, không địa chỉ, không ảnh, không ngày sinh,
 * không nhóm. Đây không phải app danh bạ.
 */
export interface Contact {
  id: UUID;
  displayName: string;
  /** Chữ tự do: "chú ruột bên nội". Không enum hoá quan hệ họ hàng VN. */
  relationNote: string | null;
  side: ContactSide;
}

export interface GiftEntry {
  id: UUID;
  contactId: UUID;
  direction: GiftDirection;
  occasion: GiftOccasion;
  amount: number;
  occurredOn: ISODate;
  eventId: UUID | null;
  /** Quà không phải tiền: "một cây vàng". amount = 0 khi đó. */
  inKindNote: string | null;
  notes: string | null;
  /**
   * Khoản `received` mà khoản `given` này đáp lại — 07 §3.3.
   *
   * Chỉ có ở `direction === 'given'`, và trỏ tới khoản của CÙNG contact. Ghép
   * chéo dịp là hợp lệ: nghĩa vụ thuộc về NHÀ, không thuộc về dịp — chú Ba mừng
   * cưới mình, mình đi tân gia nhà chú Ba là xong.
   *
   * ĐÂY KHÔNG PHẢI SỐ DƯ NỢ. Trạng thái của một KHOẢN, biến mất khi đáp xong;
   * không phải số dư của một MỐI QUAN HỆ, luôn hiện và cộng dồn. Ranh giới đầy
   * đủ ở 07 §3.6.
   */
  reciprocatesId: UUID | null;
  /**
   * Khoản nhận này KHÔNG sinh nghĩa vụ đáp lễ — 07 §3.4b.
   *
   * Bốn trường hợp có thật: bố mẹ mừng con (cho, không phải trao đổi), người
   * trên mừng người dưới (nghĩa vụ hiếu hỉ không đối xứng theo vai vế), người
   * đã mất hoặc bạn mất liên lạc (nghĩa vụ không còn đối tượng), và đã đáp bằng
   * cách khác mà app không thấy được.
   *
   * CHỈ NGƯỜI DÙNG ĐẶT. App không bao giờ tự suy ra từ `side`, `relationNote`,
   * hay số tiền — nó không biết vai vế, không biết ai còn sống, và đoán sai ở
   * đây là xúc phạm chứ không phải bất tiện.
   */
  noReciprocityNeeded: boolean;
}

/**
 * Ba trạng thái của một khoản NHẬN — 07 §3.3.
 *
 * Ba, không phải hai: "chưa có khoản đi nào ghép vào" trông y hệt "còn nợ" trong
 * dữ liệu, nhưng ngoài đời là hai chuyện khác hẳn.
 */
export type ReciprocityStatus =
  /** Chờ một dịp ở nhà đó. Nằm trong danh sách chưa đáp lễ. */
  | 'outstanding'
  /** Đã có một khoản `given` ghép vào. Xong, bất kể số tiền hai bên. */
  | 'reciprocated'
  /** Người dùng đã đánh dấu không cần đáp — 07 §3.4b. */
  | 'not_needed';

/**
 * Nguồn của dòng gợi ý — TOÀN BỘ lý do module này tồn tại.
 *
 * CỐ Ý KHÔNG CÓ cột chênh lệch. Dữ liệu đủ để tính "nhà này mình còn đi thiếu
 * 500k" — và đó chính là lý do phải nói rõ là không tính: nó biến quan hệ họ
 * hàng thành sổ nợ. Xem 07 §3.4.
 */
export interface GiftHistory {
  contactId: UUID;
  displayName: string;
  timesReceived: number;
  timesGiven: number;
  totalReceived: number;
  totalGiven: number;
  lastReceivedOn: ISODate | null;
  lastGivenOn: ISODate | null;
}

// --- Hồ sơ con (07 §4) ---

/**
 * DỮ LIỆU THAM CHIẾU, seed từ file có phiên bản. Client không bao giờ ghi.
 *
 * Toàn bộ tri thức y tế nằm ở đây, KHÔNG nằm trong code: nếu lịch tiêm nằm
 * trong code thì việc cập nhật nó thành một PR, và không ai có chuyên môn y tế
 * đọc PR. Nằm trong file dữ liệu thì nó là một tài liệu, và tài liệu thì xem
 * xét được. Xem 07 §4.2.
 */
export interface VaccineScheduleItem {
  code: string;
  displayName: string;
  doseLabel: string | null;
  /** Mốc tuổi tính bằng tháng kể từ ngày sinh. Có thể lẻ (1.5). */
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
  status: DoseStatus;
  administeredOn: ISODate | null;
  facility: string | null;
  notes: string | null;
}

/**
 * CỐ Ý KHÔNG CÓ percentile, z-score, hay đánh giá. App GHI VÀ VẼ, KHÔNG DIỄN
 * GIẢI — một nhãn đỏ do app tự tính sẽ làm bố mẹ mới hoảng mà không giúp được
 * gì. Việc đánh giá thuộc về bác sĩ. Xem 07 §4.3.
 */
export interface GrowthRecord {
  id: UUID;
  memberId: UUID;
  measuredOn: ISODate;
  heightCm: number | null;
  weightKg: number | null;
  notes: string | null;
}
