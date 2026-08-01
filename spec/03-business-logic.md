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
3. **Mục tiêu không nằm trong `needs`.** Nghĩa vụ khác nguyện vọng: học phí tháng 9 là thứ *phải* trả, góp quỹ mua nhà là thứ *muốn* làm. Trộn hai loại làm con số "cần chuẩn bị" mất nghĩa, và làm màn hình hero trở nên đáng sợ mà không có lý do.

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

**Được phép có điều kiện:** tổng của những gì đã ghi trong một kỳ — bắt buộc kèm số lượng bản ghi và chữ "đã ghi", và không bao giờ được vẽ thành đường. Xem §12.

Test phải có ít nhất một ca khẳng định các view và hàm tổng hợp **không** trả về nhóm theo `member_id` hay `actor_profile_id`.

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
): { amount: number; basis: GiftEntry } | null
```

Trả về lần **nhận** gần nhất từ contact đó, kèm bản ghi làm căn cứ để UI hiện được ngữ cảnh:

> Chú Ba đã mừng nhà mình 2.000.000 ₫ — cưới, 3/2023

Không có hàm này thì module sổ mừng cưới chỉ là một cái Excel có màu.

**Không nội suy, không điều chỉnh theo lạm phát, không làm tròn "cho đẹp".** App đưa ra một dữ kiện, người dùng quyết định. Mọi phép điều chỉnh đều là app có ý kiến về chuyện nên đi bao nhiêu — chuyện đó thuộc về hai vợ chồng.

Trả `null` khi chưa từng nhận: khi đó UI không hiện gì cả, không hiện "chưa có dữ liệu".

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
```

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

Không viết test cho component ở MVP. Toàn bộ ngân sách test dồn vào đây, vì đây là nơi lỗi gây hậu quả im lặng: một ngày giỗ sai không báo lỗi, nó chỉ đơn giản không nhắc.
