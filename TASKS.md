# Nhà mình — Bảng theo dõi triển khai

Nguồn: `implement-app-concept` plan. Thứ tự theo `05 §10` (thứ tự dựng), không theo độ khó.
Mỗi giai đoạn kết thúc bằng **một thứ chạy được**, không phải một tầng code hoàn chỉnh.

Ký hiệu: `[x]` xong · `[~]` đang làm · `[ ]` chưa

---

## Ba ràng buộc không được vi phạm

Đây là ba thứ nếu vi phạm thì sản phẩm sai về bản chất, không phải sai về kỹ thuật.
Rà lại chúng ở cuối mỗi giai đoạn có đụng tới tiền.

1. **Không bao giờ tổng hợp tiền theo người.** `holderMemberId` / `actorProfileId` chỉ được
   hiện ở **cấp từng khoản**. Không tổng, không biểu đồ, không xếp hạng, không bộ lọc theo người.
2. **Ngày âm là dữ liệu gốc.** `next_occurrence_date` là cache do **đúng một nơi** ghi:
   Edge `refresh-lunar-dates`. Không có đường code thứ hai nào tính lịch âm rồi ghi xuống.
3. **`money_events` / `money_snapshots` ghi từ ngày đầu**, kể cả trước khi có màn hình đọc.

---

## G0 · Nền móng — **xong**

- [x] Cài `pnpm` + `supabase` CLI, `git init`
- [x] `pnpm-workspace.yaml`, `packages/domain`, `apps/mobile` (Expo Router), `supabase/`
- [x] `schema.sql` → `supabase/migrations/0001_init.sql` **nguyên vẹn**
- [x] TypeScript `strict` + `noUncheckedIndexedAccess`; eslint chặn `any` và chặn import
      `@supabase/*` ngoài `features/*/repository/`

## G1 · `packages/domain` + test — **xong** (cổng chặn, đã xanh)

Làm trước UI có chủ ý: đây là chỗ lỗi **im lặng**. Một ngày giỗ tính sai không ném exception,
nó chỉ đơn giản là không nhắc — và không ai biết cho tới khi đã muộn.

- [x] `finance/` — `computeFinanceStatus`, `explainFinanceStatus`, `inferLiquidity`
- [x] `lunar/` — `solarToLunar`, `lunarToSolar`, `nextLunarOccurrence` (Hồ Ngọc Đức, UTC+7)
- [x] `recurrence/` · `reminders/` · `quota/` · `format/` · `attention/` · `history/`
- [x] **144 test vitest xanh** — phủ hết ca `03 §9` + ca thêm cho G7b
      (G4 thêm 16 ca cho `groupTasksByDue` → **160**)
- [x] Đối chiếu lịch âm với bảng thật: 7 ngày Tết, tháng nhuận 2023, 406 lượt round-trip

Không viết test cho component. Toàn bộ ngân sách test dồn vào đây.

## G2 · Tầng dữ liệu — **xong**

- [x] `lib/supabase.ts` + `lib/database.types.ts` (22 Row là `type`, **không** `interface` —
      lý do ghi trong file: `interface` không có implicit index signature nên không khớp
      `GenericTable`)
- [x] `i18n/vi.ts` + `labels.ts` — **mọi** chuỗi UI, mọi ánh xạ enum → nhãn
- [x] `data/shared/` — `errors.ts` (PostgREST → `AppError`, một chỗ duy nhất) · `mappers.ts` · `session.ts`
- [x] 13 feature repository ở `features/<feat>/repository/`, interface tách khỏi hiện thực
- [x] `0002_onboarding_rpc.sql` — giải hai vòng luẩn quẩn RLS chặn F1 và F2
- [x] `0003_grants.sql` — **`schema.sql` không có một lệnh `GRANT` nào**; thiếu nó thì mọi
      truy vấn trả `permission denied` và không màn hình nào chạy được
- [x] `supabase/tests/smoke.sql` — F1 · F2 · F8 chạy như **user thật** qua role `authenticated`

### G2b · Hook + schema + document repo — **xong**

- [x] `data/queries/keys.ts` — mọi key bắt đầu `['hh', hid, …]`, nên đăng xuất xoá được
      sạch cache một nhà bằng một lệnh. `financeAffectedKeys` gom chùm key mà mọi thao tác
      tiền kéo theo — bỏ sót một key làm hai màn hiện hai con số
- [x] `data/queries/client.ts` — `staleTime 60s` · `gcTime 24h` · persist 7 ngày ·
      **không** retry lỗi auth · **mutation không tự retry** (ghi trùng tệ hơn ghi hụt)
