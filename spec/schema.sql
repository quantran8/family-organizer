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
--   5. Mọi con số tiền do người dùng nhập là SỐ KHAI, không phải số đo. Bảng
--      nào có giá trị tiền thì phải có as_of_date + ai khai. UI không được
--      hiển thị số tổng nào thiếu nhãn thời gian.  (concept v2 §7.6)
--
-- Phiên bản: v2.1 — đã hợp nhất concept v2, hai module bản địa, addendum v2.1.
-- Tài liệu đi kèm: 02-data-contract, 03-business-logic, 05-screens-and-flows,
--                  07-local-modules, 08-addendum-v2.1.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";
-- Tìm contact theo tên khi nhập nhanh 100 phong bì (sổ hiếu hỉ).
create extension if not exists "pg_trgm";

-- =============================================================================
-- 0. ENUMS
-- =============================================================================

create type calendar_type   as enum ('solar', 'lunar');

create type recur_freq      as enum ('none', 'daily', 'weekly', 'monthly', 'yearly');

create type member_role     as enum ('owner', 'partner', 'child', 'relative');

-- Bên gia đình liên quan.
-- TRỤC LÀ "NHÀ AI", KHÔNG PHẢI "NỘI/NGOẠI". Bản trước dùng paternal/maternal
-- trong DB nhưng husband/wife ở TS và "Nhà chồng/Nhà vợ" ở UI — ba nơi ba
-- nghĩa. Hai trục đó không ánh xạ được: "bên nội của vợ" tồn tại và không có
-- chỗ. Thống nhất theo thứ người dùng thật sự nghĩ.
create type family_side     as enum (
  'husband_family',   -- nhà chồng
  'wife_family',      -- nhà vợ
  'both',
  'own'               -- gia đình nhỏ của hai vợ chồng
);

create type task_status      as enum ('todo', 'done');

create type event_kind       as enum (
  'death_anniversary',  -- ngày giỗ
  'wedding',            -- cưới hỏi
  'birthday',
  'holiday',            -- lễ, Tết
  'medical',            -- khám bệnh
  'trip',
  'school',             -- lịch học, họp phụ huynh
  'child',              -- của con: tiêm, họp phụ huynh, sinh nhật bạn cùng lớp
  'other'
);

-- Hai loại việc nhà, KHÁC BẢN CHẤT (03 §4b):
--   recurring -- lặp lại, có giờ, KHÔNG HOÃN ĐƯỢC (due_date là mốc neo)
--   flexible  -- phát sinh, không gấp, mặc định không tên, KHÔNG GÁN CHO
--                NGƯỜI KIA — ranh giới giữ nó là danh sách việc của nhà chứ
--                không phải hộp thư nhiệm vụ
create type task_list        as enum ('recurring', 'flexible');

create type fund_entry_kind  as enum ('deposit', 'withdrawal');

-- Nghĩa vụ hay nguyện vọng. Hai loại cùng MỘT MÀN HÌNH nhưng KHÔNG BAO GIỜ
-- cùng MỘT CON SỐ — projectRunway chỉ cộng 'mandatory'. Xem 03 §1c, 10 §5.
create type need_kind        as enum ('mandatory', 'optional');

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
  'asset', 'debt', 'goal', 'upcoming_payment',
  'shopping_item',
  'fund'
);

-- --- Nhập liệu bằng AI (06 §6) ---
create type ingest_source   as enum ('screenshot', 'photo', 'text');
create type ingest_status   as enum ('pending', 'confirmed', 'discarded');

-- --- Sổ hiếu hỉ (07 §3) ---
create type contact_side    as enum ('husband_family', 'wife_family', 'shared', 'other');
create type gift_direction  as enum ('received', 'given');
create type gift_occasion   as enum (
  'wedding', 'engagement', 'funeral', 'death_anniversary',
  'full_month', 'birthday', 'housewarming', 'other'
);

-- --- Hồ sơ con (07 §4) ---
-- CỐ Ý KHÔNG có 'skipped' hay 'postponed': app không bao giờ gợi ý hoãn, bỏ,
-- hay đổi thứ tự mũi tiêm. Xem 07 §4.2.
create type dose_status     as enum ('planned', 'done', 'overdue');

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

  -- Ngưỡng hai người tự chốt lúc onboarding. null = "tự quyết".
  --
  -- KHÔNG PHẢI VALIDATION. Cố ý không có check constraint, không trigger,
  -- không chặn. Nó chỉ làm hai việc: (1) dòng gợi ý dưới ô nhập tiền,
  -- (2) đầu vào của shouldAskForRefresh().
  --
  -- Vì sao tồn tại: chỉ người dùng mới quyết được khoản nào đáng ghi. Nhưng
  -- nếu mỗi người có một ngưỡng riêng trong đầu, hai người sẽ ĐỌC SAI SỰ IM
  -- LẶNG CỦA NHAU — chồng thấy vợ không ghi gì và kết luận vợ không tiêu
  -- khoản nào lớn, trong khi vợ đã chi 4tr và thấy chưa tới ngưỡng của mình.
  --
  -- Nếu biến nó thành ràng buộc, nó thành quy định của app áp lên gia đình.
  -- Nó phải giữ nguyên nghĩa: một quy ước hai người tự chốt, app lưu kết quả.
  record_threshold_amount numeric(14,2),

  -- Trial kết thúc theo CỘT MỐC, không theo ngày: 30 ngày có thể trôi qua mà
  -- không có hạn nào tới, khi đó người dùng chưa từng nhìn thấy sản phẩm hoạt
  -- động. trial_hard_cap_at là trần cứng 90 ngày.
  trial_milestones      jsonb not null default
    '{"reminderAcknowledged": false, "eventWithCostCompleted": false}'::jsonb,
  trial_hard_cap_at     timestamptz,

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
  -- 'child' và 'relative' là ĐỐI TƯỢNG ĐƯỢC GHI NHẬN, không phải người dùng
  -- app. Không có luồng mời cho hai role này. Household thực tế = 2 người lớn:
  -- ông bà không quen công nghệ, người giúp việc không thuộc gia đình.
  role          member_role not null default 'partner',
  birthday      date,                    -- bắt buộc với child: sinh lịch tiêm
  is_active     boolean not null default true,

  -- Hồ sơ con (07 §4.4). Ba trường phẳng, không cần bảng riêng.
  school_name         text,
  school_class        text,
  health_insurance_no text,

  -- "Mỗi con một màu" (v3 §7.5). Khoá vào bảng màu ở design tokens, KHÔNG phải
  -- mã hex — đổi bảng màu thì không phải migrate dữ liệu.
  --
  -- Màu BÁM THEO CON, không suy từ vị trí trong danh sách: thêm em bé thứ hai
  -- mà đổi màu anh chị là lỗi nhỏ nhưng đúng chỗ cảm xúc.
  color_key           text,

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

  -- Hai danh sách tách biệt (03 §4b, v3 §7.3). Backfill lúc migrate: có recur
  -- -> 'recurring', còn lại -> 'flexible'.
  --
  -- Việc 'flexible' KHÔNG ĐƯỢC GÁN CHO NGƯỜI KIA. Ràng buộc đó ép ở tầng UI
  -- (chip người ẩn, hoặc chỉ chọn được chính mình) chứ không ở DB: gán cho
  -- chính mình là hợp lệ, và DB không biết ai đang gọi.
  list            task_list not null default 'flexible',

  -- MẶC ĐỊNH null. Việc không gán ai là VIỆC CỦA NHÀ; gán tên là hành động
  -- phụ, có ý thức.
  --
  -- CHỈ HAI CHẾ ĐỘ: null hoặc một cái tên. KHÔNG có luân phiên tự động, không
  -- có assignee_mode, không có rotation_order. v3 §7.3 đề xuất chế độ thứ ba
  -- và nó bị bác — lý do ở 10 §2.2.
  --
  -- BẤT KỲ THÀNH VIÊN NÀO CŨNG ĐỔI ĐƯỢC, BẤT CỨ LÚC NÀO, không cần xác nhận
  -- và không sinh thông báo. Không có bước "nhận việc": việc đã tồn tại thì
  -- cần được hoàn thành, chỉ người làm là biến số. Chính quyền sửa tự do này
  -- khiến cái tên trên việc là một THOẢ THUẬN chứ không phải một MỆNH LỆNH.
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
  -- Ghi để hoàn tác. KHÔNG BAO GIỜ hiển thị trên UI và KHÔNG BAO GIỜ tổng hợp.
  -- "Tuần này anh xong 4/7" là bảng điểm giữa hai vợ chồng. Xem 03 §9.
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
-- 3b. SHOPPING ITEMS — DANH SÁCH MUA SẮM CHUNG
-- =============================================================================
-- Bề mặt DUY NHẤT trong sản phẩm có tần suất HẰNG NGÀY và TỰ NHIÊN HAI CHIỀU:
-- cả hai cùng thêm, cả hai cùng dùng, không ai nhắc ai. Thêm "nước mắm" vào
-- list khác hoàn toàn với giao "đi mua nước mắm".
--
-- Với một sản phẩm mà mọi module còn lại đều tần suất thấp, đây là thứ giữ
-- icon app khỏi trôi khỏi màn hình chính.
--
-- CỐ Ý THIẾU TRƯỜNG: không quantity, không price, không category, không store,
-- không assignee. Thêm bất kỳ thứ nào trong số đó là biến danh sách thành
-- việc được giao, và mất đúng lý do module này tồn tại.

