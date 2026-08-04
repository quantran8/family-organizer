# App gia đình cho vợ chồng trẻ — Concept v3

> **Bản đã hợp nhất quyết định triển khai.** Giữ nguyên cấu trúc 20 mục của concept
> v3 gốc, nhưng **năm đề xuất bị bác** được đánh dấu ngay tại chỗ kèm lý do, và các
> câu treo ở mục 20 đã đóng.
>
> Đọc file này để biết **sản phẩm là gì**. Đọc `spec/` để biết **nó được dựng thế
> nào**. Khi hai bên vênh nhau thì `spec/` đúng — nó là thứ được code và test.
>
> Lịch sử vì sao v3 vênh với v2: `spec/10-delta-v3.md`.

---

## 1. Tóm tắt sản phẩm

Sản phẩm là một không gian chung giúp vợ chồng trẻ cùng nắm những điều quan trọng của gia đình:

- Nhà mình sắp có sự kiện gì?
- Hôm nay hoặc tuần này ai làm việc gì?
- Sắp tới cần chuẩn bị bao nhiêu tiền?
- Tài sản chung và quỹ chung hiện có bao nhiêu, những khoản nào đã và sắp ảnh hưởng tới nó?
- Giấy tờ quan trọng nằm ở đâu và khi nào hết hạn?

App không thay thế việc hai người nói chuyện. Nó lưu lại kết quả của những cuộc trao đổi đó, và làm cho một câu duy nhất luôn đúng.

### Câu hỏi trung tâm

> **Nhà mình sắp có gì, và cần chuẩn bị bao nhiêu?**

Mọi module trong sản phẩm tồn tại để làm câu này chính xác hơn. Tính năng nào không phục vụ nó thì không thuộc về MVP.

### Một câu định vị

> App giúp vợ chồng cùng nhìn thấy những gì sắp tới — sự kiện hai bên, việc nhà, tiền cần chuẩn bị và giấy tờ sắp hết hạn — trong cùng một bức tranh.

---

## 2. Bối cảnh

Vợ chồng trẻ có nhiều loại thông tin phải cùng nắm: việc nhà định kỳ, giỗ và cưới hỏi hai bên, sự kiện của con, các khoản tiền vừa và lớn, tình hình tài sản chung, giấy tờ và hợp đồng, những điều đã nói nhưng dễ quên.

Hiện tại chúng nằm rải rác trong trí nhớ từng người, Zalo, lịch điện thoại, ghi chú, Google Sheet, email, Drive, và ngăn kéo giấy tờ trong nhà.

Mỗi công cụ giải quyết được một phần. Chưa có nơi nào ghép chúng lại để hai người nhìn thấy **những gì đang tới**.

---

## 3. Người dùng mục tiêu

- Gen Z và Millennials trẻ, khoảng 24–35 tuổi.
- Mới kết hôn, mới sống chung, hoặc mới có con đầu lòng.
- Cả hai đi làm, quen dùng smartphone, quen trả phí cho app tốt.
- Đang dùng chat, lịch, ghi chú hoặc Sheet để phối hợp.
- Muốn minh bạch và phối hợp tốt hơn nhưng không muốn công cụ phức tạp.

### Minh bạch nghĩa là gì trong sản phẩm này

Nhóm người dùng này nói rất nhiều về "minh bạch", nhưng từ đó có hai nghĩa rất khác nhau:

- **Minh bạch nhìn về quá khứ**: ghi chép đầy đủ, đối chiếu được, biết ai đã đóng bao nhiêu và ai còn thiếu.
- **Minh bạch nhìn về phía trước**: cả hai cùng thấy trước cái gì đang tới và cần chuẩn bị bao nhiêu.

Sản phẩm này chọn nghĩa thứ hai, và chọn có ý thức. Nghĩa thứ nhất đòi hỏi dữ liệu phải đủ 100% mới trung thực — điều không cặp nào duy trì quá vài tuần — và sản phẩm của nó luôn là một bảng đối chiếu, tức là một thứ dùng được lúc cãi nhau.

> Đây là **nền lý luận của toàn bộ danh sách hàm cấm viết** ở `spec/03 §9`. Mỗi lệnh
> cấm ở đó đều là một hệ quả của lựa chọn này.

### Household chỉ gồm hai người lớn

Ông bà và người giúp việc **không** là user của app. Ông bà không quen công nghệ và không thể bắt họ dùng; người giúp việc không thuộc gia đình. Household = 2 người lớn + con nhỏ (con là đối tượng được ghi nhận, không phải user).

Hệ quả thiết kế: không cần phân quyền, không cần vai trò, không cần UI chọn người phức tạp. Chỉ có "anh", "em", và "nhà mình".

### Phân khúc — **ĐÃ CHỐT: cặp ở riêng**

Cặp **ở riêng** và cặp **ở chung bố mẹ** có nhu cầu khác nhau rõ rệt: ở chung thì việc nhà bớt quan trọng, còn ranh giới tài chính lại quan trọng hơn hẳn.

**Chốt: ở riêng**, vì cả năm module đều hoạt động đầy đủ với nhóm này. Hệ quả:

- Module việc nhà **không** bị hạ trọng số.
- Ranh giới tài chính với bố mẹ hai bên **không** được nâng lên — đó là kịch bản của phân khúc kia.
- Quỹ chung (§7.6) hợp với phân khúc này: cặp ở riêng có tiền nhà, ăn uống, điện nước để gộp.

**App chỉ phục vụ được nhóm cả hai đều muốn minh bạch nhưng lười.** Người không muốn cho vợ/chồng biết sẽ đơn giản là không ghi — công cụ không giải được vấn đề đó.

---

## 4. Vấn đề cốt lõi

Vấn đề không phải là hai người không trao đổi. Vấn đề là sau khi trao đổi:

- Thông tin trôi trong tin nhắn.
- Việc định kỳ bị quên, và một người phải liên tục nhắc.
- Các khoản vừa và lớn không nằm chung bức tranh với sự kiện sắp tới.
- Không ai nhìn được tổng số tiền cần chuẩn bị cho vài tháng tới.
- Giấy tờ chỉ một người biết chỗ, và không rõ cái nào sắp hết hạn.

Mẫu chung:

> **Thông tin quan trọng của gia đình nằm rải rác, nên không ai nhìn được toàn cảnh những gì sắp tới.**

---

## 5. Định vị sản phẩm

### Không phải

- Không phải app chat.
- Không phải công cụ quản lý dự án.
- Không phải app ghi thu chi từng giao dịch.
- **Không trả lời câu hỏi "tiền đi đâu hết rồi"** — mô hình dữ liệu của sản phẩm không cho phép trả lời câu đó một cách trung thực, nên không hứa.
- **Không theo dõi quan hệ nợ giữa hai người.** App ghi ai đã nạp bao nhiêu vào quỹ chung trong tháng, nhưng không cộng dồn thành một số dư nợ và không kết luận ai còn thiếu. Xem §7.6.
- **Không phải bảng so sánh giữa hai bên nội ngoại.** Xem §7.5.
- Không phải hệ thống phê duyệt giữa vợ và chồng.
- Không phải bảng điểm so sánh ai làm nhiều việc hơn.
- Không phải cloud drive, password manager hay két sắt số.

