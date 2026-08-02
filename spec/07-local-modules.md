# 07 — Hai module bản địa

Chốt cho `06 §12` mục 2: làm **cả hai**.

Hai module này khác bản chất với bốn module lõi, và khác nhau ở một điểm quan trọng: **cả hai đều ghi dữ liệu về người khác** — họ hàng trong sổ mừng cưới, và con trong hồ sơ con. Mọi ràng buộc dưới đây bắt nguồn từ chỗ đó.

---

## 0. Cảnh báo phạm vi

Ở lượt thảo luận trước, khuyến nghị là chọn tối đa một. Làm cả hai là quyết định hợp lệ nhưng cần biết cái giá:

- Thêm khoảng **4–6 tuần** cho team nhỏ.
- Hai module không dùng chung gì với nhau: một cái cần bảng danh bạ, một cái cần dữ liệu y tế có phiên bản. Không có tiết kiệm nhờ làm cùng lúc.
- MVP đã có 16 mục P0. Thêm hai module nữa thì thứ bị hy sinh **không phải** là các mục P1 — mà là chất lượng của luồng nhập liệu AI (`06 §6`) và luồng mời (`F2`), hai thứ quyết định sống chết.

Nếu phải cắt: **giữ nguyên hai luồng đó, cắt phần sâu của hai module này** theo mục 3.4 và 4.6.

### Thứ tự đề xuất

**Sổ mừng cưới trước.** Lý do: nó đơn giản hơn, không có rủi ro sai sót nghiêm trọng, và có thứ để làm content ngay. Hồ sơ con cần dữ liệu lịch tiêm phải được xác minh trước khi ship (mục 4.2) — đó là công việc không lập trình, làm song song được nhưng không rút ngắn được.

---

## 1. Vì sao hai module này thuộc về sản phẩm này

Cả hai đều đi qua đúng bốn thứ đã có:

| | Sổ mừng cưới | Hồ sơ con |
|---|---|---|
| **Sự kiện** | mỗi lần đi phong bì gắn với một đám | mỗi mũi tiêm, mỗi lần khám là một mốc |
| **Tiền** | số tiền mừng chảy vào "sắp tới cần bao nhiêu" | học phí, viện phí, BHYT |
| **Giấy tờ** | — | khai sinh, sổ tiêm, BHYT, hồ sơ trường |
| **Việc** | "rút tiền mặt trước thứ 7" | "đặt lịch tiêm mũi 3" |

Nếu một module không nối được vào bốn thứ này thì nó không thuộc về app — đó là tiêu chí để từ chối mọi đề xuất mở rộng sau này.

---

## 2. Ràng buộc chung cho cả hai

**Không hiển thị dữ liệu người khác dưới dạng bảng xếp hạng.** Áp dụng cho cả họ hàng lẫn con.

**Không phán xét.** App ghi và nhắc. Nó không nói khoản mừng là ít hay nhiều, không nói con cao hay thấp, không so con với chuẩn nào.

**Mọi con số đều là số khai** — cùng quy tắc `formatDeclaredAt` ở `03 §8`.

**Hai module này nằm sau paywall ở phần chiều sâu, không ở phần cơ bản.** Ghi được và xem được luôn miễn phí; lịch sử nhiều năm và nhập hàng loạt bằng AI là phần trả phí.

---

## 3. Sổ hiếu hỉ

Trước gọi là "sổ mừng cưới". Tên cũ mô tả sai phạm vi: cưới chỉ là **một** trong tám dịp, và `gift_occasion` đã có đủ tám từ đầu. Cái sai không nằm ở dữ liệu mà ở khung nhìn phủ lên nó — mặc định `'wedding'`, mọi ví dụ trong tài liệu là đám cưới, mọi chuỗi UI nói "mừng cưới". Hệ quả: tân gia, đầy tháng, giỗ, tang lễ đều bị đối xử như trường hợp ngoại lệ của cưới, trong khi chúng là những dịp ngang hàng.

**Dịp là một trục, không phải một trường.** `occasion` không có giá trị mặc định — người nhập chọn, vì không có dịp nào là dịp mặc định.

### 3.1 Vấn đề thật

Không phải "ghi lại cho vui". Nỗi đau cụ thể:

> Nhà chú Ba mừng đám cưới mình 2 triệu năm 2023. Giờ con chú Ba cưới. Mình đi bao nhiêu?

