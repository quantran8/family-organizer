# 03 — Logic nghiệp vụ

Package `packages/domain` — package dùng chung **duy nhất**. Chứa cả type thực thể (xem `02 §1–3`) và toàn bộ **hàm thuần**: không I/O, không React, không Supabase, không `Date.now()` ẩn (thời gian luôn là tham số).

Không có dependency runtime nào, kể cả zod. Đây là điều kiện để cùng một quy tắc chạy được ở Hermes, ở Deno, và trong unit test. Cũng là lý do các quy tắc này **không** nằm trong Postgres: chúng là chính sách sản phẩm sẽ đổi nhiều lần, cần test và quan sát được.

> Phiên bản v2.1 — đã hợp nhất concept v2, hai module bản địa, và addendum. Lịch sử thay đổi ở `06`, `07`, `08`.

---

## 1. Trạng thái tài chính

Câu hỏi trung tâm: *nhà mình sắp có gì và cần chuẩn bị bao nhiêu?*

```ts
export function computeFinanceStatus(
  m: FinanceMetrics,
  needs: UpcomingNeed[],
  today: ISODate,
): FinanceStatus
```

Thứ tự đánh giá, dừng ở điều kiện khớp đầu tiên:

| Bậc | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chưa có tài sản, khoản sắp trả, hay khoản nợ nào | `no_data` |
| 2 | `overdueCount > 0` **hoặc** `totalUsable < tổng needs trong 30 ngày` | `tight` |
| 3 | `attentionCount > 0` **hoặc** `dueNext7dCount > 0` | `watch` |
| 4 | còn lại | `ok` |

### Hai thay đổi so với bản trước

**Nhận thêm `needs`.** Bậc 2 trước đây chỉ so `totalUsable` với `dueNext30d`, mà con số đó chỉ gồm `upcoming_payments`. Giỗ 3tr, cưới 2tr, gia hạn bảo hiểm 12tr đều không được tính — trong khi đó chính là thứ màn hình chính phải trả lời. Giờ so với tổng của cả ba nguồn.

**Bỏ điều kiện dữ liệu cũ khỏi bậc 3.** Trước đây `lastUpdatedOn` cũ hơn `snapshotIntervalDays × 3` sẽ đẩy trạng thái sang `watch`. Bỏ.

Lý do: một chấm vàng vì *"bạn chưa cập nhật"* là một lời thúc, và nghi thức cập nhật định kỳ đã bị loại bỏ ở concept v2 §7.6. **Không biết tình hình khác với tình hình không ổn.** Độ mới giờ là một nhãn riêng, xem §1b.

Vẫn chạy **ở client**, hàm thuần của các con số từ view `finance_metrics` + `upcoming_needs`, nên chạy tức thì và hoạt động cả khi offline.

Không có ngưỡng do người dùng tự đặt cho trạng thái. Một màn hình cài đặt mà hầu hết không mở, đổi lại làm trạng thái khó đoán và khó giải thích.

```ts
export function explainFinanceStatus(
  m: FinanceMetrics, needs: UpcomingNeed[], s: FinanceStatus,
): string
```

Trả về **một câu** nói vì sao. UI luôn hiện kèm trạng thái — một nhãn màu không kèm lý do sẽ bị hiểu là phán xét.

- `tight` do quá hạn → "Có 1 khoản đã qua hạn."
- `tight` do thiếu → "Khoản cần chuẩn bị trong 30 ngày nhiều hơn tiền đang có sẵn."
- `watch` → "Có 2 khoản đến hạn trong 7 ngày."
- `ok` → "Không có khoản nào cần chuẩn bị gấp."

---

## 1b. Độ mới của số khai

Tách hẳn khỏi trạng thái. Con số tài sản là thứ **một người đã nói ra tại một thời điểm**, không phải sự thật hiện tại.

```ts
export function computeFreshness(
  asOf: ISODate | null, today: ISODate,
): Freshness
```

| Khoảng cách | Kết quả |
|---|---|
| ≤ 14 ngày | `fresh` |
| 15–45 ngày | `aging` |
| > 45 ngày hoặc null | `stale` |

`Freshness` **chỉ** đổi văn bản nhãn. Không đổi màu trạng thái, không sinh badge, không sinh thông báo. Người đọc tự hiệu chỉnh mức tin và tự sửa nếu muốn.

```ts
export function shouldAskForRefresh(
  m: FinanceMetrics, needs: UpcomingNeed[], today: ISODate,
): boolean
```

Ngoại lệ duy nhất được phép hỏi lại: **hỏi theo ngữ cảnh, không theo lịch.**

`true` khi cả hai đúng:
- có ít nhất một `need` ≥ `recordThresholdAmount` (hoặc ≥ 2.000.000 nếu ngưỡng null) đến hạn trong 14 ngày
- `computeFreshness(m.lastUsableUpdatedOn)` là `stale`

Khi `true`, màn hình "Sắp tới" hiện một dòng bỏ qua được:

> Tính toán này dựa trên số dư ghi 6 tuần trước — còn đúng không? [Cập nhật] [Bỏ qua]

Bỏ qua thì im 14 ngày. Không push, không badge, không nhắc lại trong cùng phiên.

---

## 1c. Dự tính tiền cần chuẩn bị

Nội dung của màn hình hero.