### Là gì

- Là bảng chung nhẹ nhàng của gia đình.
- Là nơi hai người cùng nhìn thấy những gì sắp tới và cần chuẩn bị bao nhiêu.
- Là cầu nối giữa sự kiện, việc cần làm, khoản tiền và giấy tờ.
- Là trí nhớ dài hạn của hộ gia đình — năm nay biết năm ngoái đã làm gì.

---

## 6. Cấu trúc sản phẩm

Năm nhóm thông tin:

1. Việc nhà
2. Danh sách mua sắm chung
3. Sự kiện gia đình
4. Tài sản, quỹ chung và các khoản tiền
5. Tài liệu và giấy tờ

Các nhóm liên kết theo ngữ cảnh thực tế:

> **Đăng kiểm xe — 20/11**
> Việc: đặt lịch đăng kiểm
> Tiền cần chuẩn bị: 2 triệu
> Giấy tờ: đăng ký xe, bảo hiểm xe

---

## 7. Các module

### 7.1. Màn hình "Nhà mình"

Hai tầng, không hơn.

**Tầng 1 — Hôm nay**
- Việc cần làm hôm nay (gồm cả việc định kỳ).
- Sự kiện trong ngày.
- Đồ cần mua nếu có ai vừa thêm.

**Tầng 2 — Sắp tới**
- Tổng tiền cần chuẩn bị (xem §7.2).
- Sự kiện trong 2–4 tuần.
- Giấy tờ sắp hết hạn.

Không biểu đồ, không báo cáo, không thống kê theo người.

**Vì sao không dùng bảng mục tiêu tiết kiệm làm màn hình chính:** tiến độ một quỹ mua nhà nhích 1–2% mỗi tháng. Màn hình chính phải là thứ đổi mỗi ngày, nếu không user sẽ không mở app. Mục tiêu chung vẫn có mặt, nhưng ở dạng một khối trong §7.2.

---

### 7.2. "Sắp tới nhà mình cần bao nhiêu" — trái tim sản phẩm

Đây là màn hình đáng trả tiền nhất, vì nó là thứ duy nhất mà Zalo, Calendar, Sheet và Drive cộng lại vẫn không làm được. Nó cần đồng thời bốn nguồn dữ liệu: tài sản + sự kiện + chi phí dự kiến + hạn giấy tờ.

```
BA THÁNG TỚI: 32 TRIỆU
theo những khoản nhà mình đã ghi

Học phí con         25tr    tháng 9
Đăng kiểm xe         2tr    20/11
Giỗ ông ngoại        3tr    15/8 âm
Cưới em Hằng         2tr    tháng 10

Tài sản dùng ngay   45tr
Anh cập nhật 2 tuần trước
Còn lại dự kiến     13tr
─────────────────────────────
MỤC TIÊU — CÓ THỂ HOÃN
Góp quỹ du lịch      5tr
```

Nguyên tắc bắt buộc:

- **Chỉ nhìn về phía trước.** Không có phép tính nào cần giả định "đã ghi đủ", vì giả định đó không đúng.
- **Luôn ghi rõ nguồn**: "theo những khoản nhà mình đã ghi". Đây là một dự tính, không phải một báo cáo, và phải nói đúng như vậy.
- **Số dư luôn kèm nhãn thời gian và người cập nhật.**
- **Phân biệt khoản bắt buộc và khoản tự nguyện.** Học phí là nghĩa vụ; góp quỹ du lịch là mục tiêu.

#### Cùng màn hình không phải cùng một con số

Khối «Mục tiêu — có thể hoãn» nằm **dưới** khối đối chiếu, và **không nằm trong bất kỳ phép cộng nào**: không vào con số hero, không vào tổng tháng, không vào "Còn lại", không vào câu "Thiếu khoảng".

Vì sao vẫn để cùng màn hình: hai người cần thấy tháng 9 đóng học phí xong thì quỹ du lịch phải chậm lại. Nhưng trộn nghĩa vụ với nguyện vọng vào **một con số** làm con số đó mất nghĩa, và làm màn hình hero đáng sợ mà không có lý do.

> Cơ chế: `upcoming_needs` có cột `kind` (`mandatory` | `optional`);
> `projectRunway` chỉ cộng `mandatory`. Chi tiết ở `spec/10 §5`.

---

### 7.3. Việc nhà

Chia thành **hai danh sách tách biệt**, vì hai loại việc này có bản chất khác hẳn nhau và ép chung một mô hình thì hỏng cả hai.

#### Nhóm 1 — Việc định kỳ

Việc lặp lại, có giờ, không hoãn được: rửa bát, đổ rác, nấu cơm, tưới cây.

Ghi nhanh: việc, tần suất (hằng ngày / hằng tuần / tùy chỉnh), giờ nhắc, ghi chú.

**Hai chế độ người phụ trách:**

| Chế độ | Dùng khi |
| --- | --- |
| Không gán | Việc của nhà, ai rảnh làm |
| Cố định | Hai người đã tự phân từ đầu (anh đổ rác, em tưới cây) |

**Đổi người tự do.** Chạm chip là xoay vòng sang người kia — ai cũng đổi được, bất cứ lúc nào, một thao tác, không cần hỏi, không thông báo trang trọng. App không đếm số lần đổi và không bao giờ hiện "tháng này anh đã nhờ đổi 5 lần". Chính quyền sửa tự do này khiến cái tên là một **thoả thuận** chứ không phải một **mệnh lệnh**.

**Việc định kỳ không hoãn được.** Không có cử chỉ vuốt-để-hoãn ở danh sách này: hạn của việc lặp là **mốc neo**, không phải một lần xảy ra — lùi nó một ngày là dời cả chuỗi, trong khi người dùng tưởng mình chỉ hoãn hôm nay.

> #### ~~Luân phiên tự động~~ — **ĐÃ BÁC, không làm**
>
> v3 gốc đề xuất chế độ thứ ba: app tự xoay tên theo lịch. Lập luận cho nó khá
> mạnh — cái tên đến từ *quy tắc hai người đã chốt trước*, không phải do người kia
> gán từng lần, nên không ai đang sai bảo ai.
>
> **Vẫn không làm.** Lý do không phải lập luận đó sai, mà là cái giá không tương xứng:
> nó cần bốn thứ mới cùng lúc (`assignee_mode`, `rotation_order`,
> `rotation_anchor_date`, và `assignee_id` ở từng lần xảy ra), trong khi thứ nó
> thay thế — chip xoay vòng — đã chạy. Và một tính năng phải cẩn thận đến mức
> **không được lấy lịch sử hoàn thành làm đầu vào** (nếu bỏ lượt mà làm đổi lượt kế
> tiếp thì app đang ghi điểm) thì nên có bằng chứng người dùng cần nó trước đã.
>
> Điều kiện mở lại: thấy người dùng thật đang chạm chip xoay vòng theo một nhịp đều
> đặn, tức là họ đang tự luân phiên bằng tay. Lý do đầy đủ: `spec/10 §2.2`.

