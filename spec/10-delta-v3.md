# 10 — Delta v3

Mọi thay đổi kỹ thuật phát sinh từ `app-concept-v3`. Đọc file này trước, rồi mới đọc `02`, `03`, `05`, `09` bản đã cập nhật.

Migration: **hai file, và thứ tự giữa chúng là bắt buộc** —
`0007_concept_v3_enums.sql` (chỉ hai lệnh `alter type ... add value`) rồi
`0008_concept_v3.sql` (mọi thứ còn lại).

Tách vì Postgres không cho dùng một giá trị enum mới trong cùng transaction đã thêm nó, và **ranh giới transaction thật là ranh giới giữa hai file migration** — chữ `commit;` viết trong file không tạo ra transaction riêng, vì Supabase CLI chạy cả file trên một connection. Gộp một file sẽ hỏng ở đúng câu `alter table money_events add constraint`.

**Khác `06` và `08` ở một điểm:** hai file kia ghi lại một concept mới ghi đè lên spec cũ. File này ghi lại một concept mới **gặp một sản phẩm đã xây gần xong** — v3 ra đời sau khi G0–G17 đã code, 311 test xanh, và cả hai module bản địa đã chạy. Nên phần lớn giá trị của nó không nằm ở chỗ "v3 thêm gì", mà ở chỗ **v3 vênh với cái đã có ở đâu, và bên nào thắng**.

---

## 0. Nguyên tắc xử lý xung đột

`v3` là nguồn sự thật. Nhưng `spec/` không phải bản nháp: nhiều quyết định trong đó được ghi **kèm lý do**, và ở vài chỗ lý do đó chính là lời bác bỏ thứ v3 vừa đề xuất. Đây không phải chuyện v2 cũ nên sai — đó là chuyện v2 đã cân nhắc đúng câu hỏi ấy rồi kết luận ngược lại.

Cách xử lý: v3 thắng ở mọi chỗ **trừ** khi bản cũ có một lập luận mà v3 không phản bác, chỉ đơn giản là không nhắc tới. Tám chỗ như vậy được liệt ở §1, mỗi chỗ ghi rõ bên nào thắng và vì sao.

Ba chỗ bác v3 (§1 C2, C4, C6) và một chỗ bác một phần (§2 luân phiên) là những chỗ dễ bị mở lại nhất. Chúng được viết dài có chủ ý.

---

## 1. Tám xung đột và quyết định

| # | v3 nói | Chốt | Vì sao |
|---|---|---|---|
| C1 | Quỹ chung ghi tên người nạp, tổng theo người trong tháng | **theo v3**, có điều kiện | §3 |
| C2 | Thẻ "Bên nội / Bên ngoại" | **giữ bản cũ** | §4 |
| C3 | Mục tiêu nằm trong màn "Sắp tới", nhãn "có thể hoãn" | **theo v3**, đổi cơ chế | §5 |
| C4 | "App đã nhắc bạn 6 hạn, tổng giá trị 47 triệu" | **giữ bản cũ** — không khôi phục | §6 |
| C5 | Chọn tối đa một module bản địa | **giữ bản cũ** — giữ cả hai | §7 |
| C6 | Widget nằm trong MVP | **giữ bản cũ** — ngoài MVP | §8 |
| C7 | Phân khúc: cặp ở riêng | **theo v3** — chốt | §9 |
| C8 | Chu kỳ luân phiên mặc định? | **câu hỏi biến mất** | §2 |

---

## 2. Việc nhà: tách hai danh sách — có; luân phiên tự động — không

### 2.1 Tách hai danh sách `theo v3`

v3 §7.3 tách việc nhà thành hai loại có bản chất khác hẳn nhau:

- **Định kỳ** — lặp lại, có giờ, không hoãn được: rửa bát, đổ rác, tưới cây.
- **Linh hoạt** — phát sinh, không gấp, ai làm cũng được: lau quạt trần, gọi thợ, đặt vé.

