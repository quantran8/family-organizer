# 01 — Kiến trúc Client

Phạm vi: app chạy thế nào. **Không** chứa schema (xem `schema.sql`), **không** chứa quy tắc nghiệp vụ (xem `03-business-logic.md`), **không** chứa mô tả màn hình (xem `04-frontend-spec.md`).

---

## 1. Stack

| Lớp | Chọn | Ghi chú |
|---|---|---|
| App | Expo SDK (bare khi cần native) + TypeScript strict | EAS Build + EAS Update |
| Điều hướng | Expo Router (file-based) | Deep link cho mã mời |
| Server state | TanStack Query v5 | persist cache qua MMKV |
| Client state | Zustand (2 store nhỏ) | phiên đăng nhập, hàng đợi upload |
| Backend | Supabase (Postgres + PostgREST + GoTrue) | |
| File | Cloudflare R2 qua presigned URL | sau `StorageAdapter` |
| Form | react-hook-form + zod | zod schema dùng chung với Edge |
| Thanh toán | RevenueCat | entitlement thuộc household |
| Quan sát | Sentry + PostHog | |

**Monorepo** (pnpm workspaces) với **đúng một** package dùng chung.

Tiêu chí để một thứ được ra khỏi `apps/mobile`: **có từ hai người tiêu thụ trở lên, ở hai runtime khác nhau.** Không đạt tiêu chí đó thì nằm trong app — mỗi package thừa là thêm một `package.json`, một bước build, và một lớp import gián tiếp.

```
apps/
  mobile/
    app/                   Expo Router routes
    src/
      components/          thành phần theo màn hình
      design/              tokens + primitive  (chỉ mobile dùng)
      data/
        repositories/      interface + hiện thực  (chỉ mobile dùng)
        queries/           hook + query key
        schemas/           zod input schema  (chỉ mobile dùng)
      lib/                 supabase, storage, notifications
  edge/                    Supabase Edge Functions (Deno)
packages/
  domain/                  type + hàm thuần  ← dùng bởi CẢ mobile VÀ edge
```

### Vì sao chỉ `domain` được tách ra

Nó là thứ duy nhất có hai người tiêu thụ ở hai runtime: Hermes (React Native) và Deno (Edge). Cụ thể: `computeFinanceStatus` chạy ở client để hiển thị tức thì, và chạy lại ở Edge khi ghi `money_snapshots.status`; `solarToLunar` chạy ở Edge trong `refresh-lunar-dates`; `canUpload` chạy ở client để chặn sớm và ở Edge để quyết định thật.

**Type thực thể nằm luôn trong `domain`**, không tách package riêng. Chúng là tham số của chính các hàm này; tách ra thành một package chỉ chứa `interface` là chia nhỏ không mang lại gì.

### Ràng buộc của `packages/domain`

- Không import React, Supabase, hay bất cứ I/O nào.
- **Không có dependency runtime nào cả** — kể cả zod. Lý do: Deno và Hermes phân giải package khác nhau, và mỗi dependency là một chỗ có thể vênh. zod ở lại `apps/mobile/src/data/schemas`.
- TypeScript thuần, target ES2022, không dùng tính năng riêng của Node.
- Edge nạp bằng import map trỏ thẳng vào source, không qua bước build.

Đây cũng là điều kiện để unit test chạy không cần DB (xem `03 §9`).

---

## 2. Phân lớp trong app

```
UI (screens/, components/)
  ↓ chỉ gọi hook
queries/        useHomeFeed, useAssets, useSettlePayment …
  ↓ chỉ gọi repository
repository/     assetRepo, paymentRepo, documentRepo …
  ↓ chỉ gọi
lib/supabase, lib/storage
```

**Quy tắc cứng:** không có `supabase.from(...)` nào nằm ngoài `repository/`. Lint rule chặn import `@supabase/*` và chặn import thẳng `repository/` từ mọi file thuộc tầng UI.

Lý do không phải thẩm mỹ: đây là điều kiện để đổi backend sau này chỉ phải viết lại một thư mục, và để test hook bằng repository giả.

### Cắt theo feature, không cắt theo loại file

Mọi thứ thuộc về một feature nằm cùng một thư mục — kể cả màn hình:

```
src/features/asset/
  repository/   asset-repository.ts · .interface.ts · index.ts
  queries/      use-assets.ts
  schemas/      asset-schema.ts
  components/   asset-row.tsx            ← component riêng feature
  screens/      asset-list-screen.tsx    ← MÀN HÌNH nằm ở đây
                asset-detail-screen.tsx
                asset-form-screen.tsx
```

### `app/` chỉ là bảng định tuyến

Expo Router bắt buộc file route nằm đúng vị trí trong `app/`. Nó **không** bắt file đó chứa UI. Mỗi route là một dòng:

```ts
// app/(app)/money/assets.tsx
export { AssetListScreen as default } from '@/features/asset/screens/asset-list-screen';
```

Vì sao quan trọng: để nguyên UI trong `app/` thì một feature bị xé làm hai cây thư mục — sửa "cách hiện một khoản tài sản" phải đoán giữa `app/(app)/money/assets.tsx` và `src/features/asset/`. Cấu trúc feature mất ý nghĩa đúng lúc nó cần nhất, và mức độ lệch tăng theo số màn hình.

**26 file route 1-dòng là bắt buộc, không phải dư thừa.** Expo Router 57 chỉ có file-based routing — đường dẫn URL suy ra từ đường dẫn file, và không có API khai route bằng code. `app/(app)/money/asset/[id].tsx` *chính là* định nghĩa route `/money/asset/:id`; xoá file là mất route. Cây thư mục trong `app/` vì thế phản chiếu cây URL, không phản chiếu cách tổ chức code.

Hai ngoại lệ hợp lệ trong `app/`:

- `_layout.tsx` — khai báo Stack/Tabs và thứ tự provider. **Không chứa logic nghiệp vụ**: gate điều hướng nằm ở `features/auth/components/auth-gate.tsx`, bắt deep link ở `features/invite/queries/`.
- `app/index.tsx` — route rỗng, giữ chỗ trong lúc gate quyết định đi nhánh nào.

Rà nhanh:

```bash
find app -name '*.tsx' ! -name '_layout.tsx' | xargs wc -l | sort -rn | head
```

File route dài hơn 1 dòng (trừ `app/index.tsx`) là một màn hình đang lẫn vào bảng định tuyến.

### `design/components/` chỉ chứa primitive

Primitive **không biết gì về nghiệp vụ**: nhận giá trị nguyên thuỷ, không import type thực thể từ `@family-organizer/domain`. Component biết về một thực thể (`FamilyEvent`, một khoản tài sản) thuộc về `features/<feat>/components/`.

Phép thử khi phân vân: *feature thứ hai có dùng nó không?* Không → nó thuộc feature đó. `StatusPill` ở lại `design/` vì cả `home` lẫn `money` đều dùng; `EventRow` thì không.

### Luôn filter `household_id` tường minh

Mọi truy vấn phải có `.eq('household_id', hid)` dù RLS đã chặn. RLS là lưới an toàn thứ hai. Nhờ vậy query vẫn đúng nếu sau này chạy qua API server tự viết.

---

## 3. Tầng dữ liệu

### Query key

```ts
['hh', householdId, 'home']
['hh', householdId, 'assets']
['hh', householdId, 'asset', assetId]
['hh', householdId, 'payments', { window: '30d' }]
['hh', householdId, 'documents', { expiringOnly: true }]
```

Tiền tố `['hh', householdId]` cho phép `invalidateQueries` toàn bộ household khi realtime báo có thay đổi.

### Cấu hình mặc định

```ts
staleTime: 60_000
gcTime:    24 * 60 * 60 * 1000
retry:     (n, e) => !isAuthError(e) && n < 3
persister: MMKV, maxAge 7 ngày
```

### Optimistic update

Bắt buộc cho: đánh dấu việc xong, chốt khoản đã trả, gắn/gỡ cờ cần trao đổi. Đây là các thao tác một chạm mà người dùng mong thấy phản hồi tức thì.

Không optimistic cho: tạo tài sản, upload tài liệu, mời thành viên — các thao tác có form, chờ được.

### Ghi nhiều bước

Mọi thao tác động tới nhiều bảng phải gọi RPC, không được ghép nhiều lệnh từ client:

- `settle_payment(payment_id, paid_on, note)`
- `update_asset_value(asset_id, value, as_of, note)`

Mất mạng giữa chừng mà ghép lệnh từ client sẽ làm dư nợ hoặc lịch sử sai vĩnh viễn.

---

## 4. Offline

**Không** dùng local-first thật (WatermelonDB / PowerSync) ở MVP. Chi phí vài tuần, đổi lại giải quyết xung đột mà thực tế gần như không xảy ra: hai người, ít bản ghi, ghi thưa.

Dùng: TanStack Query persist + mutation queue.

- Đọc: cache MMKV phục vụ ngay khi mở app, refetch nền.
- Ghi: mutation vào hàng đợi persist, replay khi có mạng, backoff 1s → 30s.
- Xung đột: last-write-wins. Ngoại lệ duy nhất là `money_events` (append-only, không bao giờ xung đột).
- Banner offline chỉ hiện khi có mutation đang chờ, không hiện chỉ vì mất mạng.

---

## 5. Realtime