create table shopping_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,

  title         text not null,
  note          text,

  is_done       boolean not null default false,
  added_by      uuid references members(id) on delete set null,
  -- Ghi để hoàn tác. KHÔNG BAO GIỜ hiển thị, KHÔNG BAO GIỜ tổng hợp.
  -- "Ai mua nhiều hơn" là bảng điểm giữa hai vợ chồng.
  done_by       uuid references members(id) on delete set null,
  done_at       timestamptz,

  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index shopping_open_idx on shopping_items (household_id, created_at)
  where deleted_at is null and is_done = false;
-- Mục đã tick biến mất khỏi danh sách chính sau 24h (cron), giữ 30 ngày.
create index shopping_cleanup_idx on shopping_items (done_at)
  where is_done = true and deleted_at is null;


-- =============================================================================
-- 4. EVENTS — SỰ KIỆN GIA ĐÌNH
-- =============================================================================

create table events (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references households(id) on delete cascade,

  title                 text not null,
  kind                  event_kind not null default 'other',
  side                  family_side,           -- nhà chồng / nhà vợ / cả hai / own
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

  -- NHẮC KÉP (03 §5b, v3 §7.5). 1-3 ngày trước, null = không có.
  --
  -- Mốc này KHÔNG bắn thêm push — nó SINH MỘT VIỆC LINH HOẠT. Thông báo thứ hai
  -- về cùng một sự kiện là phiền; một dòng việc trong danh sách thì hữu ích, và
  -- gắn được với chi phí dự kiến.
  --
  -- Phần lớn sự cố gia đình không phải quên sự kiện, mà là NHỚ SỰ KIỆN NHƯNG
  -- QUÊN PHẦN CHUẨN BỊ CHO NÓ.
  prep_lead_days        smallint check (prep_lead_days between 1 and 3),
  -- Id việc đã sinh. Giữ để cron chạy lại không sinh trùng. Chỉ Edge ghi.
  prep_task_id          uuid,   -- FK thêm bằng ALTER (tasks định nghĩa trước)

  -- Sự kiện của con nào (kind='child'). KHÔNG phải trục phân loại thứ hai —
  -- chỉ để lọc và lấy màu từ members.color_key.
  child_member_id       uuid references members(id) on delete set null,

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

-- Chiều ngược lại: việc chuẩn bị do nhắc kép sinh ra (03 §5b).
alter table events add constraint events_prep_task_fk
  foreign key (prep_task_id) references tasks(id) on delete set null;

create index events_household_next_idx on events (household_id, next_occurrence_date)
  where deleted_at is null;
create index events_side_idx on events (household_id, side) where deleted_at is null;
create index events_child_idx on events (household_id, child_member_id)
  where deleted_at is null and child_member_id is not null;
create index tasks_household_list_idx on tasks (household_id, list, due_date)
  where deleted_at is null;


-- -----------------------------------------------------------------------------
-- 4b. EVENT OCCURRENCES — TRÍ NHỚ NĂM NGOÁI
-- -----------------------------------------------------------------------------
-- Subscription không sống bằng tính năng, nó sống bằng CÁI MẤT ĐI KHI HUỶ.
-- Sau 12 tháng app tự nói được: "Tết năm ngoái nhà mình chi 28 triệu — năm nay
-- bắt đầu chuẩn bị từ tháng 11."
--
-- Không code tính năng mới, chỉ là dữ liệu cũ được dùng lại đúng lúc. Nhưng
-- LỊCH SỬ KHÔNG BACKFILL ĐƯỢC: phải ghi từ ngày đầu cho MỌI household, kể cả
-- free. Paywall đặt ở chỗ ĐỌC dữ liệu quá 12 tháng, không ở chỗ ghi.
--
-- occurred_on do cron ghi (cùng lượt refresh-lunar-dates, khi mốc trôi qua).
-- actual_cost do người dùng điền, hỏi MỘT LẦN và bỏ qua được.

create table event_occurrences (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  household_id  uuid not null references households(id) on delete cascade,

  occurred_on   date not null,
  actual_cost   numeric(14,2),
  notes         text,

  -- true sau khi đã hỏi, dù người dùng có trả lời hay không.
  -- Hỏi lại lần hai về một chuyện đã qua là phiền, không phải chu đáo.
  cost_asked    boolean not null default false,

  created_at    timestamptz not null default now(),

  unique (event_id, occurred_on)
);

create index event_occurrences_lookup_idx
  on event_occurrences (household_id, event_id, occurred_on desc);
create index event_occurrences_unasked_idx
  on event_occurrences (household_id) where cost_asked = false;

comment on table event_occurrences is
  'NƠI DUY NHẤT app hỏi về một con số đã qua, và nó tồn tại chỉ để nuôi trí '
  'nhớ năm sau. Không dùng cho bất kỳ phép tổng hợp chi tiêu nào.';

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

  -- NGÀY KHAI, không phải ngày đo. current_value là thứ MỘT NGƯỜI ĐÃ NÓI RA
  -- TẠI MỘT THỜI ĐIỂM, không phải sự thật hiện tại. Nếu UI hiển thị trần trụi,
  -- hai người sẽ cùng tin vào một thứ có thể đã sai — tệ hơn không có app, vì
  -- trước đây ít nhất họ biết là mình không biết.
  -- Mọi UI hiện current_value PHẢI hiện kèm hai cột này qua formatDeclaredAt().
  as_of_date        date not null default current_date,
  updated_by_member_id uuid references members(id) on delete set null,

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
--
-- MỤC TIÊU NHÌN VỀ PHÍA TRƯỚC, cùng hướng với trái tim sản phẩm: "cần 800tr,
-- đang có 320tr" là một câu về tương lai, không cần giả định đã-ghi-đủ nào.
--
-- BA RANH GIỚI (08 §2.3, ranh giới 1 đổi CƠ CHẾ ở 10 §5):
--   1. Mục tiêu KHÔNG BAO GIỜ được cộng vào con số "cần chuẩn bị". Nghĩa vụ
--      khác nguyện vọng: học phí tháng 9 là thứ PHẢI trả, góp quỹ mua nhà là
--      thứ MUỐN làm. Trộn hai loại vào MỘT CON SỐ làm nó mất nghĩa.
--
--      Từ v3, goals CÓ trong upcoming_needs, mang kind='optional', để hiện
--      CÙNG MÀN HÌNH với nghĩa vụ ở một khối riêng «có thể hoãn». Nguyên tắc
--      không đổi — chỗ ép đổi: từ "view không union goals" sang "projectRunway
--      chỉ cộng kind='mandatory'". CÙNG MÀN HÌNH KHÔNG PHẢI CÙNG MỘT CON SỐ.
--   2. Không có tiến độ theo thời gian, không có lời khuyên. Không "mỗi tháng
--      cần góp 20 triệu", không "bạn đang chậm kế hoạch". App không biết thu
--      nhập, không biết hoàn cảnh; một lời nhắc như thế với cặp đang chật vật
--      là sự tàn nhẫn được tự động hoá. Chỉ hiện: đã có / mục tiêu / còn thiếu.
--   3. Không có đóng góp theo người. "Anh góp 200tr, em góp 120tr" là bảng
--      điểm ở dạng TRÔNG GIỐNG MINH BẠCH — và vì thế là dạng nguy hiểm nhất.

create table goals (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,

  name              text not null,             -- "Mua nhà", "Quỹ dự phòng"
  target_amount     numeric(14,2) not null check (target_amount > 0),

  -- SỐ KHAI, y hệt assets.current_value. Chịu cùng ràng buộc nhãn thời gian.
  current_amount    numeric(14,2) not null default 0,
  as_of_date        date not null default current_date,
  updated_by_member_id uuid references members(id) on delete set null,

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
-- 5.4b. FUNDS — QUỸ CHUNG  (v3 §7.6)
-- -----------------------------------------------------------------------------
-- Tiền nhà, ăn uống, điện nước của cặp ở riêng. Đáng theo dõi vì TẦN SUẤT NHẬP
-- CỰC THẤP: 2-4 lần một tháng, không phải 200 — nên nó không kéo sản phẩm về
-- phía app thu chi.
--
-- ĐÂY LÀ CHỖ DUY NHẤT TRONG TOÀN SCHEMA GHI TÊN NGƯỜI CẠNH MỘT SỐ TIỀN VÀ ĐƯỢC
-- PHÉP CỘNG THEO NGƯỜI. Ngoại lệ đó có ranh giới cứng, xem view
-- fund_month_contributors bên dưới và 03 §9 ngoại lệ 2.
--
-- Vì sao ở đây được mà chi tiêu vặt thì không: nạp quỹ là chuyển khoản rời rạc,
-- đối chiếu được với sao kê — không ai quên mình vừa chuyển 10 triệu. Chi tiêu
-- vặt thì dễ ghi thiếu, và gán tên vào một dữ liệu không đầy đủ là gán sai.

create table funds (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,

  name                 text not null,          -- "Quỹ sinh hoạt"

  -- SỐ DẪN XUẤT, không phải số khai. Chỉ record_fund_entry() và
  -- delete_fund_entry() ghi. Client KHÔNG BAO GIỜ update trực tiếp.
  current_amount       numeric(14,2) not null default 0,

  -- "GHI LẦN CUỐI", không phải "khai lần cuối". Khác assets.as_of_date: số dư
  -- quỹ là TỔNG CỦA NHỮNG KHOẢN ĐÃ GHI, không phải một con số ai đó nói ra.
  -- Câu chữ nhãn thời gian trên UI phải phản ánh đúng khác biệt này.
  as_of_date           date not null default current_date,
  updated_by_member_id uuid references members(id) on delete set null,

  is_archived          boolean not null default false,

  created_by           uuid not null references profiles(id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index funds_household_idx on funds (household_id)
  where deleted_at is null and is_archived = false;

-- XOÁ MỀM, KHÔNG PHẢI APPEND-ONLY — cố ý khác money_events.
--
-- Gõ nhầm số tiền một khoản nạp phải sửa được. Nếu append-only thì phải ghi một
-- dòng âm bù trừ, và một quỹ hiện "+5.000.000 rồi −5.000.000 (sửa nhầm)" đúng là
-- thứ sổ-nợ-hoá mà cả module này tránh. Bảo đảm append-only nằm ở tầng trên:
-- money_events vẫn ghi mọi biến động của quỹ.
create table fund_entries (
  id                    uuid primary key default gen_random_uuid(),
  fund_id               uuid not null references funds(id) on delete cascade,
  household_id          uuid not null references households(id) on delete cascade,

  kind                  fund_entry_kind not null,
  amount                numeric(14,2) not null check (amount > 0),
  occurred_on           date not null default current_date,

  -- Bắt buộc khi rút: rút mà không ghi để làm gì thì tháng sau không ai nhớ.
  purpose               text,

  -- TÊN, KHÔNG PHẢI KHOÁ NGOẠI. Người bỏ tiền vào quỹ không nhất thiết là
  -- thành viên household: bố mẹ đưa, em ruột góp. Ép FK ở đây là ép người dùng
  -- tạo một member giả cho mỗi người từng đưa tiền.
  contributor_name      text,

  -- CHỈ để điền sẵn ô nhập trên UI. KHÔNG BAO GIỜ là khoá gom nhóm — mọi phép
  -- gom theo người phải gom theo contributor_name, và phải có month đi kèm.
  contributor_member_id uuid references members(id) on delete set null,

  note                  text,

  created_by            uuid not null references profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint fund_entries_withdrawal_purpose check (
    kind = 'deposit' or (purpose is not null and btrim(purpose) <> '')
  )
);

create index fund_entries_month_idx
  on fund_entries (household_id, fund_id, occurred_on desc)
  where deleted_at is null;


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

  -- BẪY: constraint này khoá cứng danh sách, tách rời khỏi enum. Thêm một loại
  -- thực thể tiền mới phải sửa CẢ HAI — quên constraint thì migration báo thành
  -- công và lần ghi đầu tiên của loại đó mới nổ.
  constraint money_events_entity_scope check (
    entity_type in ('asset', 'debt', 'goal', 'upcoming_payment', 'fund')
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
-- ĐỔI VAI Ở v2: đây KHÔNG còn là vòng lặp thói quen. Nghi thức cập nhật định
-- kỳ đã bị bỏ — đó là nghi thức kế toán, mà chỉ người dùng mới quyết được
-- khoản nào đáng ghi (concept v2 §7.6). Người dùng KHÔNG BAO GIỜ nhìn thấy
-- hành động tạo snapshot.
--
-- Giờ nó là LỊCH SỬ DẪN XUẤT do cron ghi hằng tháng, phục vụ trí nhớ năm
-- ngoái. Thay cho nhắc định kỳ: nhãn thời gian trên mọi số khai + hỏi theo
-- ngữ cảnh (shouldAskForRefresh, 03 §1b).

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
  note                  text,

  -- Luôn null ở v2: snapshot do cron ghi, không có người tạo.
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
-- 7. INGEST DRAFTS — NHẬP LIỆU BẰNG AI
-- =============================================================================
-- NÚT THẮT SỐNG CÒN. Thông tin sinh ra ở Zalo và ở ảnh chụp giấy tờ; app nằm
-- ở HẠ NGUỒN. Nếu phải mở app gõ tay thì dữ liệu không vào, và mọi module đều
-- rỗng — kể cả những module đã build xong.
--
-- Vì AI tốn chi phí thật để chạy, đây cũng là PAYWALL TỰ NHIÊN VÀ DỄ HIỂU:
-- người dùng hiểu ngay tại sao phải trả. Free 5 lần/tháng để cảm nhận được
-- giá trị trước khi bị chặn.

create table ingest_drafts (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,
  created_by           uuid not null references profiles(id) on delete cascade,

  source               ingest_source not null,
  raw_text             text,
  image_path           text,

  suggested_entity_type entity_type,
  parsed               jsonb,

  status               ingest_status not null default 'pending',
  created_entity_id    uuid,

  created_at           timestamptz not null default now(),
  -- Nháp chưa xác nhận tự dọn sau 7 ngày.
  expires_at           timestamptz not null default (now() + interval '7 days')
);

create index ingest_pending_idx on ingest_drafts (household_id, created_at desc)
  where status = 'pending';
-- Đếm quota free 5 lần/tháng.
create index ingest_quota_idx on ingest_drafts (household_id, created_at);

comment on column ingest_drafts.parsed is
  'Output của AI. KHÔNG ĐƯỢC TIN: phải chạy qua zod schema của entity tương '
  'ứng ở client trước khi đổ vào form, và NGƯỜI DÙNG LUÔN XÁC NHẬN trước khi '
  'ghi. Không bao giờ tự tạo bản ghi từ AI — một ngày giỗ sai do AI đoán sẽ '
  'phá niềm tin ở đúng tính năng khác biệt nhất.';


-- =============================================================================
-- 7b. SỔ HIẾU HỈ
-- =============================================================================
-- Nỗi đau: nhà chú Ba mừng đám cưới mình 2 triệu năm 2023; giờ con chú Ba
-- cưới, mình đi bao nhiêu? Đi thiếu thì mất mặt, đi thừa thì tiếc, và KHÔNG
-- AI NHỚ NỔI. Hiện thông tin này nằm trong một quyển sổ giấy cất đâu đó, hoặc
-- trong trí nhớ của mẹ.
--
-- Đây là module DUY NHẤT ghi dữ liệu về người ngoài household. Mọi ràng buộc
-- dưới đây bắt nguồn từ chỗ đó.

-- contacts KHÔNG PHẢI members: không tài khoản, không thông báo, không thấy
-- dữ liệu. CỐ Ý THIẾU TRƯỜNG: không phone, không địa chỉ, không ảnh, không
-- ngày sinh, không nhóm. Đây không phải app danh bạ.
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,

  display_name  text not null,
  -- Chữ tự do: "chú ruột bên nội", "bạn cấp 3 của vợ". Không enum hoá quan hệ
  -- họ hàng VN — quá nhiều nhánh, và người dùng tự mô tả nhanh hơn chọn.
  relation_note text,
  side          contact_side not null default 'other',

  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index contacts_household_idx on contacts (household_id)
  where deleted_at is null;
create index contacts_name_trgm_idx on contacts
  using gin (display_name gin_trgm_ops);


create table gift_entries (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,

  direction     gift_direction not null,   -- received = nhà mình nhận
  occasion      gift_occasion  not null default 'wedding',
  amount        numeric(14,2) not null check (amount >= 0),
  occurred_on   date not null,

  -- Ngữ cảnh (nguyên tắc 10.6): gắn với sự kiện trong app nếu có.
  event_id      uuid references events(id) on delete set null,
  -- Quà không phải tiền: "một cây vàng", "bộ ấm chén". amount = 0 khi đó.
  in_kind_note  text,
  notes         text,

  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index gift_entries_household_idx
  on gift_entries (household_id, occurred_on desc) where deleted_at is null;
-- Index cho vòng lặp quan trọng nhất: "nhà này đã mừng mình bao nhiêu?"
create index gift_entries_lookup_idx
  on gift_entries (household_id, contact_id, direction, occurred_on desc)
  where deleted_at is null;
create index gift_entries_event_idx
  on gift_entries (event_id) where event_id is not null;

comment on table gift_entries is
  'Hai chiều SONG SONG, KHÔNG BAO GIỜ TRỪ NHAU. Dữ liệu đủ để tính "nhà này '
  'mình còn đi thiếu 500k" — và đó chính là lý do phải nói rõ là không tính: '
  'nó biến quan hệ họ hàng thành sổ nợ. App hiện hai chiều, người dùng tự cân.';


-- =============================================================================
-- 7c. HỒ SƠ CON
-- =============================================================================
-- Nhóm dữ liệu DUY NHẤT có tần suất cao và cảm xúc cao cùng lúc trong ba năm
-- đầu. Và khác mọi module khác: LỊCH TIÊM KHÔNG CHỜ AI CẢ — quên một mũi là
-- hậu quả thật, không phải bất tiện.
--
-- Con đã tồn tại trong members với role='child', profile_id = null.
-- Các bảng dưới treo vào member đó, không tạo thực thể người mới.

-- DỮ LIỆU THAM CHIẾU, không phải dữ liệu người dùng.
--
-- ĐIỀU KIỆN CHẶN PHÁT HÀNH: file seed phải được một người có chuyên môn y tế
-- đọc và xác nhận. KHÔNG seed từ trí nhớ, KHÔNG seed từ output của mô hình
-- ngôn ngữ, KHÔNG seed từ blog. Nguồn phải là văn bản chính thức (Chương
-- trình Tiêm chủng mở rộng, Bộ Y tế) và ba cột source_* phải điền thật.
-- Sai một mũi hoặc sai một mốc tuổi là gây hại thật.
create table vaccine_schedule_items (
  code            text primary key,          -- 'BCG', 'DPT-VGB-Hib_1', …
  display_name    text not null,
  dose_label      text,                      -- 'mũi 1', 'nhắc lại'
  due_age_months  numeric(5,2) not null,     -- mốc tuổi kể từ ngày sinh
  sort_order      smallint not null,

  -- Truy vết nguồn. Không có ba cột này thì không được ship.
  source_name     text not null,
  source_date     date not null,
  schedule_version text not null,

  is_active       boolean not null default true
);


create table child_vaccine_doses (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,

  schedule_code  text references vaccine_schedule_items(code) on delete set null,
  -- Mũi ngoài lịch (dịch vụ, tiêm bù). Khi đó schedule_code = null.
  custom_name    text,

  due_date       date,                       -- birthday + due_age_months
  status         dose_status not null default 'planned',
  administered_on date,
  facility       text,
  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint dose_has_name check (schedule_code is not null or custom_name is not null),
  constraint dose_done_has_date check (status <> 'done' or administered_on is not null),
  unique (member_id, schedule_code)
);

create index child_doses_upcoming_idx
  on child_vaccine_doses (household_id, due_date)
  where deleted_at is null and status <> 'done';
create index child_doses_member_idx
  on child_vaccine_doses (member_id, due_date) where deleted_at is null;

comment on column child_vaccine_doses.status is
  'KHÔNG CÓ trạng thái "bỏ" hay "hoãn". App không bao giờ gợi ý hoãn, bỏ, hay '
  'đổi thứ tự mũi tiêm. Mũi trễ hiện là "quá lịch" kèm gợi ý liên hệ cơ sở '
  'tiêm, không dùng chữ trách móc.';


create table child_growth_records (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,

  measured_on   date not null,
  height_cm     numeric(5,1),
  weight_kg     numeric(5,2),
  notes         text,

  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  unique (member_id, measured_on)
);

create index child_growth_idx
  on child_growth_records (member_id, measured_on desc) where deleted_at is null;

comment on table child_growth_records is
  'CỐ Ý KHÔNG có cột bách phân vị, z-score, hay đánh giá. App GHI VÀ VẼ, KHÔNG '
  'DIỄN GIẢI. Bố mẹ mới rất dễ lo lắng, và một nhãn đỏ do app tự tính sẽ gây '
  'hoảng mà không giúp được gì. Việc đánh giá thuộc về bác sĩ.';


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
  -- Người dùng đã hành động (mở, tạo việc gia hạn, ghi khoản chi).
  -- Đánh dấu cột mốc trial (household đã trải qua ít nhất một lần nhắc hạn
  -- được xác nhận). Cũng để không nhắc lại cùng một hạn.
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now()
);

create index reminders_pending_idx on reminders (household_id, fire_at)
  where sent_at is null and dismissed_at is null;
create index reminders_entity_idx on reminders (entity_type, entity_id);
create index reminders_acked_idx on reminders (household_id, acknowledged_at)
  where acknowledged_at is not null;

-- QUY TẮC NGƯỜI NHẬN — BẤT BIẾN (03 §5):
--   việc có assignee_id  -> nhắc CHỈ người đó
--   việc không gán ai    -> nhắc cả hai
--   sự kiện/giấy tờ/tiền -> nhắc cả hai (là việc của nhà)
--   shopping_items       -> KHÔNG BAO GIỜ nhắc
--
-- KHÔNG BAO GIỜ tồn tại thông báo dạng "X chưa làm Y". App nhắc người có tên
-- bao nhiêu lần cũng được — đó chính là giá trị: người kia khỏi phải nhắc.
-- Nhưng khoảnh khắc app báo cho người thứ hai rằng người thứ nhất chưa làm,
-- nó thôi thay việc nhắc và bắt đầu thay LỜI TỐ.


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
    'upcoming_payments','goals','funds','documents',
    'contacts','gift_entries','child_vaccine_doses'
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
alter table funds                 enable row level security;
alter table fund_entries          enable row level security;
alter table money_events          enable row level security;
alter table attention_items       enable row level security;
alter table money_snapshots       enable row level security;
alter table documents             enable row level security;
alter table document_files        enable row level security;
alter table reminders             enable row level security;
alter table shopping_items        enable row level security;
alter table event_occurrences     enable row level security;
alter table ingest_drafts         enable row level security;
alter table contacts              enable row level security;
alter table gift_entries          enable row level security;
alter table child_vaccine_doses   enable row level security;
alter table child_growth_records  enable row level security;
alter table vaccine_schedule_items enable row level security;

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
    'assets','debts','upcoming_payments','goals','funds','fund_entries',
    'money_events','attention_items','money_snapshots',
    'documents','document_files',
    'reminders',
    'shopping_items','event_occurrences','ingest_drafts',
    'contacts','gift_entries','child_vaccine_doses','child_growth_records'
  ] loop
    execute format($f$
      create policy %1$s_household on %1$s
        for all to authenticated
        using (is_household_member(household_id))
        with check (is_household_member(household_id));
    $f$, t);
  end loop;
end $$;

-- Dữ liệu tham chiếu: ai đăng nhập cũng đọc được, không ai ghi được từ client.
-- Chỉ service role (migration / seed script) mới ghi.
create policy vaccine_schedule_read on vaccine_schedule_items
  for select to authenticated using (true);

-- LƯU Ý: Dù có RLS, client PHẢI luôn filter `where household_id = ?` tường
-- minh. RLS là lưới an toàn thứ hai — không phải tầng phân quyền duy nhất.
-- Nhờ vậy mọi query vẫn đúng khi chuyển sang API server tự viết.


-- =============================================================================
-- 11. VIEW CHO MÀN HÌNH "NHÀ MÌNH"
-- =============================================================================
-- Một query duy nhất cho toàn bộ dashboard, union 4 nguồn.
-- Client filter theo household_id + khoảng ngày.
--
-- shopping_items CỐ Ý KHÔNG nằm trong view này: nó không có ngày, nên sẽ phá
-- cách nhóm theo ngày của cả feed. Card CẦN MUA trên Nhà mình query thẳng
-- shopping_items (count + 3 mục đầu). Đây là card DUY NHẤT được hiện cả khi
-- mọi nhóm khác rỗng — nó là bề mặt hằng ngày, và là lý do app được mở khi
-- không có sự kiện nào.

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
    -- Ngày khai gần nhất CỦA RIÊNG nhóm "dùng ngay" — đây là con số mà màn
    -- hình Sắp tới dựa vào, nên nhãn thời gian phải theo đúng nhóm này.
    (select max(as_of_date) from assets a
      where a.household_id = h.id and a.deleted_at is null
        and a.is_closed = false and a.liquidity = 'usable_now')     as last_usable_updated_on,
    (select max(as_of_date) from assets a
      where a.household_id = h.id and a.deleted_at is null)         as last_updated_on,
    h.record_threshold_amount,
    h.currency
  from households h
  where h.deleted_at is null;

-- ĐÃ BỎ snapshot_interval_days và last_snapshot_on: computeFinanceStatus không
-- còn dùng độ mới dữ liệu để đổi trạng thái. Một chấm vàng vì "bạn chưa cập
-- nhật" là một LỜI THÚC — và KHÔNG BIẾT TÌNH HÌNH khác với TÌNH HÌNH KHÔNG ỔN.
-- Độ mới giờ là một nhãn riêng (computeFreshness), chỉ đổi văn bản.
--
-- Lưu ý: money_snapshots.status VẪN lưu giá trị trạng thái. Đó là ảnh chụp
-- lịch sử, cần đúng bối cảnh thời điểm đó — Edge ghi vào khi tạo snapshot.


-- -----------------------------------------------------------------------------
-- 11c. UPCOMING NEEDS — nguồn của màn hình "Sắp tới nhà mình cần bao nhiêu"
-- -----------------------------------------------------------------------------
-- TRÁI TIM SẢN PHẨM. Đây là thứ DUY NHẤT mà Zalo, Calendar, Sheet và Drive
-- cộng lại vẫn không làm được, vì nó cần đồng thời bốn nguồn: tài sản + sự
-- kiện + chi phí dự kiến + hạn giấy tờ.
--
-- LỖI ĐÃ SỬA: trước đây finance_metrics.due_next_30d CHỈ cộng upcoming_payments.
-- Giỗ 3tr, cưới 2tr, gia hạn bảo hiểm 12tr đều không bao giờ được tính — trong
-- khi đó chính là thứ màn hình chính phải trả lời.
--
-- SQL chỉ gom số. Dự tính (projectRunway) tính ở packages/domain: nó là chính
-- sách sản phẩm sẽ đổi nhiều lần — cùng lý do với computeFinanceStatus.

create or replace view upcoming_needs as
  select
    'upcoming_payment'::entity_type          as source,
    'mandatory'::need_kind                   as kind,
    p.id,
    p.household_id,
    p.name                                   as title,
    coalesce(p.due_date, p.due_month)        as on_date,
    p.amount
  from upcoming_payments p
  where p.deleted_at is null
    and p.state = 'unpaid'
    and coalesce(p.due_date, p.due_month) is not null

  union all

  select 'event', 'mandatory', e.id, e.household_id, e.title,
         e.next_occurrence_date, e.estimated_cost
  from events e
  where e.deleted_at is null
    and e.next_occurrence_date is not null
    and e.estimated_cost is not null
    and e.estimated_cost > 0

  union all

  select 'document', 'mandatory', d.id, d.household_id, d.title,
         d.expiry_date, d.renewal_cost
  from documents d
  where d.deleted_at is null
    and d.expiry_date is not null
    and d.renewal_cost is not null
    and d.renewal_cost > 0

  union all

  -- ĐỔI Ở v3 (10 §5): goals GIỜ CÓ trong view này, mang kind='optional'.
  --
  -- Bản trước loại hẳn goals ra, để bảo vệ nguyên tắc "không trộn nghĩa vụ với
  -- nguyện vọng vào một con số". Nguyên tắc đó KHÔNG ĐỔI — chỉ cơ chế đổi: thay
  -- vì loại khỏi view, giờ tách bằng cột kind, và projectRunway CHỈ CỘNG
  -- 'mandatory'.
  --
  -- Vì sao đổi: hai người cần thấy tháng 9 đóng học phí xong thì quỹ du lịch
  -- phải chậm lại. Cùng màn hình KHÔNG PHẢI cùng một con số.
  --
  -- Ai đọc view này mà cộng tất cả các dòng lại là đang phá đúng nguyên tắc mà
  -- cột kind sinh ra để giữ.
  select 'goal', 'optional', g.id, g.household_id, g.name,
         g.target_date, greatest(g.target_amount - g.current_amount, 0)
  from goals g
  where g.deleted_at is null
    and g.is_archived = false
    and g.target_date is not null
    and g.target_amount > g.current_amount;


-- -----------------------------------------------------------------------------
-- 11d. MONEY HISTORY — lịch sử biến động tài sản
-- -----------------------------------------------------------------------------
-- ĐƯỜNG PHÂN GIỚI CỦA CẢ MỤC NÀY:
--   LIỆT KÊ thì trung thực khi dữ liệu thiếu. CỘNG TỔNG thì không.
--
--   "Sửa xe −2.000.000 ₫ · 15/9" vẫn đúng dù nhà mình còn mười khoản chưa ghi.
--   Nó không tự nhận là đầy đủ.
--   "Tháng 9 chi 12 triệu" thì TỰ NHẬN là đầy đủ, và sẽ sai 30-40% mãi mãi.
--
-- Niềm tin của người không giữ tiền đến từ việc THẤY ĐƯỢC THAY ĐỔI, không phải
-- từ con số hiện tại. Đó là lý do view này tồn tại.

create or replace view money_history as
  select
    me.id,
    me.household_id,
    me.entity_type,
    me.entity_id,
    me.event_type,
    me.value_before,
    me.value_after,
    me.delta,
    me.occurred_on,
    me.note,
    me.actor_profile_id,
    -- Giữ created_at để view thay được money_events ở MỌI chỗ đọc, không chỉ ở
    -- màn lịch sử: thiếu nó thì repository phải đọc hai nguồn và mapper phải có
    -- hai đường. occurred_on là ngày NGƯỜI DÙNG khai, created_at là lúc máy ghi.
    me.created_at,
    -- coalesce vì entity có thể đã xoá mềm — money_events là append-only nên
    -- dòng lịch sử vẫn còn và vẫn phải đọc được.
    coalesce(a.name, d.name, g.name, p.name, f.name, '(đã xoá)') as entity_title,
    m.display_name                                               as actor_display_name
  from money_events me
  left join assets            a on me.entity_type = 'asset'            and a.id = me.entity_id
  left join debts             d on me.entity_type = 'debt'             and d.id = me.entity_id
  left join goals             g on me.entity_type = 'goal'             and g.id = me.entity_id
  left join upcoming_payments p on me.entity_type = 'upcoming_payment' and p.id = me.entity_id
  -- Thiếu nhánh này thì mọi biến động quỹ hiện ra là '(đã xoá)'.
  left join funds             f on me.entity_type = 'fund'             and f.id = me.entity_id
  left join members           m on m.household_id = me.household_id
                               and m.profile_id  = me.actor_profile_id
                               and m.deleted_at is null;

comment on view money_history is
  'CHỈ ĐƯỢC HIỂN THỊ DẠNG DANH SÁCH. Cấm vẽ tổng theo tháng thành đường xu '
  'hướng: khoảng trống trong việc ghi chép sẽ trông y hệt thay đổi trong chi '
  'tiêu — tháng nào hai người bận và quên ghi sẽ hiện ra như một tháng tiết '
  'kiệm, và app vừa nói dối một cách rất thuyết phục. Danh sách không có vấn '
  'đề đó vì không ai nhìn một danh sách rồi kết luận nó đầy đủ.';

-- CỐ Ý KHÔNG TẠO — nếu thấy trong PR thì reject:
--   view tổng hợp theo tháng · view phân loại theo danh mục
--   view group by actor_profile_id hoặc member_id
-- Tổng của một kỳ ĐƯỢC PHÉP nhưng tính ở client và bắt buộc kèm số lượng bản
-- ghi + chữ "đã ghi" ("Tháng 9 · 5 khoản nhà mình đã ghi · −12.000.000 ₫"),
-- nên nó không thuộc về SQL.


-- -----------------------------------------------------------------------------
-- 11d-bis. QUỸ CHUNG — HAI VIEW, CẢ HAI GOM THEO THÁNG
-- -----------------------------------------------------------------------------
-- ĐÂY LÀ TẦNG THỨ NHẤT trong ba tầng ép ranh giới một-tháng của 03 §9 ngoại lệ
-- 2. Hai tầng còn lại: chữ ký hàm domain (summarizeFundMonth nhận month bắt
-- buộc) và prop bắt buộc của contributor-block.tsx.
--
-- Ba tầng độc lập nhau là có chủ ý: phá được một tầng vẫn còn hai tầng chặn.
-- Một lệnh cấm chỉ nằm trong tài liệu sẽ bị vi phạm bởi người không đọc tài liệu.

create or replace view fund_month_summary as
  select
    fe.household_id,
    fe.fund_id,
    date_trunc('month', fe.occurred_on)::date as month,
    sum(case when fe.kind = 'deposit'    then fe.amount else 0 end) as deposits,
    sum(case when fe.kind = 'withdrawal' then fe.amount else 0 end) as withdrawals,
    sum(case when fe.kind = 'deposit'    then fe.amount else -fe.amount end) as net,
    count(*) as entry_count
  from fund_entries fe
  where fe.deleted_at is null
  group by 1, 2, 3;

comment on view fund_month_summary is
  'entry_count là BẮT BUỘC ở mọi chỗ hiển thị: một con số tổng không kèm số '
  'lượng bản ghi thì tự nhận là đầy đủ. Cùng luật với groupHistoryByMonth.';

-- TỔNG THEO NGƯỜI — ngoại lệ duy nhất của lệnh cấm "tổng tiền theo người".
--
-- `month` NẰM TRONG GROUP BY, và KHÔNG TỒN TẠI view nào gom theo người mà thiếu
-- nó. Đó không phải lựa chọn thẩm mỹ — đó là chỗ ranh giới được ép ở tầng dữ
-- liệu, để không ai viết được một câu truy vấn cộng dồn mà không tự tay bỏ
-- month ra khỏi group by (lúc đó thì đã là cố ý, không còn là sơ ý).
--
-- VÌ SAO NGOẠI LỆ NÀY AN TOÀN CÒN VỚI TÀI SẢN THÌ KHÔNG:
--   "Tháng này anh bỏ 5tr, em bỏ 5tr"      -> câu GHI CHÉP. Đóng lại cuối tháng.
--   "Tính tới nay anh 180tr, em 60tr"      -> câu PHÁN XÉT. Không bao giờ đóng.
-- Cùng dữ liệu, khác hoàn toàn về việc nó dùng để làm gì. Giữa vợ chồng không
-- có cơ chế tất toán nào để xoá một con số cộng dồn, và đến lúc nào đó nó sẽ
-- được đem ra dùng. Đó là khác biệt giữa một cuốn sổ và một bản cáo trạng.
--
-- CHỈ 'deposit': rút tiền khỏi quỹ không hỏi ai rút — tiền đã vào quỹ là tiền
-- chung, và ghi tên người rút là mở đúng cánh cửa vừa đóng ở trên.
create or replace view fund_month_contributors as
  select
    fe.household_id,
    fe.fund_id,
    date_trunc('month', fe.occurred_on)::date          as month,
    coalesce(nullif(btrim(fe.contributor_name), ''), '(không ghi tên)')
                                                       as contributor_name,
    sum(fe.amount) as total,
    count(*)       as entry_count
  from fund_entries fe
  where fe.deleted_at is null
    and fe.kind = 'deposit'
  group by 1, 2, 3, 4;

comment on view fund_month_contributors is
  'NGOẠI LỆ CÓ ĐIỀU KIỆN của lệnh cấm "tổng tiền theo người" — xem 03 §9 ngoại '
  'lệ 2. Chỉ hợp lệ trong phạm vi MỘT THÁNG, chỉ ở màn hình quỹ, bắt buộc kèm '
  'entry_count, và sắp THEO TÊN ABC chứ không theo số tiền (sắp theo tiền là '
  'một bảng xếp hạng, và xếp hạng hai vợ chồng là thứ cả spec này tránh). '
  'PHÉP THỬ KHI REVIEW: con số này có vắt qua nhiều hơn một tháng không? '
  'Có -> sai.';

-- CỐ Ý KHÔNG TẠO — nếu thấy trong PR thì reject:
--   view tổng theo người KHÔNG có month trong group by
--   view số dư quỹ theo thời gian (đường xu hướng)
--   view "ai còn thiếu bao nhiêu" dưới bất kỳ tên nào


-- -----------------------------------------------------------------------------
-- 11e. GIFT HISTORY — nguồn của dòng gợi ý sổ hiếu hỉ
-- -----------------------------------------------------------------------------
-- Toàn bộ lý do module sổ hiếu hỉ tồn tại nằm ở đây: khi tạo khoản mừng cho
-- nhà nào, app nói được nhà đó đã mừng mình bao nhiêu, khi nào. Không có dòng
-- gợi ý đó thì đây chỉ là một cái Excel có màu.
--
-- CỐ Ý KHÔNG CÓ CỘT CHÊNH LỆCH. Dữ liệu đủ để tính "nhà này mình còn đi thiếu
-- 500k" — và đó chính là lý do phải nói rõ là không tính.

create or replace view gift_history as
  select
    c.id                as contact_id,
    c.household_id,
    c.display_name,
    c.side,
    count(*) filter (where g.direction = 'received')            as times_received,
    count(*) filter (where g.direction = 'given')               as times_given,
    coalesce(sum(g.amount) filter (where g.direction = 'received'), 0)
                                                                as total_received,
    coalesce(sum(g.amount) filter (where g.direction = 'given'), 0)
                                                                as total_given,
    max(g.occurred_on) filter (where g.direction = 'received')  as last_received_on,
    max(g.occurred_on) filter (where g.direction = 'given')     as last_given_on
  from contacts c
  left join gift_entries g
    on g.contact_id = c.id and g.deleted_at is null
  where c.deleted_at is null
  group by c.id, c.household_id, c.display_name, c.side;


-- -----------------------------------------------------------------------------
-- (11f đã bỏ) — VALUE SAVED
-- -----------------------------------------------------------------------------
-- Card "app đã nhắc bạn 6 hạn, tổng giá trị 47 triệu" ĐÃ BỊ BỎ.
--
-- Lý do không phải là nó yếu về marketing — mà là nó KHÔNG NHẤT QUÁN VỚI
-- CHÍNH SẢN PHẨM. Cả spec này được xây trên nguyên tắc không nói quá: số khai
-- phải kèm nhãn thời gian, dự tính phải ghi "theo những khoản đã ghi", tổng
-- phải kèm số lượng bản ghi. Câu "app đã cứu bạn 47 triệu" là một khẳng định
-- phản thực — không ai biết người dùng có tự nhớ hạn đó hay không — và nó
-- không kiểm chứng được bằng bất kỳ cách nào.
--
-- Đặt một con số không kiểm chứng được cạnh những con số được gắn nhãn cẩn
-- thận sẽ làm hỏng niềm tin vào cả hai.
--
-- Thêm nữa: 6 hạn/năm là quá thưa. Phần lớn thời gian card sẽ hiện "1 hạn"
-- hoặc không hiện gì.


-- View đọc gộp: tầng UI không cần biết tài chính nằm ở 4 bảng.
-- Dùng cho ô tìm kiếm, timeline chung và card "mọi thứ về tiền".
-- View kế thừa RLS của bảng gốc.
-- (Đặt sau khi tất cả view đã được tạo — xem cuối mục 11.)

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
declare v_old numeric; v_hh uuid; v_member uuid;
begin
  select current_value, household_id into v_old, v_hh
    from assets where id = p_asset_id and deleted_at is null for update;
  if not found then raise exception 'asset not found'; end if;

  select id into v_member from members
   where household_id = v_hh and profile_id = current_profile_id()
     and deleted_at is null;

  update assets
     set current_value        = p_value,
         as_of_date           = p_as_of,
         updated_by_member_id = v_member
   where id = p_asset_id;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_hh, 'asset', p_asset_id, 'value_updated',
          v_old, p_value, p_value - v_old, p_as_of, p_note, current_profile_id());
end $$;

-- Góp thêm vào mục tiêu. Cùng cơ học với update_asset_value.
create or replace function contribute_to_goal(
  p_goal_id uuid,
  p_amount  numeric,
  p_as_of   date default current_date,
  p_note    text default null
) returns void
language plpgsql security invoker as $$
declare v_old numeric; v_hh uuid; v_member uuid;
begin
  select current_amount, household_id into v_old, v_hh
    from goals where id = p_goal_id and deleted_at is null for update;
  if not found then raise exception 'goal not found'; end if;

  select id into v_member from members
   where household_id = v_hh and profile_id = current_profile_id()
     and deleted_at is null;

  update goals
     set current_amount       = v_old + p_amount,
         as_of_date           = p_as_of,
         updated_by_member_id = v_member
   where id = p_goal_id;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_hh, 'goal', p_goal_id, 'value_updated',
          v_old, v_old + p_amount, p_amount, p_as_of, p_note,
          current_profile_id());
end $$;

-- actor_profile_id trong money_events trả lời "AI KHAI CON SỐ NÀY" khi đọc
-- lịch sử CỦA MỘT KHOẢN. Nó KHÔNG BAO GIỜ được nhóm lại thành "anh góp bao
-- nhiêu, em góp bao nhiêu": đó là bảng điểm ở dạng TRÔNG GIỐNG MINH BẠCH
-- nhất, và vì thế là dạng nguy hiểm nhất.
--
-- LƯU Ý cho quỹ chung: fund_entries.contributor_name là một trục KHÁC HẲN
-- actor_profile_id. actor_profile_id = ai bấm nút trong app; contributor_name =
-- ai đưa tiền (có thể là bố mẹ, không phải member). Ngoại lệ 03 §9 chỉ cho gom
-- theo contributor_name kèm month — KHÔNG cho gom theo actor_profile_id ở bất
-- kỳ đâu, kể cả ở quỹ.


-- Ghi một khoản nạp/rút quỹ + cập nhật số dư + ghi lịch sử, nguyên tử.
create or replace function record_fund_entry(
  p_fund_id     uuid,
  p_kind        fund_entry_kind,
  p_amount      numeric,
  p_occurred_on date default current_date,
  p_purpose     text default null,
  p_contributor text default null,
  p_note        text default null
) returns uuid
language plpgsql security invoker as $$
declare v_old numeric; v_hh uuid; v_member uuid; v_new numeric; v_entry uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if p_kind = 'withdrawal' and coalesce(btrim(p_purpose), '') = '' then
    raise exception 'withdrawal needs a purpose';
  end if;

  select current_amount, household_id into v_old, v_hh
    from funds where id = p_fund_id and deleted_at is null for update;
  if not found then raise exception 'fund not found'; end if;

  select id into v_member from members
   where household_id = v_hh and profile_id = current_profile_id()
     and deleted_at is null;

  -- Kẹp ở 0 thay vì ném lỗi, cùng cách settle_payment kẹp remaining_amount:
  -- rút quá số dư là chuyện ghi chép lệch, không phải chuyện phải chặn người
  -- dùng lại giữa chừng.
  v_new := case when p_kind = 'deposit'
                then v_old + p_amount
                else greatest(v_old - p_amount, 0) end;

  insert into fund_entries (fund_id, household_id, kind, amount, occurred_on,
                            purpose, contributor_name, contributor_member_id,
                            note, created_by)
  values (p_fund_id, v_hh, p_kind, p_amount, p_occurred_on,
          nullif(btrim(p_purpose), ''), nullif(btrim(p_contributor), ''),
          -- Chỉ gợi ý prefill; KHÔNG dùng để gom nhóm.
          case when p_kind = 'deposit' then v_member end,
          p_note, current_profile_id())
  returning id into v_entry;

  update funds
     set current_amount       = v_new,
         as_of_date           = p_occurred_on,
         updated_by_member_id = v_member
   where id = p_fund_id;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_hh, 'fund', p_fund_id,
          case when p_kind = 'deposit' then 'contribution' else 'withdrawal' end,
          v_old, v_new, v_new - v_old, p_occurred_on,
          coalesce(nullif(btrim(p_purpose), ''), p_note),
          current_profile_id());

  return v_entry;
end $$;

-- Xoá mềm một khoản + TÍNH LẠI số dư từ các dòng còn sống.
--
-- Tính lại chứ không trừ đi: trừ dồn sẽ lệch sau bất kỳ lần ghi đồng thời nào,
-- và số dư quỹ là con số hai người nhìn vào để quyết có tiêu được không.
create or replace function delete_fund_entry(p_entry_id uuid)
returns void
language plpgsql security invoker as $$
declare v_old numeric; v_new numeric; v_hh uuid; v_fund uuid; v_member uuid;
begin
  select fund_id, household_id into v_fund, v_hh
    from fund_entries where id = p_entry_id and deleted_at is null;
  if not found then raise exception 'fund entry not found'; end if;

  select current_amount into v_old from funds where id = v_fund for update;

  update fund_entries set deleted_at = now() where id = p_entry_id;

  select coalesce(sum(case when kind = 'deposit' then amount else -amount end), 0)
    into v_new
    from fund_entries
   where fund_id = v_fund and deleted_at is null;
  v_new := greatest(v_new, 0);

  select id into v_member from members
   where household_id = v_hh and profile_id = current_profile_id()
     and deleted_at is null;

  update funds
     set current_amount = v_new, updated_by_member_id = v_member
   where id = v_fund;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_hh, 'fund', v_fund, 'value_updated',
          v_old, v_new, v_new - v_old, current_date,
          'xoá một khoản đã ghi', current_profile_id());
