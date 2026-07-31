# Nối dự án vào Supabase Cloud

Dự án **không dùng stack Docker local** (đã chốt). Mọi thứ chạy trên cloud.

Hệ quả phải nhớ: mọi lệnh Supabase cần Docker đều không dùng được, và chúng đã
bị bỏ khỏi `package.json` để không ai gọi nhầm:

| Lệnh không dùng được | Cần Docker để | Làm gì thay thế |
| --- | --- | --- |
| `supabase db reset` | dựng Postgres local | `pnpm db:push` đẩy thẳng lên cloud |
| `supabase db diff` | dựng shadow database | `pnpm db:pull` rồi đọc diff bằng git |
| `supabase functions serve` | chạy Deno runtime | `pnpm fn:deploy` rồi xem Dashboard → Edge Functions → Logs |

Nghĩa là **không có bước tập dượt nào ở giữa**: một migration sai trên cloud là
dữ liệu thật, và một Edge Function sai cũng chỉ phát hiện được sau khi deploy.
Đọc kỹ mục **6** trước khi chạy `smoke.sql`.

---

## 1 · Tạo project

<https://supabase.com/dashboard> → **New project**.

| Trường | Đặt gì | Vì sao |
|---|---|---|
| Name | `nha-minh` | tuỳ ý |
| Database password | sinh ngẫu nhiên, **lưu vào password manager ngay** | Supabase không cho xem lại. Mất nó thì phải reset, và `db push` cần nó |
| Region | **Singapore (ap-southeast-1)** | gần Việt Nam nhất. Region không đổi được sau khi tạo |
| Postgres version | mặc định | ghi lại số major — mục 3 cần |

Chờ ~2 phút cho project khởi tạo xong.

---

## 2 · Điền `.env` cho app

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Lấy hai giá trị ở **Dashboard → Project Settings → API**:

- `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
- `anon` `public` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

`.env` đã bị `.gitignore` chặn. **Đừng** chép `service_role` key vào đây — nó bỏ
qua toàn bộ RLS, và nhúng nó vào app là trao chìa khoá đọc-ghi mọi nhà cho bất
kỳ ai gỡ được bundle.

---

## 3 · Nối CLI vào project

```bash
supabase login
supabase link --project-ref <project-ref>
```

`<project-ref>` là chuỗi 20 ký tự trong URL dashboard:
`https://supabase.com/dashboard/project/`**`abcdefghijklmnopqrst`**

Sau khi link, mở `supabase/config.toml` và sửa `major_version` ở khối `[db]`
cho **khớp** phiên bản Postgres của project (Dashboard → Settings →
Infrastructure). Lệch số này thì `db push` so sai schema.

---

## 4 · Đẩy schema lên

```bash
pnpm db:push
```

Đẩy ba migration theo thứ tự:

| File | Nội dung | Bỏ qua thì sao |
|---|---|---|
| `0001_init.sql` | toàn bộ schema, RLS, view, trigger | — |
| `0002_onboarding_rpc.sql` | `create_household`, `join_household` | F1 và F2 kẹt vòng luẩn quẩn RLS: chưa là member thì không tạo được nhà, mà tạo nhà mới thành member |
| `0003_grants.sql` | `GRANT` bảng cho role `authenticated` | **mọi** truy vấn trả `permission denied` — `schema.sql` không có một lệnh GRANT nào |

Kiểm nhanh: Dashboard → Table Editor phải thấy 22 bảng.

---

## 5 · Deploy Edge Function

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role key>
pnpm fn:deploy
```

`service_role` key lấy ở **Settings → API**. Nó chỉ sống ở đây, không vào git,
không vào `.env` của app.

Hai function của G4 chạy bằng service role vì chúng làm việc cho **mọi** nhà,
không thay mặt người dùng nào — RLS theo `auth.uid()` sẽ chặn sạch. Đổi lại,
chúng tự lọc `household_id` trong từng câu truy vấn, không có lưới an toàn phía
dưới.

Ba function của G8 (`presign-upload`, `confirm-upload`, `sign-download`) thì
**ngược lại**: client gọi thẳng, thay mặt một người dùng thật, nên chúng dùng
JWT của người gọi và RLS vẫn là lưới an toàn. Service role ở đó là lựa chọn
SAI — chúng nhận `documentId` từ thân request, và với service role thì một id
của nhà khác cũng đọc được.

### Kho file (Cloudflare R2) — cần cho phần đính ảnh của G8

```bash
supabase secrets set \
  R2_ACCOUNT_ID=<account id> \
  R2_ACCESS_KEY_ID=<access key> \
  R2_SECRET_ACCESS_KEY=<secret> \
  R2_BUCKET=<tên bucket>