Ép chung một mô hình thì hỏng cả hai: danh sách định kỳ bị lấp bởi việc vặt không hạn, còn việc vặt thì mang một cái hạn giả mà không ai định đặt.

Cột mới `tasks.list` (`recurring` | `flexible`). Backfill: có `recur` → định kỳ, còn lại → linh hoạt.

**Việc linh hoạt không gán cho người kia.** Mặc định không tên; ai rảnh tự nhận. Đây là ranh giới giữ cho nó là danh sách việc của nhà, chứ không phải hộp thư nhiệm vụ một người gửi cho người kia. Ở tầng UI: chip người phụ trách hoặc ẩn hẳn, hoặc chỉ chọn được chính mình.

**Việc định kỳ mất cử chỉ vuốt-để-hoãn.** `05 §5.1` và `09 §D.1` hiện bắt buộc vẽ nó. Với việc định kỳ, thao tác đó vốn đã sai ngữ nghĩa: `tasks.due_date` của việc lặp là **mốc neo**, không phải một lần xảy ra — hoãn một lần đang âm thầm dời cả chuỗi. Đây là sửa lỗi mặc áo tính năng.

### 2.2 Luân phiên tự động — **KHÔNG LÀM**

v3 §7.3 đề xuất ba chế độ người phụ trách: không gán / cố định / **luân phiên tự động**, và lập luận cho chế độ thứ ba khá mạnh — cái tên đến từ *quy tắc hai người đã chốt trước*, không phải do người kia gán từng lần, nên không ai đang sai bảo ai.

**Vẫn không làm.** Lý do không phải là lập luận đó sai, mà là cái giá không tương xứng:

- Nó cần **bốn thứ mới cùng lúc**: `tasks.assignee_mode`, `rotation_order uuid[]`, `rotation_anchor_date`, và `task_instances.assignee_id`. Ba cột đầu là cấu hình người dùng phải hiểu; cột thứ tư là bắt buộc về mặt kỹ thuật, vì không có nó thì **đổi lượt một lần sẽ đổi vĩnh viễn mọi lần sau** — đúng thứ ngược lại với ý đồ "đổi lượt tự do".
- Thứ nó thay thế đã chạy: chip xoay vòng người phụ trách (`cycleAssignee` ở `plan-screen.tsx`), một chạm, ai cũng đổi được, không sinh thông báo.
- Và nó đứng sát một lằn ranh: luân phiên đúng nghĩa cần một quy tắc **không lấy lịch sử hoàn thành làm đầu vào** — nếu bỏ lượt mà làm đổi lượt kế tiếp thì app đang ghi điểm. Một tính năng phải cẩn thận đến thế để không vi phạm nguyên tắc 10.7 thì nên có bằng chứng là người dùng cần nó trước đã.

Vì vậy giữ đúng hai chế độ, và **không thêm cột nào**: `tasks.assignee_id` nullable đã đủ diễn đạt — `null` = việc của nhà, có tên = người đó làm.

**Hệ quả:** câu treo cuối cùng của v3 §20 ("chu kỳ luân phiên mặc định theo ngày hay theo tuần?") tự biến mất. Và `03 §9` **không** cần thêm lệnh cấm "đếm số lần đổi lượt" — không có lượt thì không có gì để đếm.

Nếu sau này mở lại: điều kiện để làm là thấy người dùng thật đang dùng chip xoay vòng theo một nhịp đều đặn, tức là họ đang tự luân phiên bằng tay. Chưa có dữ liệu đó thì đây là cấu hình đi tìm nhu cầu.

---

## 3. Quỹ chung `theo v3` — và ngoại lệ có điều kiện đầu tiên của `03 §9`

### 3.1 Vì sao nó thuộc về sản phẩm này

Cặp ở riêng thường có một quỹ chung cho tiền nhà, ăn uống, điện nước. Dữ liệu này đáng theo dõi vì **tần suất nhập cực thấp**: 2–4 lần một tháng, không phải 200 — nên nó không kéo sản phẩm về phía app thu chi.