end $$;


-- =============================================================================
-- 12b. SECURITY INVOKER CHO VIEW
-- =============================================================================
-- View kế thừa RLS của bảng gốc thay vì chạy quyền owner.

do $$
declare v text;
begin
  foreach v in array array[
    'home_feed','finance_metrics','money_feed',
    'upcoming_needs','money_history','gift_history',
    'fund_month_summary','fund_month_contributors'
  ] loop
    execute format('alter view %I set (security_invoker = true)', v);
  end loop;
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
--   settle_payment(), update_asset_value(),
--   contribute_to_goal()                         -- RPC nguyên tử, không policy
--   views: home_feed, finance_metrics, money_feed,
--          upcoming_needs, money_history,
--          gift_history                          -- SQL làm việc SQL giỏi
--
-- RA EDGE FUNCTION (là chính sách — sẽ đổi nhiều lần, cần test/observability):
--   computeFinanceStatus()      -- module TS dùng chung, chạy cả ở CLIENT
--   computeFreshness()          -- nhãn độ mới, cũng dùng chung
--   projectRunway()             -- dự tính "sắp tới cần bao nhiêu"
--   refresh_lunar_dates         -- Postgres không biết lịch âm
--                                  + ghi event_occurrences khi mốc trôi qua
--   parse_capture               -- AI đọc ảnh chụp màn hình / ảnh giấy tờ
--                                  ĐÂY LÀ EDGE FUNCTION ĐẦU TIÊN NHẬN INPUT
--                                  NGƯỜI DÙNG -> chỗ đầu tiên cần validation
--                                  phía server
--   seed_vaccine_doses          -- sinh child_vaccine_doses từ birthday
--   purge_soft_deleted          -- phải gọi R2 API để xoá file thật
--   presign_upload              -- kiểm tra premium + quota + ký URL R2
--   spawn_debt_installments     -- sinh kỳ trả nợ tiếp theo
--   generate_task_instances     -- vật hoá việc lặp, cửa sổ 90 ngày
--   build_reminders             -- sinh nhắc nhở expiry / event / money / tiêm
--   autosnapshot_monthly        -- chốt snapshot cuối tháng (dẫn xuất)
--   sweep_shopping_done         -- ẩn mục đã tick quá 24h
--   check_trial_milestones      -- cột mốc kết thúc trial
--   revenuecat_webhook          -- đồng bộ entitlement về households
--
-- ĐÃ BỎ: nudge_snapshot_update. Không còn nhắc cập nhật định kỳ.
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
--  05:30  sweep-shopping-done       ẩn shopping_items đã tick quá 24h
--  05:45  mark-overdue-doses        child_vaccine_doses planned -> overdue
--  06:00  check-trial-milestones    cập nhật households.trial_milestones
--  06:15  sweep-ingest-drafts       xoá ingest_drafts pending quá expires_at
--  23:50  autosnapshot-monthly      ngày cuối tháng chốt 1 snapshot (dẫn xuất,
--                                   người dùng không thấy)
--
-- ĐÃ BỎ: 09:00 nudge-snapshot-update. Nhắc cập nhật theo lịch là nghi thức
-- kế toán — chỉ người dùng mới quyết được khoản nào đáng ghi. Thay bằng nhãn
-- thời gian + shouldAskForRefresh() hỏi theo ngữ cảnh.
--
-- =============================================================================
-- GHI CHÚ PHẠM VI MVP
-- =============================================================================
-- ĐÃ BỎ khỏi MVP (thêm lại khi có nhu cầu thật — đều là thay đổi additive):
--   event_checklist_items  checklist trong sự kiện
--   links                  quan hệ N:N tự do; MVP dùng FK, sự kiện là hub
--   activity_log           metrics đã có PostHog
--   subscription_events    RevenueCat đã giữ lịch sử webhook
--
-- (event_instances đã ĐƯỢC ĐƯA VÀO ở v2 dưới tên event_occurrences — nó là
--  nguồn của trí nhớ năm ngoái, và lịch sử không backfill được.)
--
-- GIỮ SCHEMA NHƯNG KHÔNG BUILD UI Ở MVP:
--   money_snapshots ghi từ ngày đầu; so sánh tháng là Phase 2
--   Lý do: lịch sử KHÔNG backfill được. Chi phí schema ~0, chi phí feature 0.
--   ĐỪNG XOÁ vì "MVP chưa dùng đến".
--
-- (money_events ĐÃ CÓ UI ở v2.1: money/history.tsx + khối LỊCH SỬ trong chi
--  tiết tài sản. Bản v2 cắt nhầm phần này — xem 08 §1.)


