# 06 — Delta v2

Mọi thay đổi kỹ thuật phát sinh từ `app-concept-v2`. Đọc file này trước, rồi mới đọc `02`, `03`, `05` bản đã cập nhật.

Migration SQL: `migrations/2026-08-01-concept-v2.sql`. Nếu chưa deploy production, gộp thẳng nội dung migration vào `schema.sql` thay vì chạy migration.

---

## 0. Hai lỗi có sẵn, không liên quan v2 nhưng phải sửa cùng

### 0.1 `family_side` mâu thuẫn ở ba nơi

| Nơi | Giá trị |
|---|---|
| `schema.sql` | `paternal`, `maternal`, `both`, `own` |
| `02-data-contract.md` | `husband_family`, `wife_family`, `both`, `own` |
| `05` UI | "Nhà chồng", "Nhà vợ" |

Nội/ngoại và nhà chồng/nhà vợ **không phải cùng một trục**. Với một cặp vợ chồng, "nhà nội" là nhà chồng — nhưng "bên nội của vợ" cũng tồn tại và không ánh xạ được.

Chọn trục theo UI, vì đó là thứ người dùng thật sự nghĩ: **`husband_family` / `wife_family` / `both` / `own`**. Migration đổi enum trong DB.

### 0.2 Chi phí sự kiện không được tính vào tiền cần chuẩn bị

`finance_metrics.due_next_30d` chỉ cộng `upcoming_payments`. `events.estimated_cost` và `documents.renewal_cost` bị bỏ ngoài.

Hệ quả: giỗ 3tr, cưới 2tr, gia hạn bảo hiểm 12tr đều không xuất hiện trong con số "cần chuẩn bị" — trong khi §7.2 của concept v2 lấy đúng ba nguồn đó làm nội dung chính. Sửa bằng view `upcoming_needs` (mục 3 dưới đây).

---

## 1. Bỏ nghi thức cập nhật định kỳ

Concept v2 §7.6 từ chối việc app nhắc cập nhật theo lịch: đó là nghi thức kế toán, mà chỉ người dùng mới quyết được khoản nào đáng ghi.

### Xoá

| Thứ | Ở đâu |
|---|---|
| `households.snapshot_interval_days` | `schema.sql` |
| `money_snapshots.is_manual` | `schema.sql` |
| `FinanceMetrics.snapshotIntervalDays` | `02 §3` |
| `SnapshotRepo.create()` | `02 §4` |
| Bậc 3 của `computeFinanceStatus` — điều kiện "cũ hơn interval × 3" | `03 §1` |
| Màn hình 6.2 "Cập nhật tình hình" | `05` |
| Modal `snapshot-update.tsx` | `05 §1` |
| Luồng F4 "Nghi thức cập nhật tuần" | `05 §9` |
| Thông báo 09:00 hằng tuần | `03 §5`, `05` |
| Cài đặt "nhịp cập nhật 7 hay 30 ngày" | `05 §8` |

### Thay bằng

**Nhãn thời gian trên mọi số khai.** Con số tài sản là thứ *một người đã nói ra tại một thời điểm*, không phải sự thật hiện tại. Nếu hiển thị trần trụi, hai người cùng tin vào một thứ có thể đã sai.

```
250.000.000 ₫
Anh cập nhật 6 tuần trước
```

Hàm mới `formatDeclaredAt(asOfDate, byDisplayName, today)` trong `packages/domain`. Mọi chỗ hiện số tiền tổng đều phải gọi nó. Không có ngoại lệ.

**Độ mới tách khỏi trạng thái.** Hàm mới `computeFreshness()` trả `fresh | aging | stale`, dùng **chỉ cho nhãn**, không bao giờ đổi màu trạng thái. Lý do: một chấm vàng vì "bạn chưa cập nhật" chính là một lời thúc — đúng thứ v2 loại bỏ. Không biết tình hình khác với tình hình không ổn.

**Hỏi theo ngữ cảnh, không theo lịch.** Hàm mới `shouldAskForRefresh()`. Chỉ true khi: có khoản ≥ ngưỡng ghi đến hạn trong 14 ngày **và** `totalUsable` cũ hơn 30 ngày. Hiện dạng một dòng bỏ qua được ngay trong màn hình "sắp tới":

> Tính toán này dựa trên số dư ghi 6 tuần trước — còn đúng không? [Cập nhật] [Bỏ qua]

