-- =============================================================================
-- 0003 — QUYỀN BẢNG CHO ROLE `authenticated`
-- =============================================================================
-- 0001 bật RLS và viết policy cho 18 bảng, nhưng KHÔNG cấp quyền bảng nào cả.
-- Hai thứ đó độc lập nhau và đều bắt buộc:
--
--   GRANT  quyết định role có được ĐỘNG tới bảng không.
--   RLS    quyết định trong bảng đó thấy được DÒNG nào.
--
-- Thiếu GRANT thì mọi truy vấn của app trả `permission denied for table ...`,
-- kể cả khi policy cho phép — RLS không bao giờ được gọi tới. Không có màn
-- hình nào chạy được.
--
-- (Supabase để `postgres`/`service_role` sẵn quyền, nên migration ở 0001 chạy
-- trót lọt và lỗi chỉ lộ ra khi client thật gọi qua PostgREST với role
-- `authenticated`.)
--
-- Cấp theo NHU CẦU THẬT, không cấp cả cụm:
--   - `money_events` chỉ SELECT + INSERT. Sửa/xoá đã bị trigger chặn ở 0001,
--     nhưng không cấp quyền thì lỗi hiện ra là "permission denied" thay vì câu
--     "money_events is append-only" — câu sau nói đúng lý do hơn.
--   - Xoá là XOÁ MỀM (đặt deleted_at) nên KHÔNG cấp DELETE cho bảng nào.
--     Xoá cứng chỉ do Edge `purge-soft-deleted` chạy bằng service_role.
-- =============================================================================

grant usage on schema public to authenticated;

-- Bảng dữ liệu thường: đọc + ghi + sửa. Không có DELETE (xem trên).
grant select, insert, update on
  profiles,
  households,
  members,
  invites,
  push_tokens,
  tasks,
  task_instances,
  events,
  assets,
  debts,
  upcoming_payments,
  goals,
  attention_items,
  money_snapshots,
  documents,
  document_files,
  reminders
to authenticated;

-- Append-only: ghi thêm được, không sửa được (trigger ở 0001 §5.5 chặn nốt).
grant select, insert on money_events to authenticated;

-- money_events.id là bigserial → cần quyền trên sequence để INSERT chạy được.
grant usage, select on all sequences in schema public to authenticated;

-- View đọc cho dashboard.
grant select on home_feed, finance_metrics, money_feed to authenticated;

-- RPC nguyên tử ở 0001 §12 (0002 đã tự grant phần của nó).
grant execute on function settle_payment(uuid, date, text)          to authenticated;
grant execute on function update_asset_value(uuid, numeric, date, text) to authenticated;

-- Hàm dùng trong policy: RLS gọi chúng dưới danh nghĩa người dùng.
grant execute on function current_profile_id()        to authenticated;
grant execute on function is_household_member(uuid)   to authenticated;