```ts
export function projectRunway(
  m: FinanceMetrics, needs: UpcomingNeed[], today: ISODate,
): RunwayProjection
```

Gom `needs` theo tháng trong cửa sổ 90 ngày, cộng tổng, trừ khỏi `totalUsable`, trả về phần còn lại và mức thiếu nếu âm.

Ba ràng buộc bắt buộc:

1. **`basis` luôn là `'declared'`.** UI in kèm câu *"theo những khoản nhà mình đã ghi"*. Đây là một dự tính, không phải một báo cáo.
2. **`usableAsOf` và `freshness` luôn được trả về** để UI in nhãn thời gian ngay cạnh con số. Không có đường nào hiển thị kết quả mà thiếu nhãn.
3. **Mục tiêu không được cộng vào `total`.** Nghĩa vụ khác nguyện vọng: học phí tháng 9 là thứ *phải* trả, góp quỹ mua nhà là thứ *muốn* làm. Trộn hai loại vào một con số làm con số "cần chuẩn bị" mất nghĩa, và làm màn hình hero trở nên đáng sợ mà không có lý do.

   **Đổi ở v3 (`10 §5`):** mục tiêu giờ *có* trong `needs`, mang `kind = 'optional'`, để nó hiện **cùng màn hình** với nghĩa vụ — hai người cần thấy tháng 9 đóng học phí xong thì quỹ du lịch phải chậm lại. Nhưng cùng màn hình **không phải** cùng một con số:

   ```ts
   total = tổng của needs có kind === 'mandatory'   // KHÔNG BAO GIỜ gồm optional
   optional = needs có kind === 'optional'          // trả riêng, UI vẽ khối riêng
   ```

   `projectedRemaining` và `shortfall` cũng chỉ tính trên `mandatory`. Nguyên tắc không đổi; chỉ cơ chế đổi từ *loại khỏi view* sang *tách bằng `kind`*.

Về việc nhìn lại quá khứ: xem §12. Bản `06` cắt quá tay ở chỗ này — cái bị cấm là **cộng tổng rồi trình bày như bức tranh đầy đủ**, không phải bản thân việc xem lại.

---

## 2. Suy ra tính thanh khoản

```ts
export function inferLiquidity(kind: AssetKind): Liquidity
```

| `assetKind` | → `liquidity` |
|---|---|
| `cash`, `bank_account` | `usable_now` |
| `savings`, `gold`, `receivable` | `not_immediate` |
| `real_estate`, `investment` | `long_term` |
| `other` | `not_immediate` |

Người dùng **chỉ chọn loại tài sản**. Trường thanh khoản được điền sẵn và ẩn sau một dòng nhỏ "Đổi cách phân loại". Nếu hỏi thẳng "khoản này có dùng ngay được không?" thì mất nguyên tắc nhập-vài-giây, mà nó lại là điều kiện bắt buộc để tính được trạng thái.

---

## 2b. Hình dạng form theo loại tài sản

```ts
export function assetShape(kind: AssetKind): AssetShape
```

Một form chung cho tám loại là một form đúng cho **không loại nào**. Cột `institution` mang bốn nghĩa khác nhau tuỳ loại — và với `receivable` nó không phải một nơi chốn mà là **tên một người**. Cùng một ô, bốn câu hỏi: người dùng phải tự dịch mỗi lần, và mỗi người dịch một kiểu.

| `assetKind` | nhãn `institution` | số lượng | người giữ | ngày hẹn |
|---|---|---|---|---|
| `cash` | *(không có ô)* | — | ✓ | — |
| `bank_account`, `savings` | Ngân hàng | — | ✓ | — |
| `investment` | Sàn / nơi đầu tư | — | ✓ | — |
| `gold` | Cất ở đâu | **✓** | ✓ | — |
| `real_estate` | Địa chỉ | — | ✓ | — |
| `receivable` | **Người vay** | — | **—** | **✓** |
| `other` | Cất ở đâu | — | ✓ | — |

Ba ràng buộc của bảng này:

1. **`cash` không có ô nơi giữ.** "Nơi giữ" của tiền mặt hoặc hiển nhiên (trong nhà) hoặc là thứ không nên ghi vào một app đồng bộ lên mây.

2. **`gold` có số lượng, và số lượng là dữ liệu gốc.** Với vàng, `current_value` là thứ *sẽ sai*: giá đổi thì con số tiền khai tháng trước thành vô nghĩa, còn "2 chỉ" thì đúng mãi. Cùng nguyên tắc với "ngày âm là dữ liệu gốc". App **không tra giá vàng và không tự nhân ra tiền** — một con số tiền tự đổi mà không ai khai là đúng thứ ràng buộc #4 cấm. Đơn vị (`chi`/`luong`/`cay`) ghi đúng chữ người dùng nói, **không quy đổi** dù 1 cây = 10 chỉ: quy đổi là phép tính người dùng không nhìn thấy, nên khi nó sai thì không ai bắt được.

3. **`receivable` không hỏi người giữ.** Tiền đang ở chỗ *người vay*, mà người đó đã nằm ở `institution` rồi. Hỏi thêm "ai giữ" là gắn một cái tên vào một con số tiền mà không trả lời câu hỏi nào — đúng thứ ràng buộc #1 cấm. Ngày hẹn trả **không vào `upcoming_needs`** (view đó là tiền phải *chi ra*; cộng tiền-sắp-nhận vào làm con số hero nhỏ đi dựa trên lời hứa của người khác) và **không sinh nhắc** (ràng buộc #6 — app không đi đòi hộ).

