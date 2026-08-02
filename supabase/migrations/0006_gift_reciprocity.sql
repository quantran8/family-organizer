-- =============================================================================
-- 0006 — SỔ HIẾU HỈ: nghĩa vụ đáp lễ  (07 §3.2, §3.3, §3.5)
-- =============================================================================
-- Sửa hai chỗ sai của thiết kế v2.1, cả hai đều về KHUNG NHÌN chứ không về dữ
-- liệu:
--
-- 1. Tên "sổ mừng cưới" và `occasion default 'wedding'` làm cưới thành dịp mặc
--    định, bảy dịp còn lại thành ngoại lệ. Enum đã có đủ tám từ đầu — cái sai
--    nằm ở default và ở mọi chuỗi hiển thị phủ lên nó.
--
-- 2. Nghiêm trọng hơn: module được dựng như một SỔ GHI CHÉP — hai chiều song
--    song, không chiều nào tham chiếu chiều nào. Với người Việt, một khoản mừng
--    nhận được KHÔNG phải sự kiện đã khép lại; nó mở ra một nghĩa vụ. Không có
--    `reciprocates_id` thì app không trả lời được câu hỏi mà người dùng thật sự
--    mang trong đầu: nhà nào mình còn chưa đi lại?
--
-- ĐÂY KHÔNG PHẢI SỐ DƯ NỢ. Ranh giới ở 07 §3.6, và nó hẹp: trạng thái của MỘT
-- KHOẢN (biến mất khi đáp xong) khác hẳn số dư của MỘT MỐI QUAN HỆ (luôn hiện,
-- cộng dồn). Phép thử: bỏ hết số tiền đi mà thông tin vẫn còn giá trị thì đó là
-- nghĩa vụ.
--
-- Migration THUẦN CỘNG THÊM: `gift_entries` đã có dữ liệu thật.


-- -----------------------------------------------------------------------------
-- 1. Bỏ default 'wedding'
-- -----------------------------------------------------------------------------
-- Không có dịp nào là dịp mặc định. Người nhập chọn — kể cả trong luồng nhập
-- hàng loạt, nơi dịp được chọn MỘT LẦN cho cả đợt rồi áp cho mọi dòng.
--
-- Cột vẫn `not null`: hàng cũ giữ nguyên giá trị đã có, chỉ hàng mới bắt buộc
-- nói rõ dịp.

alter table gift_entries alter column occasion drop default;


-- -----------------------------------------------------------------------------
-- 2. reciprocates_id — khoản `given` này đáp lại khoản `received` nào
-- -----------------------------------------------------------------------------
-- Ghép cặp ở CẤP TỪNG KHOẢN. Không có cột nào ở cấp contact, và đó là toàn bộ
-- khác biệt giữa thiết kế này và một sổ nợ.
--
-- `on delete set null`: xoá mềm khoản nhận thì khoản đi vẫn còn, chỉ mất liên
-- kết. Nghĩa vụ biến mất cùng căn cứ của nó.

alter table gift_entries
  add column reciprocates_id uuid references gift_entries(id) on delete set null;

comment on column gift_entries.reciprocates_id is
  'Khoản `received` mà khoản `given` này đáp lại. Chỉ có ở direction = given, '
  'cùng contact. KHÔNG PHẢI số dư nợ — xem 07 §3.6.';

-- Một khoản nhận được đáp bởi TỐI ĐA MỘT khoản đi.
--
-- Không có ràng buộc này thì hai khoản `given` cùng trỏ vào một khoản `received`
-- sẽ làm `gift_outstanding` đúng nhưng làm mọi phép đếm ở UI sai lệch — và tệ
-- hơn, mở đường cho việc "đáp lễ nhiều lần cho đủ tiền", đúng thứ mà 07 §3.6
-- cấm.
create unique index gift_entries_reciprocates_uniq
  on gift_entries (reciprocates_id)
  where reciprocates_id is not null and deleted_at is null;


