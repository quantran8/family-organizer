/**
 * Hình dạng hàng trong DB — snake_case, đúng như PostgREST trả về.
 *
 * Viết tay thay vì `supabase gen types`: sinh tự động cần DB đang chạy, mà file
 * này phải đúng ngay cả khi chưa ai chạy `supabase start`. Khi schema đổi, đây
 * là chỗ thứ hai phải đổi theo (chỗ đầu là packages/domain/src/types).
 *
 * Repository ánh xạ snake_case → camelCase; ngoài repositories/ không ai thấy
 * kiểu ở file này.
 */

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * LƯU Ý: mọi `*Row` dưới đây phải là `type`, KHÔNG được là `interface`.
 *
 * supabase-js ràng buộc `GenericTable.Row extends Record<string, unknown>`.
 * `type` có index signature ngầm nên thoả; `interface` thì không, và hệ quả là
 * Schema thu về `never` — mọi lệnh ghi báo "not assignable to type 'never'",
 * một lỗi trông chẳng liên quan gì tới nguyên nhân thật.
 */

/** Kiểu composite `recurrence` của Postgres (schema.sql §2). */
export type RecurrenceRow = {
  freq: string | null;
  interval_n: number | null;
  byweekday: number[] | null;
  bymonthday: number | null;
  until_date: string | null;
};

