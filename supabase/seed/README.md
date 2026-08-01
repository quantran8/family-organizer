# `supabase/seed/`

Dữ liệu tham chiếu — **không phải** dữ liệu người dùng. Seed bằng service role, client không bao giờ ghi.

## `vaccine-schedule.sql` — CỔNG CHẶN PHÁT HÀNH

File này đang **cố ý để trống**.

Đây không phải việc chưa làm xong. Đây là một điều kiện chặn phát hành theo `07 §4.2`:

> **Một người có chuyên môn y tế phải đọc và xác nhận file này trước khi ship.**

### Vì sao để trống thay vì seed tạm

Sai một mũi tiêm hoặc sai một mốc tuổi là **gây hại thật** — khác về bản chất với mọi lỗi khác trong repo này. Một ngày giỗ sai thì bỏ lỡ một dịp; một mốc tiêm sai thì một đứa trẻ không được bảo vệ đúng lúc.

Bảng rỗng làm màn hình hiện trạng thái rỗng **thành thật**. Một seed đoán mò làm nó hiện dữ liệu y tế sai mà **trông như đúng** — và người dùng không có cách nào phân biệt.

### Không được seed từ

- trí nhớ của lập trình viên
- output của mô hình ngôn ngữ
- blog, bài báo, hay trang tổng hợp

Nguồn phải là **văn bản chính thức** (Chương trình Tiêm chủng mở rộng, Bộ Y tế).

### Ba cột bắt buộc điền thật

| Cột | Nghĩa |
|---|---|
| `source_name` | tên văn bản chính thức |
| `source_date` | ngày ban hành |
| `schedule_version` | phiên bản của file này |

Không có ba cột này thì không được ship. Chúng tồn tại để một năm sau còn truy được lịch đang chạy trong app đến từ đâu.

### Khi đã có file được xác nhận

Điền vào `vaccine-schedule.sql` rồi chạy bằng service role. **Không phải sửa dòng code nào** — `buildVaccineSchedule()` ở `packages/domain` là hàm thuần của `items`, toàn bộ tri thức y tế nằm trong dữ liệu.

Đó là một ràng buộc kiến trúc có chủ ý (`03 §11.2`): nếu lịch tiêm nằm trong code thì việc cập nhật nó thành một PR, và không ai có chuyên môn y tế đọc PR. Nằm trong file dữ liệu thì nó là một tài liệu, và tài liệu thì xem xét được.
