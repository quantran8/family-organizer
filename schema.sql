-- =============================================================================
-- FAMILY ORGANIZER — POSTGRES / SUPABASE SCHEMA
-- Target: Postgres 15+ (Supabase)
--
-- Nguyên tắc thiết kế:
--   1. Mọi bảng dữ liệu đều có household_id  -> RLS đơn giản + query luôn
--      filter tường minh (không phụ thuộc RLS làm tầng phân quyền duy nhất).
--   2. Chỉ bảng `profiles` tham chiếu auth.users -> dễ đổi auth provider.
--   3. Soft delete toàn hệ thống (deleted_at) -> retention 30 ngày, undo,
--      undo, và retention 30 ngày.
--   4. Ngày âm là canonical; ngày dương (next_occurrence_date) là cache do
--      tầng app / edge function tính và ghi xuống.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- =============================================================================
-- 0. ENUMS
-- =============================================================================

create type calendar_type   as enum ('solar', 'lunar');

create type recur_freq      as enum ('none', 'daily', 'weekly', 'monthly', 'yearly');

create type member_role     as enum ('owner', 'partner', 'child', 'relative');

-- Bên gia đình liên quan (đặc thù VN: nội / ngoại)
--   paternal = bên nội, maternal = bên ngoại,
--   both     = cả hai bên, own = gia đình nhỏ của hai vợ chồng
create type family_side     as enum ('paternal', 'maternal', 'both', 'own');

create type task_status      as enum ('todo', 'done');

create type event_kind       as enum (
  'death_anniversary',  -- ngày giỗ
  'wedding',            -- cưới hỏi
  'birthday',
  'holiday',            -- lễ, Tết
  'medical',            -- khám bệnh
  'trip',
  'school',             -- lịch học, họp phụ huynh
  'other'
);

-- Cho kind='balance': "tiền đang nằm ở đâu"
create type asset_type       as enum (
  'cash', 'bank_account', 'savings', 'gold',
  'real_estate', 'investment',
  'receivable',     -- khoản cho người khác vay
  'other'
);
-- Ghi chú: 'insurance' cố ý KHÔNG có ở đây. Bảo hiểm sống trong module
-- documents (có ngày hết hạn, phí gia hạn), không phải một dòng tài sản.

-- Điều kiện tiên quyết để tính trạng thái tài chính:
-- "căng" = usable_now < tổng khoản sắp phải trả
create type liquidity        as enum ('usable_now', 'not_immediate', 'long_term');

-- Cố ý CHỈ 2 trạng thái, khớp nguyên tắc "chưa làm / đã làm".
--   'chờ xác nhận' = phê duyệt núp bóng -> không làm.
--   'quá hạn'      = SUY RA từ due_date, không lưu.
--   'tạm hoãn'     = đổi due_date, trung thực hơn một state riêng.
create type payment_state    as enum ('unpaid', 'paid');

-- Trạng thái tổng quan hiển thị trên dashboard. Luôn TÍNH, không lưu.
create type finance_status   as enum ('ok', 'watch', 'tight', 'no_data');

create type doc_type         as enum (
  'marriage_cert', 'birth_cert', 'id_card', 'passport',
  'insurance', 'vehicle', 'housing_contract', 'loan_contract',
  'medical', 'vaccination', 'school', 'invoice_warranty',
  'asset', 'tax_admin', 'other'
);

create type entity_type      as enum (
  'task', 'event', 'document',
  'asset', 'debt', 'goal', 'upcoming_payment'
);

-- Loại thay đổi ghi vào money_events. Ngôn ngữ trung tính, không phán xét.
create type money_event_type  as enum (
  'created',
  'value_updated',      -- asset/debt được cập nhật giá trị
  'contribution',       -- góp thêm vào goal
  'withdrawal',         -- rút ra khỏi goal / asset
  'settled',            -- upcoming_payment đã trả / debt tất toán
  'reopened',
  'closed'
);

create type invite_status    as enum ('pending', 'accepted', 'expired', 'revoked');

create type subscription_status as enum ('trialing', 'active', 'grace', 'expired', 'none');

create type reminder_channel as enum ('local', 'push');


-- =============================================================================
-- 1. IDENTITY & HOUSEHOLD
-- =============================================================================

-- Người có tài khoản app. ĐÂY LÀ BẢNG DUY NHẤT trỏ tới auth.users.
create table profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  display_name  text not null,
  avatar_url    text,
  locale        text not null default 'vi',
  timezone      text not null default 'Asia/Ho_Chi_Minh',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table households (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null default 'Nhà mình',
  created_by            uuid references profiles(id) on delete set null,

  -- Subscription cache (source of truth: RevenueCat; đồng bộ qua webhook).
  -- Entitlement thuộc HOUSEHOLD, không thuộc user.
  subscription_status   subscription_status not null default 'trialing',
  trial_ends_at         timestamptz,
  entitlement_expires_at timestamptz,

  -- Quota storage (đơn vị bytes). Cập nhật bằng trigger trên document_files.
  storage_used_bytes    bigint not null default 0,
  storage_quota_bytes   bigint not null default 52428800,  -- 50MB free

  -- MVP một tiền tệ cho cả household. Cố ý KHÔNG để currency trên từng dòng:
  -- không có tỷ giá thì sum() qua nhiều currency ra số vô nghĩa. Đa tiền tệ
  -- cần bảng exchange_rates + quy đổi tại thời điểm -> để sau, có nhu cầu thật.
  currency              char(3) not null default 'VND',

  -- Nhịp nhắc cập nhật snapshot (7 hoặc 30 ngày). Vòng lặp thói quen chính
  -- của module tài chính. "Lâu chưa cập nhật" suy ra = interval * 3.
  snapshot_interval_days smallint not null default 7
    check (snapshot_interval_days in (7, 30)),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- Thành viên GIA ĐÌNH (không nhất thiết có tài khoản).
-- Con nhỏ / bố mẹ hai bên là member nhưng profile_id = null.
create table members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  profile_id    uuid references profiles(id) on delete set null,
  display_name  text not null,          -- "Vợ", "Chồng", "Bé An"
  role          member_role not null default 'partner',
  birthday      date,
  is_active     boolean not null default true,
  joined_at     timestamptz not null default now(),
  deleted_at    timestamptz,

  -- Một profile chỉ gắn 1 lần vào 1 household
  unique (household_id, profile_id)
);