-- -----------------------------------------------------------------------------
-- 2b. no_reciprocity_needed — khoản chỉ nhận, không cần trả  (07 §3.4b)
-- -----------------------------------------------------------------------------
-- KHÔNG PHẢI KHOẢN NHẬN NÀO CŨNG SINH NGHĨA VỤ. Bốn trường hợp có thật: bố mẹ
-- mừng con (cho, không phải trao đổi), người trên mừng người dưới (nghĩa vụ
-- hiếu hỉ không đối xứng theo vai vế), người đã mất hoặc bạn mất liên lạc
-- (nghĩa vụ không còn đối tượng), và đã đáp bằng cách khác mà app không thấy
-- được.
--
-- Thiếu cột này thì tính năng hỏng chứ không phải thiếu tiện nghi: danh sách
-- chưa đáp lễ dần đầy những dòng KHÔNG BAO GIỜ ĐÓNG ĐƯỢC — khoản bố mẹ mừng cưới
-- nằm đó vĩnh viễn — và một danh sách nghĩa vụ không xoá được sinh ra đúng thứ
-- áy náy mà thiết kế tránh.
--
-- Ở TỪNG KHOẢN, KHÔNG Ở CONTACT: cùng một người vừa sinh nghĩa vụ vừa không —
-- bố mẹ mừng cưới là cho, bố mẹ mừng tân gia thì có đi có lại.
--
-- APP KHÔNG BAO GIỜ TỰ ĐOÁN cờ này: không suy từ `side`, không đọc
-- `relation_note` tìm chữ "bố mẹ", không suy từ số tiền. App không biết vai vế,
-- không biết ai còn sống — đoán sai ở đây là xúc phạm, không phải bất tiện.

alter table gift_entries
  add column no_reciprocity_needed boolean not null default false;

comment on column gift_entries.no_reciprocity_needed is
  'Khoản nhận này không sinh nghĩa vụ đáp lễ. CHỈ người dùng đặt, app không bao '
  'giờ tự suy ra. Xem 07 §3.4b.';

-- Chỉ có nghĩa ở khoản NHẬN. Khoản đi không có nghĩa vụ để miễn.
alter table gift_entries add constraint gift_entries_no_reciprocity_received_only
  check (not no_reciprocity_needed or direction = 'received');

-- Index cho view `gift_outstanding`: quét khoản `received` chưa ai trỏ tới.
create index gift_entries_outstanding_idx
  on gift_entries (household_id, contact_id, occurred_on)
  where direction = 'received'
    and occasion <> 'funeral'
    and not no_reciprocity_needed
    and deleted_at is null;


-- -----------------------------------------------------------------------------
-- 3. Ba bất biến của việc ghép cặp — ép ở DB, không dựa vào client
-- -----------------------------------------------------------------------------
-- Ghép sai là hỏng dữ liệu quan hệ họ hàng, và người dùng không có cách nào tự
-- phát hiện. Cả ba đều kiểm được bằng một truy vấn, nên chúng thuộc về trigger
-- chứ không thuộc về code app.

create or replace function check_gift_reciprocity() returns trigger
  language plpgsql
  -- Đọc bảng gift_entries dưới quyền người gọi: RLS còn hiệu lực, nên không
  -- ghép được vào khoản của nhà khác kể cả khi đoán đúng id.
  as $$
declare
  target gift_entries%rowtype;
begin
  if new.reciprocates_id is null then
    return new;
  end if;

  -- (a) Chỉ khoản ĐI mới đáp lễ được. Chiều ngược lại vô nghĩa: khoản nhà mình
  --     nhận không "đáp" cái gì cả.
  if new.direction <> 'given' then
    raise exception 'Chỉ khoản `given` mới có reciprocates_id (07 §3.3)';
  end if;

  select * into target from gift_entries where id = new.reciprocates_id;

  if not found then
    raise exception 'Khoản được đáp lễ không tồn tại';
  end if;

  -- (b) Phải là khoản NHẬN, và của CÙNG MỘT NHÀ. Nghĩa vụ thuộc về contact —
  --     đi đám nhà chú Ba không đáp được khoản bác Tư mừng.
  if target.direction <> 'received' then
    raise exception 'Chỉ đáp lễ được một khoản `received` (07 §3.3)';
  end if;

  if target.contact_id <> new.contact_id then
    raise exception 'Chỉ đáp lễ được khoản của cùng một contact (07 §3.3)';
  end if;

  -- (c) Tang lễ không tạo nghĩa vụ, nên không có gì để đáp — 07 §3.5.
  --     Chiều ngược lại KHÔNG cấm: nhà mình đi phúng viếng vẫn đáp lễ được cho
  --     một khoản nhận ở dịp khác.
  if target.occasion = 'funeral' then
    raise exception 'Khoản phúng viếng không tạo nghĩa vụ đáp lễ (07 §3.5)';
  end if;

  -- (d) Đã đánh dấu không cần đáp thì không có nghĩa vụ để ghép vào — 07 §3.4b.
  --     Người dùng muốn ghép thật thì bật lại cờ trước; hai trạng thái này loại
  --     trừ nhau nên để cả hai cùng đúng sẽ làm UI phải chọn hiện cái nào.
  if target.no_reciprocity_needed then
    raise exception 'Khoản này đã đánh dấu không cần đáp lễ (07 §3.4b)';
  end if;

  return new;
