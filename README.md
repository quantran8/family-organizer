# Tài liệu triển khai

Năm tài liệu tách theo ranh giới **bất biến vs chính sách**. Mỗi tài liệu có một
phạm vi duy nhất; nếu phải sửa cùng lúc hai file cho một thay đổi, ranh giới đã bị
vi phạm ở đâu đó.

| File | Phạm vi | Đổi khi nào |
|---|---|---|
| `../schema.sql` | Cấu trúc dữ liệu, RLS, trigger, RPC nguyên tử | Hiếm. Migration bắt buộc |
| `01-architecture.md` | App chạy thế nào: lớp, cache, offline, upload, thông báo | Khi đổi hạ tầng |
| `02-data-contract.md` | Type, repository interface, zod schema | Khi schema đổi |
| `03-business-logic.md` | Hàm thuần: trạng thái tài chính, lịch âm, lặp lại, nhắc | Thường xuyên |
| `04-design-system.md` | Tokens, chữ, ngôn ngữ, mẫu trạng thái, tiếp cận | Thường xuyên |
| `05-screens-and-flows.md` | Route, bố cục từng màn hình, luồng, thứ tự dựng | Thường xuyên |

## Quy tắc phụ thuộc

```
05 (màn hình) → 04 (design system)
       ↓
02 (contract) → schema.sql
       ↓
03 (domain)   ← không phụ thuộc gì cả
```

`packages/domain` là package dùng chung **duy nhất**, vì nó là thứ duy nhất có hai
người tiêu thụ ở hai runtime (Hermes và Deno). Nó không import React, không import
Supabase, và không có dependency runtime nào — kể cả zod.

M��i thứ chỉ mobile dùng (design tokens, repository, zod schema) nằm trong
`apps/mobile`. Tiêu chí tách package: hai người tiêu thụ trở lên, ở hai runtime
khác nhau. Không đạt thì để trong app.

## Thứ tự đọc khi bắt đầu code

1. `01` §2 (phân lớp) và §3 (tầng dữ liệu) — dựng khung trước
2. `02` toàn bộ — sinh type và repository, chưa cần UI
3. `03` §1–3 — viết domain + test, chưa cần UI
4. `04` §2, §3, §7 — tokens và ngôn ngữ, trước khi vẽ màn hình đầu tiên
5. `05` §10 — thứ tự dựng màn hình

## Ba ràng buộc không được vi phạm

1. **Không tổng hợp tiền theo người** ở bất cứ đâu (`05 §6.1`).
2. **Ngày âm là dữ liệu gốc**, ngày dương là cache do một nơi duy nhất ghi (`03 §3`).
3. **Lịch sử không backfill được** — `money_events` và `money_snapshots` ghi từ ngày
   đầu dù MVP chưa có màn hình nào cho chúng (`schema.sql` mục 14).
