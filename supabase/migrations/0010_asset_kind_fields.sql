-- =============================================================================
-- 0010 — Trường riêng theo loại tài sản
-- =============================================================================
-- Một form chung cho tám loại là một form đúng cho không loại nào. Cột
-- `institution` đang mang bốn nghĩa khác nhau tuỳ `asset_kind` (tên ngân hàng ·
-- chỗ cất vàng · địa chỉ nhà đất · TÊN NGƯỜI VAY), và hai loại thì cần thêm
-- thứ mà bảng chưa có chỗ để ghi.
--
-- Migration này CHỈ THÊM, không sửa và không xoá:
--
--   * ba cột mới, tất cả `null`-able, không cột nào có default
--   * không đụng `institution` — nghĩa của nó vẫn do `asset_kind` quyết định,
--     nhưng ở TẦNG NHÃN (assetShape() ở packages/domain), không phải tầng cột.
--     Tách `institution` thành bốn cột riêng sẽ bắt phải sửa `finance_metrics`,
--     mọi mapper và mọi màn hình đang đọc nó — đổi lấy đúng con số không.
--
-- Vì thế mọi hàng đang có và MỌI TRUY VẤN đang chạy đều không đổi hành vi:
-- `finance_metrics` cộng theo `liquidity` nên không nhìn thấy ba cột này chút
-- nào. Đây là điều kiện bắt buộc khi không có Docker local để tập dượt — một
-- migration chỉ-thêm-cột-nullable là loại migration hiếm hoi không có bước lùi.
--
-- KHÔNG có enum mới nào ở đây, nên không vướng ràng buộc "enum phải commit ở
-- migration trước" đã gặp ở `0007`: `quantity_unit` cố ý là `text` + CHECK chứ
-- không phải kiểu enum, để thêm đơn vị sau này không cần thêm một cặp migration.


-- -----------------------------------------------------------------------------
-- 1. SỐ LƯỢNG HIỆN VẬT — vàng
-- -----------------------------------------------------------------------------
-- Với vàng, `current_value` là thứ SẼ SAI. Giá vàng đổi thì con số tiền khai
-- tháng trước thành vô nghĩa, còn "2 chỉ" thì đúng mãi mãi. Ghi cả hai và coi
-- SỐ LƯỢNG là dữ liệu gốc — cùng nguyên tắc với "ngày âm là dữ liệu gốc,
-- next_occurrence_date chỉ là cache".
--
-- App KHÔNG tra giá vàng và KHÔNG tự nhân số lượng ra tiền. Một con số tiền tự
-- đổi mà không ai khai ra là đúng thứ ràng buộc #4 cấm: giá trị phải là thứ MỘT
-- NGƯỜI ĐÃ NÓI RA TẠI MỘT THỜI ĐIỂM.

alter table assets add column if not exists quantity numeric(14,3);

-- Đơn vị đi kèm, KHÔNG quy đổi. 1 cây = 1 lượng = 10 chỉ, nhưng app không tự
-- chuyển: quy đổi là phép tính người dùng không nhìn thấy, nên khi nó sai thì
-- không ai bắt được. Ghi đúng chữ họ nói, hiện lại đúng chữ đó.
alter table assets add column if not exists quantity_unit text;

comment on column assets.quantity is
  'Số lượng hiện vật (vàng). Đây là DỮ LIỆU GỐC, còn current_value là con số '
  'khai tại một thời điểm và sẽ cũ đi khi giá đổi. App không bao giờ tự tra giá '
  'rồi nhân ra tiền — xem ràng buộc #4.';

comment on column assets.quantity_unit is
  'chi | luong | cay. KHÔNG quy đổi tự động dù 1 cây = 1 lượng = 10 chỉ.';

-- Hai cột đi liền nhau: có số thì phải có đơn vị, và ngược lại. "3" không có
-- đơn vị là một con số không đọc được; "chỉ" không có số cũng vậy.
alter table assets drop constraint if exists assets_quantity_unit_pair;
alter table assets add constraint assets_quantity_unit_pair check (
  (quantity is null and quantity_unit is null)
  or (quantity is not null and quantity_unit in ('chi', 'luong', 'cay'))
);

-- Số lượng âm không có nghĩa. `0` thì hợp lệ — bán hết vàng nhưng còn giữ hàng
-- để xem lịch sử là một trạng thái thật.
alter table assets drop constraint if exists assets_quantity_nonneg;
alter table assets add constraint assets_quantity_nonneg check (
  quantity is null or quantity >= 0
);


-- -----------------------------------------------------------------------------
-- 2. NGÀY HẸN TRẢ — khoản cho vay
-- -----------------------------------------------------------------------------
-- `asset_kind = 'receivable'` là tiền MÌNH cho người khác vay (ngược chiều với
-- bảng `debts`). Nó có một ngày mà không loại tài sản nào khác có: ngày hẹn
-- trả.
--
-- CỐ Ý KHÔNG nối vào `upcoming_needs`. View đó trả lời "sắp tới nhà mình cần
-- BAO NHIÊU" — tức tiền phải CHI RA. Một khoản sắp được người ta trả lại là
-- tiền đi vào, và cộng nó vào cùng một con số sẽ làm con số hero sai theo
-- hướng nguy hiểm nhất: trông như nhà mình cần chuẩn bị ít hơn thực tế, dựa
-- trên một lời hứa của người khác.
--
-- Nó cũng KHÔNG sinh nhắc "X chưa trả tiền" — ràng buộc #6. Ngày này để người
-- ghi tự nhớ mình đã hẹn bao giờ, không phải để app đi đòi hộ.

alter table assets add column if not exists due_date date;

comment on column assets.due_date is
  'Ngày hẹn trả của khoản cho vay (asset_kind=''receivable''). KHÔNG vào '
  'upcoming_needs: view đó là tiền PHẢI CHI, còn đây là tiền có thể nhận lại — '
  'trộn vào làm con số «cần chuẩn bị» nhỏ đi dựa trên lời hứa của người khác. '
  'Cũng không sinh nhắc theo ràng buộc #6.';
