-- =============================================================================
-- 0009 — Đặt lại comment của `upcoming_needs`
-- =============================================================================
-- CHỈ MỘT LỆNH, và nó chỉ sửa metadata — không đụng dữ liệu, không đụng cấu
-- trúc.
--
-- Vì sao cần một migration riêng: `0008 §8` dùng `drop view` + `create view`
-- (bắt buộc, vì cột `kind` chèn vào GIỮA danh sách cột, mà `create or replace`
-- chỉ thêm được cột vào cuối). `DROP VIEW` kéo theo cả comment, và `0008` quên
-- đặt lại — nên comment đang sống trên cloud vẫn là bản của `0004 §10`:
--
--     'goals CỐ Ý KHÔNG có trong view này...'
--
-- Câu đó giờ SAI theo đúng nghĩa đen: từ v3, goals CÓ trong view, mang
-- kind='optional'. Một comment nói ngược lại code là thứ tệ hơn cả không có
-- comment — người đọc sau sẽ không biết cái nào là ý định thật.
--
-- (`0008` đã được sửa cùng lúc để lần chạy trên một DB trống là đúng ngay từ
-- đầu; migration này chỉ để chữa DB đã chạy `0008` bản cũ.)

comment on view upcoming_needs is
  'Cột `kind` tách NGHĨA VỤ khỏi NGUYỆN VỌNG. Ai đọc view này rồi cộng TẤT CẢ '
  'các dòng lại là đang phá đúng nguyên tắc mà cột đó sinh ra để giữ: '
  'projectRunway CHỈ cộng kind=''mandatory'', còn kind=''optional'' (goals) trả '
  'riêng cho một khối «có thể hoãn» trên cùng màn hình. Cùng màn hình KHÔNG '
  'phải cùng một con số. Xem 08 §2.3 và 10 §5.';