create index members_household_idx on members (household_id) where deleted_at is null;
create index members_profile_idx   on members (profile_id)   where profile_id is not null;

-- Mời người thứ hai: mã ngắn share qua Zalo + deep link.
create table invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  code          text not null unique,          -- 6 ký tự, uppercase, bỏ 0/O/1/I
  invited_by    uuid not null references profiles(id) on delete cascade,
  status        invite_status not null default 'pending',
  accepted_by   uuid references profiles(id) on delete set null,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

create index invites_code_idx on invites (code) where status = 'pending';

-- Push token (Expo). Một profile có thể nhiều thiết bị.
create table push_tokens (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  token         text not null unique,
  platform      text not null check (platform in ('ios', 'android')),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);


-- =============================================================================
-- 2. RECURRENCE (dùng chung cho tasks & events)
-- =============================================================================
-- KHÔNG dùng RRULE đầy đủ — quá nặng cho nhu cầu thực tế.
-- Chỉ cần: hằng ngày / thứ trong tuần / ngày trong tháng / hằng năm.

create type recurrence as (
  freq          recur_freq,
  interval_n    smallint,        -- mỗi N đơn vị (default 1)
  byweekday     smallint[],      -- 0=CN..6=T7, cho freq='weekly'
  bymonthday    smallint,        -- 1..31, cho freq='monthly'
  until_date    date             -- null = vô hạn
);


-- =============================================================================
-- 3. TASKS — VIỆC NHÀ
-- =============================================================================
-- Cố ý CHỈ có 2 trạng thái: todo / done. Không có "đang xem xét",
-- "chờ phê duyệt" — theo nguyên tắc "không biến gia đình thành dự án".

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,

  title           text not null,
  notes           text,
  assignee_id     uuid references members(id) on delete set null,

  -- Lịch
  due_date        date,                        -- null = không có deadline
  due_time        time,

  -- Ngữ cảnh: việc này chuẩn bị cho sự kiện nào (nguyên tắc 10.6).
  -- Sự kiện là HUB. Không dùng bảng links polymorphic ở MVP: FK nullable
  -- rẻ hơn, có toàn vẹn tham chiếu thật, và thêm quan hệ mới sau này chỉ
  -- là một migration thêm cột.
  event_id        uuid,   -- FK thêm bằng ALTER bên dưới (events định nghĩa sau)
  recur           recurrence,                  -- null = việc một lần
  remind_lead_days smallint not null default 0,

  -- Chỉ dùng cho việc KHÔNG lặp. Việc lặp -> xem task_instances.
  status          task_status not null default 'todo',
  completed_at    timestamptz,
  completed_by    uuid references members(id) on delete set null,

  created_by      uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  constraint tasks_recur_status_check check (
    (recur).freq is null or (recur).freq = 'none' or status = 'todo'
  )
);

create index tasks_household_due_idx on tasks (household_id, due_date)
  where deleted_at is null;
create index tasks_assignee_idx on tasks (assignee_id)
  where deleted_at is null and status = 'todo';
create index tasks_event_idx on tasks (event_id) where event_id is not null;

-- Instance của việc lặp lại. Sinh cho cửa sổ ~90 ngày tới bằng cron,
-- và sinh thêm on-demand khi user scroll tới tương lai.
create table task_instances (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references tasks(id) on delete cascade,
  household_id  uuid not null references households(id) on delete cascade,

  due_date      date not null,
  status        task_status not null default 'todo',
  completed_at  timestamptz,
  completed_by  uuid references members(id) on delete set null,
  notes         text,                          -- ghi chú riêng cho lần này
  skipped       boolean not null default false,

  unique (task_id, due_date)
);

create index task_instances_lookup_idx
  on task_instances (household_id, due_date, status);


-- =============================================================================
-- 4. EVENTS — SỰ KIỆN GIA ĐÌNH
-- =============================================================================

create table events (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households(id) on delete cascade,

  title                 text not null,
  kind                  event_kind not null default 'other',
  side                  family_side,           -- paternal(nội) / maternal(ngoại) / both
  location              text,
  notes                 text,

  -- --- Lịch: âm hay dương ---
  calendar              calendar_type not null default 'solar',

  -- Nếu calendar='solar'
  solar_date            date,
  -- Nếu calendar='lunar' (canonical cho giỗ, sinh nhật âm)
  lunar_day             smallint check (lunar_day between 1 and 30),
  lunar_month           smallint check (lunar_month between 1 and 12),
  lunar_leap_month      boolean not null default false,

  start_time            time,
  is_all_day            boolean not null default true,

  recur                 recurrence,            -- giỗ/sinh nhật: freq='yearly'
  remind_lead_days      smallint not null default 3,

  -- CACHE: ngày dương của lần xảy ra kế tiếp. Do tầng app/edge function tính
  -- (Postgres không biết lịch âm). Dùng cho mọi query timeline & sort.
  next_occurrence_date  date,

  -- Chi phí dự kiến gắn trực tiếp (ngoài ra có thể link tới upcoming_payments)
  estimated_cost        numeric(14,2),

  created_by            uuid not null references profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint events_date_present check (
    (calendar = 'solar' and solar_date is not null)
    or
    (calendar = 'lunar' and lunar_day is not null and lunar_month is not null)
  )
);

