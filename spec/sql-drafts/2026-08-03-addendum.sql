-- =============================================================================
-- Migration: addendum v2.1
-- =============================================================================
-- Chạy sau 2026-08-02-local-modules.sql. Đọc 08-addendum-v2.1.md trước.
--
-- Hai đảo ngược so với 06-delta-v2.md:
--   1. money_events được surface lên UI (trước đây ghi mà không có màn hình)
--   2. goals trở lại P0
-- =============================================================================

begin;

-- =============================================================================
-- 1. LỊCH SỬ BIẾN ĐỘNG — VIEW ĐỌC  (08 §1)
-- =============================================================================
-- money_events đã tồn tại và ranh giới của nó đã đúng: log THAY ĐỔI CỦA BỨC
-- TRANH, không log giao dịch chi tiêu. Thiếu duy nhất một đường để đọc.
--
-- ĐƯỜNG PHÂN GIỚI CỦA CẢ MỤC NÀY:
--   Liệt kê thì trung thực khi dữ liệu thiếu. Cộng tổng thì không.
--   "Sửa xe −2tr · 15/9" vẫn đúng dù còn mười khoản chưa ghi.
--   "Tháng 9 chi 12tr" thì tự nhận là đầy đủ, và sẽ sai 30-40% mãi mãi.

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
  'Nguồn cho màn hình money/history.tsx và khối LỊCH SỬ trong chi tiết tài sản. '
  'CHỈ ĐƯỢC HIỂN THỊ DẠNG DANH SÁCH. Cấm vẽ tổng theo tháng thành đường xu '
  'hướng: khoảng trống trong việc ghi chép sẽ trông y hệt thay đổi trong chi '
  'tiêu, và người dùng sẽ đọc nó như sự thật. Xem 08 §1.4.';

-- CỐ Ý KHÔNG TẠO:
--   - view tổng hợp theo tháng
--   - view phân loại theo danh mục
--   - view tổng hợp theo actor_profile_id
-- Nếu thấy trong PR thì reject. Xem 08 §3.
--
-- Tổng của một kỳ được phép, nhưng tính ở client và bắt buộc kèm số lượng bản
-- ghi + chữ "đã ghi" — nên nó không thuộc về SQL.

alter view money_history set (security_invoker = true);


-- =============================================================================
-- 2. MỤC TIÊU — TRỞ LẠI P0  (08 §2)
-- =============================================================================
-- Đảo ngược 06 §8. Mục tiêu NHÌN VỀ PHÍA TRƯỚC — cùng hướng với trái tim sản
-- phẩm — nên nó thuộc về mô hình này. Trước đó bị gộp nhầm với phần theo dõi
-- tài sản đã cắt.

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


-- RPC góp thêm vào mục tiêu — nguyên tử, ghi money_events như tài sản.
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

-- Ghi chú: actor_profile_id trong money_events trả lời "ai khai con số này"
-- khi đọc lịch sử CỦA MỘT KHOẢN. Nó KHÔNG BAO GIỜ được nhóm lại thành
-- "anh góp bao nhiêu, em góp bao nhiêu". Đó là bảng điểm ở dạng trông giống
-- minh bạch nhất, và vì thế là dạng nguy hiểm nhất. Xem 08 §2.3.


commit;


-- =============================================================================
-- GHI CHÚ CHO NGƯỜI TRIỂN KHAI
-- =============================================================================
-- 1. Màn hình cần thêm (05):
--    - money/history.tsx  P0  — dòng thời gian cả nhà, lọc theo khoản/kỳ
--    - khối LỊCH SỬ trong money/asset/[id].tsx
--    - money/goals.tsx và money/goal/[id].tsx trở lại P0
--    - khối MỤC TIÊU trở lại money/index.tsx, đặt DƯỚI tài sản và khoản sắp trả
--    - Nhà mình KHÔNG hiện mục tiêu: nó không trả lời "sắp có gì cần chuẩn bị"
--
-- 2. Cấm, kiểm tra khi review PR:
--    - biểu đồ đường/cột của tổng theo tháng
--    - so sánh giữa các kỳ
--    - danh mục chi tiêu
--    - bất kỳ group by actor_profile_id hoặc member_id nào
--    - gợi ý "mỗi tháng cần góp bao nhiêu để đạt mục tiêu"
--
-- 3. Test bắt buộc bổ sung (03 §11):
--    - money_history trả đúng entity_title khi entity đã xoá mềm
--    - contribute_to_goal ghi đúng một dòng money_events
--    - không có view nào trả về cột nhóm theo member_id hoặc actor_profile_id