Đi thiếu thì mất mặt, đi thừa thì tiếc, và **không ai nhớ nổi**. Hiện tại thông tin này nằm trong một quyển sổ giấy cất đâu đó, hoặc trong trí nhớ của mẹ.

Đây là nỗi đau nhọn, có hậu quả xã hội thật, gắn tiền, và tự nhiên có hai người. Chưa app nào ở VN làm.

Nhưng nỗi đau đó **không dừng ở đám cưới**. Cùng một câu hỏi xuất hiện ở tân gia, đầy tháng, giỗ, thôi nôi — và ở tang lễ nó xuất hiện dưới một dạng khác, xem 3.5.

### 3.2 Tiền mừng là nghĩa vụ, không phải nhật ký

Đây là chỗ thiết kế v2.1 sai, và sai theo hướng khó thấy.

Với người Việt, một khoản mừng nhận được **không phải là một sự kiện đã khép lại**. Nó mở ra một nghĩa vụ: nhà chú Ba mừng đám cưới mình, thì khi nhà chú Ba có việc, mình **phải** đi. Không đi là một thất bại xã hội thật, không phải một thiếu sót nhỏ.

Bản v2.1 mô hình hoá module này như một **sổ ghi chép** — hai chiều song song, không chiều nào tham chiếu chiều nào. Nó ghi lại được lịch sử nhưng **không biểu diễn được nghĩa vụ**, nên không trả lời được câu hỏi mà người dùng thật sự mang trong đầu: *nhà nào mình còn chưa đi lại?*

**Phân biệt hai thứ hay bị gộp làm một:**

| | Số dư nợ (CẤM) | Nghĩa vụ đáp lễ (ĐÚNG) |
|---|---|---|
| Gắn vào | cả mối quan hệ | một khoản nhận cụ thể |
| Hình dạng | một con số, luôn hiện | một trạng thái, biến mất khi xong |
| Cộng dồn | có | không |
| Câu app nói | "chú Ba hơn mình 500k" | "chú Ba mừng cưới mình 3/2023, chưa đáp lễ" |

Số dư là một bảng tỷ số của cả mối quan hệ, luôn bật, luôn quy ra tiền. Nghĩa vụ là một việc cụ thể chưa làm xong, và nó **hết** khi mình đi một đám ở nhà đó — không cần bằng tiền, không cần đủ tiền.

Lệnh cấm ở 3.4 giữ nguyên toàn bộ. Cái được thêm là **ghép cặp ở cấp từng khoản**, không phải phép trừ ở cấp mối quan hệ.

### 3.3 Mô hình dữ liệu

Cần một thực thể mới: **`contacts`** — người quen và họ hàng. Họ **không phải** `members`: không có tài khoản, không nhận thông báo, không thấy dữ liệu.

```
contact          họ hàng / bạn bè, tối giản
gift_entry       một lần đi hoặc nhận, gắn contact + event + số tiền + chiều
                 + reciprocates_id: khoản `received` mà khoản `given` này đáp lại
```

`gift_entry.direction`:
- `received` — nhà mình nhận (đám cưới mình, đầy tháng con mình, tang lễ)
- `given` — nhà mình đi

`gift_entry.reciprocates_id` — chỉ có ở khoản `given`, trỏ tới đúng **một** khoản `received` của **cùng contact**. Một khoản `received` được đáp bởi tối đa một khoản `given` (unique).

`gift_entry.no_reciprocity_needed` — chỉ có ở khoản `received`. Xem mục 3.4.

Từ hai cột đó suy ra **ba** trạng thái của mỗi khoản nhận, không phải hai:

| Trạng thái | Điều kiện |
|---|---|
| chưa đáp lễ | không có khoản `given` nào trỏ tới, và cờ chưa bật |
| đã đáp lễ | có một khoản `given` trỏ tới |
| không cần đáp lễ | `no_reciprocity_needed = true` |

**Ghép chéo dịp là hợp lệ.** Nghĩa vụ thuộc về **nhà**, không thuộc về dịp: chú Ba mừng cưới mình, mình đi tân gia nhà chú Ba — nghĩa vụ đó đã xong. Bắt phải cùng dịp thì gần như không nghĩa vụ nào được đóng, vì hai nhà hiếm khi có cùng loại việc.

Cố ý **không có** trong `contacts`: số điện thoại, địa chỉ, ảnh, ngày sinh, nhóm. Đây không phải app danh bạ. Chỉ có tên, quan hệ (một dòng chữ tự do: "chú ruột bên nội", "bạn cấp 3 của vợ"), và bên gia đình.