Bảng mới `funds` (số dư, `as_of_date`, người cập nhật) và `fund_entries` (nạp/rút, số tiền, mục đích, **tên người nạp**).

### 3.2 Chỗ va chạm

`03 §9` dòng đầu cấm **Tổng tiền theo người**, và `05 §6.2` gọi đó là *"ràng buộc quan trọng nhất của cả spec"*. v3 §7.6 lại yêu cầu đúng thứ đó: ghi tên người nạp, và hiện tổng theo người trong tháng.

Lý do v3 đưa ra, và nó đúng: hai người vốn đã biết thu nhập của nhau và đã tự chốt tỷ lệ góp từ trước. App không phát hiện ra điều gì mới — nó chỉ trả lời một câu rất thực tế: *"tháng này em chuyển chưa?"* Không có tên thì câu đó không trả lời được.

Khác biệt căn bản với chi tiêu vặt: nạp quỹ là **chuyển khoản rời rạc, đối chiếu được với sao kê**. Không ai quên mình vừa chuyển 10 triệu. Còn chi tiêu vặt thì dễ ghi thiếu, và vì thế gán tên vào là gán tên cho một dữ liệu không đầy đủ.

### 3.3 Ngoại lệ, và ranh giới của nó

**Được phép:** tổng theo người đóng góp, **chỉ trong phạm vi một tháng**, chỉ ở màn hình quỹ, và bắt buộc kèm số lượng bản ghi.

**Cấm:** cộng dồn qua nhiều tháng; bất kỳ câu kết luận nào ("còn thiếu", "chưa góp", "chưa đạt"); tỷ lệ phần trăm so với một mức chuẩn; xuất hiện ở ngoài màn hình quỹ.

**Phép thử một câu, dùng khi review:**

> Con số này có vắt qua nhiều hơn một tháng không? Có → cấm.

Vì sao ngoại lệ này an toàn còn ngoại lệ với tài sản thì không: quỹ chung là một cái hộp hai người cùng bỏ tiền vào **trong tháng đó**. Câu *"tháng này anh bỏ 5 triệu, em bỏ 5 triệu"* là một câu ghi chép, và nó **đóng lại vào cuối tháng** — không để lại gì. Câu *"tính tới nay anh bỏ 180 triệu, em bỏ 60 triệu"* là một câu phán xét: cùng dữ liệu, khác hoàn toàn về việc nó dùng để làm gì. Một con số cộng dồn thì không bao giờ đóng; giữa vợ chồng không có cơ chế tất toán nào để xoá nó, và đến lúc nào đó nó sẽ được đem ra dùng.

Đó cũng chính là chỗ mô hình Splitwise không hợp: Splitwise giả định có quan hệ nợ **và** có ngày tất toán. Vợ chồng không có cả hai.

### 3.4 Ranh giới phải được ép bằng cấu trúc, không bằng kỷ luật

Một lệnh cấm chỉ nằm trong tài liệu sẽ bị vi phạm bởi người không đọc tài liệu. Ranh giới "một tháng" được ép ở **ba tầng độc lập**:

1. **View** — `fund_month_contributors` có `month` trong `group by`, và **không tồn tại view nào gom theo người mà thiếu `month`**.
2. **Domain** — `summarizeFundMonth(entries, month)` nhận một tháng là **tham số bắt buộc**; không có chữ ký nào nhận khoảng thời gian. Kèm một test đóng băng danh sách export của `src/funds/`, để lần sau ai thêm hàm nhận range thì test đỏ.
3. **UI** — `contributor-block.tsx` nhận `month` là **prop bắt buộc**, nên không có đường render nó ngoài ngữ cảnh một tháng.

Ba tầng này độc lập nhau: phá được một tầng vẫn còn hai tầng chặn.

### 3.5 Hai chi tiết nhỏ, lý do không nhỏ

**`byContributor` sắp theo tên, thứ tự ABC — không theo số tiền.** Sắp theo tiền là một bảng xếp hạng, và xếp hạng hai vợ chồng đúng là thứ đang tránh. ABC là thứ tự duy nhất không mang thông điệp nào.

