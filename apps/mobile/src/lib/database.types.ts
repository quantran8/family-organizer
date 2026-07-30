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
  snapshot_interval_days: number;
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
  is_manual: boolean;
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
  last_updated_on: string | null;
  last_snapshot_on: string | null;
  snapshot_interval_days: number;
  currency: string;
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
type TableOf<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
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
      events: TableOf<EventRow>;
      assets: TableOf<AssetRow>;
      debts: TableOf<DebtRow>;
      upcoming_payments: TableOf<UpcomingPaymentRow>;
      goals: TableOf<GoalRow>;
      money_events: TableOf<MoneyEventRow>;
      money_snapshots: TableOf<MoneySnapshotRow>;
      attention_items: TableOf<AttentionItemRow>;
      documents: TableOf<DocumentRow>;
      document_files: TableOf<DocumentFileRow>;
      reminders: TableOf<ReminderRow>;
    };
    Views: {
      home_feed: ViewOf<HomeFeedRow>;
      finance_metrics: ViewOf<FinanceMetricsRow>;
      money_feed: ViewOf<MoneyFeedRow>;
    };
    Functions: {
      // RPC nguyên tử ở 0001 §12
      settle_payment: {
        Args: { p_payment_id: string; p_paid_on?: string; p_note?: string | null };
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
      contribute_to_goal: {
        Args: { p_goal_id: string; p_amount: number; p_on?: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: { recurrence: RecurrenceRow };
  };
}