#### Nhóm 2 — Việc linh hoạt

Việc phát sinh, không gấp, ai làm cũng được: lau quạt trần, gọi thợ sửa ống nước, sắp lại tủ giày, đặt vé máy bay.

Một checklist phẳng chung. Cả hai cùng thêm. **Mặc định không có tên.** Ai rảnh thì tự nhận, hoặc làm xong tick luôn.

**Không giao việc trực tiếp cho người kia trong danh sách này.** Đây là ranh giới giữ cho nó là một danh sách việc của nhà, chứ không phải hộp thư nhiệm vụ mà một người gửi cho người kia. Muốn nhận việc thì chỉ có nấc "Mình làm".

Vuốt để hoãn thì **có** ở đây — ngược với danh sách định kỳ: việc một lần có một cái hạn thật.

#### Trạng thái

Hai trạng thái: chưa làm / đã làm. Không có "chờ duyệt", "đang xem xét", "đã thống nhất". Không có bước xác nhận — việc đã tồn tại thì nó cần được hoàn thành.

#### Ba đường ranh không được vượt

Rủi ro không nằm ở lúc gán tên, mà ở trạng thái "chưa làm" kéo dài có tên người bên cạnh — lúc đó app thành bằng chứng.

1. **App nhắc người làm, không báo cáo cho người kia.** Nhắc người có tên bao nhiêu lần cũng được — đó chính là giá trị: người kia khỏi phải nhắc. Nhưng không bao giờ gửi thông báo cho vợ rằng chồng chưa làm.
2. **Không có thống kê theo người.** Không "tuần này anh xong 4/7". Vĩnh viễn.
3. **Việc tồn đọng gom lại, không xếp theo tên.** "Nhà mình còn 3 việc chưa xong", không phải hai cột trong đó một cột dài hơn hẳn.

**Không có:** hệ thống điểm, sao thưởng, phiếu đổi thưởng, bảng xếp hạng, streak, mọi yếu tố game hóa. Game hóa biến việc nhà thành cuộc thi có người thắng người thua trong cùng một nhà.

---

### 7.4. Danh sách mua sắm chung

Bề mặt duy nhất trong sản phẩm có tần suất **hằng ngày** và **tự nhiên hai chiều** — cả hai cùng thêm, cả hai cùng dùng, không ai nhắc ai. Thêm "nước mắm" vào list khác hoàn toàn với giao "đi mua nước mắm".

Đây là lý do app được mở trong siêu thị, thay vì chỉ được mở khi có giỗ. Với một sản phẩm mà mọi module còn lại đều tần suất thấp, đây là thứ giữ icon app khỏi trôi khỏi màn hình chính.

Giữ cực đơn giản: một list phẳng, tick, tự dọn sau khi mua. Không phân loại, không cửa hàng, không giá.

---

### 7.5. Sự kiện gia đình

Lưu các dịp quan trọng của cả hai bên và của con: giỗ, cưới, sinh nhật, lễ Tết, khám bệnh, chuyến đi, sự kiện của con.

Một sự kiện gồm: tên, ngày (âm hoặc dương), **thẻ**, địa điểm, việc cần chuẩn bị, chi phí dự kiến, tài liệu liên quan, ghi chú.

#### Thẻ sự kiện

- **Nhà chồng / Nhà vợ / Cả hai / Nhà mình** — để lọc và để lên kế hoạch.
- **Của con** — mỗi con một màu nếu có nhiều con. Lịch tiêm chủng, họp phụ huynh, thi học kỳ, sinh nhật bạn cùng lớp, lịch học bơi/vẽ/đàn.

Hỗ trợ lặp hằng năm theo âm lịch — bắt buộc với giỗ và sinh nhật.

> #### ~~Trục "bên nội / bên ngoại"~~ — **ĐÃ BÁC, dùng "nhà chồng / nhà vợ"**
>
> v3 gốc dùng chữ "Bên nội / Bên ngoại". Hai trục đó **không phải cùng một trục**:
> với một cặp vợ chồng, "nhà nội" là nhà chồng — nhưng **"bên nội của vợ" cũng tồn
> tại và không có chỗ nào để đặt**.
>
> Chọn trục nội/ngoại là chọn một hệ quy chiếu mà một phần dữ liệu thật không biểu
> diễn được. Giữ **nhà chồng / nhà vợ** — đó là thứ người dùng thật sự nghĩ khi xếp
> lịch. Lý do đầy đủ: `spec/06 §0.1` và `spec/10 §4`.

#### Nhắc kép

Mọi sự kiện đặt được **hai mốc nhắc**: nhắc trước giờ diễn ra, và nhắc **chuẩn bị** từ 1–3 ngày trước.

> Thứ 7 con đi sinh nhật bạn Bin → nhắc "chuẩn bị cho sinh nhật bạn Bin" vào thứ 5.

Đây là chi tiết nhỏ nhưng đúng chỗ đau: phần lớn sự cố gia đình không phải quên sự kiện, mà là **nhớ sự kiện nhưng quên phần chuẩn bị cho nó**.

**Nhắc chuẩn bị sinh một việc trong danh sách linh hoạt**, không bắn thêm một thông báo nữa về cùng một sự kiện. Thông báo thứ hai là phiền; một dòng việc trong danh sách thì hữu ích, và gắn được với chi phí dự kiến ở §7.2.

#### Không đếm, không so sánh hai bên

Thẻ nhà chồng/nhà vợ dùng để **lọc và lên kế hoạch** — thấy tháng sau dồn về một bên thì thu xếp trước. App **không** đếm số sự kiện mỗi bên và không hiện bảng so sánh tần suất.

Lý do không phải là né tránh, mà là con số đó không đo cái người ta tưởng nó đo. Số sự kiện mỗi bên do số họ hàng, số đám giỗ, số đám cưới quyết định — không bên nào chọn được. Một bảng "quý này: nhà chồng 5, nhà vợ 2" không kết thúc tranh cãi, nó bắt đầu tranh cãi, và bắt đầu ở thế một người đúng một người sai về một chuyện không ai gây ra. Xem nguyên tắc §10.9.

#### Vai trò của app trong chuỗi

Sự kiện họ hàng được điều phối trong nhóm Zalo họ hàng, không phải trong app. App nằm ở **hạ nguồn**: nó không phải nơi bàn bạc, nó là nơi hai vợ chồng biết sắp có gì và cần chuẩn bị gì. Vì vậy tốc độ đưa thông tin từ Zalo vào app là yếu tố sống còn — xem §7.8.

**Không đồng bộ lịch cá nhân.** Lịch họp công ty, lịch gym, nhắc nhở đối tác nằm ở app khác. Module này chỉ chứa những gì cần cả hai cùng biết.

Lịch âm là tính năng kèm theo, miễn phí, không phải lý do trả tiền. Thị trường đã có nhiều app nhắc giỗ miễn phí; khác biệt duy nhất của ta là **dùng chung giữa hai người và gắn với tiền cần chuẩn bị**.

---

### 7.6. Tài sản, quỹ chung và các khoản tiền