-- FK forward-reference của tasks.event_id (tasks khai báo trước events)
alter table tasks add constraint tasks_event_fk
  foreign key (event_id) references events(id) on delete set null;

create index events_household_next_idx on events (household_id, next_occurrence_date)
  where deleted_at is null;
create index events_side_idx on events (household_id, side) where deleted_at is null;

-- =============================================================================
-- 5. MONEY — TÌNH HÌNH TÀI CHÍNH GIA ĐÌNH
-- =============================================================================
-- KHÔNG phải sổ thu chi. Không có bảng transaction cho chi tiêu hằng ngày.
--
-- Tách thành 4 bảng thực thể thay vì một bảng `money_items` gánh tất cả.
-- Lý do KHÔNG phải là thẩm mỹ mà là VÒNG ĐỜI khác nhau:
--   assets            -> giá trị đổi liên tục   -> cần lịch sử giá trị
--   upcoming_payments -> chốt một lần rồi xong  -> append-mostly
--   goals             -> tích luỹ dần           -> cần lịch sử góp
--   debts             -> giảm dần theo lịch trả -> TỰ SINH upcoming_payments
-- Một bảng chung không thể mô tả 4 ngữ nghĩa lịch sử đó bằng cùng cấu trúc.
--
-- Đọc gộp cho dashboard: dùng view `money_feed` ở cuối file, tầng UI không
-- cần biết có 4 bảng.

-- -----------------------------------------------------------------------------
-- 5.1. ASSETS — "tiền đang nằm ở đâu"
-- -----------------------------------------------------------------------------
-- Trả lời trực tiếp nỗi đau của người không giữ tiền. Đây là bảng lõi của wedge.