### 3.4 Tính năng lõi — vòng lặp duy nhất đáng làm

**Gợi ý khi tạo khoản mừng.** Đây là toàn bộ lý do module tồn tại:

```
Cưới con chú Ba — 12/11

Số tiền mừng          [              ]

  Chú Ba đã mừng nhà mình
  2.000.000 ₫ — cưới, 3/2023
  [ Dùng số này ]
```

Không có dòng gợi ý đó thì đây chỉ là một cái Excel có màu. Có nó thì app trả lời được câu hỏi mà không ai trả lời được.

**Gợi ý số chỉ khi CÙNG DỊP.** Khác dịp thì hiện dữ kiện, không hiện nút:

```
Tân gia nhà chú Ba — 12/11

Số tiền mừng          [              ]

  Chú Ba đã mừng nhà mình
  2.000.000 ₫ — cưới, 3/2023
  Chưa đáp lễ
                        ← không có [ Dùng số này ]
```

Lý do: mức tiền gắn với dịp, không gắn với nhà. Hai triệu ở đám cưới không dịch được sang mừng tân gia — đề xuất nó là app nói sai một cách tự tin, và người dùng có xu hướng tin con số app đưa ra hơn là tin cảm nhận của mình. Dữ kiện vẫn có giá trị (nhắc rằng nhà đó đã mừng mình, và mình chưa đáp lễ); chỉ có phép **dịch giữa hai dịp** là thứ app không được làm.

Đây là cùng một nguyên tắc với lệnh cấm nội suy và điều chỉnh lạm phát ở `03 §11.1`: app đưa dữ kiện, không đưa ý kiến về chuyện nên đi bao nhiêu.

**Nhắc nghĩa vụ — chỉ khi có dịp.** Khi một sự kiện gắn với contact có khoản chưa đáp lễ, app hiện nghĩa vụ đó ngay tại chỗ đang cần: trong form tạo khoản mừng, và ở chi tiết sự kiện.

App **không** nhắc theo định kỳ, **không** đẩy thông báo, **không** có màn hình "5 nhà bạn còn nợ". Không có dịp thì không làm gì được, và một lời nhắc không hành động được chỉ tạo áy náy. Danh sách chưa đáp lễ có tồn tại, nhưng là thứ người dùng **chủ động mở ra xem**, không phải thứ app đẩy vào mặt.

**Không có tổng nghĩa vụ.** Không "còn 5 nhà chưa đáp lễ, tổng 8 triệu". Một tổng như thế chính là số dư nợ mặc áo khác — xem bảng ở 3.2. Danh sách chưa đáp lễ liệt kê từng khoản, sắp theo ngày nhận, và **không có dòng tổng nào ở cuối**.

### 3.4b Có những khoản chỉ nhận, không cần trả

**Không phải khoản nhận nào cũng sinh nghĩa vụ.** Đây là chỗ dễ sai nhất của cả mục 3, vì "chưa có khoản đi nào ghép vào" trông y hệt "còn nợ" trong dữ liệu, mà ngoài đời là hai chuyện khác hẳn.

Bốn trường hợp có thật:

| Trường hợp | Vì sao không sinh nghĩa vụ |
|---|---|
| Bố mẹ mừng con | Cho, không phải trao đổi. Con không đáp lễ bố mẹ. |
| Người trên mừng người dưới | Nghĩa vụ hiếu hỉ **không đối xứng** theo vai vế |
| Người đã mất, bạn mất liên lạc | Nghĩa vụ không còn đối tượng |
| Đã đáp bằng cách khác | Giúp việc, quà, có mặt lúc cần — app không thấy được |

Vì vậy khoản `received` có cờ **`no_reciprocity_needed`**, mặc định `false`, người dùng tự bật ở từng khoản.

**App không bao giờ tự đoán.** Không suy từ `side`, không đọc `relation_note` để tìm chữ "bố mẹ", không suy từ số tiền. App không biết vai vế, không biết ai còn sống, không biết chuyện gì đã xảy ra giữa hai nhà — và đoán sai ở đây là xúc phạm, không phải bất tiện. Cờ này chỉ đổi khi người dùng chạm vào nó.