Đây là module quyết định việc user có trả tiền hay không.

#### Mô hình: bảng cân đối, không phải sổ thu chi

Hai người cùng biết **tài sản chung và quỹ chung hiện có bao nhiêu**, và **những khoản nào đã và sắp ảnh hưởng tới nó**.

Không theo dõi giao dịch nhỏ: ăn uống, cà phê, xăng, đi chợ. Không cần open banking, không đọc email, không import CSV, không OCR sao kê.

#### Quỹ chung — một số duy nhất

Cặp ở riêng thường có một quỹ chung cho tiền nhà, ăn uống, điện nước. Đây là dữ liệu đáng theo dõi vì tần suất nhập cực thấp: 2–4 lần một tháng, không phải 200.

App ghi: **số dư quỹ + nhãn thời gian**, và các khoản nạp/rút với **số tiền, mục đích, và người nạp**.

**Có ghi tên người nạp.** Hai lý do:

1. Hai người vốn đã biết thu nhập của nhau và đã tự chốt tỷ lệ góp từ trước. App không phát hiện ra điều gì mới; nó chỉ trả lời một câu rất thực tế: *"tháng này em chuyển chưa?"* Không có tên thì câu đó không trả lời được.
2. Nạp quỹ là chuyển khoản rời rạc, 2–4 lần một tháng, đối chiếu được với sao kê. Không ai quên mình vừa chuyển 10 triệu. Đây là khác biệt căn bản với chi tiêu vặt — thứ dễ ghi thiếu và vì thế không nên gán tên.

**Rút thì không hỏi ai rút.** Tiền đã vào quỹ là tiền chung, và ghi tên người rút là mở đúng cánh cửa vừa đóng ở trên.

#### Ranh giới: theo tháng, không cộng dồn

Ghi lại sự việc thì được. Kết luận thì không.

**Có:**
- Danh sách nạp trong tháng: ai, bao nhiêu, ngày nào, cho mục đích gì.
- Tổng theo người **trong tháng đó**, kèm số lần, sắp theo tên ABC.

**Không:**
- Số dư nợ cộng dồn qua các tháng.
- Phép tính "em còn thiếu 1.2tr".
- Tỷ lệ % so với một mức chuẩn nào đó, hay bất kỳ dấu hiệu "chưa đạt".
- Xếp người đóng góp theo số tiền.

**Phép thử khi review:**

> **Con số này có vắt qua nhiều hơn một tháng không? Có → cấm.**

Lý do chỉ giữ theo tháng: câu hỏi thật của hai người là "tháng này chuyển chưa" — câu đó **đóng lại vào cuối tháng** và không để lại gì. Một con số cộng dồn thì không bao giờ đóng. Nó chỉ lớn dần, giữa vợ chồng không có cơ chế tất toán nào để xóa nó, và đến lúc nào đó nó sẽ được đem ra dùng. Đó là khác biệt giữa một cuốn sổ và một bản cáo trạng.

Đây cũng là chỗ mô hình Splitwise không hợp: Splitwise giả định có quan hệ nợ **và** có ngày tất toán. Vợ chồng không có cả hai.

> Đây là **ngoại lệ có điều kiện duy nhất** của lệnh cấm "tổng tiền theo người".
> Ranh giới được ép ở **bốn tầng độc lập** (view · repository · hàm domain · prop
> component) chứ không dựa vào kỷ luật review. Chi tiết: `spec/03 §9` ngoại lệ 2.

#### Ba tình huống app phải im lặng

1. **Một người góp ít hơn tỷ lệ đã chốt.** App không đánh dấu, không cảnh báo, không đổi màu. Con số hiển thị đúng như nó là, và hai người tự nói với nhau. Góp ít hơn không phải lỗi cần app phát hiện.
2. **Đóng góp không bằng tiền.** Nghỉ thai sản, bỏ việc chăm con, bên nội ngoại đỡ tiền nhà — quỹ không có ô nào ghi được những thứ này, nên mọi kết luận rút ra từ riêng con số đều thiếu. Đây là lý do app ghi mà không phán.
3. **Chi cho nhà bằng tiền riêng, không qua quỹ.** Vẫn ghi ở mục khoản vừa và lớn, nhưng **không cộng vào phần nạp quỹ** — hai loại này không cùng đơn vị, gộp lại là bắt đầu làm kế toán.

#### Mục tiêu chung

Quỹ mua nhà, quỹ du lịch, quỹ sinh em bé, quỹ khẩn cấp.

Mỗi mục tiêu: tên, số cần đạt, số đã có, mốc thời gian mong muốn.

Vị trí: một khối **«Mục tiêu — có thể hoãn»** ở màn §7.2, và một danh sách riêng ở tab Tiền. Không phải màn hình chính — lý do ở §7.1.

Không thanh tiến trình hoành tráng, không hiệu ứng ăn mừng theo mốc phần trăm. Chỉ ba con số: đã có / cần đạt / còn thiếu. Không có "mỗi tháng cần góp bao nhiêu", không có "bạn đang chậm kế hoạch" — app không biết thu nhập, không biết hoàn cảnh, và một lời nhắc như thế với cặp đang chật vật là sự tàn nhẫn được tự động hoá.

**Không có đóng góp theo người ở mục tiêu.** Ngoại lệ tổng-theo-người chỉ áp cho quỹ chung, và chỉ trong một tháng.

#### Ngưỡng do hai người tự chốt

Chỉ user mới quyết được khoản nào đáng ghi — không thể tự động hóa. Nhưng nếu mỗi người có một ngưỡng riêng trong đầu, hai người sẽ **đọc sai sự im lặng của nhau**: chồng thấy vợ không ghi gì và kết luận vợ không tiêu khoản nào lớn, trong khi vợ đã chi 4tr và thấy chưa tới ngưỡng của mình.

Lời giải là một câu hỏi duy nhất lúc onboarding:

> **Khoản từ bao nhiêu trở lên thì nhà mình ghi lại?**
> 500k · 1 triệu · 2 triệu · Tự quyết

Sau đó không bao giờ hỏi lại, sửa được bất cứ lúc nào. Đây không phải hệ thống ép ai — đây là hai người tự chốt một quy ước và app lưu lại kết quả. **Không phải validation:** không chặn ai ghi khoản nhỏ hơn ngưỡng.

Ngưỡng thực tế nên là **vừa và lớn** (sửa xe 2tr), không phải chỉ khoản lớn (học phí 25tr). Đây là khác biệt giữa 4 lần/năm và 4–8 lần/tháng.

#### Số khai, không phải số đo

Con số tài sản là thứ **một người đã nói ra tại một thời điểm**, không phải sự thật hiện tại. Nếu hiển thị trần trụi, hai người sẽ cùng tin vào một thứ có thể đã sai — tệ hơn không có app, vì trước đây ít nhất họ biết là mình không biết.

Lời giải không phải là nhắc cập nhật định kỳ (đó là nghi thức kế toán, đúng thứ sản phẩm này từ chối). Lời giải là **nhãn thời gian**:

```
250 triệu
Anh cập nhật 6 tuần trước
```