create table assets (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,

  name              text not null,             -- "Sổ tiết kiệm VCB", "Vàng cưới"
  asset_kind        asset_type not null,
  liquidity         liquidity not null,        -- suy ra từ asset_kind ở tầng UI
  current_value     numeric(14,2) not null default 0,

  -- Ai đang giữ. CẢNH BÁO TẦNG UI: chỉ hiện ở cấp từng khoản
  -- ("Sổ tiết kiệm VCB — vợ giữ"). KHÔNG BAO GIỜ tổng hợp theo người
  -- ("Chồng giữ 210tr / Vợ giữ 40tr") — thành công cụ đối chiếu ngay.
  holder_member_id  uuid references members(id) on delete set null,

  institution       text,                      -- tên bank / nơi giữ
  as_of_date        date not null default current_date,   -- "cập nhật gần nhất"
  notes             text,
  is_closed         boolean not null default false,

  created_by        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index assets_household_idx on assets (household_id)
  where deleted_at is null and is_closed = false;
create index assets_liquidity_idx on assets (household_id, liquidity)
  where deleted_at is null and is_closed = false;
create index assets_holder_idx on assets (household_id, holder_member_id)
  where deleted_at is null and is_closed = false;
-- Cho cảnh báo "khoản này cập nhật lần cuối 2 tháng trước"
create index assets_stale_idx on assets (household_id, as_of_date)
  where deleted_at is null and is_closed = false;


-- -----------------------------------------------------------------------------
-- 5.2. DEBTS — nợ phải trả
-- -----------------------------------------------------------------------------
-- Nợ KHÔNG phải "một con số 180tr". Nó có gốc, dư nợ, lịch trả, kỳ hạn,
-- và quan trọng nhất: nó TỰ SINH RA upcoming_payments hằng kỳ.
-- Đó là lý do kỹ thuật để nó là bảng riêng.
-- Lưu ý: khoản MÌNH cho người khác vay nằm ở assets (asset_kind='receivable').

create table debts (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households(id) on delete cascade,

  name                  text not null,          -- "Vay mua nhà BIDV"
  lender                text,                   -- ngân hàng / người cho vay
  borrower_member_id    uuid references members(id) on delete set null,

  principal_amount      numeric(14,2),          -- gốc ban đầu
  remaining_amount      numeric(14,2) not null, -- dư nợ hiện tại

  interest_rate_pct     numeric(5,2),           -- %/năm, nullable (vay người thân)
  installment_amount    numeric(14,2),          -- tiền trả mỗi kỳ
  installment_recur     recurrence,             -- thường monthly
  next_due_date         date,
  final_due_date        date,                   -- dự kiến tất toán

  as_of_date            date not null default current_date,
  notes                 text,
  is_settled            boolean not null default false,
  settled_at            timestamptz,

  created_by            uuid not null references profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint debts_remaining_nonneg check (remaining_amount >= 0)
);

create index debts_household_idx on debts (household_id)
  where deleted_at is null and is_settled = false;
create index debts_next_due_idx on debts (household_id, next_due_date)
  where deleted_at is null and is_settled = false;


-- -----------------------------------------------------------------------------
-- 5.3. UPCOMING PAYMENTS — khoản sắp phải trả
-- -----------------------------------------------------------------------------
-- Chỉ 2 trạng thái (unpaid / paid). 'quá hạn' suy ra từ due_date.
-- 'tạm hoãn' = đổi due_date. Không có 'chờ xác nhận' (= phê duyệt núp bóng).

create table upcoming_payments (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,

  name              text not null,             -- "Học phí kỳ 1", "Tiền nhà"
  amount            numeric(14,2) not null,

  due_date          date,
  due_month         date,                      -- khi chỉ biết "tháng 9"
  recur             recurrence,

  state             payment_state not null default 'unpaid',
  settled_at        timestamptz,
  -- KHÔNG lưu "ai đã trả": biến tướng của "ai đã tiêu khoản này".

  -- Nguồn gốc: nếu kỳ trả này sinh ra từ một khoản nợ
  source_debt_id    uuid references debts(id) on delete set null,
  -- Ngữ cảnh: khoản này để chuẩn bị cho sự kiện nào
  event_id          uuid references events(id) on delete set null,

  notes             text,

  created_by        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  constraint payments_has_date check (due_date is not null or due_month is not null)
);

create index payments_due_idx
  on upcoming_payments (household_id, due_date)
  where deleted_at is null and state = 'unpaid';
create index payments_debt_idx on upcoming_payments (source_debt_id)
  where source_debt_id is not null;
create index payments_event_idx on upcoming_payments (event_id)
  where event_id is not null;


-- -----------------------------------------------------------------------------
-- 5.4. GOALS — mục tiêu tài chính chung
-- -----------------------------------------------------------------------------
-- Giải thích cho người không giữ tiền: vì sao tiền không phải để tiêu ngay.
-- Không phân loại, không mức ưu tiên — hai thứ đó không đổi hành vi nào.

create table goals (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,

  name              text not null,             -- "Mua nhà", "Quỹ dự phòng"
  target_amount     numeric(14,2) not null check (target_amount > 0),
  current_amount    numeric(14,2) not null default 0,
  target_date       date,
  notes             text,
  is_archived       boolean not null default false,   -- hoàn thành / dừng / huỷ

  created_by        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index goals_household_idx on goals (household_id)
  where deleted_at is null and is_archived = false;


-- -----------------------------------------------------------------------------
-- 5.5. MONEY EVENTS — lịch sử từng khoản (append-only)
-- -----------------------------------------------------------------------------
-- RANH GIỚI QUAN TRỌNG: bảng này log THAY ĐỔI CỦA BỨC TRANH, không log
-- giao dịch chi tiêu. Đổ xăng 500k KHÔNG vào đây. Sổ tiết kiệm từ 250tr
-- xuống 220tr thì VÀO đây.
--
-- Vì sao cần: niềm tin của người không giữ tiền đến từ việc THẤY ĐƯỢC THAY ĐỔI,
-- không phải từ con số hiện tại. `delta` ở đây là thứ sinh ra cờ cần trao đổi
-- ("quỹ dự phòng giảm 30tr trong tháng này") — không có nó thì phải chờ
-- người ta tự phát hiện.
--
-- Append-only: KHÔNG update, KHÔNG delete. Sửa sai bằng cách ghi event bù.

create table money_events (
  id                bigserial primary key,
  household_id      uuid not null references households(id) on delete cascade,

  entity_type       entity_type not null,      -- asset | debt | goal | upcoming_payment
  entity_id         uuid not null,
  event_type        money_event_type not null,

  -- Giá trị trước/sau + delta. Lưu cả ba để đọc lịch sử không cần tự tính,
  -- và để vẫn đúng khi entity gốc bị xoá mềm.
  value_before      numeric(14,2),
  value_after       numeric(14,2),
  delta             numeric(14,2),

  occurred_on       date not null default current_date,
  note              text,

  actor_profile_id  uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),

  constraint money_events_entity_scope check (
    entity_type in ('asset', 'debt', 'goal', 'upcoming_payment')
  )
);

create index money_events_entity_idx
  on money_events (entity_type, entity_id, occurred_on desc);
create index money_events_timeline_idx
  on money_events (household_id, occurred_on desc);
-- Tìm biến động lớn để gợi ý gắn cờ cần trao đổi
create index money_events_delta_idx on money_events (household_id, occurred_on)
  where delta is not null;

-- Chặn sửa/xoá ở tầng DB, không dựa vào kỷ luật của tầng app.
create or replace function money_events_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'money_events is append-only (attempted %)', tg_op;
end $$;

create trigger money_events_no_update before update on money_events
  for each row execute function money_events_append_only();
create trigger money_events_no_delete before delete on money_events
  for each row execute function money_events_append_only();


-- -----------------------------------------------------------------------------
-- 5.6. ATTENTION ITEMS — "khoản cần trao đổi"
-- -----------------------------------------------------------------------------
-- Lõi cảm xúc của wedge: cách hỏi mà không buộc tội.
-- Một bảng riêng thay vì 3 cột lặp trên 4 bảng — đồng thời card "Cần trao đổi"
-- trên dashboard đúng bằng một query vào đây.
-- CỐ Ý KHÔNG có comment thread: app không thay thế việc hai người nói chuyện.

create table attention_items (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,

  entity_type       entity_type not null,
  entity_id         uuid not null,
  note              text,                      -- "khoản này cao hơn bình thường"

  created_by        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),

  resolved_at       timestamptz,
  resolved_by       uuid references profiles(id) on delete set null,
  resolution_note   text,                      -- kết luận, nếu muốn ghi lại

  -- Tự hết hiệu lực để cờ không tích tụ khiến finance_status mắc kẹt ở 'watch'
  expires_at        timestamptz not null default (now() + interval '14 days')
);

-- KHÔNG dùng unique(entity_type, entity_id, resolved_at): Postgres coi nhiều
-- NULL là khác nhau nên constraint đó KHÔNG chặn được hai cờ mở cùng lúc.
-- Partial unique index mới đúng.
create unique index attention_one_open_per_entity
  on attention_items (entity_type, entity_id) where resolved_at is null;

create index attention_open_idx on attention_items (household_id, created_at desc)
  where resolved_at is null;


-- -----------------------------------------------------------------------------
-- 5.7. MONEY SNAPSHOTS — ảnh chụp tổng của cả nhà
-- -----------------------------------------------------------------------------
-- Khác money_events: đây là TỔNG của cả nhà theo thời điểm, không phải
-- lịch sử từng khoản. Hai tầng lịch sử khác nhau, cần cả hai.
--
-- Đây cũng là VÒNG LẶP THÓI QUEN của app:
--   reminder hằng tuần -> nhập nhanh 4 con số -> ghi 1 snapshot.
-- Vòng lặp duy nhất trong toàn sản phẩm có nhịp rõ ràng.