export type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdRow = {
  id: string;
  name: string;
  created_by: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  entitlement_expires_at: string | null;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  currency: string;
  /** null = "tự quyết". KHÔNG PHẢI validation — xem 0004 §3. */
  record_threshold_amount: number | null;
  trial_milestones: {
    reminderAcknowledged: boolean;
    eventWithCostCompleted: boolean;
  };
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MemberRow = {
  id: string;
  household_id: string;
  profile_id: string | null;
  display_name: string;
  role: string;
  birthday: string | null;
  is_active: boolean;
  /**
   * Ba cột của hồ sơ con (0005 §2.3) — treo vào member thay vì một bảng riêng.
   *
   * Trường lớp là MỘT DÒNG chữ, không phải một thực thể: nó đổi mỗi năm một
   * lần và không có gì để nối vào. Một bảng `schools` sẽ là một module không ai
   * xin.
   */
  school_name: string | null;
  school_class: string | null;
  health_insurance_no: string | null;
  joined_at: string;
  deleted_at: string | null;
};

export type InviteRow = {
  id: string;
  household_id: string;
  code: string;
  status: string;
  invited_by: string;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  household_id: string;
  title: string;
  notes: string | null;
  assignee_id: string | null;
  due_date: string | null;
  due_time: string | null;
  event_id: string | null;
  recur: RecurrenceRow | null;
  remind_lead_days: number;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TaskInstanceRow = {
  id: string;
  task_id: string;
  household_id: string;
  due_date: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  skipped: boolean;
};

/**
 * Bề mặt hằng ngày duy nhất của app (06 §4).
 *
 * CỐ Ý THIẾU TRƯỜNG: không quantity, không price, không category, không store,
 * không assignee_id. Thêm bất kỳ trường nào trong số đó là biến danh sách thành
 * VIỆC ĐƯỢC GIAO — và mất đúng lý do module này tồn tại.
 *
 * `done_by` có trong DB để hoàn tác, nhưng KHÔNG BAO GIỜ lên UI và không bao
 * giờ được tổng hợp: "ai mua nhiều hơn" là bảng điểm giữa hai vợ chồng.
 */
export type ShoppingItemRow = {
  id: string;
  household_id: string;
  title: string;
  note: string | null;
  is_done: boolean;
  added_by: string | null;
  done_by: string | null;
  done_at: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
};

export type EventRow = {
  id: string;
  household_id: string;
  title: string;
  kind: string;
  side: string | null;
  location: string | null;
  notes: string | null;
  calendar: string;
  solar_date: string | null;
  lunar_day: number | null;
  lunar_month: number | null;
  lunar_leap_month: boolean;
  start_time: string | null;
  is_all_day: boolean;
  recur: RecurrenceRow | null;
  remind_lead_days: number;
  next_occurrence_date: string | null;
  estimated_cost: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * Lần diễn ra đã qua của một sự kiện — nguồn của trí nhớ năm ngoái (06 §5).
 *
 * `occurred_on` do Edge cron `refresh-lunar-dates` ghi; UI **chỉ** được ghi
 * `actual_cost` và `cost_asked` (02 §7). Không có `created_by`: dòng này không
 * do người nào tạo ra, nó là ghi nhận một ngày đã trôi qua.
 *
 * Cũng KHÔNG có `deleted_at` — bảng này không xoá mềm. Một lần diễn ra đã diễn
 * ra; xoá nó là sửa lại quá khứ, và cả tính năng này chỉ đáng tin đúng bằng
 * mức nó không sửa được. Xoá sự kiện thì `on delete cascade` dọn theo.
 */
export type EventOccurrenceRow = {
  id: string;
  event_id: string;
  household_id: string;
  occurred_on: string;
  actual_cost: number | null;
  notes: string | null;
  cost_asked: boolean;
  created_at: string;
};

/**
 * Bản nháp do AI đọc — 06 §6.
 *
 * `parsed` là `unknown`, KHÔNG phải một kiểu cụ thể. Đó là cố ý: nội dung của
 * nó đến từ model và không được tin, nên gán cho nó một kiểu ở đây sẽ là một
 * lời hứa mà không có gì bảo đảm. Client chạy nó qua đúng zod schema của
 * entity tương ứng trước khi đổ vào form (02 §5).
 */
export type IngestDraftRow = {
  id: string;
  household_id: string;
  created_by: string;
  source: string;
  raw_text: string | null;
  image_path: string | null;
  suggested_entity_type: string | null;
  parsed: unknown;
  status: string;
  created_entity_id: string | null;
  created_at: string;
  expires_at: string;
};

export type AssetRow = {
  id: string;
  household_id: string;
  name: string;
  asset_kind: string;
  liquidity: string;
  current_value: number;
  holder_member_id: string | null;
  institution: string | null;
  as_of_date: string;
  /** Ghi bởi RPC update_asset_value. Nguồn của "Anh cập nhật 6 tuần trước". */
  updated_by_member_id: string | null;
  notes: string | null;
  is_closed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DebtRow = {
  id: string;
  household_id: string;
  name: string;
  lender: string | null;
  borrower_member_id: string | null;
  principal_amount: number | null;
  remaining_amount: number;
  interest_rate_pct: number | null;
  installment_amount: number | null;
  installment_recur: RecurrenceRow | null;
  next_due_date: string | null;
  final_due_date: string | null;
  as_of_date: string;
  notes: string | null;
  is_settled: boolean;
  settled_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UpcomingPaymentRow = {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  due_date: string | null;
  due_month: string | null;
  recur: RecurrenceRow | null;
  state: string;
  settled_at: string | null;
  source_debt_id: string | null;
  event_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GoalRow = {
  id: string;
  household_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  /** Ghi bởi RPC contribute_to_goal — SỐ KHAI, luôn hiện kèm as_of_date. */
  as_of_date: string;
  updated_by_member_id: string | null;
  target_date: string | null;
  notes: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MoneyEventRow = {
  id: number;
  household_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  value_before: number | null;
  value_after: number | null;
  delta: number | null;
  occurred_on: string;
  note: string | null;
  actor_profile_id: string | null;
  created_at: string;
};

export type MoneySnapshotRow = {
  id: string;
  household_id: string;
  as_of_date: string;
  total_usable: number;
  total_savings: number;
  total_long_term: number;
  total_debt: number;
  status: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type AttentionItemRow = {
  id: string;
  household_id: string;
  entity_type: string;
  entity_id: string;
  note: string | null;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  expires_at: string;
};

export type DocumentRow = {
  id: string;
  household_id: string;
  title: string;
  /** Cột tên `type`, KHÔNG phải `doc_type` (schema.sql §6). */
  type: string;
  owner_member_id: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  remind_lead_days: number;
  physical_location: string | null;
  external_link: string | null;
  notes: string | null;
  renewal_cost: number | null;
  event_id: string | null;
  debt_id: string | null;
  extra: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DocumentFileRow = {
  id: string;
  document_id: string;
  household_id: string;
  /** Key trên Cloudflare R2 — `hh/{household_id}/doc/{uuid}`. */
  r2_key: string;
  thumb_key: string | null;
  filename: string;
  mime: string;
  size_bytes: number;
  page_order: number;
  is_confirmed: boolean;
  uploaded_by: string;
  created_at: string;
  deleted_at: string | null;
}

export type ReminderRow = {
  id: string;
  household_id: string;
  entity_type: string;
  entity_id: string;
  target_member_id: string | null;
  fire_at: string;
  title: string;
  body: string | null;
  channel: string;
  sent_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

export type PushTokenRow = {
  id: string;
  profile_id: string;
  token: string;
  platform: string;
  last_seen_at: string;
  created_at: string;
};

// --- View ---

export type HomeFeedRow = {
  source: string;
  id: string;
  household_id: string;
  title: string;
  on_date: string | null;
  member_id: string | null;
  amount: number | null;
  is_done: boolean;
};

export type FinanceMetricsRow = {
  household_id: string;
  total_usable: number;
  total_savings: number;
  total_long_term: number;
  total_debt: number;
  due_next_30d: number;
  due_next_7d_count: number;
  overdue_count: number;
  attention_count: number;
  /** Ngày khai gần nhất CỦA RIÊNG nhóm "dùng ngay" — nguồn nhãn màn Sắp tới. */
  last_usable_updated_on: string | null;
  last_updated_on: string | null;
  record_threshold_amount: number | null;
  currency: string;
};

/** View `upcoming_needs` — ba nguồn tiền gộp làm một. Xem 0004 §10. */
export type UpcomingNeedRow = {
  source: string;
  id: string;
  household_id: string;
  title: string;
  on_date: string;
  amount: number;
};

/** View `money_history` — lịch sử biến động. CHỈ hiển thị dạng danh sách. */
export type MoneyHistoryRow = {
  id: number;
  household_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  value_before: number | null;
  value_after: number | null;
  delta: number | null;
  occurred_on: string;
  note: string | null;
  actor_profile_id: string | null;
  created_at: string;
  entity_title: string;
  actor_display_name: string | null;
};

export type MoneyFeedRow = {
  kind: string;
  id: string;
  household_id: string;
  title: string;
  amount: number;
  on_date: string | null;
  member_id: string | null;
  is_closed: boolean;
};

/**
 * Generic `Database` cho createClient.
 *
 * Sinh từ các `*Row` ở trên thay vì viết tay Row/Insert/Update cho 18 bảng —
 * ba phần đó chỉ khác nhau ở chỗ trường nào bắt buộc, mà repository đã ép kiểu
 * ở cả hai đầu rồi (toRow() lúc ghi, mappers.ts lúc đọc).
 *
 * Insert/Update để lỏng (Partial + cho phép trường phụ) là CỐ Ý: chặt hơn thì
 * phải liệt kê từng cột có default, và mỗi lần schema đổi lại sửa hai chỗ.
 * Seam thật — chỗ sai sẽ lộ ra — nằm ở mappers.ts, không nằm ở generic này.
 *
 * Khi nào muốn autocomplete đầy đủ: chạy `supabase gen types typescript` rồi
 * thay file này. Chỗ gọi không phải đổi.
 */
type TableOf<Row, Rels extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: Rels;
};

/**
 * Khoá ngoại — CHỈ khai báo cái nào thật sự dùng để nhúng (`select('*, x(*)')`).
 *
 * PostgREST suy ra kiểu của phần nhúng từ đây; thiếu nó thì `document_files`
 * trong `select('*, document_files(*)')` ra `SelectQueryError` chứ không phải
 * mảng row, và lỗi hiện ra dưới dạng một thông báo TypeScript dài mười dòng
 * không nhắc gì tới khoá ngoại.
 *
 * Không liệt kê hết mọi FK của schema: phần còn lại không nhúng ở đâu cả, và
 * một danh sách dài không ai kiểm chỉ là chỗ để sai.
 */
// --- Sổ mừng cưới (0005 §1) ---

/**
 * CỐ Ý THIẾU TRƯỜNG: không phone, không địa chỉ, không ảnh, không ngày sinh,
 * không nhóm. Đây không phải app danh bạ — thêm những trường đó là mở một
 * module mới mà không ai xin.
 */
export type ContactRow = {
  id: string;
  household_id: string;
  display_name: string;
  relation_note: string | null;
  side: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GiftEntryRow = {
  id: string;
  household_id: string;
  contact_id: string;
  direction: string;
  occasion: string;
  amount: number;
  occurred_on: string;
  event_id: string | null;
  in_kind_note: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * View `gift_history` — nguồn của dòng gợi ý.
 *
 * CỐ Ý KHÔNG CÓ cột chênh lệch. Dữ liệu đủ để tính "nhà này mình còn đi thiếu
 * 500k", và đó chính là lý do phải nói rõ là không có: nó biến quan hệ họ hàng
 * thành sổ nợ (07 §3.4).
 */
export type GiftHistoryRow = {
  contact_id: string;
  household_id: string;
  display_name: string;
  side: string;
  times_received: number;
  times_given: number;
  total_received: number;
  total_given: number;
  last_received_on: string | null;
  last_given_on: string | null;
};

// --- Hồ sơ con (0005 §2) ---

/**
 * DỮ LIỆU THAM CHIẾU — client CHỈ ĐỌC (GRANT ở 0005 §5 không cấp insert/update).
 * Seed bằng service role từ một file đã được người có chuyên môn y tế xác nhận.
 */
export type VaccineScheduleItemRow = {
  code: string;
  display_name: string;
  dose_label: string | null;
  due_age_months: number;
  sort_order: number;
  source_name: string;
  source_date: string;
  schedule_version: string;
  is_active: boolean;
};

export type ChildVaccineDoseRow = {
  id: string;
  household_id: string;
  member_id: string;
  schedule_code: string | null;
  custom_name: string | null;
  due_date: string | null;
  status: string;
  administered_on: string | null;
  facility: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/**
 * CỐ Ý KHÔNG CÓ percentile / z-score / đánh giá — app ghi và vẽ, không diễn
 * giải (07 §4.3). Không có `updated_at`: một phép đo là chuyện đã xảy ra.
 */
export type ChildGrowthRecordRow = {
  id: string;
  household_id: string;
  member_id: string;
  measured_on: string;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
};

type DocumentFilesRelationship = {
  foreignKeyName: 'document_files_document_id_fkey';
  columns: ['document_id'];
  isOneToOne: false;
  referencedRelation: 'documents';
  referencedColumns: ['id'];
};

/** Cho `select('*, events(title, estimated_cost)')` ở `pendingCostAsk`. */
type EventOccurrencesRelationship = {
  foreignKeyName: 'event_occurrences_event_id_fkey';
  columns: ['event_id'];
  isOneToOne: false;
  referencedRelation: 'events';
  referencedColumns: ['id'];
};

type ViewOf<Row> = { Row: Row; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: TableOf<ProfileRow>;
      households: TableOf<HouseholdRow>;
      members: TableOf<MemberRow>;
      invites: TableOf<InviteRow>;
      push_tokens: TableOf<PushTokenRow>;
      tasks: TableOf<TaskRow>;
      task_instances: TableOf<TaskInstanceRow>;
      shopping_items: TableOf<ShoppingItemRow>;
      events: TableOf<EventRow>;
      event_occurrences: TableOf<EventOccurrenceRow, [EventOccurrencesRelationship]>;
      ingest_drafts: TableOf<IngestDraftRow>;
      assets: TableOf<AssetRow>;
      debts: TableOf<DebtRow>;
      upcoming_payments: TableOf<UpcomingPaymentRow>;
      goals: TableOf<GoalRow>;
      money_events: TableOf<MoneyEventRow>;
      money_snapshots: TableOf<MoneySnapshotRow>;
      attention_items: TableOf<AttentionItemRow>;
      documents: TableOf<DocumentRow>;
      document_files: TableOf<DocumentFileRow, [DocumentFilesRelationship]>;
      reminders: TableOf<ReminderRow>;
      contacts: TableOf<ContactRow>;
      gift_entries: TableOf<GiftEntryRow>;
      vaccine_schedule_items: TableOf<VaccineScheduleItemRow>;
      child_vaccine_doses: TableOf<ChildVaccineDoseRow>;
      child_growth_records: TableOf<ChildGrowthRecordRow>;
    };
    Views: {
      home_feed: ViewOf<HomeFeedRow>;
      finance_metrics: ViewOf<FinanceMetricsRow>;
      money_feed: ViewOf<MoneyFeedRow>;
      upcoming_needs: ViewOf<UpcomingNeedRow>;
      money_history: ViewOf<MoneyHistoryRow>;
      gift_history: ViewOf<GiftHistoryRow>;
    };
    Functions: {
      // RPC nguyên tử ở 0001 §12
      settle_payment: {
        Args: { p_payment_id: string; p_paid_on?: string; p_note?: string | null };
        Returns: void;
      };
      // RPC ở 0004 §12 — góp thêm vào mục tiêu, ghi money_events như tài sản.
      contribute_to_goal: {
        Args: { p_goal_id: string; p_amount: number; p_as_of?: string; p_note?: string | null };
        Returns: void;
      };
      update_asset_value: {
        Args: { p_asset_id: string; p_value: number; p_as_of?: string; p_note?: string | null };
        Returns: void;
      };
      // RPC onboarding ở 0002 — xem migration để biết vì sao cần
      ensure_profile: { Args: { p_display_name: string }; Returns: string };
      create_household: {
        Args: { p_display_name: string; p_household_name?: string };
        Returns: string;
      };
      redeem_invite: { Args: { p_code: string; p_display_name: string }; Returns: string };
      my_households: {
        Args: Record<string, never>;
        Returns: Array<{ household_id: string; household_name: string; member_id: string }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: { recurrence: RecurrenceRow };
  };
}