Đổi loại thì **dọn** những trường loại mới không có, không chỉ ẩn đi: ẩn mà giữ giá trị sẽ ghi xuống một hàng "tiền mặt" mang số lượng vàng — vô hình trên màn hình nên không ai sửa được. Riêng `institution` không bị dọn khi cả hai loại đều có ô đó (gõ nhầm loại rồi sửa lại là chuyện thường).

Luật "có số thì phải có đơn vị" được ép ở **hai tầng**: CHECK `assets_quantity_unit_pair` (migration 0010) giữ dữ liệu không bao giờ sai, còn `assetFormSchema.superRefine` nói cho người dùng biết sai ở đâu trước khi bấm Lưu.

---

## 3. Lịch âm

Thuật toán chuyển đổi âm–dương của Hồ Ngọc Đức, port sang TypeScript thuần. Múi giờ cố định UTC+7.

```ts
export function solarToLunar(d: ISODate): LunarDate;
export function lunarToSolar(l: LunarDate): ISODate;
export function nextLunarOccurrence(
  l: LunarDate, after: ISODate,
): ISODate;
```

**Ngày âm là dữ liệu gốc.** Với giỗ và sinh nhật âm, lưu `lunarDay/lunarMonth/lunarLeapMonth`; ngày dương được tính ra mỗi năm. Lưu ngày dương rồi cộng 365 sẽ sai ngay năm nhuận âm.

Xử lý tháng nhuận: nếu năm đó có tháng nhuận trùng `lunarMonth` và sự kiện **không** đánh dấu `lunarLeapMonth`, dùng tháng thường. Ngày 30 rơi vào tháng thiếu (29 ngày) → lùi về ngày 29.

`nextOccurrenceDate` trong DB là **bản cache** của phép tính này. Chỉ một nơi được ghi nó: Edge Function `refresh-lunar-dates`, gọi cả khi người dùng sửa sự kiện lẫn trong cron đêm. Không được có hai đường code cùng tính lịch âm.

Cùng cron đó, khi `nextOccurrenceDate` trôi qua: ghi một dòng `event_occurrences` rồi mới tính mốc kế tiếp. Đây là nguồn duy nhất của trí nhớ năm ngoái (§10).

---

## 4. Việc lặp lại

```ts
export function expandRecurrence(
  r: Recurrence, from: ISODate, to: ISODate, anchor: ISODate,
): ISODate[]
```

Cửa sổ vật hoá 90 ngày. Không dùng RRULE đầy đủ — chỉ cần hằng ngày / thứ trong tuần / ngày trong tháng / hằng năm.

Ngày 29–31 rơi vào tháng ngắn → lùi về ngày cuối tháng. Ví dụ "kiểm tra hóa đơn điện ngày 31" thì tháng 2 rơi vào 28 hoặc 29.

```ts
export function nextDue(t: Task, after: ISODate): ISODate | null;
```

---

## 4b. Hai danh sách việc

Việc nhà chia thành hai loại có bản chất khác hẳn nhau (`10 §2.1`). Ép chung một mô hình thì hỏng cả hai: danh sách định kỳ bị lấp bởi việc vặt không hạn, còn việc vặt mang một cái hạn giả mà không ai định đặt.

| | Định kỳ (`recurring`) | Linh hoạt (`flexible`) |
|---|---|---|
| Bản chất | lặp lại, có giờ, không hoãn được | phát sinh, không gấp, ai làm cũng được |
| Ví dụ | rửa bát, đổ rác, tưới cây | lau quạt trần, gọi thợ, đặt vé |
| Người phụ trách | gán được (`assigneeId`) | **mặc định không tên**, tự nhận |
| Nhóm hiển thị | theo hạn (`groupTasksByDue`) | một danh sách phẳng |

```ts
export function splitTaskLists(
  tasks: Task[],
): { recurring: Task[]; flexible: Task[] }

export function orderFlexibleTasks(tasks: Task[]): Task[]
```

`orderFlexibleTasks` sắp: chưa xong trước, rồi theo `createdAt`. **Không bao giờ sắp hay nhóm theo người** — một danh sách tồn đọng xếp theo tên là hai cột trong đó một cột dài hơn, và đó là bảng điểm.

`groupTasksByDue` giữ nguyên và **chỉ áp cho danh sách định kỳ**.

**Việc linh hoạt không gán cho người kia.** Ranh giới này giữ cho nó là danh sách việc của nhà, chứ không phải hộp thư nhiệm vụ một người gửi cho người kia. Ở tầng UI: chip người phụ trách hoặc ẩn hẳn, hoặc chỉ chọn được chính mình.

**Việc định kỳ không hoãn được.** Cử chỉ vuốt-để-hoãn bị bỏ ở danh sách này. Với việc lặp, `dueDate` là **mốc neo** chứ không phải một lần xảy ra — hoãn một lần đang âm thầm dời cả chuỗi.

### Không có luân phiên tự động

Chỉ hai chế độ: `assigneeId = null` (việc của nhà) hoặc có tên (người đó làm). Bất kỳ thành viên nào cũng đổi được, bất cứ lúc nào, không sinh thông báo.