-- =============================================================================
-- DANH SÁCH CẤM — kiểm tra khi review PR
-- =============================================================================
-- Đây là RÀNG BUỘC SẢN PHẨM, không phải nợ kỹ thuật. Không thêm kể cả khi
-- người dùng yêu cầu, và kể cả khi dữ liệu đã có sẵn để tính.
--
--   Tổng tiền theo người                 -> công cụ kiểm soát; người giữ tiền
--                                           rời app ngay
--   Tỷ lệ hoàn thành việc theo người     -> bảng điểm giữa hai vợ chồng
--   Chuỗi ngày / điểm thưởng / huy hiệu  -> gamification việc nhà
--   Biểu đồ xu hướng chi tiêu theo tháng -> khoảng trống ghi chép trông y hệt
--                                           thay đổi chi tiêu
--   So sánh giữa các kỳ                  -> như trên
--   Phân loại chi tiêu theo danh mục     -> ranh giới với app thu chi
--   Đóng góp vào mục tiêu theo người     -> bảng điểm trông như minh bạch
--   Gợi ý "mỗi tháng cần góp bao nhiêu"  -> app không biết thu nhập
--   Chênh lệch đi/nhận theo contact      -> biến họ hàng thành sổ nợ
--   Xếp hạng contact theo số tiền        -> xếp hạng họ hàng theo độ hào phóng
--   Bách phân vị / đánh giá tăng trưởng  -> chẩn đoán y tế
--   So sánh giữa các con trong nhà       -> như trên
--   Trạng thái "bỏ / hoãn" cho mũi tiêm  -> gây hại thật
--   Tổng quỹ theo người, >1 tháng        -> sổ nợ vợ chồng dựng bằng dữ liệu
--                                           trung thực — xem ngoại lệ 2
--   "Ai còn thiếu bao nhiêu" ở quỹ       -> app phát ngôn thay một người
--   Xếp người bỏ vào quỹ theo số tiền    -> xếp hạng hai vợ chồng; sắp tên ABC
--   Đếm / so sánh sự kiện theo side      -> đếm thứ không ai chọn được (10.9)
--   Tỷ lệ hoàn thành theo danh sách việc -> bảng xếp hạng đội lốt phân loại
--
-- ĐƯỢC PHÉP CÓ ĐIỀU KIỆN — HAI NGOẠI LỆ, KHÔNG CÓ NGOẠI LỆ THỨ BA:
--
--   1. Tổng của những gì đã ghi trong một kỳ — bắt buộc kèm SỐ LƯỢNG BẢN GHI
--      và chữ "ĐÃ GHI", và không bao giờ được vẽ thành đường.
--
--   2. Tổng quỹ chung theo người đóng góp — CHỈ TRONG MỘT THÁNG, chỉ ở màn
--      hình quỹ, bắt buộc kèm số lượng bản ghi, sắp theo tên ABC.
--      PHÉP THỬ: con số này có vắt qua nhiều hơn một tháng không? Có -> cấm.
--      Ranh giới ép ở ba tầng độc lập: view (month trong group by), chữ ký hàm
--      domain (month bắt buộc), prop component (month bắt buộc).
--      Đầy đủ ở 03 §9 và 10 §3.
--
--
-- =============================================================================
-- ĐIỀU KIỆN CHẶN PHÁT HÀNH
-- =============================================================================
-- vaccine_schedule_items phải được seed từ một file có phiên bản, nguồn là
-- văn bản chính thức, và ĐƯỢC MỘT NGƯỜI CÓ CHUYÊN MÔN Y TẾ ĐỌC VÀ XÁC NHẬN
-- trước khi phát hành. Không seed từ trí nhớ, không từ mô hình ngôn ngữ,
-- không từ blog. Sai một mũi hoặc một mốc tuổi là gây hại thật.
