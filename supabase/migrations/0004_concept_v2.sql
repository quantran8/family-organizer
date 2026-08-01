-- =============================================================================
-- 0004 — CONCEPT V2
-- =============================================================================
-- Nguồn: `spec v2/06-delta-v2.md` + `spec v2/08-addendum-v2.1.md`.
-- Cộng dồn lên 0001–0003, KHÔNG reset: project đang có dữ liệu thật trên cloud.
--
-- Câu hỏi trung tâm của app đổi từ "nhà mình đang ổn không?" sang
-- "SẮP TỚI NHÀ MÌNH CẦN BAO NHIÊU?". Ba thay đổi lớn theo sau:
--
--   1. Bỏ nghi thức cập nhật định kỳ (06 §1). Thay bằng nhãn thời gian trên
--      mọi số khai + hỏi theo NGỮ CẢNH, không theo lịch.
--   2. View `upcoming_needs` gom ba nguồn tiền, sửa lỗi đã có từ 0001 (§0.2).
--   3. `money_events` được surface lên UI qua view `money_history` (08 §1).
--
-- CẢNH BÁO THỨ TỰ: mục 1 (family_side) đổi một enum ĐANG CÓ DỮ LIỆU. Chạy
-- trên project staging trước và đối chiếu
--   select side, count(*) from events group by 1;
-- trước/sau. Không có Docker local nên không có bước tập dượt nào khác.
-- =============================================================================

begin;

-- =============================================================================
-- 1. FAMILY_SIDE — sửa lỗi có sẵn (06 §0.1)
-- =============================================================================
-- Enum này mâu thuẫn ở BA nơi kể từ 0001:
--   schema.sql          paternal · maternal · both · own
--   02-data-contract    husband_family · wife_family · both · own
--   UI                  "Nhà chồng" · "Nhà vợ"
--
-- Nội/ngoại và nhà chồng/nhà vợ KHÔNG PHẢI CÙNG MỘT TRỤC. Với một cặp vợ
-- chồng, "nhà nội" là nhà chồng — nhưng "bên nội của vợ" cũng tồn tại và
-- không ánh xạ được. Chọn trục theo UI, vì đó là thứ người dùng thật sự nghĩ.
--
-- Không dùng `::text::family_side`: giá trị cũ không nằm trong type mới nên
-- ép kiểu ngầm sẽ lỗi. Map phải TƯỜNG MINH — đây là dữ liệu thật.

alter type family_side rename to family_side_old;

create type family_side as enum ('husband_family', 'wife_family', 'both', 'own');

alter table events
  alter column side type family_side
  using (
    case side::text
      when 'paternal' then 'husband_family'
      when 'maternal' then 'wife_family'
      when 'both'     then 'both'
      when 'own'      then 'own'
    end
  )::family_side;

drop type family_side_old;

comment on column events.side is
  'Trục là "NHÀ AI", không phải "nội/ngoại". Xem 06 §0.1.';


-- =============================================================================
-- 2. ENTITY_TYPE — thêm hai giá trị
-- =============================================================================
-- `shopping_item` cho module mua sắm (06 §4).
--
-- `household` trả nợ kỹ thuật ghi ở G9: lời nhắc/cờ nói về CẢ NHÀ không thuộc
-- bản ghi nào, và `nudge-snapshot-update` đang phải mượn
-- `entity_type = 'asset'` với `entity_id = household_id`. Nghi thức snapshot
-- bị bỏ ở migration này nên chỗ mượn đó biến mất, nhưng giá trị enum vẫn đúng
-- để có: cờ cấp nhà là một khái niệm thật.
--
-- alter type ... add value KHÔNG chạy được trong transaction ở Postgres < 12;
-- Supabase chạy 14+ nên an toàn trong `begin`.

alter type entity_type add value if not exists 'shopping_item';
alter type entity_type add value if not exists 'household';


-- =============================================================================
-- 3. HOUSEHOLDS — ngưỡng ghi + cột mốc trial
-- =============================================================================

