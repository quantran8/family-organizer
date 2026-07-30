-- =============================================================================
-- 0002 — RPC ONBOARDING
-- =============================================================================
-- Vì sao cần migration này: RLS ở 0001 (§10) tạo ra hai vòng luẩn quẩn mà
-- client KHÔNG THỂ thoát bằng PostgREST thuần.
--
--   1. TẠO NHÀ. `households_member` yêu cầu `with check (is_household_member(id))`.
--      Nhưng lúc INSERT household thì chưa có member nào → check thất bại.
--      Không tạo được household đầu tiên.
--
--   2. THAM GIA BẰNG MÃ MỜI. `invites_household` yêu cầu
--      `is_household_member(household_id)` để SELECT. Nhưng người đang tham gia
--      thì CHƯA phải member → không đọc được mã mời của chính mình.
--      Đây là F2 — luồng SỐNG-CÒN của sản phẩm (05 §9).
--
-- Hai thao tác này cũng đúng tiêu chí RPC ở 01 §3: ghi nhiều bảng trong một
-- transaction (households + members, hoặc invites + members). Mất mạng giữa
-- chừng mà ghép lệnh từ client sẽ để lại household không có ai, hoặc mã mời
-- đã dùng mà không có member.
--
-- SECURITY DEFINER là BẮT BUỘC ở đây, không phải tiện tay: chúng phải chạy
-- được TRƯỚC khi người gọi là member. Đổi lại, mỗi hàm tự kiểm tra điều kiện
-- của mình và không nhận household_id tuỳ ý từ client.
-- =============================================================================

-- Bảo đảm profiles tồn tại cho người vừa đăng nhập.
-- Gọi được nhiều lần (upsert theo auth_user_id).
create or replace function ensure_profile(p_display_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := (select auth.uid());
  v_profile uuid;
begin
  if v_uid is null then
    raise exception 'chưa đăng nhập' using errcode = '42501';
  end if;

  select id into v_profile from profiles where auth_user_id = v_uid;

  if v_profile is null then
    insert into profiles (auth_user_id, display_name)
    values (v_uid, coalesce(nullif(trim(p_display_name), ''), 'Bạn'))
    returning id into v_profile;
  elsif nullif(trim(p_display_name), '') is not null then
    update profiles set display_name = trim(p_display_name) where id = v_profile;
  end if;

  return v_profile;
end $$;


-- Tạo household mới + member cho chính người tạo, trong MỘT transaction.
-- Trả về household_id.
create or replace function create_household(
  p_display_name    text,
  p_household_name  text default 'Nhà mình'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_profile   uuid;
  v_household uuid;
begin
  v_profile := ensure_profile(p_display_name);

  insert into households (name)
  values (coalesce(nullif(trim(p_household_name), ''), 'Nhà mình'))
  returning id into v_household;

  insert into members (household_id, profile_id, display_name, role)
  values (v_household, v_profile, trim(p_display_name), 'owner');

  return v_household;
end $$;


-- Đổi mã mời lấy household. Trả về household_id.
--
-- Kiểm tra ĐẦY ĐỦ trong hàm vì SECURITY DEFINER bỏ qua RLS:
--   - mã phải tồn tại, còn 'pending', chưa hết hạn
--   - người dùng chưa phải member của chính household đó
create or replace function redeem_invite(
  p_code          text,
  p_display_name  text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid;
  v_invite  invites;
begin
  v_profile := ensure_profile(p_display_name);

  select * into v_invite
    from invites
   where code = upper(trim(p_code))
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then
    raise exception 'mã mời không đúng hoặc đã hết hạn' using errcode = 'P0002';
  end if;

  -- Đã ở trong nhà rồi thì không tạo member trùng, chỉ trả về household.
  if exists (
    select 1 from members
     where household_id = v_invite.household_id
       and profile_id = v_profile
       and deleted_at is null
  ) then
    return v_invite.household_id;
  end if;

  insert into members (household_id, profile_id, display_name, role)
  values (v_invite.household_id, v_profile, trim(p_display_name), 'partner');

  update invites
     set status = 'accepted', accepted_by = v_profile
   where id = v_invite.id;

  return v_invite.household_id;
end $$;


-- Household của người đang đăng nhập. Dùng ở gate app/_layout.tsx để biết
-- đi nhánh (auth) hay (app).
create or replace function my_households()
returns table (household_id uuid, household_name text, member_id uuid)
language sql stable security definer set search_path = public as $$
  select h.id, h.name, m.id
    from members m
    join households h on h.id = m.household_id
   where m.profile_id = current_profile_id()
     and m.deleted_at is null
     and m.is_active
     and h.deleted_at is null
$$;


-- Góp thêm vào mục tiêu + ghi money_events, nguyên tử.
-- Cùng lý do với settle_payment/update_asset_value ở 0001 §12: PostgREST không
-- cho mở transaction nhiều lệnh, mà đây là 2 lệnh ghi.
create or replace function contribute_to_goal(
  p_goal_id uuid,
  p_amount  numeric,
  p_on      date default current_date
) returns void
language plpgsql security invoker as $$
declare v_old numeric; v_hh uuid;
begin
  select current_amount, household_id into v_old, v_hh
    from goals where id = p_goal_id and deleted_at is null for update;
  if not found then raise exception 'goal not found'; end if;

  update goals set current_amount = current_amount + p_amount
   where id = p_goal_id;

  insert into money_events (household_id, entity_type, entity_id, event_type,
                            value_before, value_after, delta, occurred_on,
                            actor_profile_id)
  values (v_hh, 'goal', p_goal_id, 'contribution',
          v_old, v_old + p_amount, p_amount, p_on, current_profile_id());
end $$;


grant execute on function ensure_profile(text)              to authenticated;
grant execute on function create_household(text, text)      to authenticated;
grant execute on function redeem_invite(text, text)         to authenticated;
grant execute on function my_households()                   to authenticated;
grant execute on function contribute_to_goal(uuid, numeric, date) to authenticated;
