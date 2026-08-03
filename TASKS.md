# Nhà mình — Bảng theo dõi triển khai

Nguồn: `implement-app-concept` plan. Thứ tự theo `05 §10` (thứ tự dựng), không theo độ khó.
Mỗi giai đoạn kết thúc bằng **một thứ chạy được**, không phải một tầng code hoàn chỉnh.

Ký hiệu: `[x]` xong · `[~]` đang làm · `[ ]` chưa

---

## Ba ràng buộc không được vi phạm

Đây là ba thứ nếu vi phạm thì sản phẩm sai về bản chất, không phải sai về kỹ thuật.
Rà lại chúng ở cuối mỗi giai đoạn có đụng tới tiền.

1. **Không bao giờ tổng hợp tiền theo người** — trừ **đúng một ngoại lệ có điều kiện**.
   `holderMemberId` / `actorProfileId` chỉ được hiện ở **cấp từng khoản**: không tổng,
   không biểu đồ, không xếp hạng, không bộ lọc theo người.

   Ngoại lệ duy nhất (G18): **quỹ chung, trong phạm vi một tháng** — khối «Người bỏ vào»
   ở `money/fund/[id]`. **Phép thử: con số này có vắt qua nhiều hơn một tháng không?
   Có → cấm.** Ranh giới ép ở bốn tầng độc lập, xem G18 và `03 §9` ngoại lệ 2.
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
      (G4 thêm 16 ca `groupTasksByDue` → 160 · G6 thêm 8 ca `groupEventsByMonth` → **168**)
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

## G5 · Bước 3 — Mời · Tham gia (F2) — **xong**

Làm sớm là **có chủ ý**: người thứ hai không vào được thì mọi thứ xây thêm đều vô nghĩa.

- [x] `settings/invite.tsx` — mã 6 ký tự (bỏ `0 O 1 I`), share sheet hệ thống + sao chép.
      Link dựng bằng `Linking.createURL` chứ không nối chuỗi: ghép tay thì link chỉ chạy ở
      bản build và **im lặng không mở gì** trong lúc phát triển (`exp://` ≠ `family://`)
- [x] `(auth)/join/[code].tsx` — hỏi đúng một trường (tên hiển thị). Mã hiện ở dạng ĐỌC,
      không phải ô nhập: B vừa chạm một link chứa nó, bắt gõ lại là nói app không tin
      thứ nó vừa nhận
- [x] `stores/pending-invite.ts` — **mấu chốt của F2**. B chạm deep link lúc chưa đăng nhập
      thì gate đẩy sang `sign-in` và mã biến mất cùng route bị `replace`. Store persist
      xuống AsyncStorage (TTL 24 giờ) giữ mã sống qua cả vòng đăng nhập lẫn một lần
      process bị Android giết giữa chừng
- [x] Gate ở `app/_layout.tsx` nghe **hai** nguồn deep link: `getInitialURL()` (app chưa
      chạy — ca chính của F2) và `addEventListener` (app đang chạy nền). Thiếu một cái là
      hỏng một nửa số ca. Đăng nhập xong, có mã còn hiệu lực → vào thẳng `join`, không qua `setup`
- [x] Thẻ mời **hoãn tới khi A có bản ghi đầu tiên** — B không bao giờ thấy màn hình rỗng.
      Chỉ đếm member **có tài khoản** (`profileId != null`): đếm cả con nhỏ thì thêm một
      đứa con vào nhà sẽ làm thẻ biến mất trong khi người thứ hai vẫn chưa vào
- [x] `settings/` — `index` (tên hiển thị sửa tại chỗ, đăng xuất) · `household` (tên nhà,
      danh sách thành viên, thêm người không có tài khoản). Vào qua **avatar ở header**
      Nhà mình, `href: null` giấu khỏi tab bar — đúng bốn tab, không thêm (05 §2)

### Một bug im lặng sửa trong G5

- [x] `setHousehold({ memberId: '' })` ở `setup.tsx` — chuỗi rỗng để lách kiểu `UUID`.
      `memberId` đi thẳng vào `completed_by` khi người dùng chạm ô tròn đầu tiên, và `''`
      không phải uuid hợp lệ nên Postgres từ chối cả câu update. **Không có lỗi nào hiện
      lên màn hình** vì optimistic đã đổi giao diện trước rồi. G5 làm nó dễ gặp hơn hẳn
      (B vào bằng mã mời đi đúng đường này), nên `setHousehold` giờ nhận `null` tường minh

### Cạm bẫy công cụ

- [x] **`expo export` KHÔNG sinh lại `.expo/types/router.d.ts`.** Thêm route mới rồi
      typecheck sẽ báo lỗi kiểu ở `router.push` dù file route đúng chỗ. Sinh lại bằng
      `npx expo customize tsconfig.json`. Route động phải gọi dạng object:
      `router.replace({ pathname: '/(auth)/join/[code]', params: { code } })`

## G6 · Bước 4 — Sự kiện + lịch âm — **xong**

Khác biệt nhất, và cần nhiều thời gian sửa nhất.

- [x] Tab Sự kiện — chia mốc theo tháng, hiện **cả hai** ngày với ngày âm mang màu riêng;
      chip bên gia đình `Nhà nội` / `Nhà ngoại` / `Cả hai`
- [x] `(modals)/event-form.tsx` — **dòng xem trước hiện ngay** khi đủ ngày–tháng âm.
      Mặc định theo loại: giỗ và sinh nhật → lịch âm, nhắc trước 3 ngày, và người dùng
      tự chọn lịch một lần thì mặc định thôi đè lên lựa chọn của họ
- [x] `plan/event/[id].tsx` — hub ngữ cảnh: Việc · Chi phí · Giấy tờ + nút tạo bản ghi
      **đã gắn sẵn `eventId`** (`task-form` đọc param). Dòng "Năm ngoái: 6/10/2025" bằng
      `previousLunarOccurrence`, chỉ đọc. Hai nút Chi phí/Giấy tờ hiện nhưng **tắt** —
      giấu rồi thêm lại ở G7/G8 sẽ đổi hình dạng màn hình người dùng đã quen
