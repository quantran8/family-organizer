-- =============================================================================
-- 0008 — CONCEPT v3  (spec/10-delta-v3.md)
-- =============================================================================
-- CHẠY SAU `0007_concept_v3_enums.sql`, và phụ thuộc vào nó: hai giá trị enum
-- 'fund' / 'child' phải được commit ở một migration TRƯỚC, vì Postgres không
-- cho dùng giá trị enum mới trong cùng transaction đã thêm nó. Lý do đầy đủ ở
-- đầu file `0007`.
--
-- Bốn thay đổi:
--
--   1. QUỸ CHUNG (v3 §7.6) — bảng `funds` + `fund_entries`, hai view gom theo
--      tháng, hai RPC. Đây là chỗ DUY NHẤT trong toàn schema được phép cộng
--      tiền theo người, và ngoại lệ đó có ranh giới cứng: MỘT THÁNG.
--
--   2. HAI DANH SÁCH VIỆC (v3 §7.3) — cột `tasks.list`. KHÔNG có luân phiên tự
--      động: v3 đề xuất chế độ thứ ba và nó bị bác, lý do ở 10 §2.2.
--
--   3. NHẮC KÉP (v3 §7.5) — `events.prep_lead_days` + `prep_task_id`.
--
--   4. THẺ CỦA CON (v3 §7.5) — `event_kind.child`, `events.child_member_id`,
--      `members.color_key`.
--
-- Cộng một sửa cơ chế: `upcoming_needs` giờ có cột `kind` và union thêm
-- `goals` với kind='optional' (10 §5). Nguyên tắc "không trộn nghĩa vụ với
-- nguyện vọng vào một con số" KHÔNG đổi — chỗ ép đổi từ view sang hàm
-- projectRunway.
--
-- Migration THUẦN CỘNG THÊM cho dữ liệu đang có: `tasks` và `events` đã có bản
-- ghi thật trên cloud, nên mọi cột mới đều nullable hoặc có default.

begin;

-- -----------------------------------------------------------------------------
-- 1. ENUM MỚI
-- -----------------------------------------------------------------------------
-- Ba enum này tạo MỚI hoàn toàn nên dùng được ngay trong cùng transaction —
-- khác hẳn `add value` vào một enum ĐANG CÓ, thứ đã phải tách sang `0007`.
-- `create type if not exists` không tồn tại trong Postgres — dùng đúng idiom
-- mà 0004 §7 đã lập.

