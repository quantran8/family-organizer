# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ngôn ngữ

Code comments, docs (`spec/`, `TASKS.md`, `SETUP-CLOUD.md`) và UI strings đều bằng tiếng Việt. Giữ nguyên quy ước này khi viết code mới — comment giải thích **vì sao**, không phải **cái gì**.

## Commands

```bash
pnpm test                    # vitest cho packages/domain (nơi duy nhất có test)
pnpm typecheck               # tsc --noEmit cho mọi workspace
pnpm lint                    # eslint (ép ranh giới phân lớp — xem bên dưới)
pnpm mobile                  # expo start

pnpm --filter @family-organizer/domain test -- lunar        # chạy một file test
pnpm --filter @family-organizer/domain test:watch
pnpm --filter @family-organizer/mobile ios                  # expo run:ios

pnpm db:push                 # đẩy migration lên Supabase cloud
pnpm db:pull                 # kéo schema về, đọc diff bằng git
pnpm fn:deploy               # deploy toàn bộ 13 Edge Functions (cần --import-map)
```

**Không có Docker local.** `supabase db reset`, `db diff`, `functions serve` đều không dùng được và đã bị bỏ khỏi `package.json` (xem `SETUP-CLOUD.md`). Hệ quả: không có bước tập dượt — một migration sai là dữ liệu thật, một Edge Function sai chỉ lộ ra sau khi deploy. Kiểm chứng qua Dashboard → Edge Functions → Logs và `supabase/tests/smoke.sql`.

## Ba ràng buộc không được vi phạm

Vi phạm ba điều này là sản phẩm sai về bản chất, không phải sai kỹ thuật:

1. **Không bao giờ tổng hợp tiền theo người.** `holderMemberId` / `actorProfileId` chỉ hiện ở cấp từng khoản — không tổng, không biểu đồ, không xếp hạng, không filter theo người.
2. **Ngày âm là dữ liệu gốc.** `next_occurrence_date` là cache do **đúng một nơi** ghi: Edge `refresh-lunar-dates`. Không có đường code thứ hai nào tính lịch âm rồi ghi xuống.
3. **`money_events` / `money_snapshots` ghi từ ngày đầu**, kể cả khi chưa có màn hình nào đọc chúng. Lịch sử không backfill được.

## Kiến trúc

Monorepo pnpm với **đúng một** package dùng chung.

```
packages/domain/        hàm thuần + type — dùng bởi CẢ mobile (Hermes) VÀ edge (Deno)
apps/mobile/            Expo Router app
supabase/functions/     13 Edge Functions (Deno)
supabase/migrations/    schema — không bao giờ sửa trên dashboard
spec/                   nguồn sự thật của thiết kế (đọc trước khi sửa)
```

### `packages/domain` — ràng buộc cứng

- **Không có dependency runtime nào cả**, kể cả zod. Deno và Hermes phân giải package khác nhau; mỗi dependency là một chỗ có thể vênh.
- Không import React, Supabase, hay bất cứ I/O nào.
- Thời gian **luôn là tham số** — không `Date.now()` ẩn (điều kiện để test không cần mock).
- Import nội bộ ghi rõ đuôi `.ts` (`./types/base.ts`). Deno phân giải theo mặt chữ; thiếu đuôi là module-not-found lúc bundle. Vì thế cả hai tsconfig bật `allowImportingTsExtensions`.
- Không chứa chuỗi hiển thị — câu chữ dựng ở `apps/mobile/src/i18n`.

Tiêu chí để một thứ được ra khỏi `apps/mobile`: **hai người tiêu thụ trở lên, ở hai runtime khác nhau**. Không đạt thì để trong app. Design tokens, repository, zod schema đều chỉ mobile dùng → ở lại app.

Edge nạp domain qua `supabase/import_map.json` trỏ thẳng vào source, không qua bước build.

### Phân lớp trong app — được lint ép, không dựa vào kỷ luật