**`contributor_name` là chữ tự do, không phải khoá ngoại.** Người bỏ tiền vào quỹ không nhất thiết là thành viên household: bố mẹ đưa, em ruột góp. `contributor_member_id` chỉ tồn tại để điền sẵn ô nhập, và **không bao giờ là khoá gom nhóm**.

### 3.6 Ba tình huống app phải im lặng

1. **Một người góp ít hơn tỷ lệ đã chốt.** Không đánh dấu, không cảnh báo, không đổi màu. Con số hiển thị đúng như nó là, hai người tự nói với nhau. Góp ít hơn không phải một lỗi cần app phát hiện.
2. **Đóng góp không bằng tiền.** Nghỉ thai sản, bỏ việc chăm con, bên nội ngoại đỡ tiền nhà — quỹ không có ô nào ghi được những thứ này, nên **mọi kết luận rút ra từ riêng con số đều thiếu**. Đây chính là lý do app ghi mà không phán.
3. **Chi cho nhà bằng tiền riêng, không qua quỹ.** Vẫn ghi ở khoản vừa và lớn, nhưng **không cộng vào phần nạp quỹ** — hai loại này không cùng đơn vị, gộp lại là bắt đầu làm kế toán.

### 3.7 Ghi chú kỹ thuật

`fund_entries` là **xoá mềm, không phải append-only** — cố ý khác `money_events`. Gõ nhầm số tiền một khoản nạp phải sửa được; nếu append-only thì phải ghi một dòng âm bù trừ, và một quỹ hiện *"+5.000.000 rồi −5.000.000 (sửa nhầm)"* đúng là thứ sổ-nợ-hoá mà cả mục này tránh. Bảo đảm append-only nằm ở tầng trên: `money_events` vẫn ghi mọi biến động của quỹ.

`money_events.entity_type` có check constraint khoá cứng bốn giá trị. Thêm `'fund'` phải sửa **cả enum lẫn constraint** — quên constraint thì migration báo thành công và **lần nạp quỹ đầu tiên mới nổ**.

---

## 4. Trục "nhà ai" — giữ nguyên, không đổi sang nội/ngoại

v3 §7.5 dùng chữ "Bên nội / Bên ngoại" cho thẻ sự kiện.

**Giữ `husband_family` / `wife_family` / `both` / `own`.**

`06 §0.1` đã xử lý đúng câu hỏi này và kết luận: nội/ngoại và nhà chồng/nhà vợ **không phải cùng một trục**. Với một cặp vợ chồng, "nhà nội" là nhà chồng — nhưng **"bên nội của vợ" cũng tồn tại và không có chỗ nào để đặt**. Chọn trục nội/ngoại là chọn một hệ quy chiếu mà một phần dữ liệu thật không biểu diễn được.

v3 §7.5 dùng chữ "nội/ngoại" theo lối nói thông thường, không kèm lập luận nào cho việc đổi trục — nên đây là chỗ v3 không phản bác bản cũ, chỉ là không nhắc tới.

Thêm nữa: enum này **đã có dữ liệu thật trên cloud** (migration `0004` đã áp). Đổi nó lần thứ hai là một thao tác trên dữ liệu đang chạy để đổi lấy một cách gọi kém chính xác hơn.

**Nhãn UI vẫn là "Nhà chồng" / "Nhà vợ"** — đó là thứ người dùng thật sự nghĩ khi xếp lịch, và cũng là chỗ `06 §0.1` chọn làm chuẩn.

---

## 5. Mục tiêu trong màn "Sắp tới" — giữ nguyên tắc, đổi cơ chế

v3 §7.2 đặt *"Góp quỹ du lịch 5tr — mục tiêu, có thể hoãn"* ngay trong màn hình "Sắp tới", cạnh học phí và đăng kiểm.

`08 §2.3` nói ngược: mục tiêu **không được** chảy vào `upcoming_needs`, vì *"nghĩa vụ khác nguyện vọng — trộn hai loại làm con số cần chuẩn bị mất nghĩa"*.