**Không tồn tại** `assigneeMode`, `rotationOrder`, `assigneeForOccurrence()`, hay bất cứ hàm nào tính người phụ trách từ ngày tháng. Lý do đầy đủ ở `10 §2.2`.

---

## 5. Nhắc nhở

```ts
export function buildReminders(
  input: { events: FamilyEvent[]; documents: FamilyDocument[];
           payments: UpcomingPayment[]; tasks: TaskInstance[] },
  members: Member[],
  today: ISODate,
  horizonDays: number,
): ReminderDraft[]
```

Ngày bắn = ngày đến hạn − `remindLeadDays`. Giờ mặc định 08:00 giờ địa phương.

Lead mặc định theo loại:

| Loại | Lead |
|---|---|
| Tài liệu hết hạn | 30 ngày (hộ chiếu: 180) |
| Sự kiện | 3 ngày |
| Khoản sắp trả | 3 ngày |
| Việc nhà | 0 ngày |

### Quy tắc người nhận — bất biến

`ReminderDraft` có `targetMemberId`. Với **việc nhà**:

- việc có `assigneeId` → nhắc **chỉ** người đó
- việc không gán ai → nhắc cả hai

**Không bao giờ tồn tại thông báo dạng "X chưa làm Y".** App nhắc người có tên bao nhiêu lần cũng được — đó chính là giá trị: người kia khỏi phải nhắc. Nhưng khoảnh khắc app báo cho người thứ hai rằng người thứ nhất chưa làm, nó thôi thay việc nhắc và bắt đầu thay lời tố.

Với sự kiện, giấy tờ, khoản tiền: nhắc cả hai, vì đó là việc của nhà.

**Không có thông báo cho danh sách mua sắm.** Nếu bắn push mỗi lần người kia thêm một món, người dùng sẽ tắt thông báo trong tuần đầu và mất luôn kênh giữ chân duy nhất.

**Không còn thông báo cập nhật định kỳ.** Nhắc snapshot hằng tuần đã bị bỏ — xem `06 §1`.

**Gộp trước khi bắn.** Nhiều nhắc nhở cùng ngày cho cùng một người → một thông báo: "Hôm nay nhà mình có 3 việc cần chú ý."

Không bắn quá 2 thông báo mỗi ngày cho mỗi người.

---

## 5b. Nhắc kép

Phần lớn sự cố gia đình không phải quên sự kiện, mà là **nhớ sự kiện nhưng quên phần chuẩn bị cho nó**. Thứ 7 con đi sinh nhật bạn Bin — nhớ; mua quà cho bạn Bin — quên.

Mọi sự kiện đặt được **hai mốc**:

| Mốc | Ngày bắn | Việc nó làm |
|---|---|---|
| Nhắc sự kiện | `nextOccurrenceDate − remindLeadDays` | thông báo, như cũ |
| Nhắc chuẩn bị | `nextOccurrenceDate − prepLeadDays` (1–3 ngày) | **sinh một việc linh hoạt** |

**Nhắc chuẩn bị sinh việc, không bắn thêm push.** Đây là khác biệt quan trọng: thông báo thứ hai về cùng một sự kiện là phiền; một dòng việc xuất hiện trong danh sách là hữu ích, và nó gắn được với chi phí dự kiến ở §1c.

Việc sinh ra có `eventId` trỏ về sự kiện, `list = 'flexible'`, không gán ai. `events.prepTaskId` giữ id của nó để không sinh trùng khi cron chạy lại.

**Không cần xử lý đặc biệt cho trần 2 thông báo/ngày.** Nhắc chuẩn bị và nhắc sự kiện rơi cùng ngày cho cùng người sẽ gộp làm một theo đúng khoá `(ngày bắn, người nhận)` sẵn có.

---

## 6. Gợi ý gắn cờ cần trao đổi

```ts
export function suggestAttention(
  events: MoneyEvent[], actorMemberId: UUID, today: ISODate,
): AttentionSuggestion[]
```

Chạy sau khi cập nhật giá trị tài sản. Đề xuất gắn cờ khi biến động vượt ngưỡng: giảm hơn 20% giá trị khoản, hoặc hơn 10% tổng tài sản khả dụng của nhà.

Đây là **gợi ý**, không tự gắn. UI hỏi: *"Khoản này thay đổi khá nhiều. Ghi chú lại để cả hai cùng nắm?"* — không bao giờ hỏi "vì sao khoản này giảm".

### Thu hẹp so với bản trước

Gợi ý **chỉ hiện cho người vừa thực hiện thay đổi** (`actorMemberId`), không bao giờ cho người kia. Nếu người kia cũng nhận được, nó thôi là ghi chú tự nguyện và thành lời triệu tập — vi phạm nguyên tắc 10.7 (không tạo bằng chứng dùng được lúc cãi nhau).

Ở MVP có thể trả về mảng rỗng: `money_events` vẫn được ghi từ ngày đầu, nhưng tính năng gợi ý là Phase 2. Chữ ký hàm giữ nguyên để không phải sửa chỗ gọi.

---

## 6b. Quỹ chung

Số dư quỹ + các khoản nạp/rút có mục đích và **tên người nạp**. Tần suất nhập cực thấp — 2–4 lần một tháng, không phải 200 — nên nó không kéo sản phẩm về phía app thu chi.

```ts
export function summarizeFundMonth(
  entries: FundEntry[], month: ISODate,
): FundMonthSummary
```