-- Ngưỡng hai người tự chốt lúc onboarding. null = "tự quyết" (06 §2).
--
-- ĐÂY KHÔNG PHẢI VALIDATION. Không constraint chặn số nhỏ hơn, không cảnh
-- báo, không chặn form. Nó chỉ làm hai việc: một dòng gợi ý dưới ô nhập tiền,
-- và một đầu vào của shouldAskForRefresh().
--
-- Nếu biến nó thành ràng buộc, nó thành quy định của app áp lên gia đình. Nó
-- phải giữ nguyên nghĩa: một quy ước hai người tự chốt, app chỉ lưu lại.
alter table households add column if not exists
  record_threshold_amount numeric(14,2);

comment on column households.record_threshold_amount is
  'Ngưỡng ghi do hai người tự chốt. null = tự quyết. KHÔNG PHẢI VALIDATION: '
  'không chặn form, không cảnh báo khi ghi khoản nhỏ hơn. Xem 06 §2.';

-- Trial gắn CỘT MỐC, không gắn ngày (06 §9). 30 ngày có thể trôi qua mà không
-- có hạn nào tới — khi đó người dùng chưa từng nhìn thấy sản phẩm hoạt động.
alter table households add column if not exists
  trial_milestones jsonb not null default
    '{"reminderAcknowledged": false, "eventWithCostCompleted": false}'::jsonb;

comment on column households.trial_milestones is
  'Trial kết thúc khi đã qua 30 ngày VÀ đã có một lần nhắc hạn được xác nhận '
  'VÀ một sự kiện có chi phí. Trần cứng 90 ngày. Xem 06 §9.';

-- PHẢI DROP VIEW TRƯỚC KHI XOÁ CỘT.
--
-- `finance_metrics` (dựng ở 0001) đọc `households.snapshot_interval_days` và
-- `money_snapshots` — Postgres TỪ CHỐI xoá một cột đang có view phụ thuộc, kể
-- cả với `drop column if exists`: `if exists` chỉ bỏ qua khi cột KHÔNG có, nó
-- không bỏ qua lỗi phụ thuộc. Bản đầu của migration này drop view ở mục 9 (sau
-- chỗ này ~240 dòng) và `db push` chết ngay tại câu lệnh dưới.
--
-- View được dựng lại ở mục 9 với danh sách cột mới. Khoảng giữa hai chỗ đó
-- không có gì đọc `finance_metrics` — cả migration nằm trong một transaction.
drop view if exists finance_metrics;

-- Bỏ nhịp cập nhật định kỳ (06 §1). Cột này là hiện thân của nghi thức bị loại.
alter table households drop column if exists snapshot_interval_days;

-- money_snapshots đổi vai: không còn là vòng lặp thói quen do người dùng chạy,
-- mà là LỊCH SỬ DẪN XUẤT do cron ghi mỗi tháng, phục vụ "trí nhớ năm ngoái".
-- Người dùng không bao giờ nhìn thấy hành động tạo snapshot.
alter table money_snapshots drop column if exists is_manual;

comment on table money_snapshots is
  'Lịch sử dẫn xuất do cron ghi hằng tháng. KHÔNG có đường nào để người dùng '
  'tự tạo — nghi thức cập nhật định kỳ đã bị bỏ. Xem 06 §1.';


-- =============================================================================
-- 3b. ASSETS — ai khai con số này (03 §8)
-- =============================================================================
-- `as_of_date` đã có từ 0001, nhưng KHÔNG có cột nói AI khai. Thiếu nó thì
-- formatDeclaredAt() không bao giờ dựng được câu "Anh cập nhật 6 tuần trước" —
-- nó chỉ nói được "6 tuần trước", mất đúng nửa quan trọng.
--
-- current_value là thứ MỘT NGƯỜI ĐÃ NÓI RA TẠI MỘT THỜI ĐIỂM, không phải sự
-- thật hiện tại. Nếu UI hiển thị trần trụi, hai người sẽ cùng tin vào một thứ
-- có thể đã sai — tệ hơn không có app, vì trước đây ít nhất họ biết là mình
-- không biết.

alter table assets add column if not exists
  updated_by_member_id uuid references members(id) on delete set null;