**Cả hai đều đúng, và chúng không thật sự mâu thuẫn.** Thứ `08` bảo vệ là: không bao giờ **cộng** nghĩa vụ với nguyện vọng vào cùng một con số. Thứ v3 muốn là: hai loại **cùng xuất hiện** trên một màn hình, để hai người thấy tháng 9 đóng học phí xong thì quỹ du lịch phải chậm lại.

Cùng màn hình không có nghĩa là cùng một con số.

**Cơ chế mới:** `upcoming_needs` có thêm cột `kind` (`mandatory` | `optional`); goals vào view với `kind = 'optional'`. `projectRunway` **chỉ cộng `mandatory`** và trả riêng mảng `optional`. UI vẽ hai khối, hai tiêu đề.

**Con số hero không đổi nghĩa** — đó là điều kiện để thay đổi này hợp lệ.

> **Bẫy khi sửa:** comment *"goals CỐ Ý KHÔNG có trong view này"* đang nằm ở **ba** chỗ — `schema.sql` (định nghĩa view), `types/views.ts`, và `finance/runway.ts`. Sửa view mà để sót một comment nói ngược lại còn tệ hơn cả hai trạng thái, vì người đọc sau sẽ không biết cái nào là ý định thật.

---

## 6. "Giá trị đã cứu" — vẫn không khôi phục

v3 §7.7 đề nghị hiện: *"Năm nay app đã nhắc bạn 6 hạn, tổng giá trị 47 triệu"*, và gọi đó là "câu biện minh cho gói năm mạnh hơn bất kỳ tính năng mới nào".

`08 §4` đã xoá hẳn view `value_saved` và hàm `summarizeValueSaved()`. **Giữ nguyên quyết định xoá.**

Lập luận của `08 §4` không bị v3 phản bác, và nó vẫn đúng: *"47 triệu"* là một **khẳng định phản thực không kiểm chứng được**. Nó ngầm nói rằng nếu không có app thì người dùng đã mất 47 triệu — mà không ai biết điều đó. Có thể họ vẫn tự nhớ. Có thể họ đã ghi vào lịch. Con số không kiểm chứng được bằng bất kỳ cách nào, **kể cả bởi chính người dùng**.

Cả spec này được xây trên nguyên tắc ngược lại: số khai kèm nhãn thời gian, dự tính ghi rõ *"theo những khoản nhà mình đã ghi"*, tổng kèm số lượng bản ghi. Đặt một con số không kiểm chứng được cạnh những con số đó **không làm nó đáng tin hơn — nó làm những con số kia kém đáng tin đi**.

Đáng chú ý: chính v3 §10.8 vẫn giữ nguyên tắc *"mọi phép tính đều ghi rõ nó dựa trên cái gì"*. §7.7 mâu thuẫn với §10.8 của cùng một tài liệu.

**Thứ giữ người trả tiếp là trí nhớ năm ngoái** (§7.9) — cái họ thật sự mất khi huỷ, và kiểm chứng được: người dùng nhìn vào và thấy đúng dữ liệu của mình.

---

## 7. Hai module bản địa — giữ cả hai

v3 §8 nói "chọn **tối đa một**".

`06 §12` mục 2 đã chốt làm cả hai, và **cả hai đã code xong**: sổ hiếu hỉ (G15 + G17) và hồ sơ con (G15) — 5 bảng, 8 màn hình, khoảng 85 test.

v3 §8 là lời khuyên ở thời điểm chưa xây, không phải lệnh gỡ thứ đã chạy. Gỡ một module đang hoạt động để khớp một câu khuyến nghị là phá giá trị đã có.

**Nhưng cảnh báo của `07 §0` vẫn đúng và vẫn chưa được xử lý:** cái bị hy sinh khi làm cả hai **không phải** các mục P1 — mà là **chất lượng của luồng nhập liệu AI** (`06 §6`) và **luồng mời** (F2). Luồng AI hiện vẫn chưa nối model (`parse-capture/model.ts` là stub rỗng, trả 503).