**`month` là tham số bắt buộc, và không có chữ ký nào nhận khoảng thời gian.** Đó không phải lựa chọn thẩm mỹ: nó là chỗ ngoại lệ §9 được ép ở tầng domain. Xem §9 ngoại lệ 2 cho phép thử, và `10 §3` cho lý do đầy đủ.

`byContributor` sắp **theo tên, thứ tự ABC** — không theo số tiền. Sắp theo tiền là một bảng xếp hạng, và xếp hạng hai vợ chồng đúng là thứ đang tránh. ABC là thứ tự duy nhất không mang thông điệp nào.

`entryCount` là **bắt buộc trong kiểu trả về**, cùng lý do với `groupHistoryByMonth` ở §12: một con số tổng không kèm số lượng bản ghi thì tự nhận là đầy đủ.

### Ba tình huống app phải im lặng

1. **Một người góp ít hơn tỷ lệ đã chốt.** Không đánh dấu, không cảnh báo, không đổi màu. Con số hiển thị đúng như nó là, hai người tự nói với nhau. Góp ít hơn không phải một lỗi cần app phát hiện.
2. **Đóng góp không bằng tiền.** Nghỉ thai sản, bỏ việc chăm con, bên nội ngoại đỡ tiền nhà — quỹ không có ô nào ghi được những thứ này, nên **mọi kết luận rút ra từ riêng con số đều thiếu**. Đây chính là lý do app ghi mà không phán.
3. **Chi cho nhà bằng tiền riêng, không qua quỹ.** Vẫn ghi ở khoản vừa và lớn, nhưng **không cộng vào phần nạp quỹ** — hai loại này không cùng đơn vị, gộp lại là bắt đầu làm kế toán.

### Không tồn tại

`summarizeFundAllTime`, `contributorTotals(entries)` thiếu tham số tháng, `fundBalanceSeries`, và mọi hàm trả về số dư nợ giữa hai người.

---

## 7. Quota lưu trữ và quota AI

```ts
export function canUpload(
  h: Household, fileSize: number,
): { ok: true } | { ok: false; reason: AppError }
```

Free 50MB, Pro 10GB, tối đa 100MB mỗi file.

```ts
export function canUseCapture(
  h: Household, usedThisMonth: number,
): { ok: true } | { ok: false; reason: AppError }
```

Free 5 lần/tháng, Pro không giới hạn thực dụng. Free tier phải có một lượng dùng thật — nếu chặn ngay từ lần đầu, người dùng không bao giờ cảm nhận được thứ đang bán.

Client dùng cả hai để hiện lỗi sớm và chặn nút. **Nhưng quyết định thật nằm ở Edge** — cùng hàm này, chạy lại phía server. Client không được tin.

---

## 8. Định dạng

```ts
export function formatMoney(v: number, currency: string): string;
export function formatMoneyShort(v: number, currency: string): string;
export function formatDueLabel(d: ISODate, today: ISODate): string;
export function formatLunarLabel(e: FamilyEvent): string;
export function formatDeclaredAt(
  asOf: ISODate | null, byDisplayName: string | null, today: ISODate,
): string;
```

- `formatMoney(12000000, 'VND')` → `"12.000.000 ₫"`
- `formatMoneyShort` cho card chật: `"12 triệu"`, `"1,2 tỷ"`
- `formatDueLabel` → `"Hôm nay"`, `"Ngày mai"`, `"Còn 5 ngày"`, `"Quá hạn 2 ngày"`
- `formatLunarLabel` → `"15/8 âm — Chủ nhật 5/10"`
- `formatDeclaredAt` → `"Anh cập nhật 6 tuần trước"`, `"Em cập nhật hôm nay"`, `"Chưa có số liệu"`

**`formatDeclaredAt` là bắt buộc ở mọi chỗ hiển thị số tổng.** Không có ngoại lệ. Một con số tiền không kèm nhãn thời gian sẽ được đọc là sự thật hiện tại, trong khi nó là điều một người đã nói ra sáu tuần trước. Hai người cùng tin vào một thứ có thể đã sai còn tệ hơn không có app.

Ngôn ngữ dùng trong nhãn phải theo danh sách ở `04-design-system.md §3`. Không viết "quá hạn" thành "vi phạm", không viết "cần chú ý" thành "cảnh báo".

---

## 9. Không bao giờ tồn tại

Danh sách hàm **cấm viết**, kể cả khi người dùng yêu cầu. Đây là ràng buộc sản phẩm, không phải nợ kỹ thuật.