**Cờ ở từng khoản, không ở contact.** Cùng một người có thể vừa sinh nghĩa vụ vừa không: bố mẹ mừng đám cưới mình 20 triệu là cho, nhưng bố mẹ mừng tân gia thì có đi có lại. Đặt cờ ở `contacts` sẽ bắt người dùng chọn một lần cho tất cả, và họ sẽ chọn sai.

**Vì sao thiếu cờ này thì tính năng hỏng:** danh sách chưa đáp lễ dần đầy những dòng **không bao giờ đóng được**. Khoản bố mẹ mừng cưới sẽ nằm đó vĩnh viễn. Một danh sách nghĩa vụ mà người dùng không xoá được sinh ra đúng thứ áy náy mà 3.4 tránh — và tệ hơn không có danh sách nào, vì nó dạy người dùng bỏ qua cả mục.

Khoản đã tắt cờ hiện trạng thái *"không cần đáp lễ"* trong lịch sử — không ẩn đi. Nó vẫn là một khoản đã nhận, vẫn hiện trong sổ, vẫn tính vào tổng của đám. Chỉ có nghĩa vụ là không có.

Bật lại được bất cứ lúc nào: đây là một ghi chú của người dùng, không phải một quyết định một chiều.

**Nhập hàng loạt.** Ngày cưới nhận 100 phong bì. Cần chế độ nhập nhanh: tên + số tiền, Enter, lặp lại, bàn phím không tắt. Không hỏi gì thêm.

Kèm luồng AI: **chụp ảnh trang sổ ghi tay → parse thành danh sách tên + tiền → xác nhận từng dòng.** Đây là chỗ AI capture (`06 §6`) có giá trị rõ nhất trong toàn app, vì thay thế đúng 30 phút gõ tay.

**Tổng của một đám.** Sau đám cưới mình: tổng nhận được bao nhiêu, bao nhiêu nhà. Con số này người dùng thật sự muốn biết.

### 3.5 Tang lễ không giống bảy dịp còn lại

`funeral` được **ghi** và **hiện trong lịch sử** như mọi dịp khác — biết nhà nào đã đến là thông tin thật và cần thiết.

Nhưng nó **không bao giờ** xuất hiện trong hai chỗ:

- **Không gợi ý số tiền.** Không có nút `[ Dùng số này ]` khi dịp đang nhập là tang lễ, và một khoản phúng viếng nhận được không bao giờ làm căn cứ gợi ý cho dịp khác.
- **Không vào danh sách chưa đáp lễ.** Một khoản phúng viếng nhận được không tạo ra nghĩa vụ đang chờ.

Lý do: đáp lễ một đám tang nghĩa là chờ nhà đó có tang. App gợi ý điều đó — dù chỉ bằng cách xếp một dòng vào mục "chưa đáp lễ" — là nói ra một thứ không ai được phép nói ra. Nghĩa vụ có tồn tại trong đời thật, nhưng nó **không phải thứ app được nhắc**.

Đây là ngoại lệ theo dịp, không phải theo chiều: nhà mình **đi** phúng viếng vẫn ghi bình thường, và vẫn đáp lễ được cho một khoản nhận trước đó ở dịp khác.

### 3.6 Ranh giới

**Không sắp xếp theo số tiền làm mặc định.** Mặc định theo ngày. Sắp theo tiền là tuỳ chọn, và không bao giờ có nhãn kiểu "mừng nhiều nhất" hay "ít nhất". Xếp hạng họ hàng theo độ hào phóng là thứ khiến người dùng thấy app bẩn.

**Không tính "còn nợ ai bao nhiêu".** Không có cột chênh lệch, không có "nhà này mình đi ít hơn 500k", không có tổng nghĩa vụ đang chờ. Cám dỗ rất lớn vì dữ liệu có sẵn, nhưng nó biến quan hệ họ hàng thành sổ nợ.

Ranh giới chính xác — hai thứ này **rất dễ nhầm là một**:

| Được | Cấm |
|---|---|
| "Chú Ba mừng cưới mình 3/2023 — chưa đáp lễ" | "Chú Ba: còn 500k" |
| Trạng thái của **một khoản** | Số dư của **một mối quan hệ** |
| Biến mất khi mình đi một đám nhà đó | Luôn hiện, cập nhật sau mỗi khoản |
| Liệt kê từng khoản chưa đáp | Tổng số tiền còn nợ |
| Sắp theo **ngày nhận** | Sắp theo **số tiền còn thiếu** |