comment on column assets.current_value is
  'SỐ KHAI. Mọi UI hiện giá trị PHẢI hiện kèm as_of_date và '
  'updated_by_member_id qua formatDeclaredAt(). Không có ngoại lệ. Xem 03 §8.';

-- RPC phải ghi cột mới, nếu không nó mãi mãi null và nhãn mất tên người.
-- Chép nguyên từ `spec v2/schema.sql` §12, chỉ thêm dòng updated_by_member_id.
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


-- =============================================================================
-- 4. GOALS — trở lại P0 (08 §2)
-- =============================================================================
-- Đảo ngược 06 §8. Mục tiêu NHÌN VỀ PHÍA TRƯỚC — cùng hướng với trái tim sản
-- phẩm — nên nó thuộc về mô hình này. Trước đó bị gộp nhầm với phần theo dõi
-- tài sản đã cắt.
--
-- current_amount là SỐ KHAI, y hệt assets.current_value. Chịu cùng ràng buộc.

alter table goals add column if not exists
  as_of_date date not null default current_date;
alter table goals add column if not exists
  updated_by_member_id uuid references members(id) on delete set null;

comment on column goals.current_amount is
  'SỐ KHAI. Mọi UI hiện tiến độ đều phải hiện kèm as_of_date qua '
  'formatDeclaredAt(). Không có nhắc cập nhật định kỳ. Xem 08 §2.2.';

comment on table goals is
  'Mục tiêu KHÔNG chảy vào upcoming_needs: nghĩa vụ khác nguyện vọng. Học phí '
  'tháng 9 là thứ phải trả; góp quỹ mua nhà là thứ muốn làm. Trộn hai loại '
  'làm con số "cần chuẩn bị" mất nghĩa. Xem 08 §2.3.';


-- =============================================================================
-- 5. SHOPPING_ITEMS — bề mặt hằng ngày (06 §4)
-- =============================================================================
-- Bề mặt DUY NHẤT có tần suất hằng ngày và tự nhiên hai chiều. Từ "chưa cần"
-- lên P0 vì nó là lý do app được mở trong tuần không có sự kiện nào.

