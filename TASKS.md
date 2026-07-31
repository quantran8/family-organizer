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
- [ ] `money/attention.tsx` — **không có luồng bình luận**; cờ tự hết hiệu lực sau 14 ngày.
      *Gắn* cờ đã chạy từ G7 (nút trên `asset/[id]` và `payment/[id]`, mục `CẦN TRAO ĐỔI` hiện
      trên màn Tiền). Còn thiếu: màn danh sách đầy đủ và nút `[Đã rõ]` để **đóng** cờ
- [ ] `settings/` — `index` · `household` · `invite` · `subscription`
- [ ] `(modals)/paywall.tsx` — nói **cụ thể đang bị chặn gì**, không doạ.
      Nguồn sự thật của quyền là `households.subscription_status`, không phải SDK RevenueCat
- [ ] Edge `spawn-debt-installments` · `revenuecat-webhook` · 3 cron

---

## Kiểm chứng — chạy trước mỗi lần duyệt

```bash
pnpm --filter @nhaminh/domain test        # cổng G1 — 160 test
pnpm --filter @nhaminh/mobile typecheck
pnpm --filter @nhaminh/mobile lint        # chặn literal tiếng Việt trong JSX
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
| F6 | Chọn 2 ảnh → upload chạy nền, rời màn hình được | G8 |
| F7 | Gắn cờ → push → `CẦN CHÚ Ý` → `[Đã rõ]` đóng cờ | G9 |
| F8 | `[Đã trả]` → xác nhận dư nợ mới → một transaction | G7 — màn hình xong, dòng xác nhận hiện **trước khi bấm**. Tầng DB ✅ G2; nghiệm thu đầu-cuối cần cloud + một khoản nợ thật |
| F10 | Mua → webhook → mở khoá cho **cả hai** | G9 |

## Không làm ở MVP (`04 §9`)

Chat trong app · chia sẻ vị trí · thực đơn · danh sách mua sắm · album ảnh · gamification ·
bảng xếp hạng giữa hai người · biểu đồ chi tiêu · kết nối ngân hàng · widget · **chế độ tối**.
