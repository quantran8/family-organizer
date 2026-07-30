# 03 — Logic nghiệp vụ

Package `packages/domain` — package dùng chung **duy nhất**. Chứa cả type thực thể (xem `02 §1–3`) và toàn bộ **hàm thuần**: không I/O, không React, không Supabase, không `Date.now()` ẩn (thời gian luôn là tham số).

Không có dependency runtime nào, kể cả zod. Đây là điều kiện để cùng một quy tắc chạy được ở Hermes, ở Deno, và trong unit test. Cũng là lý do các quy tắc này **không** nằm trong Postgres: chúng là chính sách sản phẩm sẽ đổi nhiều lần, cần test và quan sát được.

---

## 1. Trạng thái tài chính

Câu hỏi trung tâm của app: *nhà mình đang ổn không?*

```ts
export function computeFinanceStatus(
  m: FinanceMetrics,
  today: ISODate,
): FinanceStatus
```

Thứ tự đánh giá, dừng ở điều kiện khớp đầu tiên:

| Bậc | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chưa có tài sản, khoản sắp trả, hay khoản nợ nào | `no_data` |
| 2 | `overdueCount > 0` **hoặc** `totalUsable < dueNext30d` | `tight` |
| 3 | `attentionCount > 0` **hoặc** `dueNext7dCount > 0` **hoặc** `lastUpdatedOn` cũ hơn `snapshotIntervalDays × 3` | `watch` |
| 4 | còn lại | `ok` |

Chạy **ở client**, không phải Edge. Nó là hàm thuần của 11 con số từ view `finance_metrics`, nên chạy tức thì và hoạt động cả khi offline. Edge dùng lại chính hàm này khi ghi `money_snapshots.status`.

Không có ngưỡng do người dùng tự đặt. Một màn hình cài đặt mà hầu hết không mở, đổi lại làm trạng thái khó đoán và khó giải thích.

```ts
export function explainFinanceStatus(
  m: FinanceMetrics, s: FinanceStatus,
): string
```

Trả về **một câu** nói vì sao. UI luôn hiện kèm trạng thái — một nhãn màu không kèm lý do sẽ bị hiểu là phán xét.

- `tight` do quá hạn → "Có 1 khoản đã qua hạn."
- `tight` do thiếu → "Khoản sắp trả trong 30 ngày nhiều hơn tiền đang có sẵn."
- `watch` do cũ → "Số liệu cập nhật lần cuối 24 ngày trước."
- `ok` → "Không có khoản nào cần chuẩn bị gấp."

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

**Gộp trước khi bắn.** Nhiều nhắc nhở cùng ngày → một thông báo: "Hôm nay nhà mình có 3 việc cần chú ý." Nếu không gộp, người dùng sẽ tắt thông báo trong tuần đầu và mất luôn kênh giữ chân duy nhất.

Không bắn quá 2 thông báo mỗi ngày cho mỗi người.

---

## 6. Gợi ý gắn cờ cần trao đổi

```ts
export function suggestAttention(
  events: MoneyEvent[], today: ISODate,
): AttentionSuggestion[]
```

Chạy sau khi cập nhật giá trị tài sản. Đề xuất gắn cờ khi biến động vượt ngưỡng: giảm hơn 20% giá trị khoản, hoặc hơn 10% tổng tài sản khả dụng của nhà.

Đây là **gợi ý**, không tự gắn. UI hỏi: *"Khoản này thay đổi khá nhiều. Ghi chú lại để cả hai cùng nắm?"* — không bao giờ hỏi "vì sao khoản này giảm".

Ở MVP có thể trả về mảng rỗng: `money_events` vẫn được ghi từ ngày đầu, nhưng tính năng gợi ý là Phase 2. Chữ ký hàm giữ nguyên để không phải sửa chỗ gọi.

---

## 7. Quota lưu trữ

```ts
export function canUpload(
  h: Household, fileSize: number,
): { ok: true } | { ok: false; reason: AppError }
```

Free 50MB, Pro 10GB, tối đa 100MB mỗi file.

Client dùng để hiện lỗi sớm và chặn nút. **Nhưng quyết định thật nằm ở Edge `presign-upload`** — cùng hàm này, chạy lại phía server. Client không được tin, vì presigned URL là thứ cấp quyền ghi thật.

---

## 8. Định dạng

```ts
export function formatMoney(v: number, currency: string): string;
export function formatMoneyShort(v: number, currency: string): string;
export function formatDueLabel(d: ISODate, today: ISODate): string;
export function formatLunarLabel(e: FamilyEvent): string;
```

- `formatMoney(12000000, 'VND')` → `"12.000.000 ₫"`
- `formatMoneyShort` cho card chật: `"12 triệu"`, `"1,2 tỷ"`
- `formatDueLabel` → `"Hôm nay"`, `"Ngày mai"`, `"Còn 5 ngày"`, `"Quá hạn 2 ngày"`
- `formatLunarLabel` → `"15/8 âm — Chủ nhật 5/10"`

Ngôn ngữ dùng trong nhãn phải theo danh sách ở `04-frontend-spec.md §3`. Không viết "quá hạn" thành "vi phạm", không viết "cần chú ý" thành "cảnh báo".

---

## 9. Bắt buộc test

`packages/domain` phải có unit test đủ. Các ca không được thiếu:

- Tất cả 4 nhánh `computeFinanceStatus`, gồm ranh giới `totalUsable === dueNext30d`.
- Chuyển đổi âm–dương: một năm nhuận âm, ngày 30 rơi vào tháng thiếu, giỗ vắt qua Tết dương lịch.
- `expandRecurrence` với ngày 31 qua tháng 2 năm thường và năm nhuận.
- `buildReminders` gộp đúng khi nhiều mục cùng ngày.
- `inferLiquidity` phủ hết `AssetKind`.

Không viết test cho component ở MVP. Toàn bộ ngân sách test dồn vào đây, vì đây là nơi lỗi gây hậu quả im lặng: một ngày giỗ sai không báo lỗi, nó chỉ đơn giản không nhắc.