- [x] Optimistic **bắt buộc**: `useSetTaskDone` · `useSettlePayment` · `useResolveAttention`
- [x] **Không** optimistic (có ghi lý do tại chỗ): tài sản · snapshot · giấy tờ · upload
- [x] `data/schemas/common.ts` + schema theo feature. `nextOccurrenceDate` **không** có ở đâu cả
- [x] 13 feature có `queries/`; `features/document/repository/` — repository cuối cùng
- [x] Sửa `database.types.ts`: khai FK `document_files → documents`. Thiếu nó thì
      `select('*, document_files(*)')` ra `SelectQueryError` chứ không phải mảng row

## G3 · Bước 1 — Sign in · Setup · Nhà mình rỗng — **xong khung, còn 2 việc**

- [x] `tailwind.config.js` — token `design.md §15–16`, font Be Vietnam Pro qua `expo-font`
- [x] Primitive: `MoneyText` · `AmountInput` · `Screen` · `Card` · `SectionHeader` · `Row` ·
      `Button` · `Field` · `Checkbox` · `StatusPill` · `MemberAvatar` · `DateTile` · `FAB` ·
      `EmptyState` · `ErrorState` · `Skeleton`
- [x] `(auth)/sign-in.tsx` — **một** nút `[Tiếp tục]`, email chưa có thì tự đăng ký
- [x] `(auth)/forgot-password.tsx` + `reset-password.tsx`
- [x] `(auth)/setup.tsx` — `[Tạo nhà mới]` hỏi **đúng một** trường / `[Tôi có mã mời]`
- [x] `app/_layout.tsx` — gate 3 nhánh: chưa đăng nhập → chưa có nhà → có nhà
- [x] `(app)/_layout.tsx` — 4 tab + FAB; `home/index.tsx` rỗng
- [x] **App bundle được** — `expo export` ra 4.4MB Hermes bytecode
- [ ] Google + Apple Sign-in — nút đang `disabled`. Cần EAS dev build + provider ở Supabase;
      Expo Go không đủ. Email+mật khẩu chạy được nên nó mở khoá G4–G7 trong lúc chờ
- [ ] Bộ icon thật (SVG) thay 4 ký tự tạm ở tab bar

### Hai chỗ hạ tầng phải sửa để app chạy được

- [x] **`nodeLinker: hoisted`** trong `pnpm-workspace.yaml`. Metro không hiểu cây
      `node_modules` lồng nhau của pnpm — nó thấy `import 'react-native-css-interop/jsx-runtime'`
      bên trong expo-router rồi đi tìm ở `node_modules` gốc, nơi không có gì.
      **pnpm v11 đọc thiết lập ở `pnpm-workspace.yaml`, KHÔNG phải `.npmrc`** — đặt nhầm chỗ
      thì `pnpm config get node-linker` trả `undefined` và cài đặt im lặng chạy theo mặc định
- [x] **Metro resolver bỏ đuôi `.js`** cho `packages/domain`. Package viết
      `from './types/base.js'` vì **Deno bắt buộc** đuôi đầy đủ; Metro thì đi tìm file `.js`
      thật và dừng. Bỏ đuôi ở tầng resolve giữ được cả hai runtime mà không cần bước build

## G4 · Bước 2 — Thêm nhanh · Việc · Chi tiết việc — **xong**

- [x] `(modals)/quick-add.tsx` — **một** ô tên việc, lưu xong đóng ngay ·
      `task-form.tsx` — form đầy đủ cho việc có hạn / lặp / người làm
- [x] `plan/index.tsx` tab con Việc | Sự kiện, nhớ tab con lần trước
      (`stores/ui-prefs`, persist AsyncStorage)
- [x] Chạm ô tròn → xong ngay. **Không** hộp xác nhận, không ăn mừng, không điểm, không chuỗi ngày
- [x] Vuốt trái → hoãn sang mai · vuốt phải → xoá với **hoàn tác 5 giây**.
      Xoá thật hoãn tới khi hết giờ, không xoá-rồi-khôi-phục: khôi phục cần
      tạo-lại-với-cùng-id mà repository không có
- [x] `plan/task/[id].tsx` — sửa tại chỗ (mỗi trường tự lưu khi rời khỏi nó,
      không có nút `[Lưu]` chung); việc lặp hiện 5 lần gần nhất đã xong,
      **chỉ ngày, không hiện ai làm** (ràng buộc "hai người ngang nhau")
- [x] Nhà mình có nội dung — thẻ trạng thái + HÔM NAY + TUẦN NÀY, nhóm rỗng **ẩn hẳn**.
      Quá hạn gộp vào nhóm hôm nay, không thành khối đỏ riêng
- [x] Edge `generate-task-instances` — cửa sổ 90 ngày, `upsert ignoreDuplicates`
      để chạy lại không xoá trạng thái đã xong ·
      `build-reminders` — xoá lịch tương lai chưa gửi rồi dựng lại, **không đụng
      `sent_at` khác null**; việc một lần bọc thành `TaskInstance` để không bị bỏ sót

