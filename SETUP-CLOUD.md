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

### Cron

Dashboard → **Integrations → Cron** (hoặc SQL bên dưới). Thứ tự quan trọng:
`build-reminders` đọc `task_instances`, nên nó phải chạy **sau**.

```sql
select cron.schedule(
  'generate-task-instances', '0 17 * * *',   -- 00:00 giờ VN (UTC+7)
  $$ select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/generate-task-instances',
       headers := '{"Authorization":"Bearer <service_role key>"}'::jsonb
     ) $$
);
select cron.schedule(
  'build-reminders', '30 17 * * *',          -- 00:30 giờ VN, sau function trên
  $$ select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/build-reminders',
       headers := '{"Authorization":"Bearer <service_role key>"}'::jsonb
     ) $$
);
```

Cron của Postgres tính theo **UTC**, không theo giờ máy bạn — `0 17` là 00:00
hôm sau ở Việt Nam.

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
pnpm --filter @nhaminh/mobile typecheck
pnpm --filter @nhaminh/mobile lint         # chặn literal tiếng Việt trong JSX
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