create table if not exists shopping_items (
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

create index if not exists shopping_open_idx on shopping_items (household_id, created_at)
  where deleted_at is null and is_done = false;
-- Mục đã tick biến mất khỏi danh sách chính sau 24h (cron), giữ 30 ngày.
create index if not exists shopping_cleanup_idx on shopping_items (done_at)
  where is_done = true and deleted_at is null;

comment on table shopping_items is
  'CỐ Ý THIẾU TRƯỜNG: không quantity, không price, không category, không '
  'store, không assignee. Thêm bất kỳ trường nào trong số đó là biến danh '
  'sách thành VIỆC ĐƯỢC GIAO — và mất đúng lý do module này tồn tại. '
  'Không thông báo khi người kia thêm đồ. Xem 06 §4.';


-- =============================================================================
-- 6. EVENT_OCCURRENCES — trí nhớ năm ngoái (06 §5)
-- =============================================================================
-- Subscription sống bằng cái mất đi khi hủy. Đây là thứ đó.
--
-- Dữ liệu được ghi từ ngày đầu cho MỌI household, kể cả free — nếu không ghi
-- thì tính năng này vô nghĩa vào năm thứ hai. Paywall chỉ chặn phần ĐỌC dữ
-- liệu cũ hơn 12 tháng.

create table if not exists event_occurrences (
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

create index if not exists event_occurrences_lookup_idx
  on event_occurrences (household_id, event_id, occurred_on desc);
create index if not exists event_occurrences_unasked_idx
  on event_occurrences (household_id) where cost_asked = false;

comment on table event_occurrences is
  'NƠI DUY NHẤT app hỏi về một con số đã qua, và nó tồn tại chỉ để nuôi trí '
  'nhớ năm sau. Không dùng cho bất kỳ phép tổng hợp chi tiêu nào. '
  'occurred_on do Edge cron ghi; chỉ actual_cost là UI ghi.';


-- =============================================================================
-- 7. INGEST_DRAFTS — nhập liệu bằng AI (06 §6)
-- =============================================================================
-- Nút thắt sống còn: app nằm ở HẠ NGUỒN của Zalo. Nếu phải mở app gõ tay thì
-- dữ liệu không vào và mọi module đều rỗng.

-- Hai enum này có trong `spec/schema.sql` nhưng bản đầu của migration KHÔNG
-- mang sang — bảng dưới tham chiếu tới hai type chưa tồn tại và `db push` chết
-- ngay tại đó. `create table if not exists` không cứu được: `if not exists` chỉ
-- bỏ qua khi BẢNG đã có, nó không bỏ qua một type thiếu.
--
-- `do $$ … $$` thay cho `create type if not exists` (Postgres không có cú pháp
-- đó cho type): cần chạy lại được sau một lần push hỏng giữa chừng.
do $$ begin
  create type ingest_source as enum ('screenshot', 'photo', 'text');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ingest_status as enum ('pending', 'confirmed', 'discarded');
exception when duplicate_object then null;
end $$;

create table if not exists ingest_drafts (
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

create index if not exists ingest_pending_idx on ingest_drafts (household_id, created_at desc)
  where status = 'pending';
-- Đếm quota free 5 lần/tháng.
create index if not exists ingest_quota_idx on ingest_drafts (household_id, created_at);

comment on column ingest_drafts.parsed is
  'Output của AI. KHÔNG ĐƯỢC TIN: phải chạy qua zod schema của entity tương '
  'ứng ở client trước khi đổ vào form, và NGƯỜI DÙNG LUÔN XÁC NHẬN trước khi '
  'ghi. Không bao giờ tự tạo bản ghi từ AI — một ngày giỗ sai do AI đoán sẽ '
  'phá niềm tin ở đúng tính năng khác biệt nhất.';


-- =============================================================================
-- 8. RLS — bảng mới
-- =============================================================================
-- Cùng khuôn với 0001: một policy `for all` dựa `is_household_member`.

alter table shopping_items    enable row level security;
alter table event_occurrences enable row level security;
alter table ingest_drafts     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'shopping_items', 'event_occurrences', 'ingest_drafts'
  ] loop
    execute format($f$
      create policy %1$s_household on %1$s
        for all to authenticated
        using (is_household_member(household_id))
        with check (is_household_member(household_id));
    $f$, t);
  end loop;
end $$;

-- LƯU Ý: dù có RLS, client PHẢI luôn filter `where household_id = ?` tường
-- minh. RLS là lưới an toàn thứ hai, không phải tầng phân quyền duy nhất.


-- =============================================================================
-- 9. FINANCE_METRICS — dựng lại (02 §3)
-- =============================================================================
-- Bỏ `snapshot_interval_days` và `last_snapshot_on`: computeFinanceStatus
-- không còn dùng độ mới dữ liệu để đổi trạng thái. Một chấm vàng vì "bạn chưa
-- cập nhật" là một LỜI THÚC — và KHÔNG BIẾT TÌNH HÌNH khác với TÌNH HÌNH
-- KHÔNG ỔN. Độ mới giờ là một nhãn riêng (computeFreshness), chỉ đổi văn bản.
--
-- Thêm `last_usable_updated_on`: ngày khai gần nhất CỦA RIÊNG nhóm "dùng
-- ngay" — đây là con số màn hình Sắp tới dựa vào, nên nhãn thời gian phải
-- theo đúng nhóm đó, không phải theo tài sản bất kỳ.
--
-- View đã được DROP ở mục 2 — xem lý do ở đó (nó phụ thuộc vào hai cột mà mục
-- 2 xoá, nên không drop trước thì chính lệnh xoá cột bị Postgres chặn).

create view finance_metrics as
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
    -- CHỈ upcoming_payments. Chi phí sự kiện và gia hạn giấy tờ nằm ở
    -- `upcoming_needs` — trộn vào đây sẽ đếm trùng ở màn hình Sắp tới.
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
      where a.household_id = h.id and a.deleted_at is null
        and a.is_closed = false and a.liquidity = 'usable_now')     as last_usable_updated_on,
    (select max(as_of_date) from assets a
      where a.household_id = h.id and a.deleted_at is null)         as last_updated_on,
    h.record_threshold_amount,
    h.currency
  from households h
  where h.deleted_at is null;


-- =============================================================================
-- 10. UPCOMING_NEEDS — sửa lỗi có sẵn (06 §0.2, §3)
-- =============================================================================
-- TRÁI TIM SẢN PHẨM. Thứ DUY NHẤT mà Zalo, Calendar, Sheet và Drive cộng lại
-- vẫn không làm được, vì nó cần đồng thời ba nguồn.
--
-- LỖI ĐÃ SỬA: `finance_metrics.due_next_30d` CHỈ cộng upcoming_payments. Giỗ
-- 3tr, cưới 2tr, gia hạn bảo hiểm 12tr đều không bao giờ được tính — trong
-- khi §7.2 của concept v2 lấy đúng ba nguồn đó làm nội dung chính.
--
-- SQL CHỈ GOM SỐ. Dự tính (projectRunway) tính ở packages/domain: nó là chính
-- sách sản phẩm sẽ đổi nhiều lần — cùng lý do với computeFinanceStatus.

create or replace view upcoming_needs as
  select
    'upcoming_payment'::entity_type          as source,
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

  select 'event', e.id, e.household_id, e.title,
         e.next_occurrence_date, e.estimated_cost
  from events e
  where e.deleted_at is null
    and e.next_occurrence_date is not null
    and e.estimated_cost is not null
    and e.estimated_cost > 0

  union all

  select 'document', d.id, d.household_id, d.title,
         d.expiry_date, d.renewal_cost
  from documents d
  where d.deleted_at is null
    and d.expiry_date is not null
    and d.renewal_cost is not null
    and d.renewal_cost > 0;

comment on view upcoming_needs is
  'goals CỐ Ý KHÔNG có trong view này. Nghĩa vụ khác nguyện vọng — trộn hai '
  'loại làm con số "cần chuẩn bị" mất nghĩa, và làm màn hình hero trở nên '
  'đáng sợ mà không có lý do. Xem 08 §2.3.';


-- =============================================================================
-- 11. MONEY_HISTORY — lịch sử biến động (08 §1)
-- =============================================================================
-- ĐƯỜNG PHÂN GIỚI CỦA CẢ MỤC NÀY:
--   LIỆT KÊ thì trung thực khi dữ liệu thiếu. CỘNG TỔNG thì không.
--
--   "Sửa xe −2.000.000 ₫ · 15/9" vẫn đúng dù nhà mình còn mười khoản chưa ghi.
--   "Tháng 9 chi 12 triệu" thì TỰ NHẬN là đầy đủ, và sẽ sai 30-40% mãi mãi.
--
-- money_events đã tồn tại từ 0001 và ranh giới của nó đã đúng. Thiếu duy nhất
-- một đường để ĐỌC — đó là lỗi bản 06 sửa ở 08 §1.

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
    -- Tên khoản, lấy từ bảng gốc. coalesce vì entity có thể đã xoá mềm —
    -- money_events là append-only nên dòng lịch sử vẫn còn.
    coalesce(a.name, d.name, g.name, p.name, '(đã xoá)') as entity_title,
    m.display_name                                       as actor_display_name
  from money_events me
  left join assets            a on me.entity_type = 'asset'            and a.id = me.entity_id
  left join debts             d on me.entity_type = 'debt'             and d.id = me.entity_id
  left join goals             g on me.entity_type = 'goal'             and g.id = me.entity_id
  left join upcoming_payments p on me.entity_type = 'upcoming_payment' and p.id = me.entity_id
  left join members           m on m.household_id = me.household_id
                               and m.profile_id  = me.actor_profile_id
                               and m.deleted_at is null;

comment on view money_history is
  'Nguồn cho màn hình money/history.tsx và khối LỊCH SỬ trong chi tiết tài '
  'sản. CHỈ ĐƯỢC HIỂN THỊ DẠNG DANH SÁCH. Cấm vẽ tổng theo tháng thành đường '
  'xu hướng: khoảng trống trong việc ghi chép sẽ trông y hệt thay đổi trong '
  'chi tiêu, và người dùng sẽ đọc nó như sự thật. Xem 08 §1.4.';

-- CỐ Ý KHÔNG TẠO:
--   - view tổng hợp theo tháng
--   - view phân loại theo danh mục
--   - view tổng hợp theo actor_profile_id
-- Nếu thấy trong PR thì reject. Xem 08 §3.
--
-- Tổng của một kỳ được phép, nhưng tính ở client và BẮT BUỘC kèm số lượng bản
-- ghi + chữ "đã ghi" — nên nó không thuộc về SQL.

-- View trong Postgres 15+ mặc định chạy quyền OWNER, tức bỏ qua RLS của người
-- gọi. security_invoker bắt view dùng quyền người gọi, nên policy household
-- vẫn có hiệu lực khi đọc qua view.
alter view money_history   set (security_invoker = true);
alter view upcoming_needs  set (security_invoker = true);
alter view finance_metrics set (security_invoker = true);


-- =============================================================================
-- 12. CONTRIBUTE_TO_GOAL — dựng lại (08 §2.4)
-- =============================================================================
-- Ghi nhiều bảng phải qua RPC: mất mạng giữa chừng làm số góp và lịch sử lệch
-- nhau vĩnh viễn. Cùng khuôn với update_asset_value ở 0001.
--
-- 0002 đã có bản `(uuid, numeric, date)`. Bản mới thêm `p_note` và ghi hai cột
-- as_of_date/updated_by_member_id vừa thêm ở mục 4.
--
-- PHẢI DROP BẢN CŨ TRƯỚC. `create or replace` với danh sách tham số khác sẽ tạo
-- một OVERLOAD thứ hai chứ không thay thế, và PostgREST khi đó không phân giải
-- được `rpc('contribute_to_goal', …)` — nó trả lỗi
-- "Could not choose the best candidate function", một lỗi chỉ lộ ra lúc chạy.
drop function if exists contribute_to_goal(uuid, numeric, date);

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

  -- `contribution`, không phải `value_updated`: góp thêm vào mục tiêu là một
  -- hành động khác về bản chất với khai lại giá trị một tài sản. Giữ đúng giá
  -- trị mà 0002 đã dùng để lịch sử cũ và mới đọc như nhau.
  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on, note,
                            actor_profile_id)
  values (v_hh, 'goal', p_goal_id, 'contribution',
          v_old, v_old + p_amount, p_amount, p_as_of, p_note,
          current_profile_id());
