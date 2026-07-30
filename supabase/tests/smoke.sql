-- Smoke test tầng DB: F1 (tạo nhà) · F2 (mời + tham gia) · F8 (trả một kỳ nợ)
-- Chạy như hai người dùng THẬT qua role `authenticated` + JWT claims, để RLS
-- thật sự có hiệu lực — chạy bằng superuser thì RLS bị bỏ qua và test vô nghĩa.

\set ON_ERROR_STOP on
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values (:'A','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
        'a@test.vn','x',now(),now(),now()),
       (:'B','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
        'b@test.vn','x',now(),now(),now())
on conflict (id) do nothing;

-- ============================================================ F1: A tạo nhà
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'A', 'role','authenticated')::text, true);

select 'F1 tạo nhà: ' || create_household('Vợ', 'Nhà mình') as ket_qua;
select 'F1 my_households: ' || household_name as ket_qua from my_households();

-- A tạo mã mời (RLS: A đã là member nên insert được)
insert into invites (household_id, code, invited_by)
select household_id, 'K7M2PQ', current_profile_id() from my_households();
select 'F1 tạo mã mời: K7M2PQ' as ket_qua;

-- A thêm dữ liệu: một khoản nợ + một kỳ phải trả sinh từ nợ đó
insert into debts (household_id, name, lender, principal_amount, remaining_amount,
                   installment_amount, as_of_date, created_by)
select household_id, 'Vay mua nhà BIDV', 'BIDV', 200000000, 180000000,
       8000000, current_date, current_profile_id() from my_households();

insert into upcoming_payments (household_id, name, amount, due_date,
                               source_debt_id, created_by)
select d.household_id, 'Trả góp nhà tháng 10', 8000000, current_date + 5,
       d.id, current_profile_id() from debts d;

insert into assets (household_id, name, asset_kind, liquidity, current_value,
                    as_of_date, created_by)
select household_id, 'Tiền mặt', 'cash', 'usable_now', 45000000,
       current_date, current_profile_id() from my_households();
commit;

-- ============================================================ F2: B tham gia
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'B', 'role','authenticated')::text, true);

-- B CHƯA là member: RLS phải chặn không cho đọc bảng invites trực tiếp.
select 'F2 B đọc thẳng invites (kỳ vọng 0 dòng): ' || count(*) as ket_qua
  from invites;

-- Nhưng redeem_invite (SECURITY DEFINER) thì phải chạy được — đây chính là
-- vòng luẩn quẩn mà 0002 giải.
select 'F2 B tham gia: ' || redeem_invite('k7m2pq', 'Chồng') as ket_qua;
select 'F2 B thấy nhà: ' || household_name as ket_qua from my_households();

-- Người thứ hai KHÔNG BAO GIỜ thấy màn hình rỗng — phải thấy dữ liệu của A.
select 'F2 B thấy dữ liệu của A: ' || count(*) || ' khoản tiền' as ket_qua
  from money_feed;
commit;

-- ====================================================== F8: trả một kỳ nợ
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'B', 'role','authenticated')::text, true);

select 'F8 dư nợ trước: ' || remaining_amount from debts;
select settle_payment(id, current_date, 'trả đúng hạn') from upcoming_payments;
select 'F8 dư nợ sau (kỳ vọng 172000000): ' || remaining_amount as ket_qua from debts;
select 'F8 money_events đã ghi: ' || count(*) as ket_qua from money_events;
commit;

-- ============================================ money_events là append-only
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'B', 'role','authenticated')::text, true);
-- HAI lớp chặn, và đây là thứ tự chúng bắn:
--   1. GRANT (0003) không cho `authenticated` UPDATE  → permission denied
--   2. Trigger (0001 §5.5) chặn kể cả role có quyền   → "is append-only"
-- Lớp 1 bắn trước với người dùng thường; lớp 2 là lưới an toàn cho service_role
-- và cho migration sau này lỡ cấp thừa quyền.
do $$
begin
  update money_events set delta = 0;
  raise exception 'SAI: sửa được money_events';
exception when insufficient_privilege then
  raise notice 'append-only lớp 1 (GRANT): chặn UPDATE — đúng';
end $$;
rollback;

-- Lớp 2: chạy bằng superuser để vượt GRANT, xem trigger có chặn không.
begin;
do $$
begin
  update money_events set delta = 0;
  raise exception 'SAI: trigger không chặn';
exception when others then
  if sqlerrm like '%append-only%' then
    raise notice 'append-only lớp 2 (trigger): chặn UPDATE — đúng';
  else
    raise;
  end if;
end $$;
rollback;

-- ==================================================== view finance_metrics
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', :'A', 'role','authenticated')::text, true);
select 'metrics: usable=' || total_usable || ' debt=' || total_debt
    || ' due30=' || due_next_30d || ' overdue=' || overdue_count as ket_qua
  from finance_metrics;
select 'home_feed: ' || count(*) || ' mục' as ket_qua from home_feed;
commit;