end $$;

create trigger gift_entries_reciprocity_check
  before insert or update of reciprocates_id, direction, contact_id
  on gift_entries
  for each row execute function check_gift_reciprocity();


-- Chiều ngược lại của (d): không bật cờ "không cần đáp" khi ĐÃ có khoản đi ghép
-- vào. Nghĩa vụ đó đã hoàn thành rồi — bật cờ lúc này làm mất liên kết đã đúng.
-- Muốn bật thì gỡ ghép cặp trước.
create or replace function check_no_reciprocity_flag() returns trigger
  language plpgsql as $$
begin
  if new.no_reciprocity_needed and not coalesce(old.no_reciprocity_needed, false) then
    if exists (
      select 1 from gift_entries r
      where r.reciprocates_id = new.id and r.deleted_at is null
    ) then
      raise exception 'Khoản này đã được đáp lễ; gỡ ghép cặp trước (07 §3.4b)';
    end if;
  end if;
  return new;
end $$;

create trigger gift_entries_no_reciprocity_check
  before update of no_reciprocity_needed on gift_entries
  for each row execute function check_no_reciprocity_flag();


-- -----------------------------------------------------------------------------
-- 4. VIEW gift_outstanding — các khoản nhận CHƯA ĐÁP LỄ
-- -----------------------------------------------------------------------------
-- Nguồn của mục "chưa đáp lễ" và của dòng trạng thái trong form nhập.
--
-- CỐ Ý KHÔNG CÓ:
--   · cột tổng tiền  — "còn 5 nhà, tổng 8 triệu" là số dư nợ mặc áo khác
--   · số ngày quá hạn — nghĩa vụ đáp lễ KHÔNG CÓ HẠN; chờ đến khi nhà đó có việc
--   · thứ tự theo tiền — sắp theo NGÀY NHẬN, nghĩa vụ lâu nhất nằm trên
--
-- View trả từng dòng và chỉ từng dòng. Không có chỗ nào để nhét một con số tổng
-- vào, và đó là chủ ý — xem danh sách hàm cấm ở 03 §11.3.

create or replace view gift_outstanding as
  select
    g.id            as entry_id,
    g.household_id,
    g.contact_id,
    c.display_name,
    c.relation_note,
    c.side,
    g.occasion,
    g.amount,
    g.in_kind_note,
    g.occurred_on
  from gift_entries g
  join contacts c on c.id = g.contact_id and c.deleted_at is null
  where g.direction  = 'received'
    and g.deleted_at is null
    -- 07 §3.5: phúng viếng được ghi và hiện trong lịch sử, nhưng không bao giờ
    -- nằm ở đây. Đáp lễ một đám tang nghĩa là chờ nhà đó có tang.
    and g.occasion  <> 'funeral'
    -- 07 §3.4b: bố mẹ mừng con, người trên mừng người dưới, người đã mất. Không
    -- có cái lọc này thì danh sách đầy dần những dòng không bao giờ đóng được.
    and not g.no_reciprocity_needed
    and not exists (
      select 1 from gift_entries r
      where r.reciprocates_id = g.id and r.deleted_at is null
    );

comment on view gift_outstanding is
  'Khoản nhận chưa được đáp lễ, sắp theo ngày nhận. KHÔNG có cột tổng và '
  'không bao giờ được thêm — xem 07 §3.6.';


-- -----------------------------------------------------------------------------
-- 5. Quyền
-- -----------------------------------------------------------------------------
-- View kế thừa RLS của `gift_entries` và `contacts` (cả hai bật ở 0005), nên
-- không cần policy riêng.

grant select on gift_outstanding to authenticated;