### Ba thứ hạ tầng phát hiện trong G4

- [x] **`groupTasksByDue` ở `packages/domain`**, không ở component: ranh giới
      "tuần này" có ca biên thật (việc hạn Chủ nhật nhìn từ thứ Bảy), và ca biên
      trong JSX là ca biên không có test. **16 test mới → 160 xanh**
- [x] **`lib/today.ts` — chỗ DUY NHẤT đọc đồng hồ.** Thiếu nó thì màn này dùng
      `toISOString()` (UTC) còn màn kia dùng giờ máy, và hai màn lệch nhau một
      ngày trong khoảng 00:00–07:00 giờ Việt Nam. `useToday()` giữ giá trị ổn
      định giữa các render (chuỗi mới mỗi render sẽ vào query key → refetch vô hạn)
- [x] **`react-native-gesture-handler` 2.28 → 2.32.** 2.28 import
      `react-native/Libraries/Renderer/shims/ReactNative`, thứ RN 0.86 đã bỏ —
      bundle **chết hẳn** ngay khi có một `Swipeable` đầu tiên. Cũng thêm
      `GestureHandlerRootView` ở `app/_layout.tsx`: thiếu nó thì cử chỉ vuốt im
      lặng không chạy trên Android, không lỗi, không cảnh báo
- [x] Sửa `data/schemas/common.ts`: `recurrence` khai `interval`/`until` trong
      khi domain là `intervalN`/`untilDate`. Tên lệch làm `expandRecurrence` đọc
      `intervalN` ra `undefined` rồi lặp mỗi ngày thay vì mỗi tuần

## G5 · Bước 3 — Mời · Tham gia (F2)

Làm sớm là **có chủ ý**: người thứ hai không vào được thì mọi thứ xây thêm đều vô nghĩa.

- [ ] `settings/invite.tsx` — mã 6 ký tự (bỏ `0 O 1 I`), share sheet, deep link `family://join/{code}`
- [ ] `(auth)/join/[code].tsx` — chưa cài app → store → cài → mở → deep link **giữ nguyên**
- [ ] Thẻ mời **hoãn tới khi A có bản ghi đầu tiên** — B không bao giờ thấy màn hình rỗng

## G6 · Bước 4 — Sự kiện + lịch âm

Khác biệt nhất, và cần nhiều thời gian sửa nhất.

- [ ] Tab Sự kiện — hiện **cả hai** ngày; chip `Nhà nội` / `Nhà ngoại` / `Cả hai`
- [ ] `(modals)/event-form.tsx` — **cẩn thận nhất**: chọn lịch âm phải có **dòng xem trước ngay**
      (*"Năm nay rơi vào Chủ nhật 5/10"*). Không có nó, người dùng sẽ không tin app hiểu lịch âm
- [ ] `plan/event/[id].tsx` — hub ngữ cảnh: Việc · Chi phí · Giấy tờ + 3 nút tạo bản ghi
      **đã gắn sẵn `eventId`**