| Hàm | Vì sao cấm |
|---|---|
| Tổng tiền theo người | Biến app thành công cụ kiểm soát; người giữ tiền rời app ngay |
| Tỷ lệ hoàn thành việc theo người | Bảng điểm giữa hai vợ chồng |
| Chuỗi ngày, điểm thưởng, huy hiệu | Gamification việc nhà — nguyên tắc 10.5 |
| Biểu đồ xu hướng chi tiêu theo tháng | Khoảng trống trong ghi chép trông y hệt thay đổi trong chi tiêu |
| So sánh giữa các kỳ | Như trên |
| Phân loại chi tiêu theo danh mục | Ranh giới với app thu chi |
| So sánh dự kiến với thực tế | Cần giả định "đã ghi đủ"; sẽ luôn sai 30–40% |
| Đóng góp vào mục tiêu theo người | Bảng điểm ở dạng trông giống minh bạch nhất |
| Gợi ý số tiền cần góp mỗi tháng | App không biết thu nhập hay hoàn cảnh |
| Chênh lệch đi/nhận theo contact | Biến quan hệ họ hàng thành sổ nợ |
| Xếp hạng contact theo số tiền | Xếp hạng họ hàng theo độ hào phóng |
| Bách phân vị / đánh giá tăng trưởng của con | Chẩn đoán y tế, không thuộc về app |
| So sánh giữa các con trong nhà | Như trên, và tệ hơn về mặt cảm xúc |
| Gợi ý hoãn hoặc bỏ mũi tiêm | Gây hại thật |
| Lịch sử "ai sửa gì" tổng hợp được | Nguyên tắc 10.7 |
| Tổng quỹ chung theo người, vắt qua nhiều hơn một tháng | Sổ nợ giữa hai vợ chồng, dựng bằng dữ liệu trung thực — xem ngoại lệ 2 |
| Kết luận "ai còn thiếu bao nhiêu" ở quỹ chung | Như trên, và tệ hơn: app phát ngôn thay một người |
| Xếp người đóng góp quỹ theo số tiền | Xếp hạng hai vợ chồng; sắp theo tên ABC |
| Đếm hoặc so sánh số sự kiện theo `side` | Đếm thứ không ai chọn được — nguyên tắc 10.9 |
| Tỷ lệ hoàn thành theo danh sách việc | Bảng xếp hạng đội lốt phân loại |

### Hai ngoại lệ có điều kiện

**Ngoại lệ 1 — tổng của một kỳ.** Tổng của những gì đã ghi trong một kỳ, bắt buộc kèm số lượng bản ghi và chữ "đã ghi", và không bao giờ được vẽ thành đường. Xem §12.

**Ngoại lệ 2 — quỹ chung theo người, trong phạm vi một tháng.** Được hiện tổng theo từng người đóng góp, **chỉ trong một tháng**, chỉ ở màn hình quỹ, và bắt buộc kèm số lượng bản ghi.

Cấm: cộng dồn qua nhiều tháng; mọi câu kết luận ("còn thiếu", "chưa góp", "chưa đạt"); tỷ lệ phần trăm so với một mức chuẩn; xuất hiện ngoài màn hình quỹ.

Phép thử một câu, dùng khi review:

> **Con số này có vắt qua nhiều hơn một tháng không? Có → cấm.**

Vì sao ngoại lệ này an toàn còn ngoại lệ với tài sản thì không: quỹ chung là một cái hộp hai người cùng bỏ tiền vào **trong tháng đó**. Câu *"tháng này anh bỏ 5 triệu, em bỏ 5 triệu"* là một câu ghi chép, và nó **đóng lại vào cuối tháng** — không để lại gì. Câu *"tính tới nay anh bỏ 180 triệu, em bỏ 60 triệu"* là một câu phán xét: cùng dữ liệu, khác hoàn toàn về việc nó dùng để làm gì. Một con số cộng dồn thì không bao giờ đóng; giữa vợ chồng không có cơ chế tất toán nào để xoá nó, và đến lúc nào đó nó sẽ được đem ra dùng.

Ranh giới này **được ép bằng cấu trúc, không bằng kỷ luật** — xem §7.6. Đầy đủ lý do ở `10 §3`.

Test phải có ít nhất một ca khẳng định các view và hàm tổng hợp **không** trả về nhóm theo `member_id` hay `actor_profile_id` — trừ đúng ngoại lệ 2, và ca đó phải khẳng định thêm rằng không có chữ ký hàm nào nhận khoảng thời gian.

---

## 10. Trí nhớ năm ngoái

```ts
export function lastYearFor(
  e: FamilyEvent, occurrences: EventOccurrence[], today: ISODate,
): EventOccurrence | null
```

Trả lần diễn ra gần nhất trước hôm nay, cùng sự kiện. Dùng ở chi tiết sự kiện và trong form khi tạo sự kiện lặp:

> Năm ngoái: 3.200.000 ₫ — 3/10/2025

### Không có `summarizeValueSaved()`

Hàm tính *"app đã nhắc bạn 6 hạn, tổng giá trị 47 triệu"* đã bị bỏ, và không được thêm lại.

Nó là một **khẳng định phản thực**: không ai biết người dùng có tự nhớ hạn đó hay không, nên con số không kiểm chứng được bằng bất kỳ cách nào. Cả `packages/domain` được xây trên nguyên tắc ngược lại — `basis: 'declared'`, `count` bắt buộc trong `groupHistoryByMonth`, `formatDeclaredAt` ở mọi số tổng. Đặt một con số không kiểm chứng được cạnh những con số đó sẽ làm hỏng niềm tin vào cả hai.

---

## 11. Hai module bản địa

### 11.1 Gợi ý số tiền mừng

```ts
export function suggestGiftAmount(
  h: GiftHistory | null,
  entries: GiftEntry[],
  forOccasion: GiftOccasion,
): {
  basis: GiftEntry;
  /** Chỉ có số khi CÙNG DỊP. `null` = hiện dữ kiện, không hiện nút. */
  amount: number | null;
  isOutstanding: boolean;
} | null
```

Trả về lần **nhận** gần nhất từ contact đó, kèm bản ghi làm căn cứ để UI hiện được ngữ cảnh:

> Chú Ba đã mừng nhà mình 2.000.000 ₫ — cưới, 3/2023

Không có hàm này thì module sổ hiếu hỉ chỉ là một cái Excel có màu.

**`amount` chỉ có giá trị khi `basis.occasion === forOccasion`.** Khác dịp thì `amount = null`: UI hiện dữ kiện và trạng thái chưa đáp lễ, nhưng **không** hiện nút `[ Dùng số này ]`. Mức tiền gắn với dịp, không gắn với nhà — hai triệu ở đám cưới không dịch được sang mừng tân gia, và đề xuất nó là app nói sai một cách tự tin. Xem `07 §3.4`.

**`forOccasion === 'funeral'` luôn trả `amount = null`**, kể cả khi căn cứ cũng là tang lễ. Và một khoản `funeral` không bao giờ được chọn làm `basis`. Xem `07 §3.5`.

**Không nội suy, không điều chỉnh theo lạm phát, không làm tròn "cho đẹp".** App đưa ra một dữ kiện, người dùng quyết định. Mọi phép điều chỉnh đều là app có ý kiến về chuyện nên đi bao nhiêu — chuyện đó thuộc về hai vợ chồng.

Trả `null` khi chưa từng nhận: khi đó UI không hiện gì cả, không hiện "chưa có dữ liệu".

### 11.1b Nghĩa vụ đáp lễ

```ts
export function listOutstandingObligations(
  entries: GiftEntry[],
  contactId?: UUID,
): GiftEntry[]
```

Các khoản `received` **chưa được khoản `given` nào ghép vào**, sắp theo ngày nhận (cũ nhất trước — nghĩa vụ lâu nhất nằm trên).

Bỏ qua `occasion === 'funeral'` hoàn toàn (`07 §3.5`).

**Trả mảng bản ghi, không trả tổng.** Không có `{ count, total }` như `summarizeOccasion` — một tổng số tiền các khoản chưa đáp lễ chính là số dư nợ mặc áo khác. Đây là lý do hàm này trả `GiftEntry[]` trần chứ không phải một object tóm tắt: **không có chỗ nào để nhét con số đó vào.**

Ghép chéo dịp là hợp lệ — nghĩa vụ thuộc về nhà, không thuộc về dịp (`07 §3.3`).

```ts
export function summarizeOccasion(
  entries: GiftEntry[],
): { count: number; total: number }
```

Tổng của một đám: nhận được bao nhiêu, từ bao nhiêu nhà. Đây là con số người dùng thật sự muốn biết sau đám cưới mình.

**Không có hàm nào tính chênh lệch đi–nhận.** Dữ liệu đủ để tính, và đó chính là lý do phải nói rõ.

### 11.2 Lịch tiêm

```ts
export function buildVaccineSchedule(
  birthday: ISODate,
  items: VaccineScheduleItem[],
): ChildVaccineDose[]
```

Hàm thuần: `dueDate = birthday + dueAgeMonths`. Không có logic y tế nào trong code — **toàn bộ tri thức nằm trong `items`**, là dữ liệu tham chiếu có phiên bản.

Đây là ràng buộc kiến trúc có chủ ý: nếu lịch tiêm nằm trong code thì việc cập nhật nó thành một PR, và không ai có chuyên môn y tế đọc PR. Nằm trong file dữ liệu thì nó là một tài liệu, và tài liệu thì xem xét được.

```ts
export function doseStatus(
  d: ChildVaccineDose, today: ISODate,
): 'planned' | 'done' | 'overdue'
```

Chỉ ba trạng thái. **Không có `skipped`, không có `postponed`.**

```ts
export function formatDoseLabel(d: ChildVaccineDose, today: ISODate): string
```

- `planned` → `"còn 9 ngày"`
- `overdue` → `"quá lịch 12 ngày"` + UI kèm gợi ý liên hệ cơ sở tiêm
- `done` → `"đã tiêm 3/7"`

Không dùng chữ trách móc: không "bạn đã bỏ lỡ", không "chưa hoàn thành".

### 11.3 Không tồn tại

```ts
// KHÔNG BAO GIỜ VIẾT:
function assessGrowth(r: GrowthRecord[], age: number): string
function comparePercentile(r: GrowthRecord, standard: WHOStandard): number
function compareChildren(a: UUID, b: UUID): Comparison
function giftBalance(h: GiftHistory): number
function suggestSkipDose(d: ChildVaccineDose): boolean

// Bốn hàm dưới trông vô hại vì `listOutstandingObligations` đã tồn tại —
// chúng chính là số dư nợ dựng lại từ dữ liệu nghĩa vụ. Xem 07 §3.6.
function totalOutstanding(entries: GiftEntry[]): number
function sortOutstandingByAmount(entries: GiftEntry[]): GiftEntry[]
function reciprocityShortfall(received: GiftEntry, given: GiftEntry): number
function suggestAcrossOccasions(basis: GiftEntry, target: GiftOccasion): number
```

`totalOutstanding` là hàm nguy hiểm nhất trong danh sách này, vì nó là một dòng code và trông như một tiện ích hiển thị. "Còn 5 nhà chưa đáp lễ, tổng 8 triệu" đọc lên là một câu về **nợ**, không phải một câu về **việc cần làm** — và nó cộng dồn đúng cái mà thiết kế cố ý giữ ở dạng từng khoản rời.