Phép thử: nếu bỏ hết số tiền đi mà thông tin vẫn còn nguyên giá trị thì đó là nghĩa vụ; nếu bỏ số tiền đi mà nó thành vô nghĩa thì đó là số dư nợ.

**Đáp lễ không cần bằng tiền.** Ghép một khoản `given` vào khoản `received` là xong nghĩa vụ, bất kể số tiền hai bên. App không bao giờ nói "đi chưa đủ" hay hiện phần chênh — người đi ít hơn thường có lý do mà app không biết.

**Không chia sẻ ra ngoài household.** Không xuất, không share ảnh, không link. Dữ liệu này lộ ra là một sự cố xã hội thật.

**Nếu phải cắt scope:** giữ `contacts` + `gift_entry` + `reciprocates_id` + gợi ý ở 3.4. Cắt nhập hàng loạt bằng AI (nhập tay vẫn dùng được), cắt tổng của một đám. **Không cắt `reciprocates_id`** — không có nó thì module quay về đúng trạng thái sổ ghi chép mà mục 3.2 nói là sai.

---

## 4. Hồ sơ con

### 4.1 Vấn đề thật

Nhóm dữ liệu duy nhất trong cả app có **tần suất cao và cảm xúc cao cùng lúc** trong ba năm đầu. Và khác mọi module khác: **lịch tiêm không chờ ai cả.** Quên một mũi là hậu quả thật, không phải bất tiện.

Đây cũng là thứ hiện đang nằm trong một quyển sổ tiêm giấy mà chỉ mẹ biết chỗ — đúng mẫu vấn đề trung tâm của sản phẩm.

### 4.2 Lịch tiêm — phần cần cẩn thận nhất của cả app

**Không được viết lịch tiêm từ trí nhớ, kể cả từ trí nhớ của lập trình viên hay của AI.** Sai một mũi hoặc sai một mốc tuổi là gây hại thật.

Yêu cầu bắt buộc:

- Lịch nằm trong một **file dữ liệu có phiên bản**, không hardcode trong code.
- Nguồn phải là văn bản chính thức (Chương trình Tiêm chủng mở rộng, Bộ Y tế). Ghi rõ nguồn và ngày ban hành trong file.
- **Một người có chuyên môn y tế đọc và xác nhận trước khi ship.** Đây là điều kiện chặn phát hành, không phải việc nên làm.
- Trong app luôn có một dòng: *"Lịch tham khảo theo Chương trình TCMR. Hãy xác nhận với cơ sở tiêm chủng."*
- App **không bao giờ** gợi ý hoãn, bỏ, hay đổi thứ tự mũi tiêm. Không có tính năng "đánh dấu không tiêm mũi này".
- Mũi đã trễ: hiện là *"quá lịch"*, kèm gợi ý liên hệ cơ sở tiêm. Không dùng chữ mang tính trách móc.

Sinh lịch: từ `birthday` của member role `child`, sinh sẵn các mốc. Đây là nguồn mật độ dữ liệu lớn nhất trong toàn app — một hộ mới có con sẽ có ngay hàng chục mốc thật, không phải dữ liệu mẫu.

### 4.3 Chiều cao cân nặng

Ghi và vẽ. **Không diễn giải.**

Không phần trăm bách phân vị, không "so với chuẩn WHO", không màu xanh đỏ, không cảnh báo. Lý do: bố mẹ mới rất dễ lo lắng, và một nhãn đỏ do app tự tính sẽ gây hoảng mà không giúp được gì. Việc đánh giá thuộc về bác sĩ.

Nếu sau này có nhu cầu thật về đường chuẩn, đó là quyết định cần người có chuyên môn tham gia, không phải một PR thêm thư viện.

### 4.4 Phần còn lại

| Nhóm | Nối vào đâu |
|---|---|
| Lần khám bệnh | sự kiện + việc + tài liệu |
| Học phí, học thêm | `upcoming_payments` → màn hình Sắp tới |
| BHYT, khai sinh, hồ sơ trường | `documents`, `owner_member_id` = con |
| Lịch học, họp phụ huynh | sự kiện lặp |

Không tạo cấu trúc mới cho những thứ này. Chúng là dữ liệu đã có, chỉ được lọc theo con.

### 4.5 Màn hình

Một màn hình cho mỗi con, vào từ tab Giấy tờ hoặc từ Nhà mình khi có mốc gần.