create table money_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households(id) on delete cascade,

  as_of_date            date not null,

  -- Bốn con số của flow nhập nhanh
  total_usable          numeric(14,2) not null default 0,
  total_savings         numeric(14,2) not null default 0,
  total_long_term       numeric(14,2) not null default 0,
  total_debt            numeric(14,2) not null default 0,

  status                finance_status not null default 'no_data',

  -- true  = user tự nhập trong flow cập nhật tuần
  -- false = cron tự tổng hợp cuối tháng, để lịch sử không trống nếu user lười
  is_manual             boolean not null default true,
  note                  text,

  created_by            uuid references profiles(id) on delete set null,
  created_at            timestamptz not null default now(),

  unique (household_id, as_of_date)
);

create index money_snapshots_timeline_idx
  on money_snapshots (household_id, as_of_date desc);


-- =============================================================================
-- 6. DOCUMENTS — TÀI LIỆU & GIẤY TỜ
-- =============================================================================
-- Một document = 1 giấy tờ logic, chứa NHIỀU file (hợp đồng thuê nhà = 6 trang).

create table documents (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references households(id) on delete cascade,

  title               text not null,
  type                doc_type not null default 'other',
  owner_member_id     uuid references members(id) on delete set null,  -- thuộc về ai

  issued_date         date,
  expiry_date         date,
  remind_lead_days    smallint not null default 30,

  physical_location   text,                    -- "ngăn kéo phòng làm việc"
  external_link       text,                    -- Google Drive / iCloud
  notes               text,

  renewal_cost        numeric(14,2),           -- phí gia hạn dự kiến

  -- Ngữ cảnh: tài liệu này gắn với sự kiện nào / khoản nợ nào
  -- (hợp đồng vay <-> debt là quan hệ duy nhất không đi qua hub sự kiện).
  event_id            uuid references events(id) on delete set null,
  debt_id             uuid references debts(id) on delete set null,

  -- Metadata riêng theo loại (serial máy giặt, biển số xe, số hợp đồng...)
  -- Dùng jsonb để không phải migration mỗi lần thêm doc_type.
  extra               jsonb not null default '{}'::jsonb,

  created_by          uuid not null references profiles(id) on delete cascade,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz              -- soft delete, retention 30 ngày
);

create index documents_household_idx on documents (household_id)
  where deleted_at is null;
-- Query nóng: "giấy tờ nào sắp hết hạn"
create index documents_expiry_idx on documents (household_id, expiry_date)
  where deleted_at is null and expiry_date is not null;
create index documents_owner_idx on documents (owner_member_id)
  where deleted_at is null;
create index documents_extra_gin on documents using gin (extra);
create index documents_event_idx on documents (event_id) where event_id is not null;
create index documents_debt_idx on documents (debt_id) where debt_id is not null;