Chỉ subscribe khi **app ở foreground và đang mở màn hình liên quan**. Ngoài ra dựa vào push + refetch khi app trở lại foreground.

Lý do: mỗi websocket là một connection có hạn mức, trong khi app được mở vài lần một ngày. Đây cũng là cách để cắt phụ thuộc Realtime nếu sau này rời Supabase.

Kênh: `hh:{householdId}` → invalidate query theo bảng có thay đổi.

---

## 6. Upload tài liệu

Ba pha, không bao giờ cho file đi qua server của mình:

1. Client xử lý trước → gọi Edge `presign-upload` (kiểm tra premium + quota + ký URL, TTL 5 phút, ghim `content-length` và `content-type` vào chữ ký).
2. Client `PUT` thẳng lên R2.
3. Client gọi `confirm-upload` → ghi `document_files.is_confirmed = true`.

### Xử lý trước khi upload (bắt buộc)

| Bước | Thư viện | Kết quả |
|---|---|---|
| Quét giấy tờ | `react-native-document-scanner-plugin` | VisionKit / ML Kit, tự tìm mép và làm phẳng |
| Nén ảnh | `expo-image-manipulator` | cạnh dài 2000px, HEIC→JPEG, q=0.8 |
| Thumbnail | resize 300px / `react-native-pdf-thumbnail` | upload thành object riêng |

Danh sách tài liệu **chỉ tải thumbnail**, không bao giờ tải bản gốc.

### Hàng đợi

Persist MMKV, trạng thái từng file (`queued` / `uploading` / `done` / `failed`), retry thủ công được. `expo-file-system` `createUploadTask` với `sessionType: BACKGROUND`. File > 20MB dùng multipart để resume.

Tình huống thật cần chịu được: chụp 8 ảnh hồ sơ rồi khoá máy đi làm việc khác.

---

## 7. Thông báo

**Local là mặc định.** Phần lớn nhắc nhở có ngày biết trước (giấy tờ hết hạn, giỗ, học phí) → `expo-notifications` schedule thẳng trên máy. Không tốn server, chạy cả khi offline.

**Push chỉ cho sự kiện thời gian thực:** người kia gán việc cho bạn, người kia cập nhật tình hình tài chính, có cờ cần trao đổi mới.

Bảng `reminders` là nguồn sự thật để client sync về và đặt lại lịch khi cài máy mới. Sau mỗi lần sync: huỷ toàn bộ local notification rồi schedule lại từ đầu — đơn giản hơn diff và không bao giờ để lại lịch mồ côi.

---

## 8. Auth và onboarding

Google + Apple Sign-in. Không dùng OTP SMS ở MVP (tốn tiền thật mỗi tin).

Chuỗi khởi tạo sau đăng nhập: `profiles` (upsert) → chọn tạo household mới hoặc nhập mã mời → `members` cho chính mình.

**Mời người thứ hai là bước sống-còn của sản phẩm.** Mã 6 ký tự (bỏ `0 O 1 I`) + deep link `family://join/{code}`, chia sẻ qua Zalo bằng share sheet hệ thống. Không phụ thuộc email.

---

## 9. Đăng ký trả phí

RevenueCat SDK ở client chỉ để mua và hiển thị paywall. **Nguồn sự thật của quyền là `households.subscription_status`**, do webhook `revenuecat-webhook` ghi. Client không bao giờ tự quyết định quyền dựa trên trạng thái SDK cục bộ.

Kiểm tra quyền ở server (`presign-upload`), không chỉ ẩn nút ở UI.

---

## 10. Widget

**Ngoài phạm vi MVP.** Cần code SwiftUI (WidgetKit) và Kotlin (Glance) riêng, chia sẻ dữ liệu qua App Group / SharedPreferences. Đây là điểm yếu thật của React Native. Ghi lại ở đây để không ai hứa với người dùng trước khi có kế hoạch.

---

## 11. Chất lượng

- TypeScript `strict`, không `any` (lint error).
- Unit test bắt buộc và đủ cho `packages/domain` — mọi quy tắc nghiệp vụ nằm ở đó và test được không cần DB.
- Không viết test cho component ở MVP. Thay bằng Maestro smoke test cho 3 luồng: tạo household + mời, tạo sự kiện âm lịch, upload tài liệu.
- Sentry bật source map qua EAS.
- PostHog theo dõi đúng các chỉ số validate: mời được người thứ hai chưa, người thứ hai có mở app không, tuần 2 còn thêm dữ liệu không.

---

## 12. Môi trường

Hai project Supabase (`dev`, `prod`), hai bucket R2. `.env` qua `expo-constants` + EAS secrets. Migration bằng Supabase CLI, không sửa schema trên dashboard — schema phải luôn tái tạo được từ repo.