Bỏ qua thì im 14 ngày. Không push, không badge.

### `money_snapshots` được giữ, nhưng đổi vai

Không còn là vòng lặp thói quen. Giờ là **lịch sử dẫn xuất** do cron ghi mỗi tháng, phục vụ "trí nhớ năm ngoái" (mục 5). Người dùng không bao giờ nhìn thấy hành động tạo snapshot.

---

## 2. Ngưỡng ghi do hai người tự chốt

Nếu mỗi người có ngưỡng riêng trong đầu, hai người sẽ **đọc sai sự im lặng của nhau**.

- Cột mới `households.record_threshold_amount numeric(14,2)`, nullable. `null` = "tự quyết".
- Hỏi **một lần** ở onboarding, một câu, bốn nút: `500k · 1 triệu · 2 triệu · Tự quyết`.
- Sửa được trong Cài đặt → Nhà mình.

**Đây không phải validation.** Không constraint, không chặn form, không cảnh báo khi ghi khoản nhỏ hơn. Nó chỉ làm hai việc:

1. Hiện dưới ô nhập tiền: *"Nhà mình ghi từ 2 triệu trở lên"* — một dòng nhắc nhẹ.
2. Là đầu vào của `shouldAskForRefresh()`.

Nếu biến nó thành ràng buộc, nó thành quy định của app áp lên gia đình. Nó phải giữ nguyên nghĩa: một quy ước hai người tự chốt, app chỉ lưu lại.

---

## 3. Màn hình "Sắp tới nhà mình cần bao nhiêu"

Trái tim sản phẩm theo v2 §7.2. Đây là thứ duy nhất không công cụ miễn phí nào làm được, vì nó cần đồng thời bốn nguồn.

### View mới `upcoming_needs`

Union ba nguồn, cửa sổ 90 ngày:

| Nguồn | Điều kiện | Số tiền |
|---|---|---|
| `upcoming_payments` | `state = 'unpaid'` | `amount` |
| `events` | `estimated_cost is not null` | `estimated_cost` |
| `documents` | `renewal_cost is not null`, sắp hết hạn | `renewal_cost` |

Trả về `source`, `id`, `title`, `on_date`, `amount`. Không tính toán — SQL chỉ gom số.

### Hàm mới `projectRunway()`

```ts
projectRunway(m: FinanceMetrics, needs: UpcomingNeed[], today: ISODate): RunwayProjection
```

Trả về tổng 90 ngày, nhóm theo tháng, số dư dự kiến còn lại, và mức thiếu nếu có.

**Ràng buộc bắt buộc:** mọi con số dẫn xuất phải kèm `basis: 'declared'`. UI luôn in kèm câu *"theo những khoản nhà mình đã ghi"*. Đây là một dự tính, không phải một báo cáo, và phải nói đúng như vậy.

### Không có phép tính nhìn về quá khứ

> **Đã điều chỉnh ở `08 §1`.** Bản này cắt quá tay: nó không phân biệt giữa *liệt kê* những gì đã ghi (trung thực khi dữ liệu thiếu) và *cộng tổng* rồi trình bày như bức tranh đầy đủ (không trung thực). Màn hình lịch sử biến động là P0. Đọc `08 §1` thay cho đoạn dưới đây.

Không có bảng "dự kiến vs thực tế", không có phần chênh lệch, không có "tiền đi đâu". Mọi phép tính loại đó cần giả định *đã ghi đủ*, mà giả định đó không tồn tại trong mô hình này.

---

## 4. Danh sách mua sắm chung

Bề mặt duy nhất có tần suất hằng ngày và tự nhiên hai chiều. Từ "chưa cần" lên P0.

- Bảng mới `shopping_items`: `title`, `note`, `is_done`, `added_by`, `done_by`, `done_at`.
- Tự dọn: mục đã tick biến mất khỏi danh sách chính sau 24 giờ (cron), giữ 30 ngày để hoàn tác.
- Cố ý **không có**: phân loại, cửa hàng, số lượng, giá, gán người mua. Thêm bất kỳ trường nào trong số đó là biến nó thành việc được giao.
- Vị trí: sub-tab thứ hai trong tab "Việc & Sự kiện", **và** một card thường trực trên Nhà mình khi danh sách khác rỗng. Đây là card duy nhất được hiện cả khi các nhóm khác rỗng.

Không đếm badge. Không thông báo khi người kia thêm đồ — nếu bắn push mỗi lần thêm chai nước mắm thì app sẽ bị tắt thông báo trong tuần đầu.