Không nhắc, không ép. Người đọc tự hiệu chỉnh mức tin và tự sửa nếu muốn.

Ngoại lệ duy nhất được phép hỏi: **hỏi theo ngữ cảnh, không theo lịch.** Khi có khoản lớn sắp tới *và* số dư đã cũ, app hiện *"Tính toán này dựa trên số dư ghi 6 tuần trước — còn đúng không?"*, bỏ qua được, và im 14 ngày sau đó.

> **Số dư quỹ chung là ngoại lệ về câu chữ:** nó là *tổng của những khoản đã ghi*,
> không phải một con số ai đó nói ra. Nhãn của nó là **"Ghi lần cuối …"**, không
> phải "… cập nhật …".

#### Không có phép tính nhìn về quá khứ

Bỏ mọi bảng đối soát kiểu "dự kiến vs thực tế" — chúng cần giả định đã ghi đủ, mà giả định đó không tồn tại. Chỉ giữ phép tính nhìn tới ở §7.2.

**Được phép:** liệt kê những gì đã ghi. Một danh sách *"Sửa xe −2.000.000 ₫ · 15/9"* vẫn đúng dù còn mười khoản chưa ghi — nó không tự nhận là đầy đủ. Tổng của một kỳ chỉ được hiện **kèm số lượng bản ghi và chữ "đã ghi"**, và không bao giờ vẽ thành đường.

#### Ranh giới cứng

- Không theo dõi thu nhập cá nhân.
- Không theo dõi chi tiêu cá nhân.
- Không hiển thị số dư tài khoản riêng.
- Không tính quan hệ nợ giữa hai người.

---

### 7.7. Tài liệu và giấy tờ

Không phải thư mục lưu file — Drive và iCloud làm việc đó tốt hơn. Giá trị nằm ở việc đặt tài liệu vào ngữ cảnh:

> Tài liệu → ngày hết hạn → sự kiện → việc cần làm → khoản tiền cần chuẩn bị

Một tài liệu gồm: tên, loại, thuộc về ai, ngày cấp, ngày hết hạn, vị trí bản giấy, link Drive/iCloud, ảnh, ghi chú, chi phí gia hạn dự kiến.

Loại tài liệu của con nên có sẵn mẫu: sổ tiêm chủng, BHYT, giấy khai sinh, hồ sơ nhập học, biên lai học phí.

> #### ~~Định lượng "giá trị đã cứu"~~ — **ĐÃ BÁC, không làm**
>
> v3 gốc đề nghị hiện *"Năm nay app đã nhắc bạn 6 hạn, tổng giá trị 47 triệu"*, và
> gọi đó là câu biện minh cho gói năm mạnh hơn bất kỳ tính năng mới nào.
>
> **Không làm.** Đó là một **khẳng định phản thực không kiểm chứng được**: nó ngầm
> nói rằng nếu không có app thì người dùng đã mất 47 triệu — mà không ai biết điều
> đó. Có thể họ vẫn tự nhớ. Có thể họ đã ghi vào lịch. Con số không kiểm chứng được
> bằng bất kỳ cách nào, **kể cả bởi chính người dùng**.
>
> Cả sản phẩm này được xây trên nguyên tắc ngược lại: số khai kèm nhãn thời gian,
> dự tính ghi rõ "theo những khoản nhà mình đã ghi", tổng kèm số lượng bản ghi. Đặt
> một con số không kiểm chứng được cạnh những con số đó **không làm nó đáng tin hơn
> — nó làm những con số kia kém đáng tin đi**.
>
> Đáng chú ý: chính §10.8 dưới đây giữ nguyên tắc ngược lại. v3 tự mâu thuẫn ở chỗ
> này. Thứ giữ người trả tiếp là **trí nhớ năm ngoái** (§7.9) — cái họ thật sự mất
> khi huỷ, và kiểm chứng được. Lý do đầy đủ: `spec/08 §4` và `spec/10 §6`.

---

### 7.8. Nhập liệu nhanh — nút thắt sống còn

Thông tin sinh ra ở Zalo và ở ảnh chụp giấy tờ. App nằm ở hạ nguồn. **Nếu phải mở app gõ tay, dữ liệu sẽ không vào, và mọi module đều rỗng.**

- **Chụp màn hình Zalo → share sang app → tự tạo sự kiện + ngày + tiền cần chuẩn bị.** Thao tác 3 giây.
- **Chụp ảnh giấy tờ → tự điền loại, ngày cấp, ngày hết hạn.**
- Quick add một dòng cho mọi loại nội dung.

Đây không phải tiện ích. Với sản phẩm phụ thuộc mật độ dữ liệu, đây là điều kiện sống.

**Người dùng luôn xác nhận trước khi ghi.** Không bao giờ tự tạo bản ghi từ AI — một ngày giỗ sai do AI đoán sẽ phá niềm tin ở đúng tính năng khác biệt nhất.

Vì AI tốn chi phí thật để chạy, đây cũng là **paywall tự nhiên và dễ hiểu** — user hiểu ngay tại sao phải trả.

> ⚠️ **Trạng thái: khung đã dựng, model chưa nối.** `parse-capture` trả 503 cho tới
> khi nối một nhà cung cấp LLM. Đây là món nợ lớn nhất của sản phẩm hiện tại — xem
> §21.

---

### 7.9. Trí nhớ năm ngoái

Subscription không sống bằng tính năng, nó sống bằng **cái mất đi khi hủy**.

Sau 12 tháng, app tự nói được:

> *"Tết năm ngoái nhà mình chi 28 triệu — năm nay bắt đầu chuẩn bị từ tháng 11."*
> *"Giỗ ông ngoại năm ngoái: xuất phát 8h, quà 1 triệu, mua hoa ở chợ Hôm."*

Không code tính năng mới — chỉ là dữ liệu cũ được dùng lại đúng lúc. Đây là thứ khiến hủy gói thấy tiếc.

Lưu ý: trí nhớ năm ngoái chỉ nói về **sự kiện và chi phí của nhà**, không bao giờ về hành vi của một người ("năm ngoái anh làm 40% việc nhà").

---

## 8. Tính năng bản địa — **ĐÃ CHỐT: làm cả hai**

> v3 gốc khuyến nghị "chọn tối đa một". **Quyết định đó đã bị thực tế vượt qua:**
> cả hai module đã được code xong — 5 bảng, 8 màn hình, ~85 test. Gỡ một thứ đang
> chạy để khớp một câu khuyến nghị là phá giá trị đã có. Xem `spec/10 §7`.

| Module | Vì sao mạnh | Trạng thái |
| --- | --- | --- |
| **Sổ hiếu hỉ** | Chưa app nào làm, đau thật, gắn tiền, tự nhiên hai người, dễ làm content | ✅ xong, kèm **nghĩa vụ đáp lễ** |
| **Hồ sơ con** (tiêm chủng, khám, BHYT, học phí) | Cảm xúc cao, tần suất cao trong 3 năm đầu | ✅ code xong, **chặn phát hành**: file lịch tiêm phải được người có chuyên môn y tế xác nhận |