- [ ] Edge `refresh-lunar-dates` — **nơi duy nhất** ghi `next_occurrence_date` (ràng buộc #2)

## G7 · Bước 5 — Tiền

- [ ] `money/index.tsx` — thẻ trạng thái + 4 dòng nhóm + `SẮP PHẢI TRẢ` + `CẦN TRAO ĐỔI` + `MỤC TIÊU`
- [ ] `(modals)/snapshot-update.tsx` — **nghi thức chính**: 4 ô điền sẵn, xong dưới 30 giây.
      Push cho người kia: *"Tình hình tài chính gia đình vừa được cập nhật."*
      **Không bao giờ** viết "X đã thay đổi số tiền"
- [ ] `money/assets.tsx` + `asset/[id].tsx` + form — **không hỏi thanh khoản**, suy ra bằng `inferLiquidity`
- [ ] `money/payments.tsx` + `payment/[id].tsx` — `[Đã trả]` → RPC `settle_payment`
- [ ] **Rà ràng buộc #1** trên mọi màn tiền

## G7b · Lịch sử tiền (thêm ngoài `05 §1`)

Lý do sản phẩm: *niềm tin của người không giữ tiền đến từ việc **thấy được thay đổi**, không phải
từ con số hiện tại.* Không có màn hình đọc thì `delta` chỉ nằm trong DB.

- [ ] `money/history.tsx` — **danh sách mốc thời gian, không biểu đồ**. `status` đọc nguyên từ DB,
      **không** tính lại trên số cũ. Mốc đầu tiên **không** hiện cột chênh lệch (`null` ≠ `0`)
- [ ] `money/changes.tsx` — timeline chung, chạm dòng → mở chi tiết khoản đó
- [ ] Mục "Thay đổi gần nhất" trong `asset/[id]` · `debt/[id]` · `goal/[id]`
- [ ] **Chỉ đọc** — không nút nào sửa/xoá lịch sử. Ngôn ngữ trung tính: `+12 triệu` / `−8 triệu`,
      không "tăng trưởng" / "thâm hụt" / "vượt chi"

## G8 · Bước 6 — Giấy tờ + upload

**Không có máy quét tài liệu** (đã chốt) — chỉ chọn file và upload.

- [ ] `docs/index.tsx` — **chỉ tải thumbnail**, không bao giờ tải bản gốc
- [ ] `docs/[id].tsx` — **vị trí bản giấy là trường quan trọng nhất**. Bỏ máy quét làm ma sát
      chụp ảnh cao hơn, nên đường "chỉ ghi chỗ để giấy, chưa cần ảnh" càng phải mượt.
      Giấy tờ **không có file nào vẫn là bản ghi đầy đủ**, không hiện như thiếu sót
- [ ] `(modals)/doc-form.tsx` — hỏi đúng ba trường trước: tên · ngày hết hạn · bản giấy để đâu
- [ ] Upload 3 pha — file **không bao giờ đi qua server của mình**
- [ ] Hàng đợi persist, chịu được: chọn 8 ảnh rồi khoá máy đi làm việc khác
- [ ] Edge `presign-upload` · `confirm-upload`

## G9 · Bước 7–8 — Nợ · Cần trao đổi · Cài đặt · Gói dịch vụ

- [ ] `money/debts.tsx` + `debt/[id].tsx` + form
- [ ] `money/attention.tsx` — **không có luồng bình luận**; cờ tự hết hiệu lực sau 14 ngày
- [ ] `settings/` — `index` · `household` · `invite` · `subscription`
- [ ] `(modals)/paywall.tsx` — nói **cụ thể đang bị chặn gì**, không doạ.
      Nguồn sự thật của quyền là `households.subscription_status`, không phải SDK RevenueCat
- [ ] Edge `spawn-debt-installments` · `revenuecat-webhook` · 3 cron

---

## Kiểm chứng — chạy trước mỗi lần duyệt

```bash
pnpm --filter @nhaminh/domain test        # cổng G1
pnpm --filter @nhaminh/mobile typecheck
pnpm --filter @nhaminh/mobile lint        # chặn literal tiếng Việt trong JSX
supabase db reset                          # rồi psql -f supabase/tests/smoke.sql
```

**Rà bảng từ vựng** — lý do chính để gom chuỗi vào một chỗ là kiểm được bằng một lần quét:

```bash
grep -rn "phê duyệt\|cảnh báo\|vi phạm\|hiệu suất\|nhiệm vụ\|đối phương" apps/mobile/src/i18n/
```

**Checklist thiết kế** (`design.md §17`) trước khi duyệt mỗi màn: nền trắng · không gradient ·
một tiêu điểm rõ · quét được trong vài giây · tím iris dùng dè (5–8%) · chữ ấm và không phán xét ·
vùng chạm ≥ 44px · trạng thái không chỉ dùng màu · hai thành viên được thể hiện ngang nhau.

## Luồng nghiệm thu

| Luồng | Kiểm gì | Xong ở |
|---|---|---|
| F1 | Dưới **90 giây** từ mở app tới bản ghi đầu tiên, cả ba đường đăng nhập | G3 |
| F2 | B chạm deep link → thấy **dữ liệu của A ngay**, không thấy màn hình rỗng | G5 |
| F3 | Chạm ô tròn → xong tức thì, một chạm, không màn trung gian | ✅ G4 |
| F4 | Thông báo 09:00 mở **thẳng** modal Cập nhật tình hình | G7 |
| F5 | Nhập `15/8 âm` → xem trước đúng → việc gắn `eventId` hiện trên Nhà mình đúng tuần | G6 |
| F6 | Chọn 2 ảnh → upload chạy nền, rời màn hình được | G8 |
| F7 | Gắn cờ → push → `CẦN CHÚ Ý` → `[Đã rõ]` đóng cờ | G9 |
| F8 | `[Đã trả]` → xác nhận dư nợ mới → một transaction | ✅ G2 (tầng DB) |
| F10 | Mua → webhook → mở khoá cho **cả hai** | G9 |

## Không làm ở MVP (`04 §9`)

Chat trong app · chia sẻ vị trí · thực đơn · danh sách mua sắm · album ảnh · gamification ·
bảng xếp hạng giữa hai người · biểu đồ chi tiêu · kết nối ngân hàng · widget · **chế độ tối**.