---

## 5. Trí nhớ năm ngoái

Subscription sống bằng cái mất đi khi hủy.

- Bảng mới `event_occurrences`: mỗi lần sự kiện lặp thực sự diễn ra → `occurred_on`, `actual_cost`, `notes`.
- Sinh tự động khi `next_occurrence_date` trôi qua. Sau đó app hỏi **một lần, bỏ qua được**: *"Giỗ ông ngoại đã xong. Thực tế hết bao nhiêu?"*
- Hàm mới `lastYearFor(event, occurrences, today)`.
- Hiện ở chi tiết sự kiện và trong form khi tạo sự kiện lặp lại: *"Năm ngoái: 3.200.000 ₫"*.
- Dữ liệu cũ hơn 12 tháng nằm sau paywall (`premium_required`, feature `history`). Dữ liệu vẫn được ghi từ ngày đầu cho mọi household, kể cả free — nếu không ghi thì tính năng này vô nghĩa vào năm thứ hai.

---

## 6. Nhập liệu nhanh bằng AI

Nút thắt sống còn: app nằm ở hạ nguồn của Zalo. Nếu phải mở app gõ tay, dữ liệu không vào và mọi module đều rỗng.

- Bảng mới `ingest_drafts`: `source ('screenshot'|'photo'|'text')`, `raw_text`, `image_path`, `parsed jsonb`, `suggested_entity_type`, `status ('pending'|'confirmed'|'discarded')`.
- Edge Function mới `parse-capture`. Đây là Edge Function **đầu tiên nhận input người dùng**, nên là chỗ đầu tiên cần validation phía server — ghi chú này quan trọng vì `02 §5` hiện đang khẳng định không có input nào đi qua Edge.
- Share extension iOS + share target Android → route `(modals)/capture-review.tsx`.
- Người dùng **luôn** xác nhận trước khi ghi. Không bao giờ tự tạo bản ghi từ AI. Một sự kiện giỗ sai ngày do AI đoán sẽ phá niềm tin ở đúng tính năng khác biệt nhất.
- Sau paywall: `feature: 'ai_capture'`. Free tier được 5 lần/tháng để cảm nhận được giá trị.

---

## 7. Việc nhà — chống tạo bằng chứng

Concept v2 §7.3 và nguyên tắc 10.7. Không có thay đổi schema; toàn bộ là ràng buộc hành vi.

### Ba đường ranh (bất biến, không được vượt trong bất kỳ tính năng tương lai nào)

1. **App nhắc người có tên, không báo cáo cho người kia.** `buildReminders` nhận thêm `targetMemberId`; nhắc việc **chỉ** gửi cho `assigneeId`. Nếu việc không gán ai, gửi cho cả hai. Không bao giờ có thông báo dạng "X chưa làm Y".
2. **Không thống kê theo người.** Không tỷ lệ hoàn thành, không chuỗi ngày, không so sánh, không biểu đồ. Vĩnh viễn, kể cả khi người dùng xin.
3. **Việc tồn đọng gom lại.** "Nhà mình còn 3 việc chưa xong", không phải hai cột trong đó một cột dài hơn.

### Thay đổi cụ thể

- Form việc: **mặc định không gán ai**. Gán tên là hành động phụ, có ý thức.
- Chip người phụ trách chạm được ngay trên dòng để đổi — bất kỳ ai đổi, bất cứ lúc nào, không hỏi, không thông báo. Chính quyền sửa tự do này khiến cái tên là thỏa thuận chứ không phải mệnh lệnh. **Không có bước xác nhận nhận việc** — việc đã tồn tại thì cần được hoàn thành, chỉ người làm là biến số.
- `05 §5.2` hiện "5 lần gần nhất đã xong" → giữ, nhưng **bỏ tên người**. Chỉ hiện làm/không làm theo ngày. `completed_by` vẫn ghi trong DB để hoàn tác, không bao giờ hiển thị.

---

## 8. Bỏ và hoãn

| Thứ | Trước | Sau | Vì sao |
|---|---|---|---|
| ~~Mục tiêu (goals)~~ | P1 | ~~P2~~ → **P0** | ĐẢO NGƯỢC ở `08 §2` — mục tiêu nhìn về phía trước, thuộc về mô hình này |
| Tìm kiếm | P1 | P2 | dữ liệu còn mỏng ở MVP |
| Card MỤC TIÊU ở tab Tiền | có | bỏ | như trên |
| Câu "tiền đi đâu" trong mọi copy | — | cấm | mô hình dữ liệu không trả lời được câu đó |
| Đính kèm file tổng quát | P0 | chỉ ảnh | ảnh cần cho AI; file khác hoãn |