```
Bé An · 14 tháng

SẮP TỚI
◆ Sởi - Rubella (MR)      mũi 1     còn 9 ngày
◆ Khám định kỳ 15 tháng             25/9

ĐÃ TIÊM                                12 mũi ›
CHIỀU CAO · CÂN NẶNG                        ›
GIẤY TỜ                              4 mục ›
```

Mốc tiêm sắp tới cũng xuất hiện ở `CẦN CHÚ Ý` trên màn hình Nhà mình — nhắc trước 7 ngày.

### 4.6 Ranh giới

**Không theo dõi sức khỏe chuyên sâu.** Không ghi triệu chứng, không ghi thuốc, không ghi liều. `16 §Chưa cần` của tài liệu sản phẩm vẫn giữ nguyên.

**Không lời khuyên y tế.** App không giải thích vaccine là gì, không trả lời câu hỏi sức khỏe, không có nội dung tư vấn.

**Không so sánh giữa các con.** Nếu nhà có hai con, không bao giờ đặt cạnh nhau để đối chiếu.

**Nếu phải cắt scope:** giữ lịch tiêm + giấy tờ của con. Cắt chiều cao cân nặng và lần khám bệnh — hai thứ đó nice-to-have, lịch tiêm thì không.

---

## 5. Ảnh hưởng tới các tài liệu khác

| Tài liệu | Thay đổi |
|---|---|
| `02` | thêm type `Contact`, `GiftEntry`, `ChildProfile`, `VaccineDose`, `GrowthRecord`; thêm `ContactRepo`, `GiftRepo`, `ChildRepo` |
| `03` | thêm `suggestGiftAmount()`, `buildVaccineSchedule()`; bổ sung §9 danh sách cấm |
| `05` | thêm route `gifts/`, `child/[memberId]/`; thêm F12, F13 |
| `06 §12` | mục 2 đã chốt |
| schema | migration `2026-08-02-local-modules.sql` |

### Bổ sung ở lần sửa 2026-08-02 (đổi tên module + nghĩa vụ đáp lễ)

| Tài liệu | Thay đổi |
|---|---|
| `02` | `GiftEntry.reciprocatesId`; type `OutstandingObligation`; `GiftRepository.listOutstanding()` + `linkReciprocity()` |
| `03 §11.1` | `suggestGiftAmount()` nhận thêm dịp đang nhập, trả `canSuggestAmount`; thêm `listOutstandingObligations()`; §9 thêm bốn hàm cấm |
| `05` | route `gifts/` đổi nhãn sang "Hiếu hỉ"; thêm mục chưa đáp lễ |
| schema | migration `0006_gift_reciprocity.sql` — `reciprocates_id`, bỏ default `'wedding'`, view `gift_outstanding` |

### Bổ sung cho `03 §9` — danh sách hàm cấm viết

| Hàm | Vì sao cấm |
|---|---|
| Chênh lệch đi/nhận theo từng contact | Biến quan hệ họ hàng thành sổ nợ |
| Tổng số tiền các khoản chưa đáp lễ | Số dư nợ mặc áo khác — xem 3.2 |
| Xếp danh sách chưa đáp lễ theo số tiền | Như trên; sắp theo ngày nhận |
| Gợi ý số tiền khi dịp nhận ≠ dịp đang đi | App dịch mức tiền giữa hai dịp — 3.4 |
| Bất kỳ gợi ý số nào cho dịp `funeral` | Chờ nhà đó có tang để trả nợ — 3.5 |
| Xếp hạng contact theo số tiền | Xếp hạng họ hàng theo độ hào phóng |
| Bách phân vị / đánh giá tăng trưởng của con | Chẩn đoán y tế, không thuộc về app |
| So sánh giữa các con trong nhà | Như trên, và tệ hơn về mặt cảm xúc |
| Bất kỳ gợi ý nào về hoãn hoặc bỏ mũi tiêm | Gây hại thật |

---

## 6. Vẫn còn treo

`06 §12` mục 1 chưa chốt: **phân khúc ở riêng hay ở chung bố mẹ.**

Việc chọn cả hai module này làm nghiêng cán cân: hồ sơ con phục vụ cặp mới có con, mà nhóm này ở VN có tỷ lệ sống chung ông bà rất cao. Nếu đó là phân khúc chính thì module việc nhà nên bị hạ trọng số, và ranh giới tài chính với bố mẹ hai bên nên được nâng lên.

Đây là quyết định cần chốt trước khi dựng tuần 3.