**Sổ hiếu hỉ không phải sổ ghi chép.** Với người Việt, một khoản mừng nhận được không phải sự kiện đã khép lại — nó **mở ra một nghĩa vụ**. Không có ghép cặp đáp lễ thì app không trả lời được câu người dùng thật sự mang trong đầu: *nhà nào mình còn chưa đi lại?*

Nhưng đây **không phải sổ nợ**: trạng thái của **một khoản** (biến mất khi đáp xong) khác hẳn số dư của **một mối quan hệ** (luôn hiện, cộng dồn). Không có tổng số tiền chưa đáp lễ, không xếp danh sách theo số tiền, và tang lễ thì không bao giờ gợi ý số.

**Cảnh báo còn nguyên giá trị:** cái bị hy sinh khi làm cả hai **không phải** các mục P1 — mà là **chất lượng luồng nhập liệu AI** (§7.8) và **luồng mời**. Luồng AI hiện vẫn chưa nối model.

---

## 9. Phạm vi bảo mật

MVP là **document registry**, không phải két sắt số.

Không khuyến khích lưu: mật khẩu, mã PIN, OTP, private key, thông tin đăng nhập ngân hàng, ảnh đầy đủ thẻ thanh toán.

Được lưu: thông tin mô tả, ngày hết hạn, vị trí bản giấy, link Drive/iCloud, ảnh với giới hạn rõ ràng.

Mã hóa đầu cuối, recovery key, family vault: nghiên cứu sau khi nhu cầu được xác thực.

---

## 10. Nguyên tắc thiết kế

**10.1. Nhập cực nhanh.** Vài giây cho mỗi mục. Không form dài.

**10.2. Tổng quan trước, chi tiết sau.**

**10.3. Không tạo cảm giác kiểm soát.** Tránh: ai đã tiêu khoản này, cần phê duyệt, vi phạm ngân sách, người chịu trách nhiệm. Ưu tiên: việc của nhà mình, cần chuẩn bị, sắp đến hạn, cập nhật gần nhất.

**10.4. Không thay thế giao tiếp.** App lưu kết quả của cuộc trao đổi, không phải nơi trao đổi.

**10.5. Không biến gia đình thành dự án.** Không phê duyệt, không nhiều trạng thái, không sprint, không KPI, không game hóa.

**10.6. Mọi thông tin phải có ngữ cảnh.** Tiền, tài liệu, việc đều gắn được với một sự kiện thực tế.

**10.7. Không bao giờ tạo bằng chứng dùng được lúc cãi nhau.** Không thống kê theo người, không thông báo về việc người kia chưa làm, không lịch sử ai sửa gì, không bảng nợ.

**10.8. Nói rõ dữ liệu là số khai hay số đo.** Mọi con số do người nhập đều kèm nhãn thời gian. Mọi phép tính đều ghi rõ nó dựa trên cái gì.

**10.9. Không đếm những gì hai người không chọn được.** Số đám giỗ bên nhà chồng, số lần bố mẹ ốm, số việc phát sinh của con — đếm và so sánh những thứ này tạo ra một bên "nhiều hơn" mà không ai gây ra. Dữ liệu chỉ nên đo thứ người ta có thể thay đổi.

**10.10. Một cái tên cạnh một việc chỉ được xuất hiện theo quy tắc đã chốt trước, hoặc do chính người đó nhận.** Không bao giờ do người kia gán từng lần.

---

## 11. Khác biệt so với giải pháp hiện tại

|  | Điểm yếu |
| --- | --- |
| **Zalo** | Thông tin trôi, không có timeline, không biết việc nào chưa xong, không liên kết sự kiện–tiền–giấy tờ |
| **Google Calendar** | Không có việc nhà, không có bức tranh tài chính, không quản lý giấy tờ |
| **Google Sheet** | Mất công thiết lập, không tự nhiên trên điện thoại, không có reminder theo ngữ cảnh |
| **Google Drive** | Không biết tài liệu thuộc về ai, không có ngày hết hạn, không nhắc gia hạn, không ghi vị trí bản giấy |
| **Trello / Notion / Todoist** | Giống môi trường công việc, nhiều trạng thái, không thiết kế cho sự kiện gia đình VN |
| **App thu chi** | Yêu cầu nhập mọi giao dịch; app này không |
| **Splitwise** | Mô hình của người ở ghép: có quan hệ nợ và có ngày tất toán. Vợ chồng không có cả hai |
| **App lịch âm nhắc giỗ** | Miễn phí và làm tốt, nhưng dùng một mình, không gắn với tiền cần chuẩn bị |

Cần thành thật: chi phí của sự phân mảnh là **chi phí phân tán** — mỗi lần chỉ tốn 30 giây nên user không cảm thấy đau. Người ta trả tiền để gỡ nỗi đau nhọn, không trả để gỡ nỗi đau rải đều. Hệ quả: đừng kỳ vọng conversion cao, hãy thiết kế bản miễn phí như kênh tăng trưởng chính.

---

## 12. Lợi thế bản địa hóa

App family organizer phương Tây tập trung vào meal planning, grocery list, chore chart, allowance cho trẻ, carpool.

Bối cảnh Việt Nam cần: ngày giỗ và lịch âm, cưới hỏi, lễ Tết, sự kiện hai bên nội ngoại, học phí và lịch học thêm, đưa đón con, hỗ trợ bố mẹ hai bên, hồ sơ bảo hiểm–xe–nhà–trường, các khoản tiền cần chuẩn bị cho sự kiện.

---

## 13. Giả thuyết thị trường

Concept đã tồn tại ở nhiều thị trường nhưng chưa phổ biến tại VN. Nguyên nhân có thể: thế hệ trước chưa có thói quen, Gen Z mới bước vào giai đoạn lập gia đình, app phương Tây không hiểu bối cảnh VN, người Việt đang dùng nhiều công cụ miễn phí rời rạc.

**Rủi ro cần thừa nhận:** việc chưa có đối thủ lớn cũng có thể là dấu hiệu nhu cầu còn yếu. Và mảng lịch âm/nhắc giỗ **đã có sẵn app miễn phí làm tốt**, nên phần đó không còn là lợi thế.

---

## 14. Mô hình thu phí

### Nguyên tắc

- **Không khóa phần dùng chung.** Nếu người thứ hai gặp paywall, họ không tham gia và app chết. Paywall theo household; quyền xem luôn miễn phí.
- **Bán gói năm, không đẩy gói tháng.** Với app tần suất thấp, gói tháng bắt user tự hỏi "mình còn cần cái này không?" 12 lần mỗi năm, và 8 trong 12 tháng đó không có sự kiện gì.
- **Trial gắn với cột mốc, không gắn với ngày.** 30 ngày có thể trôi qua mà không có hạn nào tới. Trial kết thúc khi đã qua 30 ngày **và** household đã trải qua ít nhất **một lần nhắc hạn được xác nhận** **và** **một sự kiện có chi phí**. Trần cứng 90 ngày.

### Cái gì nằm sau paywall

- AI nhập liệu từ ảnh và ảnh chụp màn hình (tốn chi phí thật → dễ hiểu).
- Dung lượng lưu ảnh, backup, khôi phục.
- Trí nhớ năm ngoái (dữ liệu quá 12 tháng).
- Nhắc hạn nâng cao và nhắc kép.