```
UI (features/*/screens, features/*/components, design/, app/)
  ↓ chỉ gọi hook
features/<feat>/queries/
  ↓ chỉ gọi repository
features/<feat>/repository/     ← chỗ DUY NHẤT được chạm supabase
  ↓
lib/supabase
```

`.eslintrc.js` chặn import `@supabase/*` và `lib/supabase` từ tầng UI, và chặn UI import thẳng `features/*/repository` (`allowTypeImports: true` — type-only import không tạo phụ thuộc runtime nên được phép).

### Cắt theo feature, không cắt theo loại file

Mọi thứ của một feature nằm cùng thư mục, **kể cả màn hình**:

```
src/features/asset/
  repository/   asset-repository.ts · .interface.ts · index.ts
  queries/      use-assets.ts
  schemas/      asset-schema.ts
  components/   asset-row.tsx
  screens/      asset-list-screen.tsx
```

### `app/` chỉ là bảng định tuyến

Mỗi file route là **một dòng** re-export:

```ts
// app/(app)/money/assets.tsx
export { AssetListScreen as default } from '@/features/asset/screens/asset-list-screen';
```

34 file route 1-dòng (ngoài `_layout.tsx`) là bắt buộc, không phải dư thừa — Expo Router 57 chỉ có file-based routing. Rà nhanh (file route dài hơn ~10 dòng là một screen đang lẫn vào bảng định tuyến):

```bash
find apps/mobile/app -name '*.tsx' ! -name '_layout.tsx' | xargs wc -l | sort -rn | head
```

Hai ngoại lệ hợp lệ: `_layout.tsx` (khai Stack/Tabs + thứ tự provider, **không** logic nghiệp vụ — gate ở `features/auth/components/auth-gate.tsx`) và `app/index.tsx` (route rỗng giữ chỗ).

`design/components/` chỉ chứa primitive — không import type thực thể từ domain. Phép thử: *feature thứ hai có dùng nó không?* Không → nó thuộc feature đó.

## Quy ước bắt buộc

**Query key luôn bắt đầu `['hh', householdId, …]`.** Đó là thứ khiến `removeQueries({ queryKey: ['hh', id] })` xoá sạch cache một nhà khi đăng xuất/đổi nhà; key phẳng theo loại sẽ rò dữ liệu nhà cũ sang nhà mới. Key xây theo tầng để invalidate tầng trên quét cả tầng dưới. `financeAffectedKeys` gom chùm key mà mọi thao tác tiền kéo theo — bỏ sót một key làm hai màn hình hiện hai con số khác nhau.

**Luôn `.eq('household_id', hid)` tường minh** trong mọi truy vấn, dù RLS đã chặn. RLS là lưới an toàn thứ hai.

**Ghi nhiều bảng phải qua RPC** (`settle_payment`, `update_asset_value`), không ghép nhiều lệnh từ client — mất mạng giữa chừng làm dư nợ hoặc lịch sử sai vĩnh viễn.

**Optimistic update bắt buộc cho:** `useSetTaskDone`, `useSettlePayment`, `useResolveAttention` (thao tác một chạm). **Không optimistic cho:** tài sản, snapshot, giấy tờ, upload — thao tác có form, chờ được, và một con số tiền hiện ra rồi biến mất làm người dùng nghi ngờ mọi thứ còn lại.

**Mutation không tự retry** — ghi trùng tệ hơn ghi hụt. Query retry ≤3 lần, không retry lỗi auth.

**Không có chuỗi tiếng Việt viết thẳng trong JSX** — mọi câu chữ qua `src/i18n/vi.ts`, mọi ánh xạ enum→nhãn qua `labels.ts`. Lint cảnh báo qua `react/jsx-no-literals`.

**TypeScript strict, không `any`** (lint error). `noUncheckedIndexedAccess` bật ở cả hai package.

## Edge Functions

`_shared/client.ts` có hai client, chọn nhầm là lỗ hổng bảo mật:

- `serviceClient()` — cron chạy cho **mọi** nhà, không thay mặt ai. Bỏ qua RLS hoàn toàn, nên **mọi truy vấn phải tự lọc `household_id`**.
- `userClient(req)` — mang JWT người gọi, RLS còn hiệu lực. Dùng cho function client gọi thẳng (`presign-upload`, `confirm-upload`) vì chúng nhận `documentId` từ body; với service role thì id của nhà khác cũng đọc được.

Cron functions khai `verify_jwt = false` trong `supabase/config.toml` (mỗi function một section `[functions.<tên>]`, không có khoá chung).

**Quyền phải kiểm ở server, không chỉ ẩn nút ở UI.** `canUpload` chạy ở client để nói sớm và nói rõ, nhưng `presign-upload` mới là chỗ quyết định — presigned URL là thứ cấp quyền ghi thật.

## Upload — ba pha, file không bao giờ đi qua server của mình

1. Client xử lý trước (nén 2000px, HEIC→JPEG q=0.8, thumbnail 300px) → gọi `presign-upload` (kiểm premium + quota + ký URL TTL 5 phút, ghim `content-length`/`content-type` vào chữ ký). Hàng `document_files` được ghi **trước** ở trạng thái chưa confirm.
2. Client `PUT` thẳng lên R2.
3. Client gọi `confirm-upload` → `is_confirmed = true`.

Mất mạng giữa chừng để lại hàng pending mà cron `sweep-orphan-uploads` dọn sau 24h. Danh sách tài liệu **chỉ tải thumbnail**, không bao giờ tải bản gốc.

## Test

Ngân sách test dồn hết vào `packages/domain` (168 test vitest) — mọi quy tắc nghiệp vụ nằm ở đó và test được không cần DB. Đây là chỗ lỗi **im lặng**: một ngày giỗ tính sai không ném exception, nó chỉ đơn giản là không nhắc.

Không viết test cho component ở MVP.

## Cấu hình & bí mật

`app.config.js` (không phải `app.json`) đọc `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` từ `apps/mobile/.env` (đã gitignore) hoặc EAS secrets. `SUPABASE_SERVICE_ROLE_KEY` chỉ sống ở Supabase Edge Function secrets — không bao giờ ở đây.

`nodeLinker: hoisted` trong `pnpm-workspace.yaml` là bắt buộc: Metro không hiểu cây node_modules lồng nhau của pnpm. **pnpm v11 đọc thiết lập này ở `pnpm-workspace.yaml`, không phải `.npmrc`** — đặt nhầm chỗ thì cài đặt im lặng chạy theo mặc định, không cảnh báo nào.

`expo-notifications` và `expo-apple-authentication` đang **tạm tắt** qua `expo.autolinking.exclude` trong `apps/mobile/package.json` + `ios.entitlements: {}` + plugin bị comment. Lý do: chúng sinh entitlement `applesignin` mà Expo bắt buộc ký kể cả khi build simulator, nên máy chưa có certificate Apple Development hợp lệ là `expo run:ios` chết ngay. Bật lại: xoá cả ba chỗ rồi `expo prebuild --clean`.

## Tài liệu

`spec/` là nguồn sự thật, tách theo ranh giới **bất biến vs chính sách** — nếu một thay đổi bắt phải sửa hai file cùng lúc thì ranh giới đã bị vi phạm ở đâu đó.

| File | Phạm vi |
|---|---|
| `spec/schema.sql` | cấu trúc dữ liệu, RLS, trigger, RPC nguyên tử |
| `spec/01-architecture.md` | lớp, cache, offline, upload, thông báo |
| `spec/02-data-contract.md` | type, repository interface, zod schema |
| `spec/03-business-logic.md` | hàm thuần: tài chính, lịch âm, lặp lại, nhắc |
| `spec/04-design-system.md` | tokens, chữ, ngôn ngữ, mẫu trạng thái |
| `spec/05-screens-and-flows.md` | route, bố cục màn hình, thứ tự dựng |

`TASKS.md` theo dõi tiến độ theo giai đoạn G0–G10 (hiện ở G9 xong code, G10 chờ EAS build). Cập nhật khi hoàn thành một mục.