-- File thật, lưu trên Cloudflare R2. DB chỉ giữ key + metadata.
create table document_files (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references documents(id) on delete cascade,
  household_id    uuid not null references households(id) on delete cascade,

  r2_key          text not null unique,        -- vd: hh/{household_id}/doc/{uuid}
  thumb_key       text,                        -- thumbnail sinh trên client
  filename        text not null,
  mime            text not null,
  size_bytes      bigint not null check (size_bytes > 0),
  page_order      smallint not null default 0,

  -- Upload 2 pha: presign -> client upload R2 -> confirm.
  -- Row pending mà quá 24h chưa confirm -> cron dọn (orphan).
  is_confirmed    boolean not null default false,
  uploaded_by     uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index document_files_doc_idx on document_files (document_id, page_order)
  where deleted_at is null;
create index document_files_orphan_idx on document_files (created_at)
  where is_confirmed = false;

-- Trigger duy trì households.storage_used_bytes.
-- Chỉ tính file đã confirmed và chưa xoá.
create or replace function sync_storage_used() returns trigger
language plpgsql as $$
declare
  hh uuid := coalesce(new.household_id, old.household_id);
begin
  update households h
     set storage_used_bytes = coalesce((
           select sum(f.size_bytes) from document_files f
            where f.household_id = hh
              and f.is_confirmed = true
              and f.deleted_at is null
         ), 0)
   where h.id = hh;
  return null;
end $$;

create trigger document_files_storage_sync
after insert or update or delete on document_files
for each row execute function sync_storage_used();


-- =============================================================================
-- 8. REMINDERS
-- =============================================================================
-- Phần lớn nhắc nhở là ngày biết trước -> schedule LOCAL trên máy,
-- không cần server. Bảng này là source of truth để client sync về và
-- đặt lại notification khi cài máy mới.
-- channel='push' chỉ cho sự kiện realtime (partner gán việc cho bạn).

create table reminders (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,

  entity_type     entity_type not null,
  entity_id       uuid not null,
  target_member_id uuid references members(id) on delete cascade,  -- null = cả nhà

  fire_at         timestamptz not null,
  title           text not null,
  body            text,
  channel         reminder_channel not null default 'local',

  sent_at         timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index reminders_pending_idx on reminders (household_id, fire_at)
  where sent_at is null and dismissed_at is null;
create index reminders_entity_idx on reminders (entity_type, entity_id);


-- =============================================================================
-- 9. TRIGGER updated_at
-- =============================================================================
-- Có cột updated_at nhưng không có gì maintain thì nó mãi bằng created_at.
-- Một function dùng chung, gắn cho mọi bảng có cột này.

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','households','tasks','events','assets','debts',
    'upcoming_payments','goals','documents'
  ] loop
    execute format(
      'create trigger %1$s_touch before update on %1$s
         for each row execute function touch_updated_at()', t);
  end loop;
end $$;


-- =============================================================================
-- 10. RLS
-- =============================================================================
-- QUAN TRỌNG VỀ PERFORMANCE: bọc auth.uid() trong (select ...) để planner
-- coi là InitPlan, đánh giá MỘT LẦN cho cả query thay vì từng dòng.
-- Membership check tách thành hàm STABLE SECURITY DEFINER -> cache trong query
-- và tránh đệ quy RLS trên chính bảng members.

create or replace function current_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = (select auth.uid())
$$;

create or replace function is_household_member(p_household uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members m
     where m.household_id = p_household
       and m.profile_id   = current_profile_id()
       and m.deleted_at is null
       and m.is_active
  )
$$;

-- Bật RLS
alter table profiles              enable row level security;
alter table households            enable row level security;
alter table members               enable row level security;
alter table invites               enable row level security;
alter table push_tokens           enable row level security;
alter table tasks                 enable row level security;
alter table task_instances        enable row level security;
alter table events                enable row level security;
alter table assets                enable row level security;
alter table debts                 enable row level security;
alter table upcoming_payments     enable row level security;
alter table goals                 enable row level security;
alter table money_events          enable row level security;
alter table attention_items       enable row level security;
alter table money_snapshots       enable row level security;
alter table documents             enable row level security;
alter table document_files        enable row level security;
alter table reminders             enable row level security;

-- profiles: chỉ chính mình + người cùng household (để hiện tên/avatar)
create policy profiles_self on profiles
  for all to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create policy profiles_same_household_read on profiles
  for select to authenticated
  using (exists (
    select 1 from members m1
    join members m2 on m1.household_id = m2.household_id
    where m1.profile_id = profiles.id
      and m2.profile_id = current_profile_id()
      and m1.deleted_at is null and m2.deleted_at is null
  ));

create policy households_member on households
  for all to authenticated
  using (is_household_member(id))
  with check (is_household_member(id));

create policy members_same_household on members
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy push_tokens_self on push_tokens
  for all to authenticated
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

-- Policy chung cho các bảng dữ liệu: dùng household_id.
-- (Sinh bằng loop để tránh lặp 10 lần cùng một câu.)
do $$
declare t text;
begin
  foreach t in array array[
    'invites','tasks','task_instances','events',
    'assets','debts','upcoming_payments','goals',
    'money_events','attention_items','money_snapshots',
    'documents','document_files',
    'reminders'
  ] loop
    execute format($f$
      create policy %1$s_household on %1$s
        for all to authenticated
        using (is_household_member(household_id))
        with check (is_household_member(household_id));
    $f$, t);
  end loop;
end $$;

-- LƯU Ý: Dù có RLS, client PHẢI luôn filter `where household_id = ?` tường
-- minh. RLS là lưới an toàn thứ hai — không phải tầng phân quyền duy nhất.
-- Nhờ vậy mọi query vẫn đúng khi chuyển sang API server tự viết.


-- =============================================================================
-- 11. VIEW CHO MÀN HÌNH "NHÀ MÌNH"
-- =============================================================================
-- Một query duy nhất cho toàn bộ dashboard, union 4 nguồn.
-- Client filter theo household_id + khoảng ngày.

create or replace view home_feed as
  select
    'task'::entity_type as source,
    ti.id               as id,
    t.household_id,
    t.title,
    ti.due_date         as on_date,
    t.assignee_id       as member_id,
    null::numeric       as amount,
    (ti.status = 'done') as is_done
  from task_instances ti
  join tasks t on t.id = ti.task_id
  where t.deleted_at is null and ti.skipped = false

  union all

  select 'task', t.id, t.household_id, t.title, t.due_date, t.assignee_id,
         null, (t.status = 'done')
  from tasks t
  where t.deleted_at is null
    and ((t.recur).freq is null or (t.recur).freq = 'none')

  union all

  select 'event', e.id, e.household_id, e.title, e.next_occurrence_date,
         null, e.estimated_cost, false
  from events e
  where e.deleted_at is null and e.next_occurrence_date is not null

  union all

  select 'upcoming_payment', p.id, p.household_id, p.name,
         coalesce(p.due_date, p.due_month), null, p.amount, (p.state = 'paid')
  from upcoming_payments p
  where p.deleted_at is null

  union all

  select 'document', d.id, d.household_id, d.title, d.expiry_date,
         d.owner_member_id, d.renewal_cost, false
  from documents d
  where d.deleted_at is null and d.expiry_date is not null;


-- -----------------------------------------------------------------------------
-- 11b. FINANCE METRICS — nguyên liệu thô cho "Nhà mình đang ổn không?"
-- -----------------------------------------------------------------------------
-- View này CỐ Ý KHÔNG trả về trạng thái ok/watch/tight.
--
-- Trạng thái là CHÍNH SÁCH SẢN PHẨM, không phải bất biến dữ liệu: ngưỡng và
-- điều kiện sẽ đổi nhiều lần khi học được từ người dùng. Để trong plpgsql thì
-- mỗi lần đổi là một migration, không test được trong CI, không dùng chung
-- type với TypeScript, và không thấy gì trong Sentry.
--
-- Nó là hàm THUẦN của các con số dưới đây -> tính bằng một module TS dùng chung
-- cho cả client và Edge Function:
--     packages/finance-rules/status.ts  ->  computeFinanceStatus(metrics)
-- Lợi ích kèm theo: hiện tức thì, chạy được offline, một định nghĩa duy nhất.
--
-- Việc của SQL ở đây là thứ SQL giỏi: gom số. Và đây cũng là NƠI DUY NHẤT
-- định nghĩa "khả dụng / tiết kiệm / dài hạn" — trước đó định nghĩa này bị
-- lặp ở 3 chỗ (status function, view, autosnapshot).

create or replace view finance_metrics as
  select
    h.id as household_id,
    (select coalesce(sum(current_value), 0) from assets a
      where a.household_id = h.id and a.deleted_at is null
        and a.is_closed = false and a.liquidity = 'usable_now')     as total_usable,
    (select coalesce(sum(current_value), 0) from assets a
      where a.household_id = h.id and a.deleted_at is null
        and a.is_closed = false and a.liquidity = 'not_immediate')  as total_savings,
    (select coalesce(sum(current_value), 0) from assets a
      where a.household_id = h.id and a.deleted_at is null
        and a.is_closed = false and a.liquidity = 'long_term')      as total_long_term,
    (select coalesce(sum(remaining_amount), 0) from debts d
      where d.household_id = h.id and d.deleted_at is null
        and d.is_settled = false)                                   as total_debt,
    (select coalesce(sum(amount), 0) from upcoming_payments p
      where p.household_id = h.id and p.deleted_at is null
        and p.state = 'unpaid'
        and coalesce(p.due_date, p.due_month)
            <= current_date + interval '30 days')                   as due_next_30d,
    (select count(*) from upcoming_payments p
      where p.household_id = h.id and p.deleted_at is null
        and p.state = 'unpaid'
        and coalesce(p.due_date, p.due_month)
            between current_date and current_date + 7)              as due_next_7d_count,
    (select count(*) from upcoming_payments p
      where p.household_id = h.id and p.deleted_at is null
        and p.state = 'unpaid'
        and coalesce(p.due_date, p.due_month) < current_date)       as overdue_count,
    (select count(*) from attention_items ai
      where ai.household_id = h.id and ai.resolved_at is null
        and ai.expires_at > now())                                  as attention_count,
    (select max(as_of_date) from assets a
      where a.household_id = h.id and a.deleted_at is null)         as last_updated_on,
    (select as_of_date from money_snapshots ms
      where ms.household_id = h.id
      order by as_of_date desc limit 1)                             as last_snapshot_on,
    h.snapshot_interval_days,
    h.currency
  from households h
  where h.deleted_at is null;

-- Lưu ý: money_snapshots.status VẪN lưu giá trị trạng thái. Đó là ảnh chụp
-- lịch sử, cần đúng bối cảnh thời điểm đó — Edge ghi vào khi tạo snapshot.


-- View đọc gộp: tầng UI không cần biết tài chính nằm ở 4 bảng.
-- Dùng cho ô tìm kiếm, timeline chung và card "mọi thứ về tiền".
create or replace view money_feed as
  select 'asset'::entity_type as kind, a.id, a.household_id, a.name as title,
         a.current_value as amount, a.as_of_date as on_date,
         a.holder_member_id as member_id, a.is_closed as is_closed
  from assets a where a.deleted_at is null
  union all
  select 'debt', d.id, d.household_id, d.name,
         d.remaining_amount, d.next_due_date, d.borrower_member_id, d.is_settled
  from debts d where d.deleted_at is null
  union all
  select 'upcoming_payment', p.id, p.household_id, p.name,
         p.amount, coalesce(p.due_date, p.due_month), null, (p.state = 'paid')
  from upcoming_payments p where p.deleted_at is null
  union all
  select 'goal', g.id, g.household_id, g.name,
         g.current_amount, g.target_date, null, g.is_archived
  from goals g where g.deleted_at is null;


-- =============================================================================
-- 12. RPC NGUYÊN TỬ (thin) — ngoại lệ duy nhất còn logic nhiều bước trong DB
-- =============================================================================
-- NGUYÊN TẮC: Edge quyết định KHI NÀO và BAO NHIÊU; DB chỉ đảm bảo
-- TẤT CẢ HOẶC KHÔNG GÌ CẢ. RPC ở đây không có nhánh rẽ, không có ngưỡng,
-- không có quy tắc sản phẩm — chỉ có cơ học ghi dữ liệu.
--
-- Vì sao không đẩy hẳn ra Edge: PostgREST không cho mở transaction nhiều lệnh.
-- Chốt một kỳ trả nợ = 3 lệnh ghi; mất mạng ở giữa -> dư nợ sai vĩnh viễn.

create or replace function settle_payment(
  p_payment_id uuid,
  p_paid_on    date default current_date,
  p_note       text default null
) returns void
language plpgsql security invoker as $$
declare
  v_pay   upcoming_payments;
  v_debt  debts;
begin
  select * into v_pay from upcoming_payments
   where id = p_payment_id and deleted_at is null and state = 'unpaid'
   for update;
  if not found then
    raise exception 'payment not found or already settled';
  end if;

  update upcoming_payments
     set state = 'paid', settled_at = now()
   where id = p_payment_id;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_pay.household_id, 'upcoming_payment', v_pay.id, 'settled',
          v_pay.amount, 0, -v_pay.amount, p_paid_on, p_note,
          current_profile_id());

  -- Nếu kỳ này sinh ra từ một khoản nợ: giảm dư nợ trong cùng transaction
  if v_pay.source_debt_id is not null then
    select * into v_debt from debts where id = v_pay.source_debt_id for update;

    update debts
       set remaining_amount = greatest(remaining_amount - v_pay.amount, 0),
           as_of_date       = p_paid_on,
           is_settled       = (remaining_amount - v_pay.amount) <= 0,
           settled_at       = case when (remaining_amount - v_pay.amount) <= 0
                                   then now() end
     where id = v_debt.id;

    insert into money_events (household_id, entity_type, entity_id, event_type,
                              value_before, value_after, delta, occurred_on,
                              actor_profile_id)
    values (v_debt.household_id, 'debt', v_debt.id, 'value_updated',
            v_debt.remaining_amount,
            greatest(v_debt.remaining_amount - v_pay.amount, 0),
            -v_pay.amount, p_paid_on, current_profile_id());
  end if;
end $$;

-- Cập nhật giá trị một tài sản + ghi lịch sử, nguyên tử.
create or replace function update_asset_value(
  p_asset_id uuid,
  p_value    numeric,
  p_as_of    date default current_date,
  p_note     text default null
) returns void
language plpgsql security invoker as $$
declare v_old numeric; v_hh uuid;
begin
  select current_value, household_id into v_old, v_hh
    from assets where id = p_asset_id and deleted_at is null for update;
  if not found then raise exception 'asset not found'; end if;

  update assets set current_value = p_value, as_of_date = p_as_of
   where id = p_asset_id;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_hh, 'asset', p_asset_id, 'value_updated',
          v_old, p_value, p_value - v_old, p_as_of, p_note, current_profile_id());