end $$;

-- Ghi chú: actor_profile_id trong money_events trả lời "ai khai con số này"
-- khi đọc lịch sử CỦA MỘT KHOẢN. Nó KHÔNG BAO GIỜ được nhóm lại thành "anh
-- góp bao nhiêu, em góp bao nhiêu". Đó là bảng điểm ở dạng trông giống minh
-- bạch nhất, và vì thế là dạng nguy hiểm nhất. Xem 08 §2.3.


-- =============================================================================
-- 13. GRANT — bảng và view mới
-- =============================================================================
-- 0003 giải thích vì sao GRANT và RLS là hai thứ độc lập và đều bắt buộc.
-- Thiếu GRANT thì mọi truy vấn trả `permission denied` và RLS không bao giờ
-- được gọi tới — không màn hình nào chạy được.
--
-- Xoá là XOÁ MỀM nên KHÔNG cấp DELETE cho bảng nào.

grant select, insert, update on
  shopping_items,
  event_occurrences,
  ingest_drafts
to authenticated;

-- finance_metrics phải cấp LẠI: mục 9 drop rồi tạo mới, mà DROP VIEW kéo theo
-- quyền của view cũ. Thiếu dòng này thì mọi màn hình tiền chết ngay sau khi
-- migration chạy trót lọt — kiểu hỏng tệ nhất vì migration báo thành công.
grant select on finance_metrics, upcoming_needs, money_history to authenticated;

grant execute on function contribute_to_goal(uuid, numeric, date, text) to authenticated;

commit;
