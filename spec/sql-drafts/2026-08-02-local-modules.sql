-- =============================================================================
-- Migration: hai module bản địa  (sổ mừng cưới + hồ sơ con)
-- =============================================================================
-- Chạy sau 2026-08-01-concept-v2.sql. Đọc 07-local-modules.md trước.
--
-- Hai module này khác bốn module lõi ở một điểm: CẢ HAI ĐỀU GHI DỮ LIỆU VỀ
-- NGƯỜI KHÁC — họ hàng, và con. Mọi ràng buộc dưới đây bắt nguồn từ chỗ đó.
-- =============================================================================

begin;

-- =============================================================================
-- 1. SỔ MỪNG CƯỚI  (07 §3)
-- =============================================================================

-- 1.1 CONTACTS — họ hàng và bạn bè
-- -----------------------------------------------------------------------------
-- KHÔNG PHẢI members: không tài khoản, không thông báo, không thấy dữ liệu.
--
-- CỐ Ý THIẾU TRƯỜNG: không phone, không địa chỉ, không ảnh, không ngày sinh,
-- không nhóm. Đây không phải app danh bạ. Thêm những trường đó là mở một
-- module mới mà không ai xin.

create type contact_side as enum ('husband_family', 'wife_family', 'shared', 'other');

create table contacts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,

  display_name  text not null,
  -- Chữ tự do: "chú ruột bên nội", "bạn cấp 3 của vợ". Không enum hoá quan hệ
  -- họ hàng VN — nó quá nhiều nhánh và người dùng tự mô tả nhanh hơn chọn.
  relation_note text,
  side          contact_side not null default 'other',

  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index contacts_household_idx on contacts (household_id)
  where deleted_at is null;
-- Tìm theo tên khi nhập nhanh 100 phong bì.
create index contacts_name_trgm_idx on contacts
  using gin (display_name gin_trgm_ops);


-- 1.2 GIFT ENTRIES — một lần đi hoặc nhận
-- -----------------------------------------------------------------------------
create type gift_direction as enum ('received', 'given');
create type gift_occasion  as enum (
  'wedding', 'engagement', 'funeral', 'death_anniversary',
  'full_month', 'birthday', 'housewarming', 'other'
);