end $$;


-- =============================================================================
-- 13. PHÂN CÔNG: DB vs EDGE FUNCTION
-- =============================================================================
-- Ranh giới KHÔNG phải "DB vs Edge" mà là BẤT BIẾN vs CHÍNH SÁCH.
-- Lý do: client nói chuyện TRỰC TIẾP với PostgREST. Mọi thứ đặt trong Edge
-- đều CÓ THỂ BỊ ĐI VÒNG bằng một lệnh gọi PostgREST thẳng.
--
-- Ở LẠI DB (bắt buộc — là bảo đảm, không phải logic):
--   current_profile_id(), is_household_member()  -- RLS không gọi được Edge
--   touch_updated_at()                           -- trigger
--   money_events_append_only()                   -- trigger, chặn sửa lịch sử
--   sync_storage_used()                          -- bộ đếm quota
--        (ENFORCE quota ở Edge khi phát presigned URL;
--         DUY TRÌ bộ đếm ở DB, để insert thẳng qua PostgREST không làm lệch)
--   settle_payment(), update_asset_value()       -- RPC nguyên tử, không policy
--   views: home_feed, finance_metrics, money_feed -- SQL làm việc SQL giỏi
--
-- RA EDGE FUNCTION (là chính sách — sẽ đổi nhiều lần, cần test/observability):
--   computeFinanceStatus()      -- module TS dùng chung, chạy cả ở CLIENT
--   refresh_lunar_dates         -- Postgres không biết lịch âm
--   purge_soft_deleted          -- phải gọi R2 API để xoá file thật
--   presign_upload              -- kiểm tra premium + quota + ký URL R2
--   spawn_debt_installments     -- sinh kỳ trả nợ tiếp theo
--   generate_task_instances     -- vật hoá việc lặp, cửa sổ 90 ngày
--   build_reminders             -- sinh nhắc nhở expiry / event / money
--   autosnapshot_monthly        -- chốt snapshot cuối tháng
--   nudge_snapshot_update       -- nhắc cập nhật theo snapshot_interval_days
--   revenuecat_webhook          -- đồng bộ entitlement về households
--
-- pg_cron KHÔNG chứa logic. Nó chỉ net.http_post() gọi Edge Function:
--   select cron.schedule('purge', '0 2 * * *', $$
--     select net.http_post(
--       url     := 'https://<project>.supabase.co/functions/v1/purge-soft-deleted',
--       headers := '{"Authorization":"Bearer <service_role>"}'::jsonb)
--   $$);