- [x] Edge `refresh-lunar-dates` — **nơi duy nhất** ghi `next_occurrence_date` (ràng buộc #2).
      Nhận `{eventId}` từ repository (ngày dương có mặt trong vài giây) hoặc không body
      từ cron. **Chỉ ghi khi giá trị đổi**: ghi lại cùng giá trị vẫn chạm
      `touch_updated_at`, và `updated_at` nhảy mỗi đêm cho mọi sự kiện sẽ hỏng mọi thứ
      dựa vào nó để biết "có gì mới"
- [x] `groupEventsByMonth` ở `packages/domain` — **8 test mới → 168**. Hai ca biên JSX
      không kiểm được: cùng số tháng khác năm phải là **hai** nhóm (gom theo `YYYY-MM`,
      không theo số tháng), và sự kiện `nextOccurrenceDate = null` (Edge chưa tính xong)
      **không được biến mất** — người vừa bấm Lưu mà nhìn vào danh sách trống sẽ tưởng hỏng

### Một câu chữ sửa lại so với spec

- [x] `05 §5.5` viết mẫu dòng xem trước là *"Năm nay rơi vào…"*. Câu đó **sai** ở ca rất
      hay gặp: ngày âm đã qua trong năm nay thì lần kế tiếp rơi vào **năm sau**, và
      "năm nay" lúc đó là một lời nói dối kèm ngày đúng — thứ làm mất niềm tin nhanh hơn
      cả không có dòng nào. Đổi thành *"Lần tới rơi vào {weekday} {date}"* và **luôn kèm
      đủ năm**. Kiểm bằng 6 ca thật: `1/1 âm → Thứ Bảy 6/2/2027`, `30/12 âm → Thứ Sáu
      5/2/2027` (đúng hôm trước Tết, tháng chạp thiếu được kẹp), `18/6 âm → hôm nay`

## G7 · Bước 5 — Tiền — **xong**

Tầng dữ liệu đã có sẵn từ G2/G2b (repository, hook, zod, RPC). G7 gần như thuần UI —
và chỗ tốn thời gian nhất không phải dựng màn, mà là quyết định **cái gì không hiện**.

- [x] `money/index.tsx` — thẻ trạng thái + 4 dòng nhóm + `SẮP PHẢI TRẢ` + `CẦN TRAO ĐỔI` + `MỤC TIÊU`.
      Bốn con số đọc từ view `finance_metrics`, **không** cộng ở client trên danh sách tài sản:
      cộng ở client thì màn này lệch với `assets.tsx` mỗi khi có khoản đóng hay xoá mềm
- [x] `(modals)/snapshot-update.tsx` — **nghi thức chính**: 4 ô điền sẵn, xong dưới 30 giây.
      Điền sẵn ưu tiên mốc trước, phương án hai là `finance_metrics`. **Không hỏi ngày** —
      một quyết định thừa trong thứ phải xong trong 30 giây. `status` tính ở client trên
      **bốn con số vừa nhập**, không phải trên `metrics` cũ trong cache
- [x] `money/assets.tsx` + `asset/[id].tsx` + `asset-form` + `update-asset-value` —
      **không hỏi thanh khoản**, suy ra bằng `inferLiquidity`, ẩn sau dòng nhỏ "Đổi cách phân
      loại". Người dùng chạm vào nó một lần thì đổi loại tài sản **thôi đè** lên lựa chọn đó
- [x] `money/payments.tsx` + `payment/[id].tsx` + `payment-form` — `[Đã trả]` → RPC
      `settle_payment`. Dòng xác nhận dư nợ mới hiện **trước khi bấm**, không phải trong hộp
      thoại: một thao tác làm đổi con số ở màn hình khác phải nói trước con số đó thành bao nhiêu
- [x] Mở khoá nút **"Thêm khoản"** trên `plan/event/[id].tsx` (G6 để `disabled` chờ form này)
- [x] `quick-add` — thêm ba đường: sự kiện · khoản sắp trả · khoản tiền
- [x] **Rà ràng buộc #1** trên mọi màn tiền — xem mục dưới

## G7b · Lịch sử tiền (thêm ngoài `05 §1`) — **xong**

Lý do sản phẩm: *niềm tin của người không giữ tiền đến từ việc **thấy được thay đổi**, không phải
từ con số hiện tại.* Không có màn hình đọc thì `delta` chỉ nằm trong DB.

- [x] `money/history.tsx` — **danh sách mốc thời gian, không biểu đồ**. `status` đọc nguyên từ DB,
      **không** tính lại trên số cũ. Mốc đầu tiên **không** hiện cột chênh lệch (`null` ≠ `0`)
- [x] `money/changes.tsx` — timeline chung, lọc theo **loại khoản**, phân trang bằng con trỏ ngày
- [x] Mục "Thay đổi gần nhất" trong `asset/[id]`. `debt/[id]` · `goal/[id]` lên cùng G9 —
      hai màn đó chưa tồn tại, và mục này dùng chung `useEntityMoneyEvents` nên chỉ là một khối JSX
- [x] **Chỉ đọc** — không nút nào sửa/xoá lịch sử. Ngôn ngữ trung tính: `+12 triệu` / `−8 triệu`,
      không "tăng trưởng" / "thâm hụt" / "vượt chi"

### Hai chỗ sửa lại so với spec

- [x] **`"Quá hạn 40 ngày"` sai cho độ mới của số liệu.** `formatDueLabel` trả `overdue_days`
      cho mọi ngày trong quá khứ, và `dueLabelText` đọc nó thành *"Quá hạn N ngày"*. Đúng cho
      một khoản phải trả, **sai** cho một sổ tiết kiệm chưa cập nhật: người dùng chưa bao giờ
      hứa sẽ cập nhật nó, nên họ không lỡ hẹn gì cả — app tự đặt ra một deadline rồi trách họ
      vì không giữ. Thêm `agoLabelText` + `vi.dueLabel.daysAgo` (*"40 ngày trước"*), dùng ở
      `financeStatus.lastUpdated` và mọi chỗ nói về độ mới
- [x] **`useAsset` / `usePayment` / `useDebt` nhận `null`.** Ba form dùng chung cho tạo mới lẫn
      sửa, và `payment/[id]` gọi `useDebt(sourceDebtId)` mà phần lớn khoản chi không sinh từ nợ.
      Thiếu `enabled` thì mỗi lần mở form tạo mới bắn một query với id rỗng, Postgres từ chối
      vì không phải uuid hợp lệ, và màn hình hiện lỗi cho thứ người dùng chưa hề làm

### Hai thứ dựng thêm mà spec không liệt kê

- [x] `design/components/toast.tsx` + `stores/toast.ts` — nghi thức cập nhật là một **modal**,
      và nó đóng sau khi lưu, nên toast dựng trong nó bị gỡ trước khi kịp đọc. Store nhỏ là chỗ
      nối: modal `show()` rồi `back()`, màn hình dưới hiện. Dùng lại cho `[Đã trả]`, `Cập nhật
      giá trị`, và `Cần trao đổi`
- [x] `money/_layout.tsx` — Stack cho tab, cùng lý do với `plan/_layout.tsx`: thiếu nó thì
      expo-router coi mỗi file trong thư mục là một tab con và tab bar mọc thêm sáu mục

### `AttentionRow` đã cân nhắc và bỏ

`components/index.ts` từng ghi chú sẽ thêm nó ở G7. Bỏ: cờ "cần trao đổi" hiện ở **ba chỗ với
ba hình dạng khác nhau** — một dòng tóm tắt trên màn Tiền, một nút trong chi tiết khoản, một
dòng đầy đủ ở `attention.tsx` của G9. Một primitive gánh cả ba sẽ có nhiều prop điều kiện hơn
là code nó tiết kiệm được.

## G7c · Tái cấu trúc: gom UI về feature — **xong**

Làm ngay sau G7 vì đây là lúc rẻ nhất: 26 màn hình đã dựng, G8/G9 còn thêm ~12 nữa.

**Vấn đề:** repo cắt theo feature, nhưng UI bị Expo Router kéo hết sang `app/` — **5.385 dòng
trong `app/` so với 3.612 dòng ở `src/features/`**. Hơn 40% code nằm ngoài kiến trúc. Một
feature bị xé làm hai cây thư mục: sửa "cách hiện một khoản tài sản" phải đoán giữa 4 file ở
2 chỗ. Expo Router chỉ ép **file route** nằm đúng vị trí — nó không ép file đó chứa UI.

- [x] 27 màn hình → `features/<feat>/screens/`, đổi `export default` → **named export**
- [x] Mỗi file route trong `app/` còn **đúng một dòng** re-export. `app/` từ 5.385 →
      **328 dòng**, và không còn một dòng UI nghiệp vụ nào — phần còn lại toàn `_layout.tsx`
      (khai báo Stack/Tabs thật) cộng `app/index.tsx` (route rỗng lúc bootstrap)
- [x] `app/_layout.tsx` **176 → 63 dòng**: `AuthGate` (gate ba nhánh onboarding, mã mời chờ,
      ẩn splash) → `features/auth/components/auth-gate.tsx`; `useCaptureInviteCode` →
      `features/invite/queries/`. File gốc giờ trả lời đúng một câu: *app có provider nào
      và theo thứ tự nào*
- [x] `docs/index.tsx` (placeholder chờ G8) → `features/document/screens/`. Ban đầu định để
      lại với lý do "sắp bị thay thế" — lý do đó sai: nó vẫn là UI trong `app/`, và một
      ngoại lệ không có nguyên tắc sẽ thành tiền lệ cho ngoại lệ tiếp theo
- [x] `design/components/` chỉ còn primitive. `TaskRow` → `features/task/components/`,
      `EventRow` + `LunarDatePicker` → `features/event/components/`.
      **`StatusPill` ở LẠI** — cả `home` lẫn `money` đều dùng, nhét vào một trong hai sẽ
      làm feature kia phải import chéo
- [x] `expo export` xanh — typecheck không bắt được lỗi resolve runtime, phải bundle thật

### Hàng rào lint: chỗ nguy hiểm nhất của cả đợt

- [x] `.eslintrc.js` cũ nhắm `app/**` + `src/design/**`. Screen chuyển sang
      `src/features/*/screens/` là **rơi ra ngoài cả hai luật** — vẫn biên dịch, vẫn chạy,
      nhưng hàng rào chặn `supabase` và chặn chuỗi tiếng Việt trong JSX im lặng ngừng hoạt
      động. Kiểu hỏng tệ nhất: không có lỗi nào để nhìn thấy. Cập nhật `files` **cùng lúc**
      với việc di chuyển, và **kiểm bằng ba lần vi phạm cố ý** rồi khôi phục

### Hai bug hàng rào mới bắt được (tồn tại từ G3)

- [x] **Luật chặn repository chưa bao giờ chặn được gì.** Nó trỏ `**/data/repositories/*` —
      một thư mục **chưa từng tồn tại** trong repo này (đường dẫn thật là
      `features/<feat>/repository/`). Sửa xong nó bắt ngay một vi phạm thật:
      `app/_layout.tsx` gọi thẳng `authRepository.getSession()` và `.onAuthStateChange()`.
      Tách thành `useRestoreSession()` ở `features/auth/queries` — nó không phải `useQuery`
      (là subscription dài hạn), nhưng đó không phải lý do để tầng route gọi thẳng repository
- [x] **`allowTypeImports` cần bản `@typescript-eslint/no-restricted-imports`**, luật ESLint
      gốc báo config sai nếu gặp nó. Phải `'no-restricted-imports': 'off'` cùng lúc, nếu
      không hai luật cùng chạy và luật gốc chặn lại đúng thứ bản TS vừa cho phép.
      `import type { PaymentWindow }` bị xoá lúc biên dịch nên không tạo phụ thuộc runtime —
      chặn cả nó thì chỗ gọi buộc phải khai lại type, hai định nghĩa cho một thứ

### Còn nợ

- [ ] `DateTile` là **code chết** — được export ở `design/components/index.ts` nhưng không màn
      nào render. Tàn dư từ G4/G6. Để lại vì nằm ngoài phạm vi đợt này; đừng dựng màn mới
      quanh nó trước khi kiểm lại nó còn đúng design.md không

### Vì sao `app/` vẫn còn 12 thư mục và 27 file

Không phải rác chưa dọn. **Expo Router 57 chỉ có file-based routing** — đường dẫn URL suy ra
từ đường dẫn file, không có API khai route bằng code (đã kiểm `node_modules/expo-router/build/`:
chỉ có `ExpoRoot` quét thư mục `app/`). `app/(app)/money/asset/[id].tsx` **chính là** định
nghĩa route `/money/asset/:id`; xoá file là mất route.

Nghĩa là cây thư mục `app/` phản chiếu **cây URL**, không phản chiếu cách tổ chức code — và
hai thứ đó không nhất thiết giống nhau. Đây là giới hạn của công cụ, không phải lựa chọn kiến
trúc. Thứ tối đa làm được là ép mỗi file xuống một dòng, và đã làm.

## G8 · Bước 6 — Giấy tờ + upload — **xong code, chưa nghiệm thu**

**Không có máy quét tài liệu** (đã chốt) — chỉ chọn file và upload.

- [x] `docs/index.tsx` — **chỉ tải thumbnail**, không bao giờ tải bản gốc. Repository ép điều
      này ở tầng dưới (câu select của `list` cố ý không lấy `r2_key`); `useFileUrls(…, 'thumb')`
      là vế còn lại. Chỉ ký thumbnail **trang đầu** mỗi giấy tờ — hợp đồng 6 trang chỉ hiện một
      ô, năm chữ ký kia không ai nhìn tới
- [x] `docs/[id].tsx` — **vị trí bản giấy là trường quan trọng nhất**: đứng riêng, chữ `title2`,
      trên mảng màu lớn DUY NHẤT của màn hình. Chưa ghi thì nó là **nút mời ghi**, không phải ô
      trống — ô trống nói "bạn thiếu dữ liệu", nút nói "chạm vào đây thì xong".
      Giấy tờ **không có file nào vẫn là bản ghi đầy đủ**: không badge, không "0 file", chỉ một
      dòng nhỏ nói biết chỗ để giấy đã đủ dùng
- [x] `(modals)/doc-form.tsx` — hỏi đúng ba trường trước: tên · ngày hết hạn · bản giấy để đâu.
      **Không** mở bộ chọn file trước như `05 §7.3`: bỏ máy quét làm thứ tự đó vô nghĩa (bắt
      người dùng đi tìm ảnh cho một bản ghi chưa tồn tại). Lưu xong đi **thẳng** vào chi tiết —
      đó mới là nơi đính file
- [x] Upload 3 pha — file **không bao giờ đi qua server của mình**. `presign` ghi hàng
      `document_files` TRƯỚC khi PUT: mất mạng giữa chừng để lại rác có hạn (cron dọn sau 24h),
      còn ghi sau thì file nằm trên R2 mà không ai biết để dọn
- [x] Hàng đợi persist, chịu được: chọn 8 ảnh rồi khoá máy đi làm việc khác. Chạy **tuần tự**
      một file một lúc; ghi trạng thái `uploaded` **trước** pha 3 nên app bị giết đúng lúc đó
      thì lần mở sau chỉ phải gọi confirm, không tải lại cả file
- [x] Edge `presign-upload` · `confirm-upload` · **`sign-download`** (không có trong danh sách
      gốc nhưng bắt buộc: bucket không công khai, nên mọi thumbnail đều phải ký mới hiện được)

### R2 chưa có key — phần còn lại chạy bình thường

Ba Edge đọc `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET` từ env.
Thiếu chúng thì trả `503 storage_not_configured` — **nói thẳng là chưa cấu hình**, không giả vờ
là lỗi mạng hay lỗi quota. Nửa "ghi thông tin + vị trí bản giấy" không đụng tới R2 và chạy đầy
đủ ngay bây giờ; đó cũng là đường chính (05 §7.2), không phải đường lui.

Ký SigV4 **viết tay** bằng Web Crypto (~60 dòng) thay vì kéo SDK S3. Hai chỗ R2 khác S3 và đều
làm chữ ký sai một cách khó đoán: region **luôn** là `auto`, và bucket nằm trong **path** chứ
không phải subdomain.

### Ba thứ phát hiện trong G8

- [x] **`notes` của giấy tờ rơi mất cả hai đầu.** Cột `documents.notes` có, `DocumentInput` có,
      form ghi xuống — nhưng `FamilyDocument` không khai trường đó và `toDocument` không đọc nó.
      Nghĩa là ghi chú người dùng gõ vào **lưu được xuống DB nhưng không bao giờ đọc lại lên**.
      Bốn thực thể khác đều có `notes`, nên đây là chỗ sót từ G2 chứ không phải quyết định
- [x] **URL đã ký không được vào cache đĩa.** Chữ ký sống 15 phút, cache persist sống 7 ngày.
      Ghi xuống đĩa thì lần mở app sau khôi phục một loạt URL đã chết và màn hình hiện **đúng số
      ô ảnh, đúng bố cục, chỉ mọi ảnh đều vỡ** — không có lỗi nào để nhìn thấy vì truy vấn đã
      "thành công". Key mang sẵn đoạn `'signed-url'` để `shouldDehydrateQuery` loại ra
- [x] **`functions.invoke` KHÔNG ném khi server trả 4xx** — nó trả `error` với thân response
      chưa đọc. Không mở thân ra thì `quota_exceeded` và `premium_required` (hai thứ có câu chữ
      riêng và đường đi riêng) đều rơi xuống `unknown`, và người dùng nhận "Chưa làm được. Thử
      lại giúp mình nhé" cho một việc thử lại bao nhiêu lần cũng không xong

### Còn nợ của G8

- [ ] Nghiệm thu F6 cần R2 key thật + máy thật (`expo-image-picker` và `UploadTask` đều không
      chạy trong bản export)
- [ ] Bộ lọc **Theo người** / **Theo loại** (`05 §7.1`) — cần một lớp chọn thứ hai và chỉ có
      nghĩa khi nhà đã có vài chục giấy tờ
- [ ] Thumbnail cho PDF — cần `react-native-pdf-thumbnail` (module native, phải có EAS dev
      build). PDF hiện ô giữ chỗ chữ "PDF"; bản gốc vẫn mở được bình thường

## G8b · Đồng bộ token với `design.md` — **xong**

Phát hiện lúc dựng G8: `tailwind.config.js` ghi "nguồn sự thật là design.md" nhưng giá trị bên
dưới là của một **bản design.md cũ hơn** (iris/jade/amber, trung tính ấm). Bản trên đĩa dùng
brand chàm `#6257F6`, trung tính **lạnh**, và bộ ngữ nghĩa `positive`/`attention`/`critical`.

Sửa ngay thay vì để lại: G8 thêm ~600 dòng `className`, và mỗi màn viết theo bảng cũ là một màn
phải sửa lại lần nữa.

- [x] `tailwind.config.js` dịch **nguyên văn** `design.md §17–18`. Không giữ token nào design.md
      đã bỏ — một token tồn tại mà không có trong design.md là token không ai rà được
- [x] 54 file đổi tên token. **`subtle` đổi NGHĨA** (nền → **màu chữ**), nên `bg-subtle` →
      `bg-soft` phải chạy **trước** `text-tertiary` → `text-subtle`. Đổi nhầm thứ tự cho ra một
      màn hình chữ gần như vô hình trên nền trắng — và nó vẫn biên dịch bình thường
- [x] Hex cứng trong prop React Native (`placeholderTextColor`, `tabBarActiveTintColor`,
      `headerTintColor`) — Tailwind không với tới được, phải đổi tay
- [x] **CTA chính đổi sang ĐEN** (`design.md §5.2`, §10.1). Đây là chỗ đổi tên máy móc cho ra
      kết quả sai: `bg-iris` → `bg-brand` biên dịch được nhưng vi phạm *"brand must not compete
      with the primary CTA"*. Cả `Button` primary lẫn `FAB` giờ dùng `action`, bo `999px` theo §8
- [x] **Bỏ bảng màu-theo-module** (`task`/`event`/`finance`/`document`). `design.md §5.4` nói
      thẳng: màu ngữ nghĩa không được dùng làm màu trang trí theo module. Ngày âm và dấu ◆ của
      sự kiện chuyển sang `brand` vì chúng là **ngữ cảnh thời gian** — đúng vai trò của brand (§5.3)
- [x] **Avatar còn hai sắc trung tính** thay vì bốn màu tươi băm theo tên. `design.md §5.5`:
      không gán màu cho thành viên theo giới tính — và với một nhà đúng hai người thì bảng bốn
      màu **luôn** cho ra "một màu của vợ, một màu của chồng", đúng thứ ràng buộc "hai người
      ngang nhau" cấm

## G9 · Bước 7 — Nợ · Cần trao đổi · Cron — **xong code, chưa nghiệm thu**

Gói dịch vụ **tách khỏi G9** (đã chốt) — xem G10 bên dưới.

- [x] `money/debts.tsx` + `debt/[id].tsx` + `debt-form`. Dòng "Đang nợ" trên màn Tiền giờ có
      đích; đúng như ghi chú G7 dự kiến, chỉ đổi **đích** chứ không đổi hình dạng — `GroupRow`
      vốn đã vẽ mũi tên khi có `onPress`, nên bốn dòng vẫn là bốn dòng giống nhau
- [x] **Không có nút `[Đã trả]` ở màn chi tiết nợ.** `settle_payment` chốt một **kỳ trả cụ
      thể**, nên chỗ đúng để bấm là chi tiết KỲ TRẢ — nơi G7 đã đặt dòng xác nhận *"Dư nợ sẽ
      còn 172.000.000 ₫"* hiện ra trước khi bấm. Một nút ở màn nợ sẽ phải hỏi lại "trả kỳ nào",
      tức là bắt người dùng chọn một thứ họ vừa đi qua
- [x] **Dư nợ chỉ hỏi một lần, lúc tạo** (02 §7) — ép ở **tầng type**:
      `DebtPatch = Partial<Omit<DebtInput, 'remainingAmount'>>`, nên một ô nhập dư nợ ở chế độ
      sửa sẽ không biên dịch được. Form sửa thay ô đó bằng một dòng nói dư nợ tự giảm thế nào:
      ẩn hẳn thì người dùng đi tìm, nói ra thì họ biết phải làm gì thay thế
- [x] `money/attention.tsx` — **không có luồng bình luận**; nút `[Đã rõ]` đóng cờ.
      `resolutionNote` ở lại **tuỳ chọn**: bắt gõ một câu trước khi đóng là dựng lại đúng thứ
      vừa tránh. Hai người đã nói chuyện xong rồi mới bấm nút này
- [x] Sáu Edge cron còn thiếu theo `schema §14` (nhiều hơn "3 cron" bản kế hoạch ghi):
      `spawn-debt-installments` · `expire-attention-items` · `nudge-snapshot-update` ·
      `autosnapshot-monthly` · `sweep-orphan-uploads` · `purge-soft-deleted`

### `progressPct` + `debtPaidAmount` xuống `packages/domain` — **9 test mới → 177**

`progressPct` từng là hàm cục bộ trong `money-overview-screen`. Chi tiết nợ cần đúng logic đó,
và chép sang là hai đường code cùng tính một thứ. Cả hai hàm đều có ca biên thật:

- mẫu số 0 → chia cho 0 ra `Infinity`, và `width: Infinity%` là style không hợp lệ.
  React Native **bỏ qua im lặng**, thanh vẽ rỗng trông y hệt 0% — bug này không bao giờ tự lộ
- `debtPaidAmount` trả **`null` khi chưa nhập gốc**, không phải 0. Trả 0 sẽ nói với người dùng
  rằng họ chưa trả đồng nào cho một khoản họ đã trả hai năm
- `remaining > principal` xảy ra thật (nhập gốc chưa gồm lãi) → "đã trả" ra **âm**, và số âm đó
  đi thẳng vào `progressPct` rồi vào `width`

### Ba thứ phát hiện trong G9

- [x] **`nudge-snapshot-update` phải chạy SAU `build-reminders`, không phải trước.**
      `build-reminders` xoá sạch mọi nhắc nhở tương lai chưa gửi của một nhà rồi dựng lại từ
      đầu. Hàng do nudge ghi có `fire_at` cùng ngày — nằm đúng trong khoảng bị xoá. Chạy nudge
      lúc 04:00 thì **vòng lặp thói quen chính của cả sản phẩm** im lặng không bao giờ bắn.
      Đã ghi bảng thứ tự đầy đủ vào `SETUP-CLOUD.md`
- [x] **`upcoming_payments` KHÔNG có unique constraint chặn trùng** (khác `task_instances`, nơi
      `unique (task_id, due_date)` cho phép `upsert ignoreDuplicates`). Nghĩa là
      `spawn-debt-installments` không có lưới an toàn nào ở tầng DB: chạy hai lần sẽ sinh hai kỳ
      trả giống hệt, và `finance_metrics` cộng `dueNext30d` từ đó — màn Tiền nói nhà mình cần
      chuẩn bị **gấp đôi** số tiền thật. Phải tự kiểm trước mỗi lần ghi
- [x] **`entity_type` enum không có `'household'`.** Lời nhắc cập nhật tình hình nói về **cả
      nhà**, không thuộc bản ghi nào. Tạm dùng `entity_type = 'asset'` với
      `entity_id = household_id` (không trùng id tài sản nào). Đây là chỗ chật, nên sửa bằng
      migration thêm `'household'` vào enum khi có dịp đụng lại schema — đã ghi lý do tại chỗ

### Một quyết định về kiểu, ngược với hướng "gọn"

- [x] `attention-repository` tra tên khoản bằng **`switch` bảy nhánh**, không bằng bảng tra
      `{table, column}`. Bảng tra gọn hơn để đọc, nhưng tên bảng/cột lúc đó là **chuỗi động** và
      `database.types.ts` không kiểm được chuỗi động: `.from(t.table)` mất sạch kiểu, và đổi tên
      một cột trong migration sẽ **không** làm typecheck đỏ — nó chỉ hỏng lúc chạy, ở một màn
      phụ, dưới dạng một dòng thiếu tên

### Còn nợ của G9

- [ ] Nghiệm thu F7 (gắn cờ → push → `CẦN CHÚ Ý` → `[Đã rõ]`) cần tầng push thật
- [ ] Nghiệm thu cron cần deploy lên cloud — không có `functions serve` (không Docker), và
      **Deno chưa cài trên máy này** nên Edge Function không có cổng typecheck cục bộ nào. Đã
      đối chiếu tay mọi import `@family-organizer/domain` và mọi tên cột với `0001_init.sql`
- [ ] `money/goals` + `goal/[id]` (`05 §6.6` là **P1**) — mục MỤC TIÊU trên màn Tiền vẫn chỉ
      đọc, chưa có form tạo. `debt/[id]` đã có mục "Thay đổi gần nhất"; `goal/[id]` còn thiếu

## G10 · Gói dịch vụ — **chưa làm, chờ EAS build**

Tách khỏi G9 vì nó là thứ **duy nhất** trong hai bước 7–8 có phụ thuộc bên ngoài: RevenueCat
cần EAS dev build + sản phẩm đã khai trên App Store/Play mới mua thử được — cùng ràng buộc đang
giữ Google/Apple Sign-in ở G3.

- [ ] `settings/subscription.tsx` — đọc `households.subscription_status`
- [ ] `(modals)/paywall.tsx` — nói **cụ thể đang bị chặn gì**, không doạ.
      Nguồn sự thật của quyền là `households.subscription_status`, **không phải** SDK RevenueCat
- [ ] Edge `revenuecat-webhook`
- [ ] Quyền thuộc household: người kia được dùng ngay, không phải mua lại (F10)

Ba màn `settings/` còn lại (`index` · `household` · `invite`) **đã xong từ G5**.

---

# Concept v2 — G11–G16

Nguồn: `spec/` (`06-delta-v2` · `07-local-modules` · `08-addendum-v2.1` + `02`/`03`/`05` bản v2.1).

**Đây là thay đổi mô hình sản phẩm, không phải một đợt thêm tính năng.** Câu hỏi trung tâm đổi
từ *"nhà mình đang ổn không?"* sang *"sắp tới nhà mình cần bao nhiêu?"*, và nghi thức cập nhật
định kỳ — thứ G7 xây cả một vòng lặp thói quen quanh nó — bị loại bỏ.

## G11 · Nền móng — DB + domain — **xong code, chưa đẩy lên cloud**

Làm trước UI có chủ ý, cùng lý do với G1: đây là chỗ lỗi **im lặng**.

- [x] `0004_concept_v2.sql` — `family_side` (`paternal|maternal` → `husband_family|wife_family`),
      `entity_type` thêm `shopping_item` + `household`, ngưỡng ghi, cột mốc trial,
      `assets.updated_by_member_id`, `goals.as_of_date`, ba bảng mới
      (`shopping_items` · `event_occurrences` · `ingest_drafts`), ba view
      (`finance_metrics` dựng lại · `upcoming_needs` · `money_history`), RLS + GRANT
- [x] `0005_local_modules.sql` — `contacts` · `gift_entries` · view `gift_history` ·
      `vaccine_schedule_items` · `child_vaccine_doses` · `child_growth_records`
- [x] `supabase/seed/vaccine-schedule.sql` **để trống** + `README.md` ghi cổng chặn phát hành
- [x] `packages/domain` — 10 hàm mới (`computeFreshness` · `shouldAskForRefresh` ·
      `projectRunway` · `formatDeclaredAt` · `groupHistoryByMonth` · `lastYearFor` ·
      `suggestGiftAmount` · `summarizeOccasion` · `buildVaccineSchedule` · `doseStatus` ·
      `formatDoseLabel`); **177 → 262 test xanh**
- [x] Gỡ nghi thức snapshot: màn hình · route · Edge `nudge-snapshot-update` · `is_manual` ·
      `snapshot_interval_days` · chuỗi i18n · dòng cron trong `SETUP-CLOUD.md`
- [x] `expo export` xanh — 5.6MB Hermes bytecode

### Bốn thứ phát hiện trong G11 mà spec không nói ra

- [x] **`DROP VIEW` kéo theo GRANT của view cũ.** Mục 9 drop rồi tạo lại `finance_metrics`;
      thiếu dòng `grant select` thì migration báo **thành công** và mọi màn tiền chết ngay sau
      đó với `permission denied`. Kiểu hỏng tệ nhất: không có gì để nhìn thấy lúc chạy migration
- [x] **`contribute_to_goal` đã tồn tại từ 0002** với chữ ký `(uuid, numeric, date)`.
      `create or replace` với danh sách tham số khác tạo một **OVERLOAD thứ hai** chứ không thay
      thế, và PostgREST khi đó trả *"Could not choose the best candidate function"* — lỗi chỉ lộ
      lúc chạy. Phải `drop function` bản cũ tường minh trước
- [x] **`assets.updated_by_member_id` chưa bao giờ tồn tại.** `as_of_date` có từ 0001 nhưng
      không có cột nói AI khai, nên `formatDeclaredAt` chỉ dựng được *"6 tuần trước"* mà mất
      đúng nửa quan trọng. Thêm cột + sửa RPC `update_asset_value` ghi nó
- [x] **`build-reminders` ghi cứng `target_member_id: null`.** Nghĩa là một việc gán riêng cho
      vợ vẫn bắn thông báo cho **cả hai** — đúng thứ `06 §7` cấm. Đã nối `assignee_id` qua
      `buildReminders` và gộp theo cặp `(ngày, người nhận)`; `capPerDay` cũng đếm theo cặp, nếu
      không thì thông báo của một người ăn mất suất của người kia

### Còn nợ của G11

- [ ] **Chưa chạy `pnpm db:push`.** `family_side` đổi một enum ĐANG CÓ DỮ LIỆU trên cloud và
      không có Docker local nên không có bước tập dượt. Chạy trên project staging trước, đối
      chiếu `select side, count(*) from events group by 1` trước/sau
- [ ] Nếu project đã `cron.schedule` job `nudge-snapshot-update`: phải
      `select cron.unschedule('nudge-snapshot-update')` — xem `SETUP-CLOUD.md §5`
- [ ] `pnpm fn:deploy` cho `autosnapshot-monthly` + `build-reminders` (đã sửa, chưa deploy)

## G12 · Vòng lặp hằng ngày — Mua sắm + ngưỡng ghi — **xong code**

Bề mặt hằng ngày duy nhất của app. Lý do app được mở trong tuần không có sự kiện nào.

- [x] `features/shopping/` đủ tầng: repository · queries · components · screens.
      **Cố ý KHÔNG có** `schemas/`: một ô nhập một dòng không cần zod, và một schema
      ở đây sẽ là chỗ mời thêm trường vào thứ cố ý thiếu trường
- [x] Tab con thứ hai `Việc | Mua sắm | Sự kiện`, mua sắm nằm GIỮA — đặt cuối thì thao
      tác thường xuyên nhất lại xa nhất
- [x] Ô nhập cố định trên cùng, **bàn phím giữ nguyên sau khi thêm** (`blurOnSubmit={false}`
      + `focus()` cho Android). Ô tự xoá ngay khi gửi nên cảm giác tức thì dù không optimistic
- [x] `useToggleShoppingItem` optimistic; `useAddShoppingItem` **không** — id do DB sinh,
      một dòng lạc quan mang id giả rồi bị thay, và tick đúng dòng đó trong khoảng giữa
      sẽ bắn lệnh với id không tồn tại
- [x] Mục đã tick **mờ đi, ở lại 24h** rồi cron dọn. Tick nhầm là chuyện thường xuyên khi
      vừa đẩy xe vừa cầm điện thoại — biến mất tức thì là thao tác không hoàn tác được
- [x] Card `CẦN MUA` trên Nhà mình — **nhóm duy nhất hiện cả khi mọi nhóm khác rỗng**;
      `isEmpty` phải tính cả nó, nếu không màn hình vừa hiện "Bắt đầu từ điều gần nhất"
      vừa hiện ba món cần mua
- [x] Cron `purge-soft-deleted` thêm **hai chặng**: tick + 24h → xoá mềm; xoá mềm + 30
      ngày → xoá cứng. Không xoá cứng thẳng sau 24h: 30 ngày hoàn tác là lời hứa chung
      của cả schema (§3)
- [x] **Ngưỡng ghi** (06 §2): `(auth)/threshold.tsx` một câu bốn nút · sửa ở Cài đặt →
      Nhà mình bằng `ChipSelect` · `useRecordThresholdHint()` cho dòng nhắc dưới ô nhập
      tiền. **Không phải validation** — không chặn, không cảnh báo, không constraint

### Ba chỗ suýt hỏng trong G12

- [x] **Gate đẩy `threshold` về `home` ngay trong khung hình đầu tiên.** Nó là bước
      onboarding DUY NHẤT chạy khi nhà ĐÃ tồn tại, nên cả `useEffect` điều hướng lẫn
      `canRender` đều coi nó là "đã có nhà mà còn ở `(auth)`" và đá ra. Không có lỗi nào
      để nhìn thấy — chỉ là một bước onboarding im lặng biến mất
- [x] **`expo export` KHÔNG sinh lại `.expo/types/router.d.ts`** (bài học G5 lặp lại):
      thêm route `threshold` xong `router.replace` đỏ dù file đúng chỗ.
      `npx expo customize tsconfig.json` để sinh lại
- [x] **`recordThresholdAmount` phải kiểm `!== undefined`, không phải truthy.** `null` là
      giá trị HỢP LỆ ("tự quyết"); dùng truthy thì người dùng không bao giờ quay lại được
      lựa chọn đó sau khi đã chốt một con số

## G14 · Sự kiện v2 — trí nhớ năm ngoái + chi phí thực tế — **xong code, chưa deploy**

*"Subscription sống bằng cái mất đi khi hủy"* (`06 §5`). Đây là thứ đó — và nó chỉ có
giá trị vào **năm thứ hai**, nghĩa là mọi lỗi ở đây đều im lặng suốt 12 tháng đầu.

- [x] **Cron ghi `event_occurrences`** — `refresh-lunar-dates` ghi một dòng khi
      `next_occurrence_date` trôi qua, **rồi mới** tính mốc kế tiếp. Thứ tự đó là bắt
      buộc: một khi cột đã bị đẩy sang năm sau thì ngày vừa qua không còn ở đâu trong DB.
      Chỉ ghi ở **chế độ cron**, không ghi khi client gọi kèm `{ eventId }` — lúc đó ngày
      cũ là ngày người dùng vừa sửa bỏ, không phải một dịp đã diễn ra
- [x] `cost_asked` đặt sẵn `true` cho sự kiện **không có** `estimatedCost`: `05 §5.7` chỉ
      hỏi sau khi một dịp CÓ dự kiến trôi qua. Không có nhánh này thì mọi sinh nhật, mọi
      ngày kỷ niệm đều sinh một câu hỏi "hết bao nhiêu?" mỗi năm
- [x] `EventRepo` thêm ba hàm chỉ-đọc-và-ghi-một-cột: `occurrences` · `pendingCostAsk` ·
      `recordActualCost`. **Không có `create`** — dòng occurrence chỉ do cron sinh (03 §3)
- [x] Khối `NĂM NGOÁI` ở chi tiết sự kiện, đặt **trước** "việc cần chuẩn bị": người mở màn
      này để chuẩn bị, và câu hỏi đầu trong đầu họ là *"lần trước hết bao nhiêu"*
- [x] Sheet `(modals)/event-actual-cost.tsx` — tự bật **một lần mỗi lần chạy app** ở màn
      Nhà mình. Cả `[Lưu]` lẫn `[Bỏ qua]` đều đóng câu hỏi vĩnh viễn; **vuốt xuống thì
      không** (cử chỉ điều hướng ≠ quyết định)
- [x] **Việc nhà chống tạo bằng chứng** (`06 §7`): chip người phụ trách chạm-đổi-ngay trên
      dòng Việc — không sheet, không xác nhận, không thông báo. Vòng đổi **chỉ** qua
      `owner`/`partner`, không rơi vào `child`/`relative`
- [x] **262 → 263 test xanh** — chỉ +1: `lastYearFor` đã có 6 ca từ G11 ở
      `local-modules.test.ts`. Ca thêm là ca duy nhất còn thiếu và là ca dễ sai nhất —
      *lần gần nhất KHÔNG có số tiền vẫn thắng lần cũ hơn CÓ số tiền*. Ưu tiên dòng "đầy
      đủ hơn" sẽ hiện chi phí của hai năm trước dưới nhãn "năm ngoái", sai một cách rất
      khó phát hiện vì bản thân con số trông hoàn toàn hợp lý. `expo export` xanh — 5.7MB

### Bốn quyết định trong G14 mà spec không nói ra

- [x] **`insert`, KHÔNG `upsert`.** Sự kiện dương lịch một lần đã qua giữ nguyên
      `solar_date` mãi mãi, nên đêm nào cron cũng thử ghi lại đúng dòng cũ.
      `unique (event_id, occurred_on)` chặn — đó là thiết kế, không phải lưới an toàn phụ.
      Đổi sang `upsert` sẽ ghi đè `actual_cost` người dùng vừa nhập bằng `null`, **mỗi
      đêm**, cho tới khi họ nhận ra con số biến mất
- [x] **`pendingCostAsk` trả đúng MỘT dòng.** Ba dịp trôi qua trong lúc người dùng đi vắng
      không được thành ba câu hỏi xếp hàng lúc mở app. Cũng lọc sự kiện đã xoá mềm: cascade
      chỉ chạy khi xoá CỨNG, nên dòng occurrence vẫn còn sau khi người dùng xoá sự kiện
- [x] **`staleTime: Infinity` cho `pendingCostAsk`.** Không có nó, một refetch giữa chừng
      đổi nội dung sheet **dưới tay người dùng** — họ gõ số cho giỗ ông ngoại rồi bấm Lưu
      vào một sự kiện khác
- [x] **Cờ "đã hỏi lần này" nằm ở module scope, không phải `useRef`.** `HomeScreen` tháo/lắp
      theo tab nên mọi state trong nó chết theo, và sheet sẽ bật lại mỗi lần quay về tab —
      kể cả ba giây sau khi người dùng vừa vuốt xuống đóng nó

### Còn nợ của G14

- [ ] **Chưa deploy `refresh-lunar-dates`.** Toàn bộ tính năng đứng sau nó: không deploy thì
      `event_occurrences` không bao giờ có dòng nào, và mọi thứ ở trên đều chạy đúng trên
      một bảng rỗng — **kiểu hỏng không có gì để nhìn thấy**
- [ ] Prefill ô chi phí dự kiến từ số thực tế năm ngoái (`05 §5.6`) — **chưa làm được**:
      form sự kiện hiện chỉ có đường TẠO (`useCreateEvent`), chưa có màn sửa, mà sự kiện
      mới thì theo định nghĩa chưa có lịch sử. Làm cùng lúc với màn sửa sự kiện
- [ ] Paywall cho bản ghi cũ hơn 12 tháng (`06 §5`) — chờ G10. Dữ liệu **vẫn ghi** từ ngày
      đầu cho mọi household kể cả free; chỉ phần ĐỌC bị chặn
- [x] ~~`.expo/types/router.d.ts` sửa tay cho route mới~~ — **KHÔNG cần sửa tay.** G15 tìm ra
      cách: `expo export` đúng là không sinh lại nó, nhưng `npx expo start` thì có, sau ~6 giây.
      Không cần simulator: chạy nền, đợi file đổi, rồi `pkill -f "expo start"`

## G13 · G15 · G16

Theo thứ tự dựng ở `06 §11`:

- [x] **G13** Trái tim v2 — **xong code, chưa nghiệm thu** (chờ `db:push`; xem dưới)
- [x] **G15** Hai module bản địa — **xong code, CHẶN PHÁT HÀNH ở seed lịch tiêm** (xem dưới)
- [x] **G16** Khung AI capture · gói khởi tạo · dọn `spec/` ← `spec v2/` — **xong code, đường AI chưa nối model** (xem dưới)

---

## G13 · Trái tim v2 — **xong code, chưa nghiệm thu**

Nối UI vào tầng G11 đã dựng. Trước đợt này `projectRunway` và `groupHistoryByMonth` được
export từ domain mà **không có chỗ gọi**, và view `money_history` chưa ai đọc — tầng dưới
xong từ G11 nhưng không có đường nào nhìn thấy nó.

- [x] **Màn "Sắp tới"** (`05 §6.1`) — `features/money/screens/upcoming-screen.tsx` + route
      `money/upcoming.tsx`. Hero 90 ngày · gom theo tháng · đối chiếu `totalUsable` kèm nhãn
      thời gian · khi thiếu thì đổi hẳn câu chữ (không chỉ tô đỏ số âm) và **không kèm lời
      khuyên nào**. Dòng hỏi lại số dư chỉ hiện khi `shouldAskForRefresh()` true; bỏ qua thì
      im 14 ngày qua `stores/ui-prefs.refreshAskSnoozedUntil` — cục bộ MỘT máy, cố ý không
      lên server: người kia bỏ qua trên máy họ không có nghĩa mình đã thấy câu hỏi
- [x] Đường vào đặt **trên** bốn dòng nhóm ở tab Tiền — theo v2 đây mới là màn chính của
      module, bốn con số nhóm trả lời câu hỏi cũ
- [x] **Lịch sử biến động** (`08 §1`) — `money/changes.tsx` đổi từ nhóm NGÀY sang nhóm THÁNG
      (`groupEventsByDay` → `groupHistoryByMonth`). Dòng tổng tháng **bắt buộc kèm `count` +
      chữ "đã ghi"**: đó là ranh giới giữa *liệt kê* (trung thực khi dữ liệu thiếu) và *cộng
      tổng* (không). Không biểu đồ, không so sánh giữa các kỳ
- [x] **Mục tiêu P0** (`08 §2`) — bốn màn mới: `goal-list` · `goal-detail` · `goal-form` ·
      `contribute`. Đúng **ba** con số (đã có · cần đạt · còn thiếu). Khối MỤC TIÊU trên tab
      Tiền nay chạm được và có nhãn thời gian
- [x] **Nhãn thời gian** (`03 §8`) — `formatDeclaredAt` thay `agoLabelText` ở chi tiết tài sản
      (nay có TÊN người khai, trước chỉ có "Cập nhật 40 ngày trước"), và **luôn hiện** ở danh
      sách tài sản (bỏ cổng 30 ngày)
- [x] Repository đọc thẳng view `money_history` — xoá `attachTitles` (~45 dòng, 5 truy vấn phụ
      mỗi trang). Khoản đã xoá mềm nay hiện `'(đã xoá)'` thay vì trống, và tên người lấy từ
      `members` (phạm vi nhà) thay vì `profiles` (toàn cục)
- [x] `ProgressBar` + `progressPct` → `design/components` (ba nơi dùng, qua phép thử ranh giới)
- [x] `pnpm test` **263 xanh** (G13 không đổi domain) · `typecheck` sạch · `lint` 0 error ·
      `expo export` xanh — 5.8MB

### Ba thứ phát hiện trong G13 mà spec không nói ra

- [x] **View `money_history` thiếu `created_at`.** `MoneyEvent.createdAt` là trường bắt buộc
      của domain, nên thiếu cột này thì view không thay được bảng `money_events` ở mọi chỗ
      đọc và repository phải giữ hai đường. Đã thêm vào `0004` tại chỗ — migration chưa push
      nên không cần migration mới
- [x] **`goals.update()` ghi được `current_amount` mà không ghi nhãn.** `toRow()` map cột số
      nhưng không map `as_of_date` / `updated_by_member_id`, nên một lần sửa form để màn hình
      nói *"Em cập nhật 5 tuần trước"* ngay cạnh con số vừa đổi hôm nay — **không lỗi nào ném
      ra**. Chặn ở tầng type: `GoalPatch = Omit<Partial<GoalInput>, 'currentAmount'>`; mọi
      thay đổi số đi qua RPC `contribute_to_goal`, form sửa giấu hẳn ô "Đã có". Cùng mô hình
      với `assets.current_value` / `update_asset_value`
- [x] **Comment ở `asset-list-screen` lập luận NGƯỢC với `05 §6.3`.** Nó biện hộ cho việc giấu
      nhãn thời gian ("hiện trên mọi dòng biến danh sách thành bảng kiểm tra ai chăm cập nhật
      hơn"). Lo ngại đúng chỗ nhưng sai cách chặn — đã **viết lại** thay vì chỉ xoá: giấu nhãn
      không bỏ được phép so sánh, nó chỉ làm con số đọc như sự thật hiện tại. Việc chặn so
      sánh nằm ở chỗ khác và đã có: không có tổng theo người ở bất kỳ đâu trong app

### Còn nợ của G13

- [ ] **Nghiệm thu bằng mắt chờ `db:push`.** Ba màn mới đọc view `upcoming_needs` /
      `money_history` và cột `goals.as_of_date` — đều nằm trong `0004`/`0005` **chưa đẩy lên
      cloud** (xem "Còn nợ của G11"). Code typecheck và bundle được ngay; chạy thật thì lỗi
      cho tới khi migration lên
- [ ] `t.money.bucketToday/Yesterday/ThisWeek/LastWeek` nay không còn chỗ dùng sau khi bỏ nhóm
      theo ngày. Để lại vì `groupEventsByDay` vẫn còn ở domain; dọn cả hai cùng lúc nếu xác
      nhận không màn nào cần nhóm theo ngày nữa

---

## G15 · Hai module bản địa — **xong code**

DB (`0005_local_modules.sql`) và 5 hàm domain đã có từ G11; G15 dựng phần app.
Nguồn: `spec/07-local-modules.md`.

### Sổ hiếu hỉ (`07 §3`)

- [x] `database.types.ts` — `ContactRow` · `GiftEntryRow` · `GiftHistoryRow` + đăng ký vào `Database`
- [x] Mapper `toContact` · `toGiftEntry` · `toGiftHistory`; query key `gifts` · `contacts`
- [x] `features/gift/repository` — `findOrCreateContact` cho luồng nhập hàng loạt,
      `createEntries` MỘT lệnh insert (100 phong bì qua 100 round-trip là hỏng)
- [x] `features/gift/queries` — không optimistic (module có form, không phải thao tác một chạm);
      mọi mutation invalidate `gifts.all` để **dòng gợi ý không nói số cũ**
- [x] 4 màn: sổ (2 tab) · form có **dòng gợi ý** · nhập nhanh · theo từng nhà
- [x] Vào từ tab Tiền. Dòng vào **luôn hiện** kể cả khi sổ trống — một đường vào chỉ
      xuất hiện sau khi có dữ liệu thì không ai tìm được nó để tạo dữ liệu đầu tiên

### Hồ sơ con (`07 §4`)

- [x] `database.types.ts` — `VaccineScheduleItemRow` · `ChildVaccineDoseRow` ·
      `ChildGrowthRecordRow`; `MemberRow` + `school_name` · `school_class` · `health_insurance_no`
- [x] `Member` (domain) + 3 trường trên; mapper `toChildVaccineDose` ghép `displayName` từ
      bảng tham chiếu — **cố ý không denormalize**: lịch lên phiên bản mới thì tên phải đổi
      theo ở mọi hàng cũ, một bản sao sẽ đóng băng tên của phiên bản đã bị thay
- [x] `features/child/repository` — `seedSchedule` dùng `ignoreDuplicates`: chạy lại khi lịch
      lên phiên bản **không được xoá mất** chuyện một đứa trẻ đã tiêm gì
- [x] `useMarkDoseDone` **KHÔNG optimistic** dù là thao tác một chạm — đi ngược `01 §3` có chủ ý:
      một ô tích hiện ra rồi lặng lẽ biến mất khi ghi hỏng để lại một mũi mà bố mẹ TIN LÀ đã ghi
- [x] 4 màn: danh sách con · hồ sơ · chiều cao cân nặng · form. Vào từ tab Giấy tờ
- [x] **Ba trạng thái rỗng khác nhau**, không gộp: chưa có ngày sinh · chưa seed bảng lịch ·
      có lịch nhưng chưa dựng cho bé này

### Cổng chặn phát hành — **chưa mở**

- [ ] `supabase/seed/vaccine-schedule.sql` vẫn **cố ý để trống**. Một người có chuyên môn y tế
      phải đọc và xác nhận trước khi ship (`07 §4.2`, `supabase/seed/README.md`).
      **Không phải việc nên làm — là điều kiện chặn.** Cho tới lúc đó màn hồ sơ con hiện
      trạng thái rỗng THÀNH THẬT và vẫn ghi tay được từng mũi đã tiêm.
      Điền xong **không phải sửa dòng code nào** — `buildVaccineSchedule()` là hàm thuần của `items`

### Ba thứ phát hiện trong G15

- [x] **`.expo/types/router.d.ts` SINH LẠI ĐƯỢC** — ghi chú ở G12 nói phải sửa tay là sai.
      `expo export` không sinh, nhưng `npx expo start` sinh sau ~6 giây. Không cần sửa tay,
      không cần máy có simulator: chạy `expo start`, đợi file đổi, `pkill -f "expo start"`
- [x] **`DatePicker` cho bỏ chọn về `null`** (chạm lại ngày đang chọn), nên mọi state ngày
      phải là `string | null` kể cả khi trường đó bắt buộc — chặn ở nút Lưu, không ở kiểu
- [x] **Lint bắt được vi phạm phân lớp thật.** Form khoản mừng gọi thẳng
      `giftRepository.findOrCreateContact` vì cần tra tên trước khi ghi; đã chuyển vào
      `useCreateGiftEntryByName` ở tầng queries. Đây đúng là loại lỗi mà `.eslintrc` tồn tại để chặn

---

## G16 · Khung AI capture · gói khởi tạo · dọn spec — **xong code**

Ba phần rời nhau, gộp một đợt vì cùng là những thứ còn treo của concept v2.

### Khung AI capture (`06 §6`, F4) — **đường đi chạy thật, chưa nối model**

DB (`ingest_drafts` ở `0004`) và type `IngestDraft` đã có từ G11; G16 dựng phần còn lại.

- [x] `canUseCapture` + `captureQuotaFor` ở domain — free **5 lần/tháng**, Pro có trần
      thật (500), không phải `Infinity`: không có trần nghĩa là một vòng lặp hỏng ở client
      tiêu tiền model không giới hạn
- [x] Edge `parse-capture` — **Edge Function đầu tiên nhận input người dùng**, nên là chỗ
      đầu tiên có validation phía server thật (danh sách trắng nguồn, trần độ dài text,
      bắt buộc text-với-`text` và ảnh-với-ảnh). Dùng `userClient` **không** `serviceClient`:
      nó nhận `householdId` từ body, service role sẽ ghi được vào nhà khác
- [x] `features/ingest/` đủ tầng: repository · queries · schemas · screens
- [x] `(modals)/capture-review.tsx` + mục "Từ ảnh" trong menu `[+]`
- [x] **288 test xanh** (263 → 288: +13 quota AI, +12 gói khởi tạo) · typecheck sạch ·
      lint 0 error · `expo export` xanh — 5.8MB

### Gói khởi tạo (`05 §3.4`)

- [x] `STARTER_PACK_ITEMS` + `buildStarterPack` ở domain — danh mục là **nội dung nghiệp
      vụ**, ghim bằng test, không phải một mảng trong JSX
- [x] `(auth)/seed.tsx` — danh sách tick, không phải form. Chuỗi onboarding nay là
      setup → ngưỡng ghi → **gói khởi tạo** → home
- [x] Mục cần ngày (giỗ, học phí, đăng kiểm…) **vẫn được tạo**, ở trạng thái chưa có ngày.
      Lọc bỏ chúng thì thứ người dùng vừa tick biến mất không dấu vết

### Dọn spec

- [x] `spec v2/` **không còn tồn tại**. `02` · `03` · `05` · `schema.sql` bị ghi đè bằng bản
      v2.1; `06`/`07`/`08` thành file mới trong `spec/`; hai file SQL thiết kế vào
      `spec/sql-drafts/` để không bị nhầm là migration chạy được
- [x] `04-frontend-spec.md` — tên file **không tồn tại từ lâu**, được tham chiếu ở `01` và
      `03`. Đổi thành `04-design-system.md`
- [x] CLAUDE.md bỏ hẳn lớp "v2 thắng v1"; `06`/`08` ghi rõ là **lịch sử thay đổi**, khi vênh
      với năm file chính thì năm file chính đúng

### Bốn thứ phát hiện trong G16 mà spec không nói ra

- [x] **`fn:deploy` trỏ vào một function đã bị xoá.** `nudge-snapshot-update` gỡ ở G11 nhưng
      vẫn còn trong danh sách deploy — `supabase functions deploy` nhận nhiều tên và **hỏng
      cả lệnh** khi một tên không tồn tại, nghĩa là mọi Edge Function còn nợ deploy từ G11/G14
      đều không lên được. Đã gỡ và thêm `parse-capture`
- [x] **Gate lặp lại đúng cái bẫy của G12.** `seed` là bước onboarding thứ HAI chạy khi nhà
      **đã tồn tại**, nên nó rơi vào đúng chỗ `threshold` từng rơi: cả `useEffect` điều hướng
      lẫn `canRender` coi nó là "đã có nhà mà còn ở `(auth)`" và đá về home — không lỗi nào để
      nhìn thấy. Đã đổi `inThreshold` thành danh sách `POST_HOUSEHOLD_STEPS` để bước thứ ba
      thêm vào sau không phải phát hiện lại bài học này
- [x] **KHÔNG dùng lại `eventSchema` để kiểm output của AI.** Schema của form bắt buộc `title`
      và bắt buộc có ngày (`superRefine`) — đúng cho lúc bấm Lưu, sai cho lúc điền sẵn. Ép bản
      nháp qua nó sẽ vứt **cả** bản nháp vì đúng thứ nó không hứa sẽ có, trong khi một bản nháp
      chỉ đọc được mỗi cái tên vẫn có ích. `schemas/parsed-schema.ts` là schema riêng, mọi
      trường optional + `.catch()` từng trường: một trường sai không kéo theo cả bản nháp
- [x] **Mọi trường optional nghĩa là object rỗng cũng `safeParse` thành công.** Không có
      `hasAnyField` thì một bản nháp model đọc không ra gì vẫn mở form "AI đã điền" mà không
      điền gì — trông y hệt một lỗi im lặng. Nay hiện thẳng câu "chưa đọc được gì, nhập tay
      giúp mình"

### Còn nợ của G16

- [ ] **Chưa nối nhà cung cấp model.** `supabase/functions/parse-capture/model.ts` là chỗ
      DUY NHẤT còn trống — nối vào là điền một hàm, không sửa kiến trúc. Chưa có
      `CAPTURE_MODEL_API_KEY` thì Edge trả **503 `capture_not_configured`** và màn hình nói
      "Đọc ảnh chưa bật", **không** giả vờ là lỗi mạng và **không** trả bản nháp rỗng cho có
- [ ] **Share extension iOS / share target Android chưa làm** (`06 §6`). Đây là đường vào
      THẬT của F4 (chụp trong Zalo → share sheet → app); mục "Từ ảnh" trong menu `[+]` chỉ là
      đường vào phụ khi người dùng đã ở trong app. Cần native module + `expo prebuild --clean`,
      mà repo đang tắt `expo-notifications`/`apple-authentication` vì thiếu certificate —
      prebuild lại lúc này có thể làm hỏng build iOS đang chạy được
- [ ] Đường ẢNH mới chọn được ảnh, chưa upload lên R2 (`capture-review-screen.tsx` còn TODO).
      Đường TEXT đã chạy đầy đủ tới Edge. Làm cùng lúc với việc nối model
- [ ] Quota AI đếm theo bản nháp **đã tạo**, không theo bản nháp được xác nhận — client và
      Edge phải đếm **giống hệt nhau**. Đổi một bên mà quên bên kia thì người dùng thấy
      "còn 3 lượt" rồi bị từ chối

---

## G17 · Sổ hiếu hỉ — nghĩa vụ đáp lễ — **xong code, chưa deploy migration**

Sửa hai chỗ sai của thiết kế v2.1 trong module sổ mừng cưới. Cả hai đều về **khung
nhìn** chứ không về dữ liệu — enum `gift_occasion` đã có đủ tám dịp từ `0005`.

### 1. Tên module đóng khung sai (`07 §3`)

- [x] "Sổ mừng cưới" → **"Sổ hiếu hỉ"**. Cưới chỉ là một trong tám dịp; tân gia, đầy
      tháng, giỗ, thôi nôi là **dịp ngang hàng**, không phải ngoại lệ của cưới
- [x] Bỏ `default 'wedding'` ở cột `occasion` và bỏ `useState('wedding')` ở **cả hai**
      form (đơn và nhập nhanh) — không có dịp nào là dịp mặc định. Người nhập một khoản
      tân gia mà chip "Cưới" đã chọn sẵn sẽ ghi nhầm, và không ai phát hiện ra.
      Ở màn nhập nhanh nặng hơn: dịp chọn **một lần cho cả mẻ**, nên chọn sẵn sai là
      sai 100 dòng cùng lúc

### 2. Tiền mừng là **nghĩa vụ**, không phải nhật ký (`07 §3.2`)

Chỗ sai nghiêm trọng hơn: module được dựng như một **sổ ghi chép** — hai chiều song
song, không chiều nào tham chiếu chiều nào. Với người Việt, một khoản mừng nhận được
**không phải sự kiện đã khép lại**; nó mở ra một nghĩa vụ. Bản cũ ghi được lịch sử
nhưng **không biểu diễn được nghĩa vụ**, nên không trả lời được câu hỏi mà người dùng
thật sự mang trong đầu: *nhà nào mình còn chưa đi lại?*

- [x] `0006_gift_reciprocity.sql` — `reciprocates_id` (unique, `on delete set null`),
      `no_reciprocity_needed`, view `gift_outstanding`, 2 trigger ép 5 bất biến
- [x] `listOutstandingObligations()` trả **mảng trần**, không `{count, total}` như
      `summarizeOccasion`: kiểu trả về **không có chỗ nào để nhét tổng tiền vào**, và
      đó là chủ ý — một tổng các khoản đang chờ chính là số dư nợ mặc áo khác
- [x] Ghép **chéo dịp** hợp lệ (nghĩa vụ thuộc về *nhà*, không thuộc về *dịp*); ghép cặp
      là xong **bất kể số tiền hai bên** — app không bao giờ nói "đi chưa đủ"
- [x] Gợi ý số **chỉ khi cùng dịp**. Khác dịp → hiện dữ kiện, ẩn nút `[Dùng số này]`:
      mức tiền gắn với dịp, 2 triệu đám cưới không dịch được sang mừng tân gia
- [x] `funeral` ghi và hiện trong lịch sử, nhưng **không bao giờ** gợi ý số và **không
      bao giờ** vào danh sách chưa đáp lễ — đáp lễ một đám tang nghĩa là chờ nhà đó có tang
- [x] Nhắc **chỉ khi có dịp** (trong form ghi khoản đi). Không thông báo đẩy, không nhắc
      định kỳ — không có dịp thì không làm gì được, và lời nhắc không hành động được
      chỉ tạo áy náy

### 3. Có khoản chỉ nhận, không cần trả (`07 §3.4b`)

Chỗ dễ sai nhất: *"chưa có khoản đi nào ghép vào"* trông y hệt *"còn nợ"* trong dữ liệu,
nhưng ngoài đời là hai chuyện khác hẳn.

- [x] Cờ `no_reciprocity_needed` **ở từng khoản, không ở contact** — cùng một người vừa
      sinh nghĩa vụ vừa không: bố mẹ mừng cưới là *cho*, bố mẹ mừng tân gia thì có đi có lại
- [x] Ô tích ngay ở **form tạo** (chiều nhận, dịp ≠ tang lễ), không chỉ ở màn chi tiết:
      người ghi biết ngay lúc nhập rằng đây là bố mẹ mừng con
- [x] **Không** có ô tích cho cả mẻ ở màn nhập nhanh — một mẻ 100 phong bì gồm cả bố mẹ
      lẫn họ hàng, một cái tích chung sẽ tắt sạch nghĩa vụ của 99 nhà để đúng cho một nhà
- [x] **App không bao giờ tự đoán**: không suy từ `side`, không đọc `relation_note` tìm
      chữ "bố mẹ", không suy từ số tiền. Đoán sai vai vế là xúc phạm, không phải bất tiện
- [x] Thiếu cờ này thì **tính năng hỏng chứ không phải thiếu tiện nghi**: danh sách chưa
      đáp lễ đầy dần những dòng không bao giờ đóng được, và một danh sách nghĩa vụ không
      xoá được dạy người dùng bỏ qua cả mục

### Ranh giới với sổ nợ — vẫn giữ nguyên mọi lệnh cấm cũ

`giftBalance` vẫn cấm. Thêm 4 hàm cấm ở `03 §11.3`: `totalOutstanding`,
`sortOutstandingByAmount`, `reciprocityShortfall`, `suggestAcrossOccasions`.

Phép thử ở `07 §3.6`: **bỏ hết số tiền đi mà thông tin vẫn còn giá trị thì đó là nghĩa
vụ; bỏ số tiền đi mà nó thành vô nghĩa thì đó là số dư nợ.**

- [x] **311 test xanh** (288 → 311: +23 cho dịp, tang lễ, ghép cặp, ba trạng thái) ·
      typecheck sạch · lint 0 error
- [x] `pnpm db:push` — `0006` **đã chạy**. Kiểm chứng 2026-08-04 bằng
      `supabase migration list`: cả `0004`/`0005`/`0006` đều đã có trên cloud, và
      các bảng `contacts`/`gift_entries`/`shopping_items` đều có dữ liệu thật.
      Ghi chú "chưa chạy" ở G11 và ở đây trước đây SAI — nó làm mọi kế hoạch sau
      đó ước lượng sai rủi ro (tưởng lần push kế tiếp sẽ áp bốn migration liền
      một mạch lên dữ liệu thật). Trước khi lập kế hoạch đụng DB, chạy
      `supabase migration list` thay vì tin file này.

---

## G18 · Concept v3 — quỹ chung · hai danh sách việc · nhắc kép — **xong code, cron chưa deploy**

Nguồn: `spec/10-delta-v3.md`. Migration: `0007_concept_v3_enums.sql` +
`0008_concept_v3.sql` + `0009_upcoming_needs_comment.sql`.

### Năm đề xuất của v3 bị BÁC

Đây là phần đáng đọc nhất của đợt này. v3 là nguồn sự thật, nhưng ở năm chỗ bản cũ
có lập luận mà v3 **không phản bác — chỉ đơn giản không nhắc tới**:

| v3 nói | Chốt | Vì sao |
|---|---|---|
| Luân phiên tự động việc nhà (§7.3) | **không làm** | cần 4 cột mới cho một thứ chip xoay vòng đã làm được; và quy tắc phải cẩn thận đến mức không lấy lịch sử hoàn thành làm đầu vào thì nên có bằng chứng người dùng cần nó trước — `10 §2.2` |
| Thẻ "Bên nội / Bên ngoại" (§7.5) | **giữ nhà chồng/nhà vợ** | "bên nội của vợ" tồn tại và không ánh xạ được — `06 §0.1`, `10 §4` |
| "App đã cứu bạn 47 triệu" (§7.7) | **không khôi phục** | khẳng định phản thực không kiểm chứng được; đặt cạnh mười con số gắn nhãn cẩn thận thì làm mười con số kia kém tin đi. Chính v3 §10.8 giữ nguyên tắc ngược lại — `10 §6` |
| Chọn tối đa một module bản địa (§8) | **giữ cả hai** | cả hai đã code xong ở G15/G17; §8 là lời khuyên lúc chưa xây — `10 §7` |
| Widget vào MVP (§16) | **ngoài MVP** | cần WidgetKit + Glance riêng; và nửa đầu của cùng mục (notification) còn chưa chạy — `10 §8` |

### Ngoại lệ có điều kiện đầu tiên của `03 §9`

Quỹ chung ghi **tên người nạp** — thứ mà ràng buộc #1 cấm tuyệt đối cho tới nay.
Nó hợp lệ vì và chỉ vì **cửa sổ một tháng**:

> *"Tháng này anh bỏ 5tr, em bỏ 5tr"* là câu **ghi chép** — đóng lại cuối tháng.
> *"Tính tới nay anh 180tr, em 60tr"* là câu **phán xét** — không bao giờ đóng.

Cùng dữ liệu, khác hoàn toàn về việc nó dùng để làm gì. **Phép thử khi review:
con số này có vắt qua nhiều hơn một tháng không? Có → cấm.**

Ranh giới ép ở **bốn tầng độc lập**, không dựa vào kỷ luật review:

1. **view** — `month` nằm trong `group by` của `fund_month_contributors`
2. **repository** — không có chữ ký nào đọc nhiều tháng
3. **domain** — `summarizeFundMonth(entries, month)` nhận tháng bắt buộc; test
   `fund.test.ts` **đóng băng danh sách export** để bắt hàm mới nhận range
4. **UI** — `ContributorBlock` nhận `month` là **prop bắt buộc** dù không vẽ nó ra

### Đã làm

- [x] **Spec**: `10-delta-v3.md` mới · `02` · `03` (§4b, §5b, §6b, **§9 nới có điều
      kiện**, §13) · `05` (§0 phân khúc, §5.1 tách đôi, §6.1 hai khối, **§6.9 quỹ**)
      · `09` (§D.1a/b, **§E.9**, §A.5, §I.3) · `schema.sql` · `CLAUDE.md`
- [x] **DB**: 2 bảng (`funds`, `fund_entries`) · 3 enum mới + 2 giá trị enum ·
      cột cho `tasks`/`events`/`members` · 2 view quỹ · `upcoming_needs` có `kind`
      và union thêm `goals` · `money_history` thêm nhánh fund · 2 RPC · RLS
- [x] **Domain**: `funds/month.ts` · `splitTaskLists` + `orderFlexibleTasks` ·
      `projectRunway` tách mandatory/optional · nhắc kép ở `build.ts` ·
      **311 → 342 test xanh**
- [x] **Mobile**: `features/fund/` đủ 5 tầng · tách hai danh sách việc + tab con ·
      khối «Mục tiêu — có thể hoãn» · form sự kiện có nhắc chuẩn bị + thẻ của con ·
      4 route mới · i18n
- [x] **Edge** `build-reminders`: nhắc chuẩn bị **sinh một việc linh hoạt**, không
      bắn thêm push. Idempotent qua `events.prep_task_id`
- [x] typecheck sạch cả hai workspace · lint 0 error

### Ba thứ phát hiện trong G18 mà plan không nói ra

1. **Supabase CLI bỏ qua `commit;` giữa file.** Nó cắt file thành từng lệnh rồi
   chạy tất cả trên **một** connection trong **một** transaction — nên
   `alter type ... add value` rồi dùng giá trị mới ngay trong cùng file là hỏng.
   **Ranh giới transaction thật là ranh giới giữa hai FILE migration.** Đó là lý do
   `0007` tách riêng chỉ để chứa hai lệnh enum.

   Kèm một bẫy thứ hai: thứ tự chạy theo thứ tự **tên file**, và chuỗi ngắn hơn
   đứng trước khi nó là tiền tố — `0007_concept_v3.sql` sắp **trước**
   `0007_concept_v3_enums.sql`. Đổi tên thôi là không đủ, phải đổi **số**.

2. **`create or replace view` không bỏ hay đổi thứ tự cột được.** `money_history`
   trên cloud có `me.created_at` mà bản trong `spec/schema.sql` thiếu — tức
   `spec/schema.sql` đã **lệch khỏi DB thật từ trước G18**. Viết lại view từ bản
   trong spec làm push hỏng ở đúng câu đó. Đáng lo hơn con số: cột ấy tồn tại để
   view thay được `money_events` ở mọi chỗ đọc (`0004 §9`), nên bỏ nó đi là hỏng
   thật chứ không chỉ hỏng migration.

3. **`DROP VIEW` kéo theo `comment on view`.** `0008` dựng lại `upcoming_needs`
   nhưng quên đặt lại comment, nên câu đang sống trên cloud vẫn là bản `0004`:
   *"goals CỐ Ý KHÔNG có trong view này"* — giờ sai theo đúng nghĩa đen.
   `0009` chữa. Cùng loại lỗi mà `0004 §13` đã học một lần với `grant`.

### Còn nợ của G18

- [ ] `pnpm db:push` cho `0009` (chỉ sửa comment, không đụng dữ liệu)
- [x] `pnpm fn:deploy` — **đã deploy cả 12 function**, `build-reminders` lên
      version 3 (kèm bước sinh việc chuẩn bị). Xác nhận bằng
      `supabase functions list`: cả 12 đều `ACTIVE`

### Một chỗ vênh phát hiện lúc deploy — **chưa sửa, cần quyết**

`supabase functions list` cho thấy **bảy** function là cron job (`schema.sql §14`)
nhưng chỉ **ba** khai `verify_jwt = false` trong `config.toml`:

| Function | Cron | `verify_jwt` |
|---|---|---|
| `generate-task-instances` | 03:30 | `false` ✅ |
| `refresh-lunar-dates` | 04:00 | `false` ✅ |
| `build-reminders` | 04:30 | `false` ✅ |
| `purge-soft-deleted` | 02:00 | **`true`** ⚠️ |
| `sweep-orphan-uploads` | 03:00 | **`true`** ⚠️ |
| `spawn-debt-installments` | 05:00 | **`true`** ⚠️ |
| `expire-attention-items` | 05:15 | **`true`** ⚠️ |

Bốn job dưới **vẫn chạy được**: `cron.schedule` gửi kèm
`Authorization: Bearer <service_role>` (xem mẫu ở `schema.sql §13`), mà service key
là một JWT hợp lệ — nên `verify_jwt = true` không chặn chúng.

Nên **chưa sửa gì**: đổi `verify_jwt` là đổi cấu hình bảo mật, và ở đây trạng thái
chặt hơn (`true`) lại là trạng thái an toàn hơn. Ba function kia buộc phải
`false` vì lý do riêng đã ghi trong `config.toml`. Việc cần làm là **kiểm chứng
bốn job đó thật sự chạy** qua Dashboard → Edge Functions → Logs sau 05:15, rồi
mới quyết có thống nhất cấu hình hay không.
- [ ] Nghiệm thu trên máy thật: nạp quỹ → kiểm `money_events` có dòng
      `entity_type='fund'` (chỗ constraint sẽ nổ nếu enum và check lệch nhau)
- [ ] Nghiệm thu: việc có `recur` nằm ở tab «Định kỳ», không `recur` ở «Linh
      hoạt»; tab linh hoạt **không** gán được cho người kia
- [ ] Nghiệm thu: màn Sắp tới — con số hero **không đổi** khi thêm một mục tiêu

---

## Kiểm chứng — chạy trước mỗi lần duyệt

```bash
pnpm --filter @family-organizer/domain test        # cổng G1 — 342 test
pnpm --filter @family-organizer/mobile typecheck
pnpm --filter @family-organizer/mobile lint        # chặn literal tiếng Việt trong JSX
```

**Backend chạy trên Supabase Cloud** — không có stack Docker local (xem
`SETUP-CLOUD.md`). Nghĩa là không còn `db reset`, `db diff`, hay `functions
serve`: migration mới đẩy thẳng bằng `pnpm db:push` và một migration sai là dữ
liệu thật; Edge Function chỉ chạy được sau `pnpm fn:deploy`, gỡ lỗi bằng
Dashboard → Edge Functions → Logs. `smoke.sql` GHI dữ liệu test nên chỉ chạy
trên project trống hoặc project staging riêng.

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
| F2 | B chạm deep link → thấy **dữ liệu của A ngay**, không thấy màn hình rỗng | G5 — code xong, **chưa nghiệm thu**: cần hai máy thật + Supabase cloud |
| F3 | Chạm ô tròn → xong tức thì, một chạm, không màn trung gian | ✅ G4 |
| F4 | Thông báo 09:00 mở **thẳng** modal Cập nhật tình hình | G7 — modal xong, mở từ thẻ trạng thái. Phần *thông báo* cần tầng push (`expo-notifications` + Edge `nudge-snapshot-update`) → **G9** |
| F5 | Nhập `15/8 âm` → xem trước đúng → việc gắn `eventId` hiện trên Nhà mình đúng tuần | G6 — xem trước **đã kiểm** (6 ca thật); phần `eventId` → Nhà mình cần cloud để nghiệm thu |
| F6 | Chọn 2 ảnh → upload chạy nền, rời màn hình được | G8 — code xong, **chưa nghiệm thu**: cần R2 key + máy thật (`expo-image-picker` và `UploadTask` không chạy trong bản export) |
| F7 | Gắn cờ → push → `CẦN CHÚ Ý` → `[Đã rõ]` đóng cờ | G9 — màn danh sách + `[Đã rõ]` xong, cờ tự hết hạn đã có cron. Phần *push* cần tầng thông báo → **còn nợ** |
| F8 | `[Đã trả]` → xác nhận dư nợ mới → một transaction | G7 — màn hình xong, dòng xác nhận hiện **trước khi bấm**. Tầng DB ✅ G2; nghiệm thu đầu-cuối cần cloud + một khoản nợ thật |
| F10 | Mua → webhook → mở khoá cho **cả hai** | G10 — chờ EAS build + sản phẩm khai trên store |

## Không làm ở MVP (`04 §9`)

Chat trong app · chia sẻ vị trí · thực đơn · album ảnh · gamification ·
bảng xếp hạng giữa hai người · biểu đồ chi tiêu · kết nối ngân hàng · widget · **chế độ tối**.

**Đã bỏ khỏi danh sách này:** *danh sách mua sắm* — lên P0 ở `06 §4` và làm xong
ở G12. Nó là bề mặt hằng ngày duy nhất của app.

**Widget** giữ nguyên ngoài MVP dù v3 §16 mục 15 xếp nó vào "Phải có" — xem
`10 §8`. Lưu ý nửa đầu của chính mục đó (**notification**) cũng chưa chạy:
`expo-notifications` đang tắt vì thiếu certificate.

**Luân phiên tự động việc nhà** (v3 §7.3) — cân nhắc và BÁC ở `10 §2.2`.