do $$ begin
  create type task_list as enum ('recurring', 'flexible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fund_entry_kind as enum ('deposit', 'withdrawal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type need_kind as enum ('mandatory', 'optional');
exception when duplicate_object then null; end $$;


-- -----------------------------------------------------------------------------
-- 2. TASKS — hai danh sách  (03 §4b)
-- -----------------------------------------------------------------------------
-- Hai loại việc khác bản chất; ép chung một mô hình thì hỏng cả hai: danh sách
-- định kỳ bị lấp bởi việc vặt không hạn, còn việc vặt mang một cái hạn giả mà
-- không ai định đặt.
--
-- KHÔNG THÊM: assignee_mode, rotation_order, rotation_anchor_date,
-- task_instances.assignee_id. Luân phiên tự động bị bác — 10 §2.2.

alter table tasks
  add column if not exists list task_list not null default 'flexible';

-- Backfill: việc đang có recur là việc định kỳ. Chạy TRƯỚC khi ai kịp tạo dữ
-- liệu mới, nên không cần lo tương tranh.
update tasks
   set list = 'recurring'
 where (recur).freq is not null
   and (recur).freq <> 'none'
   and list = 'flexible';

create index if not exists tasks_household_list_idx
  on tasks (household_id, list, due_date)
  where deleted_at is null;

comment on column tasks.list is
  'recurring = lặp lại, có giờ, KHÔNG HOÃN ĐƯỢC (due_date là mốc neo, hoãn một '
  'lần là dời cả chuỗi). flexible = phát sinh, mặc định không tên, KHÔNG GÁN '
  'CHO NGƯỜI KIA — ranh giới giữ nó là danh sách việc của nhà chứ không phải '
  'hộp thư nhiệm vụ. Ràng buộc sau ép ở tầng UI: DB không biết ai đang gọi.';


-- -----------------------------------------------------------------------------
-- 3. EVENTS — nhắc kép + thẻ của con  (03 §5b, v3 §7.5)
-- -----------------------------------------------------------------------------
-- Phần lớn sự cố gia đình không phải quên sự kiện, mà là NHỚ SỰ KIỆN NHƯNG
-- QUÊN PHẦN CHUẨN BỊ CHO NÓ.
--
-- Mốc chuẩn bị KHÔNG bắn thêm push — nó SINH MỘT VIỆC LINH HOẠT. Thông báo thứ
-- hai về cùng một sự kiện là phiền; một dòng việc trong danh sách thì hữu ích.

alter table events
  add column if not exists prep_lead_days smallint,
  add column if not exists prep_task_id   uuid,
  add column if not exists child_member_id uuid;

do $$ begin
  alter table events add constraint events_prep_lead_range
    check (prep_lead_days is null or prep_lead_days between 1 and 3);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table events add constraint events_prep_task_fk
    foreign key (prep_task_id) references tasks(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table events add constraint events_child_member_fk
    foreign key (child_member_id) references members(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists events_child_idx
  on events (household_id, child_member_id)
  where deleted_at is null and child_member_id is not null;

comment on column events.prep_task_id is
  'Việc chuẩn bị đã sinh. Giữ để cron chạy lại không sinh trùng. CHỈ Edge '
  'build-reminders được ghi — 02 §7.';


-- -----------------------------------------------------------------------------
-- 4. MEMBERS — mỗi con một màu  (v3 §7.5)
-- -----------------------------------------------------------------------------
-- Khoá vào bảng màu ở design tokens, KHÔNG phải mã hex: đổi bảng màu thì không
-- phải migrate dữ liệu.
--
-- Màu BÁM THEO CON, không suy từ vị trí trong danh sách — thêm em bé thứ hai mà
-- đổi màu anh chị là lỗi nhỏ nhưng đúng chỗ cảm xúc.

alter table members add column if not exists color_key text;


-- -----------------------------------------------------------------------------
-- 5. QUỸ CHUNG — hai bảng  (v3 §7.6)
-- -----------------------------------------------------------------------------
-- Tiền nhà, ăn uống, điện nước của cặp ở riêng. Đáng theo dõi vì TẦN SUẤT NHẬP
-- CỰC THẤP: 2-4 lần một tháng, không phải 200 — nên nó không kéo sản phẩm về
-- phía app thu chi.

create table if not exists funds (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,

  name                 text not null,

  -- SỐ DẪN XUẤT, không phải số khai. Chỉ record_fund_entry() và
  -- delete_fund_entry() ghi. Client KHÔNG BAO GIỜ update trực tiếp.
  current_amount       numeric(14,2) not null default 0,

  -- "GHI LẦN CUỐI", không phải "khai lần cuối". Khác assets.as_of_date: số dư
  -- quỹ là TỔNG CỦA NHỮNG KHOẢN ĐÃ GHI, không phải một con số ai đó nói ra.
  as_of_date           date not null default current_date,
  updated_by_member_id uuid references members(id) on delete set null,

  is_archived          boolean not null default false,

  created_by           uuid not null references profiles(id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index if not exists funds_household_idx on funds (household_id)
  where deleted_at is null and is_archived = false;

-- XOÁ MỀM, KHÔNG PHẢI APPEND-ONLY — cố ý khác money_events.
--
-- Gõ nhầm số tiền một khoản nạp phải sửa được. Nếu append-only thì phải ghi một
-- dòng âm bù trừ, và một quỹ hiện "+5.000.000 rồi −5.000.000 (sửa nhầm)" đúng
-- là thứ sổ-nợ-hoá mà cả module này tránh. Bảo đảm append-only nằm ở tầng trên:
-- money_events vẫn ghi mọi biến động.
create table if not exists fund_entries (
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

create index if not exists fund_entries_month_idx
  on fund_entries (household_id, fund_id, occurred_on desc)
  where deleted_at is null;

comment on table fund_entries is
  'CÓ GHI TÊN NGƯỜI NẠP — ngoại lệ duy nhất của lệnh cấm "tổng tiền theo '
  'người", và CHỈ trong phạm vi một tháng (03 §9 ngoại lệ 2). Vì sao ở đây '
  'được mà chi tiêu vặt thì không: nạp quỹ là chuyển khoản rời rạc, đối chiếu '
  'được với sao kê — không ai quên mình vừa chuyển 10 triệu.';


-- -----------------------------------------------------------------------------
-- 6. MONEY_EVENTS — mở constraint cho 'fund'
-- -----------------------------------------------------------------------------
-- BẪY: constraint này khoá cứng danh sách, TÁCH RỜI khỏi enum. Thêm giá trị
-- enum ở mục 0 mà quên chỗ này thì migration báo thành công và LẦN NẠP QUỸ ĐẦU
-- TIÊN MỚI NỔ — kiểu hỏng tệ nhất vì nó không lộ ra lúc deploy.

alter table money_events drop constraint if exists money_events_entity_scope;
alter table money_events add constraint money_events_entity_scope check (
  entity_type in ('asset', 'debt', 'goal', 'upcoming_payment', 'fund')
);


-- -----------------------------------------------------------------------------
-- 7. TRIGGER updated_at cho funds
-- -----------------------------------------------------------------------------

do $$ begin
  create trigger funds_touch before update on funds
    for each row execute function touch_updated_at();
exception when duplicate_object then null; end $$;


-- -----------------------------------------------------------------------------
-- 8. VIEW — upcoming_needs có `kind`, union thêm goals  (10 §5)
-- -----------------------------------------------------------------------------
-- Bản trước loại hẳn goals ra, để bảo vệ nguyên tắc "không trộn nghĩa vụ với
-- nguyện vọng vào một con số". NGUYÊN TẮC KHÔNG ĐỔI — chỉ cơ chế đổi: thay vì
-- loại khỏi view, giờ tách bằng cột `kind`, và projectRunway CHỈ CỘNG
-- 'mandatory'.
--
-- Vì sao đổi: hai người cần thấy tháng 9 đóng học phí xong thì quỹ du lịch phải
-- chậm lại. CÙNG MÀN HÌNH KHÔNG PHẢI CÙNG MỘT CON SỐ.
--
-- Ai đọc view này rồi cộng tất cả các dòng lại là đang phá đúng nguyên tắc mà
-- cột `kind` sinh ra để giữ.
--
-- drop rồi create vì thêm cột giữa: create or replace không đổi được thứ tự cột.

drop view if exists upcoming_needs;

create view upcoming_needs as
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

  select 'goal', 'optional', g.id, g.household_id, g.name,
         g.target_date, greatest(g.target_amount - g.current_amount, 0)
  from goals g
  where g.deleted_at is null
    and g.is_archived = false
    and g.target_date is not null
    and g.target_amount > g.current_amount;

-- `drop view` ở trên KÉO THEO comment cũ. Đặt lại — và comment cũ (0004 §10)
-- giờ đã SAI: nó nói "goals CỐ Ý KHÔNG có trong view này".
comment on view upcoming_needs is
  'Cột `kind` tách NGHĨA VỤ khỏi NGUYỆN VỌNG. Ai đọc view này rồi cộng TẤT CẢ '
  'các dòng lại là đang phá đúng nguyên tắc mà cột đó sinh ra để giữ: '
  'projectRunway CHỈ cộng kind=''mandatory'', còn kind=''optional'' (goals) trả '
  'riêng cho một khối «có thể hoãn» trên cùng màn hình. Cùng màn hình KHÔNG '
  'phải cùng một con số. Xem 08 §2.3 và 10 §5.';


-- -----------------------------------------------------------------------------
-- 9. VIEW — money_history nhận thêm nhánh fund
-- -----------------------------------------------------------------------------
-- Thiếu nhánh này thì mọi biến động quỹ hiện ra là '(đã xoá)'.
--
-- `me.created_at` PHẢI GIỮ, đúng vị trí cũ (ngay sau actor_profile_id):
--
--   1. `create or replace view` KHÔNG bỏ hay đổi thứ tự cột được — chỉ thêm cột
--      vào CUỐI. Bản đầu của migration này bỏ sót `created_at` và push hỏng ở
--      đúng câu lệnh này.
--   2. Quan trọng hơn, cột đó có lý do tồn tại (0004 §9): nó để view thay được
--      `money_events` ở MỌI chỗ đọc, không riêng màn lịch sử. Bỏ nó thì
--      repository phải đọc hai nguồn và mapper phải có hai đường.
--
--   `occurred_on` là ngày NGƯỜI DÙNG khai; `created_at` là lúc máy ghi.

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
    me.created_at,
    coalesce(a.name, d.name, g.name, p.name, f.name, '(đã xoá)') as entity_title,
    m.display_name                                               as actor_display_name
  from money_events me
  left join assets            a on me.entity_type = 'asset'            and a.id = me.entity_id
  left join debts             d on me.entity_type = 'debt'             and d.id = me.entity_id
  left join goals             g on me.entity_type = 'goal'             and g.id = me.entity_id
  left join upcoming_payments p on me.entity_type = 'upcoming_payment' and p.id = me.entity_id
  left join funds             f on me.entity_type = 'fund'             and f.id = me.entity_id
  left join members           m on m.household_id = me.household_id
                               and m.profile_id  = me.actor_profile_id
                               and m.deleted_at is null;


-- -----------------------------------------------------------------------------
-- 10. VIEW — quỹ chung, CẢ HAI GOM THEO THÁNG
-- -----------------------------------------------------------------------------
-- ĐÂY LÀ TẦNG THỨ NHẤT trong ba tầng ép ranh giới một-tháng của 03 §9 ngoại lệ
-- 2. Hai tầng còn lại: chữ ký hàm domain (summarizeFundMonth nhận month bắt
-- buộc) và prop bắt buộc của contributor-block.tsx. Ba tầng độc lập nhau là có
-- chủ ý — phá được một tầng vẫn còn hai tầng chặn.

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
-- nó. Đó là chỗ ranh giới được ép ở tầng dữ liệu: không ai viết được một câu
-- truy vấn cộng dồn mà không tự tay bỏ month ra khỏi group by — lúc đó thì đã
-- là cố ý, không còn là sơ ý.
--
-- VÌ SAO NGOẠI LỆ NÀY AN TOÀN CÒN VỚI TÀI SẢN THÌ KHÔNG:
--   "Tháng này anh bỏ 5tr, em bỏ 5tr"   -> câu GHI CHÉP. Đóng lại cuối tháng.
--   "Tính tới nay anh 180tr, em 60tr"   -> câu PHÁN XÉT. Không bao giờ đóng.
-- Cùng dữ liệu, khác hoàn toàn về việc nó dùng để làm gì. Giữa vợ chồng không
-- có cơ chế tất toán nào để xoá một con số cộng dồn.
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
  'NGOẠI LỆ CÓ ĐIỀU KIỆN của lệnh cấm "tổng tiền theo người" — 03 §9 ngoại lệ '
  '2. Chỉ hợp lệ trong phạm vi MỘT THÁNG, chỉ ở màn hình quỹ, bắt buộc kèm '
  'entry_count, sắp THEO TÊN ABC chứ không theo số tiền. PHÉP THỬ KHI REVIEW: '
  'con số này có vắt qua nhiều hơn một tháng không? Có -> sai.';

-- CỐ Ý KHÔNG TẠO — nếu thấy trong PR thì reject:
--   view tổng theo người KHÔNG có month trong group by
--   view số dư quỹ theo thời gian (đường xu hướng)
--   view "ai còn thiếu bao nhiêu" dưới bất kỳ tên nào


-- -----------------------------------------------------------------------------
-- 11. RPC — ghi khoản quỹ, nguyên tử
-- -----------------------------------------------------------------------------
-- Ba bảng trong một transaction: fund_entries + funds.current_amount +
-- money_events. Ghép nhiều lệnh từ client thì mất mạng giữa chừng làm số dư sai
-- vĩnh viễn.

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


-- -----------------------------------------------------------------------------
-- 12. RLS
-- -----------------------------------------------------------------------------

alter table funds        enable row level security;
alter table fund_entries enable row level security;

do $$
declare t text;
begin
  foreach t in array array['funds', 'fund_entries'] loop
    begin
      execute format($f$
        create policy %1$s_household on %1$s
          for all to authenticated
          using (is_household_member(household_id))
          with check (is_household_member(household_id));
      $f$, t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 13. SECURITY INVOKER cho view mới
-- -----------------------------------------------------------------------------
-- View kế thừa RLS của bảng gốc thay vì chạy quyền owner.

alter view upcoming_needs           set (security_invoker = true);
alter view money_history            set (security_invoker = true);
alter view fund_month_summary       set (security_invoker = true);
alter view fund_month_contributors  set (security_invoker = true);


-- -----------------------------------------------------------------------------
-- 14. GRANT
-- -----------------------------------------------------------------------------
-- `upcoming_needs` phải cấp LẠI: mục 8 drop rồi tạo mới, mà DROP VIEW kéo theo
-- quyền của view cũ. Thiếu dòng này thì màn hình "Sắp tới" chết ngay sau khi
-- migration chạy trót lọt — kiểu hỏng tệ nhất vì migration báo thành công.
-- (0004 §13 đã học đúng bài này với finance_metrics.)

grant select, insert, update on funds, fund_entries to authenticated;
grant select on upcoming_needs, money_history to authenticated;
grant select on fund_month_summary, fund_month_contributors to authenticated;

grant execute on function
  record_fund_entry(uuid, fund_entry_kind, numeric, date, text, text, text)
to authenticated;
grant execute on function delete_fund_entry(uuid) to authenticated;

-- Không cấp `delete` ở đâu cả — xoá là xoá mềm trong toàn schema này.

commit;