create table gift_entries (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,

  direction     gift_direction not null,
  occasion      gift_occasion  not null default 'wedding',
  amount        numeric(14,2) not null check (amount >= 0),
  occurred_on   date not null,

  -- Gắn với sự kiện trong app nếu có. Nguyên tắc 10.6: mọi thông tin có ngữ cảnh.
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
  'Hai chiều SONG SONG, không bao giờ trừ nhau. Xem view gift_history và '
  'ghi chú cấm ở 07 §5.';


-- 1.3 VIEW gift_history — nguồn của dòng gợi ý
-- -----------------------------------------------------------------------------
-- Toàn bộ lý do module này tồn tại nằm ở đây: khi tạo khoản mừng cho nhà nào,
-- app nói được nhà đó đã mừng mình bao nhiêu, khi nào.
--
-- CỐ Ý KHÔNG CÓ CỘT CHÊNH LỆCH. Dữ liệu đủ để tính "nhà này mình còn đi thiếu
-- 500k" — và đó chính là lý do phải nói rõ là không tính. Nó biến quan hệ họ
-- hàng thành sổ nợ. App hiện hai chiều song song, người dùng tự cân.

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


-- =============================================================================
-- 2. HỒ SƠ CON  (07 §4)
-- =============================================================================
-- Con đã tồn tại trong members với role='child' và profile_id = null.
-- Các bảng dưới đây treo vào member đó, không tạo thực thể người mới.


-- 2.1 LỊCH TIÊM — PHẦN CẨN THẬN NHẤT CỦA CẢ APP
-- -----------------------------------------------------------------------------
-- KHÔNG ĐƯỢC VIẾT LỊCH TIÊM TỪ TRÍ NHỚ. Sai một mũi hoặc sai một mốc tuổi là
-- gây hại thật.
--
-- Bảng vaccine_schedule_items là DỮ LIỆU THAM CHIẾU, seed từ một file có phiên
-- bản, nguồn là văn bản chính thức của Chương trình Tiêm chủng mở rộng.
-- Điều kiện chặn phát hành: một người có chuyên môn y tế đọc và xác nhận
-- file seed trước khi ship. Xem 07 §4.2.

create table vaccine_schedule_items (
  code            text primary key,          -- 'BCG', 'DPT-VGB-Hib_1', …
  display_name    text not null,
  dose_label      text,                      -- 'mũi 1', 'nhắc lại'
  -- Mốc tuổi tính bằng tháng kể từ ngày sinh.
  due_age_months  numeric(5,2) not null,
  sort_order      smallint not null,

  -- Truy vết nguồn. Không có ba cột này thì không được ship.
  source_name     text not null,
  source_date     date not null,
  schedule_version text not null,

  is_active       boolean not null default true
);

comment on table vaccine_schedule_items is
  'DỮ LIỆU THAM CHIẾU, không phải dữ liệu người dùng. Seed từ file có phiên '
  'bản. Nguồn phải là văn bản chính thức và phải được người có chuyên môn y '
  'tế xác nhận trước khi phát hành. Xem 07 §4.2.';


-- Mũi tiêm thực tế của một đứa trẻ cụ thể.
create type dose_status as enum ('planned', 'done', 'overdue');

create table child_vaccine_doses (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  member_id      uuid not null references members(id) on delete cascade,

  schedule_code  text references vaccine_schedule_items(code) on delete set null,
  -- Cho mũi ngoài lịch (dịch vụ, tiêm bù). Khi đó schedule_code = null.
  custom_name    text,

  due_date       date,                       -- sinh từ birthday + due_age_months
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
  'tiêm, không dùng chữ trách móc. Xem 07 §4.2.';


-- 2.2 CHIỀU CAO CÂN NẶNG — ghi và vẽ, KHÔNG diễn giải
-- -----------------------------------------------------------------------------
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
  'CỐ Ý KHÔNG có cột bách phân vị, z-score, hay đánh giá. App ghi và vẽ, không '
  'diễn giải. Một nhãn đỏ do app tự tính sẽ làm bố mẹ mới hoảng mà không giúp '
  'được gì — việc đánh giá thuộc về bác sĩ. Xem 07 §4.3.';


-- 2.3 Thông tin trường lớp — một dòng treo vào member, không cần bảng riêng
-- -----------------------------------------------------------------------------
alter table members add column if not exists school_name  text;
alter table members add column if not exists school_class text;
alter table members add column if not exists health_insurance_no text;


-- =============================================================================
-- 3. RLS
-- =============================================================================

alter table contacts              enable row level security;
alter table gift_entries          enable row level security;
alter table child_vaccine_doses   enable row level security;
alter table child_growth_records  enable row level security;

create policy contacts_rw on contacts
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy gift_entries_rw on gift_entries
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy child_doses_rw on child_vaccine_doses
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy child_growth_rw on child_growth_records
  for all using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- Dữ liệu tham chiếu: ai đăng nhập cũng đọc được, không ai ghi được từ client.
alter table vaccine_schedule_items enable row level security;
create policy vaccine_schedule_read on vaccine_schedule_items
  for select using (auth.uid() is not null);

alter view gift_history set (security_invoker = true);


-- =============================================================================
-- 4. TRIGGER updated_at
-- =============================================================================

create trigger contacts_touch before update on contacts
  for each row execute function touch_updated_at();
create trigger gift_entries_touch before update on gift_entries
  for each row execute function touch_updated_at();
create trigger child_doses_touch before update on child_vaccine_doses
  for each row execute function touch_updated_at();


commit;


-- =============================================================================
-- GHI CHÚ CHO NGƯỜI TRIỂN KHAI
-- =============================================================================
-- 1. `contacts_name_trgm_idx` cần extension pg_trgm:
--        create extension if not exists pg_trgm;
--    Chạy trước migration này nếu chưa có.
--
-- 2. CHẶN PHÁT HÀNH: file seed cho vaccine_schedule_items phải được một người
--    có chuyên môn y tế đọc và xác nhận. Không seed từ trí nhớ, không seed từ
--    output của mô hình ngôn ngữ, không seed từ blog. Nguồn phải là văn bản
--    chính thức và ba cột source_name / source_date / schedule_version phải
--    điền thật.
--
-- 3. Edge cần bổ sung:
--    - khi thêm member role='child' có birthday: sinh child_vaccine_doses từ
--      vaccine_schedule_items (due_date = birthday + due_age_months)
--    - cron: chuyển status 'planned' -> 'overdue' khi qua due_date
--    - buildReminders: mũi tiêm lead 7 ngày
--
-- 4. Chưa làm và cố ý không làm — nếu thấy trong PR thì reject:
--    - cột hoặc view tính chênh lệch đi/nhận theo contact
--    - sắp xếp contact theo tổng tiền làm mặc định
--    - bách phân vị hoặc đánh giá tăng trưởng
--    - so sánh giữa các con trong cùng household
--    - bất kỳ trạng thái nào cho phép đánh dấu "bỏ mũi tiêm"