Đó là món nợ có thật, và nó không được trả bằng việc thêm module thứ ba.

---

## 8. Widget — vẫn ngoài MVP

v3 §16 mục 15 đặt "Notification chất lượng + widget" vào danh sách Phải có.

`01 §10` giữ nguyên: widget **ngoài phạm vi MVP** — cần code SwiftUI (WidgetKit) và Kotlin (Glance) riêng, chia sẻ dữ liệu qua App Group / SharedPreferences. Đây là điểm yếu thật của React Native, không phải một mục có thể tick.

Lưu ý kèm, và nó quan trọng hơn: **nửa đầu của chính mục 15 cũng chưa chạy.** `expo-notifications` đang tắt qua `expo.autolinking.exclude` vì thiếu certificate Apple Development. Nghĩa là F4 và F7 — và toàn bộ giá trị "app nhắc người có tên, người kia khỏi phải nhắc" — chưa từng được kiểm chứng.

Bật lại push là việc trước. Widget là việc sau khi có bằng chứng người dùng cần nó.

---

## 9. Phân khúc: chốt cặp **ở riêng**

Đóng câu treo ở `06 §12` mục 1 và `07 §6`.

v3 §3 khuyến nghị ở riêng vì **cả năm module đều hoạt động đầy đủ**. Cặp ở chung bố mẹ có nhu cầu khác rõ rệt: việc nhà bớt quan trọng, ranh giới tài chính với bố mẹ hai bên lại quan trọng hơn hẳn.

Hệ quả ghi vào spec:
- Module việc nhà **không** bị hạ trọng số.
- Ranh giới tài chính với bố mẹ hai bên **không** được nâng lên — đó là kịch bản của phân khúc ở chung, và "bố mẹ hai bên" vẫn nằm ngoài phạm vi (v3 §8 liệt nó là ứng viên module bản địa thứ ba, đã không chọn).
- Quỹ chung (§3) hợp lý với phân khúc này: cặp ở riêng có tiền nhà, ăn uống, điện nước để gộp; cặp ở chung thường không.

---

## 10. Nhắc kép

v3 §5 chỉ đích chỗ đau: *phần lớn sự cố gia đình không phải quên sự kiện, mà là nhớ sự kiện nhưng quên phần chuẩn bị cho nó.*

Cột mới `events.prep_lead_days` (1–3 ngày) và `events.prep_task_id`.

**Nhắc chuẩn bị sinh ra một việc trong danh sách linh hoạt**, không phải bắn thêm một push nữa vào cùng người về cùng một chuyện. Đây là khác biệt quan trọng: thông báo thứ hai về cùng một sự kiện là phiền; một dòng việc xuất hiện trong danh sách là hữu ích, và nó gắn được với chi phí dự kiến ở `§7.2`.

Tương tác với trần 2 thông báo/ngày: nhắc chuẩn bị và nhắc sự kiện rơi cùng ngày cho cùng người sẽ **gộp làm một** theo đúng khoá `(ngày bắn, người nhận)` sẵn có. Không cần xử lý đặc biệt.

---

## 11. Thẻ "Của con"

`event_kind` thêm giá trị `'child'`, và `events` thêm một tham chiếu member nullable để biết **con nào** — lịch tiêm, họp phụ huynh, thi học kỳ, sinh nhật bạn cùng lớp, lịch học bơi.

`members` thêm `color_key` cho "mỗi con một màu". Màu phải **bám theo con**, không suy từ vị trí trong danh sách: thêm em bé thứ hai mà đổi màu anh chị là một lỗi nhỏ nhưng đúng chỗ cảm xúc.

Không có cấu trúc mới nào khác — giấy tờ của con, học phí, lịch khám vẫn là `documents`, `upcoming_payments`, `events` lọc theo member, đúng như `07 §4.4`.

---

## 12. Không đếm, không so sánh hai bên

v3 §7.5 nói rõ điều `05` mới chỉ ngầm hiểu: thẻ nhà chồng/nhà vợ dùng để **lọc và lên kế hoạch** — thấy tháng sau dồn về một bên thì thu xếp trước. App **không** đếm số sự kiện mỗi bên và không hiện bảng so sánh tần suất.