-- =============================================================================
-- 14. LỊCH CHẠY NỀN
-- =============================================================================
-- Mọi job đều là Edge Function; pg_cron chỉ gọi HTTP. Chạy theo batch có
-- cursor, không phải một transaction lớn.
--
--  02:00  purge-soft-deleted        xoá cứng bản ghi deleted_at > 30 ngày,
--                                   kèm gọi R2 API xoá file thật
--  03:00  sweep-orphan-uploads      document_files pending quá 24h
--  03:30  generate-task-instances   vật hoá việc lặp, cửa sổ 90 ngày
--  04:00  refresh-lunar-dates       tính next_occurrence_date cho sự kiện âm lịch
--  04:30  build-reminders           nhắc expiry tài liệu / sự kiện / khoản tiền
--  05:00  spawn-debt-installments   sinh kỳ trả nợ tiếp theo
--  05:15  expire-attention-items    đóng cờ cần trao đổi đã quá expires_at
--  09:00  nudge-snapshot-update     nhắc household quá hạn snapshot_interval_days
--                                   (vòng lặp thói quen chính của sản phẩm)
--  23:50  autosnapshot-monthly      ngày cuối tháng chốt 1 snapshot is_manual=false
--                                   để lịch sử không trống nếu user lười nhập
--
-- =============================================================================
-- GHI CHÚ PHẠM VI MVP
-- =============================================================================
-- ĐÃ BỎ khỏi MVP (thêm lại khi có nhu cầu thật — đều là thay đổi additive):
--   event_instances        ghi chú/chi phí thực tế theo từng năm
--   event_checklist_items  checklist trong sự kiện
--   links                  quan hệ N:N tự do; MVP dùng FK, sự kiện là hub
--   activity_log           metrics đã có PostHog
--   subscription_events    RevenueCat đã giữ lịch sử webhook
--
-- GIỮ SCHEMA NHƯNG KHÔNG BUILD UI Ở MVP:
--   money_events    ghi từ ngày đầu; timeline & biểu đồ là Phase 2
--   money_snapshots ghi từ ngày đầu; so sánh tháng là Phase 2
--   Lý do: lịch sử KHÔNG backfill được. Chi phí schema ~0, chi phí feature 0.
--   ĐỪNG XOÁ hai bảng này vì "MVP chưa dùng đến".