Core experience miễn phí không được cố tình phá để tạo paywall.

### Giá thử nghiệm

Giả thuyết: quy đổi dưới ~70.000đ/tháng dễ cân nhắc hơn. Ví dụ để test, chưa phải giá chính thức:

- 12 tháng: 499.000đ
- 6 tháng: 299.000đ
- (Gói tháng có tồn tại nhưng không được nêu bật)

Một gói cho cả household.

---

## 15. Giả thuyết cần validate

### 15.1. Câu hỏi số một — hỏi trước khi viết dòng code nào

Với 10 cặp:

> Trong ba tháng qua, đã có lần nào **một người thấy bất ngờ** về một khoản chi vừa hoặc lớn mà người kia đã tiêu chưa? Cụ thể là khoản gì, bao nhiêu, và lúc đó hai người nói gì với nhau?

Kể được câu chuyện cụ thể kèm cảm xúc → có sản phẩm. Trả lời chung chung kiểu "cũng có, thỉnh thoảng" → điểm mù không đủ đau để đổi hành vi.

**Câu hỏi số hai:**

> Hai người có quỹ chung không, và đang theo dõi nó bằng cách gì?

"Có, đang dùng Sheet hoặc nhớ trong đầu" → đúng hướng. "Tiền ai người nấy giữ, tới đâu tính đó" → quỹ chung không dùng tới, và phân khúc có thể sai.

### 15.2. Vấn đề

- Có tồn tại điểm mù tài chính giữa hai người không?
- Giấy tờ có thường chỉ một người biết vị trí không?
- Đã từng mất tiền hoặc mất thời gian vì quên một hạn nào chưa?
- Sự kiện hai bên có thường chỉ một người nhớ không?
- Việc nhà định kỳ đang được phân theo cách nào — cố định, luân phiên miệng, hay không có quy tắc?

### 15.3. Hành vi

- Người thứ hai có thực sự vào app sau 2 tuần không? **(chỉ số quan trọng nhất)**
- Có ai dùng chức năng nhập từ ảnh chụp màn hình không?
- Có ai tự cập nhật số dư mà không bị nhắc không?
- Danh sách mua sắm có được dùng hằng tuần không?
- **Chip đổi người có được chạm theo một nhịp đều đặn không?** (nếu có → đó là bằng chứng cho luân phiên tự động, xem §7.3)
- Nhắc chuẩn bị (1–3 ngày trước) có được đặt không?
- Có ai gắn tiền hoặc tài liệu vào sự kiện không?

### 15.4. Giá trị

- App có tránh được một lần quên thật, mất tiền thật không?
- Người không giữ tiền có thấy nắm tình hình hơn không?
- Số lần phải nhắc nhau có giảm không?
- Hai người có thấy thiếu app khi ngừng dùng không?

### 15.5. Trả tiền

- Có ai trả tiền thật sau trial không?
- Lý do mua là AI nhập liệu, nhắc hạn, hay bức tranh tiền sắp tới?
- Lý do không mua: giá, thiếu giá trị, hay không thành thói quen?

---

## 16. MVP

### Phải có

1. Tạo household và mời người còn lại
2. Màn hình "Nhà mình" hai tầng
3. **Màn hình "sắp tới cần bao nhiêu"** (§7.2), phân biệt khoản bắt buộc và mục tiêu
4. Quick add
5. **Việc định kỳ**: tần suất + hai chế độ người phụ trách + đổi người tự do
6. **Việc linh hoạt**: checklist chung, tự nhận, không gán cho người kia
7. **Danh sách mua sắm chung**
8. Sự kiện gia đình + thẻ nhà chồng/nhà vợ/của con + lịch âm + lặp hằng năm
9. **Nhắc kép**: nhắc trước giờ + nhắc chuẩn bị 1–3 ngày trước (sinh một việc)
10. Tài sản với nhãn thời gian + ngưỡng ghi chốt lúc onboarding
11. **Quỹ chung: số dư + khoản nạp/rút có mục đích và người nạp; xem theo tháng, không cộng dồn**
12. Các khoản vừa và lớn, gắn được với sự kiện
13. Document registry + ngày hết hạn + vị trí bản giấy
14. **Nhập từ ảnh chụp màn hình và ảnh giấy tờ (AI)**
15. Notification chất lượng
16. Đồng bộ hai người
17. **Có giá trị đầy đủ khi chỉ một người dùng**
18. **Onboarding tạo sẵn dữ liệu** (Tết, giỗ, sinh nhật bố mẹ hai bên, đăng kiểm, bảo hiểm xe, học phí)
19. Hai module bản địa ở §8

> **Widget đã bị gỡ khỏi mục 15** — v3 gốc xếp nó vào "Phải có". Widget cần code
> SwiftUI (WidgetKit) và Kotlin (Glance) riêng, chia sẻ dữ liệu qua App Group; đó là
> điểm yếu thật của React Native, không phải một mục có thể tick. Và **nửa đầu của
> chính mục đó — notification — cũng chưa chạy**: `expo-notifications` đang tắt vì
> thiếu certificate. Bật lại push là việc trước. Xem `spec/10 §8`.

### Hoãn

- Mục tiêu chung dạng nhiều quỹ (MVP chỉ cần 1–2 mục tiêu)
- Tìm kiếm (dữ liệu còn mỏng)
- Đính kèm file tổng quát (giữ ảnh vì cần cho AI)
- Calendar view đầy đủ — **chọn timeline/agenda, không dựng cả hai**
- Trí nhớ năm ngoái (chỉ có ý nghĩa từ năm thứ hai, nhưng dữ liệu phải được cấu trúc từ ngày đầu)
- Widget

### Chưa cần / không làm

Chat, location tracking, meal planning, album gia đình, family vault, password manager, thu chi chi tiết, kết nối ngân hàng, OCR sao kê, AI tư vấn tài chính, quy trình phê duyệt.

**Không làm, vĩnh viễn:** tính ai thiếu ai thừa, thống kê tần suất hai bên, thống kê việc nhà theo người, điểm thưởng và game hóa, theo dõi thu nhập hoặc chi tiêu cá nhân, "giá trị đã cứu".

---

## 17. Dấu hiệu nên tiếp tục

- Phần lớn người thử mời được người thứ hai, và người thứ hai **có hoạt động sau 2 tuần**.
- Household tự tạo dữ liệu sau vài tuần mà không bị nhắc.
- App tránh được một lần quên thật, có hậu quả tiền bạc.
- Chức năng nhập từ ảnh chụp màn hình được dùng lặp lại.
- Có người tự cập nhật số dư mà không cần app hỏi.
- Người dùng liên kết sự kiện với tiền hoặc tài liệu.
- Quỹ chung được ghi đều mỗi tháng.
- Một số household trả tiền thật sau trial.
- User mô tả app là nơi chung cần thiết, không chỉ là giao diện đẹp.

---

## 18. Dấu hiệu nên dừng hoặc pivot