---

## 9. Gói dịch vụ

- **Trial gắn cột mốc, không gắn ngày.** Cột mới `households.trial_milestones jsonb` — trial kết thúc khi đã qua 30 ngày **và** household đã trải qua ít nhất một lần nhắc hạn được xác nhận **và** một sự kiện có chi phí. Trần cứng 90 ngày. Lý do: 30 ngày có thể trôi qua mà không có hạn nào tới, khi đó người dùng chưa từng nhìn thấy sản phẩm hoạt động.
- **Paywall nêu gói năm trước, gói tháng ở dòng nhỏ.** App tần suất thấp mà bán gói tháng thì bắt người dùng tự hỏi "còn cần không?" 12 lần mỗi năm.
- **Quyền xem không bao giờ bị khóa.** Người thứ hai gặp paywall là app chết. Chỉ khóa: `ai_capture`, dung lượng file, `history` quá 12 tháng.
- ~~**Giá trị đã cứu.**~~ — **ĐÃ BỎ ở `08 §4`.** Bản này gọi nó là "câu biện minh cho gói năm mạnh hơn bất kỳ tính năng mới nào". Nhận định đó đúng về marketing và sai về nhất quán: đó là một khẳng định phản thực không kiểm chứng được, đặt cạnh những con số được gắn nhãn cẩn thận ở khắp phần còn lại.

---

## 10. Onboarding

Hai bước mới, cả hai đều bỏ qua được, tổng dưới 40 giây.

**Ngưỡng ghi** (mục 2) — một câu, bốn nút.

**Gói khởi tạo.** Một danh sách tick, **không phải form**:

```
Nhà mình thường có những việc này. Chọn cái nào đúng:

☑ Tết Nguyên đán
☐ Giỗ (chọn ngày sau)
☑ Sinh nhật bố mẹ hai bên
☑ Đăng kiểm xe
☑ Bảo hiểm xe
☐ Học phí

[ Thêm vào ]   [ Để sau ]
```

`05 §3.3` hiện nói "không ép nhập dữ liệu ban đầu" — nguyên tắc đó giữ nguyên. Tick một danh sách gợi ý không phải nhập liệu, và app phụ thuộc mật độ dữ liệu: một household trống ngày đầu là một household chết.

---

## 11. Thứ tự dựng lại

Thay cho `05 §10`. Thay đổi lớn nhất: nhập liệu bằng AI lên rất sớm, vì nếu nó không hoạt động thì mọi module đều rỗng và ta sẽ không biết cho tới khi đã xây xong.

1. Sign in · Setup (+ ngưỡng ghi) · Nhà mình rỗng
2. Thêm nhanh · Việc · Mua sắm — vòng lặp hằng ngày
3. Mời · Tham gia
4. **Nhập từ ảnh chụp màn hình** — kiểm chứng sớm giả thuyết sống còn
5. Sự kiện + lịch âm
6. Tài sản · Khoản sắp trả · **màn hình "Sắp tới cần bao nhiêu"**
7. Giấy tờ + máy quét + upload
8. Nợ · Cần trao đổi
9. Cài đặt · Gói dịch vụ
10. Trí nhớ năm ngoái · Mục tiêu · Tìm kiếm (P2)

---

## 12. Còn treo — cần quyết trước khi dựng tuần 3

1. **Phân khúc**: cặp ở riêng hay ở chung bố mẹ? Ảnh hưởng trọng số giữa module việc nhà và module tiền.
2. ~~**Tính năng bản địa**~~ — ĐÃ CHỐT: làm cả sổ mừng cưới và hồ sơ con. Xem `07-local-modules.md` và migration `2026-08-02-local-modules.sql`.
3. **`suggestAttention`** (`03 §6`) có mâu thuẫn nhẹ với nguyên tắc 10.7. Đề xuất thu hẹp: gợi ý chỉ hiện cho **người vừa thực hiện thay đổi**, không bao giờ cho người kia. Như vậy nó là ghi chú tự nguyện, không phải lời triệu tập. Đã áp dụng trong `03` bản mới; xác nhận lại nếu không đồng ý.