```

Lấy ở **Cloudflare Dashboard → R2 → Manage API tokens**. `R2_ACCOUNT_ID` là
chuỗi hex trong URL dashboard R2.

**Chưa đặt cũng không sao.** Ba function trả `503 storage_not_configured` và
app hiện đúng câu đó; phần *ghi thông tin giấy tờ + vị trí bản giấy* — đường
chính của tính năng (05 §7.2) — không đụng tới R2 và chạy đầy đủ.

Bucket phải để **KHÔNG công khai**. Giấy tờ ở đây là căn cước, hộ chiếu, giấy
khai sinh: một URL đoán được là một rò rỉ không thu hồi được. Mọi lần đọc đều đi
qua `sign-download` và nhận một URL sống 15 phút.

Hai chỗ R2 khác S3, cả hai đều làm chữ ký sai theo kiểu khó đoán vì thông báo
lỗi không nhắc gì tới nguyên nhân:

- Region **luôn** là `auto`. Đặt `ap-southeast-1` cho giống Supabase → 403.
- Bucket nằm trong **path**, không phải subdomain. Virtual-host style ký ra chữ
  ký hợp lệ nhưng trỏ tới một host không tồn tại.

### Cron

Dashboard → **Integrations → Cron** (hoặc SQL bên dưới).

Cron của Postgres tính theo **UTC**, không theo giờ máy bạn — `0 17` là 00:00
hôm sau ở Việt Nam. Cột "giờ VN" dưới đây là giờ người dùng thật sự trải nghiệm.

| Giờ VN | UTC | Job | Vì sao ở đúng chỗ đó trong thứ tự |
|---|---|---|---|
| 02:00 | `0 19` | `purge-soft-deleted` | xoá cứng bản ghi quá 30 ngày, kèm xoá object R2 |
| 03:00 | `0 20` | `sweep-orphan-uploads` | dọn `document_files` pending quá 24h |
| 03:30 | `30 20` | `generate-task-instances` | vật hoá việc lặp, cửa sổ 90 ngày |
| 04:00 | `0 21` | `refresh-lunar-dates` | tính `next_occurrence_date` cho sự kiện âm lịch |
| 04:30 | `30 21` | `build-reminders` | **phải chạy sau** hai job trên — nó đọc `task_instances` và `next_occurrence_date` |
| 05:00 | `0 22` | `spawn-debt-installments` | sinh kỳ trả nợ tiếp theo |
| 05:15 | `15 22` | `expire-attention-items` | đóng cờ cần trao đổi đã quá `expires_at` |
| 09:00 | `0 2` | `nudge-snapshot-update` | **phải chạy sau `build-reminders`** — xem dưới |
| 23:50 | `50 16` | `autosnapshot-monthly` | tự thoát nếu chưa phải ngày cuối tháng |

**Hai phụ thuộc thứ tự không có gì trong code nói ra:**

1. `build-reminders` đọc `task_instances` và `next_occurrence_date`, nên nó phải
   chạy **sau** `generate-task-instances` và `refresh-lunar-dates`.
2. `build-reminders` **xoá sạch mọi nhắc nhở tương lai chưa gửi** của một nhà
   rồi dựng lại từ đầu. Hàng do `nudge-snapshot-update` ghi có `fire_at` trong
   cùng ngày — nằm đúng trong khoảng bị xoá. Chạy nudge **trước** 04:30 thì lời
   nhắc biến mất trước khi kịp bắn, và không có lỗi nào để nhìn thấy.

```sql
-- Mẫu cho một job; lặp lại cho từng dòng trong bảng trên.
select cron.schedule(
  'generate-task-instances', '30 20 * * *',
  $$ select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/generate-task-instances',
       headers := '{"Authorization":"Bearer <service_role key>"}'::jsonb
     ) $$
);
```

`purge-soft-deleted` cần key R2 (mục trên). Chưa có key thì nó **bỏ qua**
`document_files` thay vì xoá — xoá hàng DB mà chưa xoá được object sẽ làm mất
`r2_key` vĩnh viễn, và object nằm lại trên bucket không ai tìm ra.

---

## 6 · Smoke test — đọc trước khi chạy

```bash
psql "<connection string>" -f supabase/tests/smoke.sql
```

Connection string ở **Settings → Database → Connection string → URI**.

> **`smoke.sql` GHI dữ liệu.** Nó tạo hai user `a@test.vn` / `b@test.vn`, một
> nhà, một mã mời, một khoản nợ, rồi chạy F1 · F2 · F8 như người dùng thật qua
> role `authenticated` để RLS thật sự có hiệu lực.
>
> Chỉ chạy trên project **trống** hoặc một project staging riêng. Trên project
> đã có dữ liệu thật của bạn thì nó để lại rác — và không có `db reset` để dọn.

Nếu muốn giữ project chính sạch: tạo thêm một project `nha-minh-staging` (bậc
free cho 2 project), chạy smoke ở đó.

---

## 7 · Chạy app

```bash
pnpm mobile
```

`app.config.js` đọc `.env` lúc khởi động. **Đổi `.env` thì phải khởi động lại
Metro** — Expo đọc config một lần lúc bắt đầu, không theo dõi file.

---

## Kiểm chứng — chạy trước mỗi lần duyệt

```bash
pnpm test                                  # cổng G1 — 160 test domain
pnpm --filter @family-organizer/mobile typecheck
pnpm --filter @family-organizer/mobile lint         # chặn literal tiếng Việt trong JSX
```

---

## Việc phải làm trước khi phát hành

- [ ] `enable_confirmations = true` ở `config.toml` **cùng lúc** với việc cắm
      SMTP thật (Resend/Postmark). SMTP mặc định của Supabase giới hạn ~2
      email/giờ — bật xác minh mà quên cắm SMTP là khoá cửa người dùng mới
- [ ] Bật Google/Apple provider ở Dashboard → Authentication → Providers
      (G3 còn treo — nút đang `disabled`, cần EAS dev build)
- [ ] `site_url` và `additional_redirect_urls` phải khớp scheme thật khi có
      universal link, không chỉ `family://`
- [ ] Bật Point-in-Time Recovery nếu đã có dữ liệu thật (bậc trả phí)