Lý do không phải né tránh, mà là **con số đó không đo cái người ta tưởng nó đo**. Số sự kiện mỗi bên do số họ hàng, số đám giỗ, số đám cưới quyết định — không bên nào chọn được. Một bảng "quý này: nhà chồng 5, nhà vợ 2" không kết thúc tranh cãi, nó **bắt đầu** tranh cãi, và bắt đầu ở thế một người đúng một người sai về một chuyện không ai gây ra.

Đây là nguyên tắc 10.9 của v3, và nó tổng quát hơn một lệnh cấm: **không đếm những gì hai người không chọn được.** Áp dụng cho cả số lần bố mẹ ốm và số việc phát sinh của con.

Bổ sung vào `03 §9` dưới dạng một dòng cấm.

---

## 13. Ảnh hưởng tới các tài liệu khác

| Tài liệu | Thay đổi |
|---|---|
| `02` | type `Fund`, `FundEntry`, `FundMonthSummary`, `TaskList`, `NeedKind`; `MoneyEntityType` += `fund`; `EventKind` += `child`; `Task.list`; `FamilyEvent.prepLeadDays`/`prepTaskId`; `Member.colorKey`; `UpcomingNeed.kind`; `FundRepo`; §7 thêm 3 dòng; §8 thêm 4 type cấm |
| `03` | §4b hai danh sách việc; §5b nhắc kép; §7.6 ba tình huống im lặng; **§9 ngoại lệ có điều kiện thứ hai**; §13 test bắt buộc |
| `05` | route `money/fund*`; §5.1 tách đôi; §6.1 hai khối; **§6.9 quỹ chung**; §8 giá thử nghiệm; bảng so sánh thêm Splitwise |
| `09` | §D.1 tách đôi; **§E.9 quỹ chung**; §A.5 từ vựng quỹ; §I.3 câu hỏi rà lại |
| `schema.sql` | 2 bảng, 3 enum, 2 giá trị enum, cột mới, 2 view quỹ, `upcoming_needs` có `kind`, RPC quỹ |
| `CLAUDE.md` | **ràng buộc #1 phải có qualifier** — nếu không nó sai theo nghĩa đen |
| migration | `0007_concept_v3_enums.sql` + `0008_concept_v3.sql` (thứ tự bắt buộc) |

### Bổ sung cho `03 §9` — danh sách hàm cấm viết

| Hàm | Vì sao cấm |
|---|---|
| Tổng quỹ chung theo người, vắt qua nhiều hơn một tháng | Là sổ nợ giữa hai vợ chồng, dựng bằng dữ liệu trung thực |
| Kết luận "ai còn thiếu bao nhiêu" ở quỹ chung | Như trên, và tệ hơn: app phát ngôn thay một người |
| Xếp người đóng góp theo số tiền | Xếp hạng hai vợ chồng; sắp theo tên ABC |
| Đếm hoặc so sánh số sự kiện theo `side` | Đếm thứ không ai chọn được — nguyên tắc 10.9 |
| Tỷ lệ hoàn thành theo danh sách việc | Bảng xếp hạng đội lốt phân loại |

---

## 14. Câu treo — đã đóng hết

v3 §20 liệt năm câu. Sau file này không còn câu nào mở:

| v3 §20 hỏi | Trả lời |
|---|---|
| 1. Phân khúc ở riêng hay ở chung? | **ở riêng** — §9 |
| 2. Tính năng bản địa nào? | **cả hai, đã xong** — §7 |
| 3. Ngưỡng ghi mặc định? | **đã có sẵn**: 500k / 1tr / 2tr / Tự quyết, mặc định gợi ý 2.000.000 (`05 §3.3`) |
| 4. Quỹ chung có vào MVP? | **có** — §3 |
| 5. Chu kỳ luân phiên mặc định? | **câu hỏi biến mất** — không làm luân phiên, §2.2 |