- Chỉ một người dùng; người còn lại không mở app.
- User quay lại hoàn toàn với Zalo, Calendar, Sheet.
- Dữ liệu không được cập nhật sau tuần đầu.
- Chỉ thêm vài ngày giỗ rồi không quay lại.
- Số dư không bao giờ được cập nhật lần hai.
- Quỹ chung chỉ được ghi một tháng rồi bỏ.
- Document chỉ được dùng như một folder.
- User liên tục đòi tính năng ghi nợ/chia tiền — dấu hiệu ta chọn sai phân khúc, hoặc họ chưa thực sự là một đơn vị kinh tế chung.
- Không có tình huống thực tế nào app giúp ích.
- User thích concept nhưng không trả bất kỳ mức giá nào.

---

## 19. Tóm tắt một câu

> Một app chung cho vợ chồng trẻ, giúp cả hai cùng nhìn thấy những gì sắp tới — sự kiện hai bên và của con, việc nhà, tiền cần chuẩn bị và giấy tờ sắp hết hạn — mà không biến gia đình thành một hệ thống quản lý, và không tạo ra bằng chứng để cãi nhau.

---

## 20. Thay đổi so với v2

### Thêm mới

- **Tách việc định kỳ / việc linh hoạt** thành hai danh sách (§7.3)
- **Nhắc kép**: nhắc trước giờ + nhắc chuẩn bị 1–3 ngày, và mốc thứ hai **sinh một việc** (§7.5)
- **Thẻ sự kiện của con**, mỗi con một màu; mẫu tài liệu của con (§7.5, §7.7)
- **Quỹ chung**: số dư + khoản nạp/rút có ghi người nạp, xem theo tháng, không cộng dồn (§7.6)
- **Mục tiêu chung**: một khối «có thể hoãn» trong §7.2 — cùng màn hình, khác con số
- Phân biệt khoản bắt buộc / khoản tự nguyện ở §7.2
- §3: định nghĩa rõ "minh bạch" nghĩa là gì trong sản phẩm này
- Nguyên tắc 10.9 (không đếm thứ không chọn được) và 10.10 (tên chỉ đến từ quy tắc hoặc tự nhận)
- Splitwise vào bảng so sánh ở §11
- Câu hỏi validate số hai: hai người có quỹ chung không (§15.1)

### Sửa

- **Việc nhà**: từ một danh sách thành hai; "mặc định không gán" nay là một trong hai chế độ
- **Sự kiện**: thẻ hai bên giữ để lọc, nhưng nói rõ không đếm và không so sánh
- **Ranh giới lịch**: nói rõ không đồng bộ lịch cá nhân
- **MVP**: tách mục 5 thành 5 và 6; thêm quỹ chung, nhắc kép; danh sách "không làm vĩnh viễn"
- **Trí nhớ năm ngoái**: chỉ nói về sự kiện và chi phí, không về hành vi một người

### Bỏ / từ chối

- **Tự động tính ai còn thiếu, ai thừa** — mô hình của người ở ghép, không phải của vợ chồng
- **Số dư nợ cộng dồn giữa hai người** — không có cơ chế tất toán nên chỉ lớn dần
- **Thống kê tần suất sự kiện hai bên** — cấp đạn cho tranh cãi về thứ không ai chọn được (10.9)
- **Goal Dashboard làm màn hình chính** — tiến độ nhích quá chậm để làm bề mặt hằng ngày
- **Điểm thưởng, phiếu đổi, game hóa việc nhà** — biến việc nhà thành cuộc thi trong cùng một nhà

### Năm đề xuất của chính v3 bị bác

| v3 nói | Chốt | Vì sao |
|---|---|---|
| Luân phiên tự động việc nhà (§7.3) | **không làm** | cần 4 thứ mới cho việc thay một chip đã chạy; và quy tắc phải cẩn thận đến mức không được lấy lịch sử hoàn thành làm đầu vào thì nên có bằng chứng nhu cầu trước |
| Thẻ "Bên nội / Bên ngoại" (§7.5) | **giữ nhà chồng/nhà vợ** | "bên nội của vợ" tồn tại và không ánh xạ được |
| "App đã cứu bạn 47 triệu" (§7.7) | **không khôi phục** | khẳng định phản thực không kiểm chứng được; nó làm những con số cẩn thận khác kém tin đi |
| Chọn tối đa một module bản địa (§8) | **giữ cả hai** | cả hai đã code xong; §8 là lời khuyên lúc chưa xây |
| Widget vào MVP (§16) | **ngoài MVP** | cần code native riêng, và nửa đầu của cùng mục (notification) còn chưa chạy |

Lý do đầy đủ cho cả năm: `spec/10-delta-v3.md`.

### Câu treo — **đã đóng hết**

| v3 §20 hỏi | Trả lời |
|---|---|
| 1. Phân khúc ở riêng hay ở chung? | **ở riêng** — §3 |
| 2. Tính năng bản địa nào? | **cả hai, đã xong** — §8 |
| 3. Ngưỡng ghi mặc định? | **500k / 1tr / 2tr / Tự quyết**, gợi ý 2 triệu — §7.6 |
| 4. Quỹ chung có vào MVP? | **có** — §7.6 |
| 5. Chu kỳ luân phiên mặc định? | **câu hỏi biến mất** — không làm luân phiên, §7.3 |

---

## 21. Trạng thái triển khai — đọc trước khi hứa gì với ai

Ba thứ quyết định sống chết của sản phẩm **hiện chưa chạy**, và không cái nào nằm trong danh sách tính năng mới của v3:

| Thứ | Trạng thái | Hệ quả nếu không có |
|---|---|---|
| **AI nhập liệu** (§7.8) | khung xong, **model chưa nối** — trả 503 | Mọi module rỗng. Đây là lý do nó được xếp ở bước 4/12 của thứ tự dựng: *"nếu luồng này không hoạt động thì ta sẽ không biết cho tới khi đã xây xong tất cả"* |
| **Push notification** | **đang tắt** vì thiếu certificate Apple | Toàn bộ giá trị "app nhắc người có tên, người kia khỏi phải nhắc" chưa từng được kiểm chứng |
| **Lịch tiêm của con** (§8) | file seed **cố ý để rỗng** | Chặn phát hành hồ sơ con. Cần một người có chuyên môn y tế đọc và xác nhận — việc không lập trình, làm song song được nhưng không rút ngắn được |

Thêm tính năng lên trên ba thứ này là thêm chiều rộng cho một sản phẩm chưa kiểm chứng được chiều sâu.

---

## Tài liệu liên quan

| File | Nội dung |
|---|---|
| `spec/10-delta-v3.md` | v3 đổi gì so với v2 và **vì sao năm đề xuất bị bác** |
| `spec/03-business-logic.md §9` | Danh sách hàm **cấm viết** + hai ngoại lệ có điều kiện |
| `spec/05-screens-and-flows.md` | Từng màn hình, từng luồng |
| `spec/09-ui-build-spec.md` | Số đo, màu, từng khối — đủ để dựng lại UI mà không đọc code |
| `TASKS.md` | Tiến độ theo giai đoạn G0–G18 |