`reciprocityShortfall` cũng vậy: đáp lễ xong là xong, bất kể số tiền hai bên. Hiện phần chênh là app nói "đi chưa đủ" — chuyện app không biết đủ ngữ cảnh để nói.

Chiều cao cân nặng: app **ghi và vẽ, không diễn giải**. Bố mẹ mới rất dễ lo lắng, và một nhãn đỏ do app tự tính sẽ gây hoảng mà không giúp được gì. Việc đánh giá thuộc về bác sĩ.

---

## 12. Lịch sử biến động

### Đường phân giới

**Liệt kê thì trung thực khi dữ liệu thiếu. Cộng tổng thì không.**

Một danh sách *"Sửa xe −2.000.000 ₫ · 15/9"* vẫn đúng dù nhà mình còn mười khoản khác chưa ghi — nó không tự nhận là đầy đủ. Một con số *"Tháng 9 chi 12 triệu"* thì tự nhận, và sẽ sai 30–40% mãi mãi.

```ts
export function groupHistoryByMonth(
  events: MoneyEvent[],
): { month: ISODate; count: number; total: number; items: MoneyEvent[] }[]
```

`count` là **bắt buộc trong kiểu trả về**, không phải tuỳ chọn. UI không được hiển thị `total` mà thiếu `count` và thiếu chữ "đã ghi":

```
Tháng 9 · 5 khoản nhà mình đã ghi
−12.000.000 ₫
```

Câu đó đúng theo đúng nghĩa đen của nó.

### Cấm vẽ thành đường

Đây là chỗ cấm sắc nhất của cả tài liệu. Khi vẽ tổng theo tháng thành một đường xu hướng, **khoảng trống trong việc ghi chép trông y hệt như thay đổi trong chi tiêu**. Tháng nào hai người bận và quên ghi sẽ hiện ra như một tháng tiết kiệm. Người dùng sẽ đọc biểu đồ đó như sự thật, và app vừa nói dối một cách rất thuyết phục.

Danh sách không có vấn đề này, vì không ai nhìn một danh sách rồi kết luận nó đầy đủ.

Vì sao vẫn cần: niềm tin của người không giữ tiền đến từ việc **thấy được thay đổi**, không phải từ con số hiện tại.

---

## 13. Bắt buộc test

`packages/domain` phải có unit test đủ. Các ca không được thiếu:

- Tất cả 4 nhánh `computeFinanceStatus`, gồm ranh giới `totalUsable === tổng needs 30 ngày`, và ca **có chi phí sự kiện nhưng không có upcoming_payment** (ca này trước đây sai).
- `computeFreshness` ở ranh giới 14 và 45 ngày, và `asOf = null`.
- `shouldAskForRefresh` chỉ true khi cả hai điều kiện cùng đúng.
- `projectRunway`: luôn trả `basis = 'declared'`; `shortfall` null khi dư.
- Chuyển đổi âm–dương: một năm nhuận âm, ngày 30 rơi vào tháng thiếu, giỗ vắt qua Tết dương lịch.
- `expandRecurrence` với ngày 31 qua tháng 2 năm thường và năm nhuận.
- `buildReminders`: **việc có assignee chỉ sinh đúng một draft, đúng người**; việc không assignee sinh cho cả hai; gộp đúng khi nhiều mục cùng ngày.
- `inferLiquidity` phủ hết `AssetKind`.
- `suggestAttention` không bao giờ trả gợi ý cho member khác `actorMemberId`.
- `buildVaccineSchedule` với ngày sinh 29/2 và mốc tuổi lẻ (1.5 tháng).
- `suggestGiftAmount` trả `null` khi contact chưa từng mừng nhà mình.
- `groupHistoryByMonth` luôn trả `count`; tháng không có bản ghi thì không xuất hiện (không phải trả 0).
- Không có hàm exported nào nhận `WHOStandard` hay trả về percentile.
- `projectRunway`: `total` **không** đổi khi thêm một `need` có `kind='optional'`; `shortfall` cũng vậy; mảng `optional` được trả về đầy đủ.
- `summarizeFundMonth`: khoản ngoài tháng được hỏi bị loại; `byContributor` sắp theo tên ABC chứ không theo số tiền; khoản không ghi tên gom vào một nhóm mà không mất số tiền; `entryCount` luôn có.
- **Đóng băng danh sách export của `src/funds/`**: một test khẳng định tập tên hàm exported khớp đúng danh sách cho trước. Đây là bản kiểm được bằng máy của §9 ngoại lệ 2 — lần sau ai thêm một hàm nhận khoảng thời gian thì test đỏ ngay.
- `splitTaskLists` chia đúng hai nhóm, kể cả việc `list='flexible'` nhưng lỡ có `recur`.
- `orderFlexibleTasks`: kết quả **không đổi** khi hoán vị `assigneeId` của đầu vào (khẳng định không bao giờ sắp theo người).
- `buildReminders`: sự kiện có `prepLeadDays` sinh hai draft ở hai ngày; nhắc chuẩn bị và nhắc sự kiện cùng ngày cùng người thì gộp làm một.

Không viết test cho component ở MVP. Toàn bộ ngân sách test dồn vào đây, vì đây là nơi lỗi gây hậu quả im lặng: một ngày giỗ sai không báo lỗi, nó chỉ đơn giản không nhắc.
