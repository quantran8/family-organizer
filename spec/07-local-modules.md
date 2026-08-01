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

## 3. Sổ mừng cưới

### 3.1 Vấn đề thật

Không phải "ghi lại cho vui". Nỗi đau cụ thể:

> Nhà chú Ba mừng đám cưới mình 2 triệu năm 2023. Giờ con chú Ba cưới. Mình đi bao nhiêu?

Đi thiếu thì mất mặt, đi thừa thì tiếc, và **không ai nhớ nổi**. Hiện tại thông tin này nằm trong một quyển sổ giấy cất đâu đó, hoặc trong trí nhớ của mẹ.

Đây là nỗi đau nhọn, có hậu quả xã hội thật, gắn tiền, và tự nhiên có hai người. Chưa app nào ở VN làm.

### 3.2 Mô hình dữ liệu

Cần một thực thể mới: **`contacts`** — người quen và họ hàng. Họ **không phải** `members`: không có tài khoản, không nhận thông báo, không thấy dữ liệu.

```
contact          họ hàng / bạn bè, tối giản
gift_entry       một lần đi hoặc nhận, gắn contact + event + số tiền + chiều
```

`gift_entry.direction`:
- `received` — nhà mình nhận (đám cưới mình, đầy tháng con mình, tang lễ)
- `given` — nhà mình đi

Cố ý **không có** trong `contacts`: số điện thoại, địa chỉ, ảnh, ngày sinh, nhóm. Đây không phải app danh bạ. Chỉ có tên, quan hệ (một dòng chữ tự do: "chú ruột bên nội", "bạn cấp 3 của vợ"), và bên gia đình.

### 3.3 Tính năng lõi — vòng lặp duy nhất đáng làm

**Gợi ý khi tạo khoản mừng.** Đây là toàn bộ lý do module tồn tại:

```
Cưới con chú Ba — 12/11

Số tiền mừng          [              ]

  Chú Ba đã mừng nhà mình
  2.000.000 ₫ — cưới, 3/2023
  [ Dùng số này ]
```

Không có dòng gợi ý đó thì đây chỉ là một cái Excel có màu. Có nó thì app trả lời được câu hỏi mà không ai trả lời được.

**Nhập hàng loạt.** Ngày cưới nhận 100 phong bì. Cần chế độ nhập nhanh: tên + số tiền, Enter, lặp lại, bàn phím không tắt. Không hỏi gì thêm.

Kèm luồng AI: **chụp ảnh trang sổ ghi tay → parse thành danh sách tên + tiền → xác nhận từng dòng.** Đây là chỗ AI capture (`06 §6`) có giá trị rõ nhất trong toàn app, vì thay thế đúng 30 phút gõ tay.

**Tổng của một đám.** Sau đám cưới mình: tổng nhận được bao nhiêu, bao nhiêu nhà. Con số này người dùng thật sự muốn biết.

### 3.4 Ranh giới

**Không sắp xếp theo số tiền làm mặc định.** Mặc định theo ngày. Sắp theo tiền là tuỳ chọn, và không bao giờ có nhãn kiểu "mừng nhiều nhất" hay "ít nhất". Xếp hạng họ hàng theo độ hào phóng là thứ khiến người dùng thấy app bẩn.

**Không tính "còn nợ ai bao nhiêu".** Không có cột chênh lệch, không có "nhà này mình đi ít hơn 500k". Cám dỗ rất lớn vì dữ liệu có sẵn, nhưng nó biến quan hệ họ hàng thành sổ nợ. App chỉ hiện hai chiều song song, người dùng tự cân.

**Không chia sẻ ra ngoài household.** Không xuất, không share ảnh, không link. Dữ liệu này lộ ra là một sự cố xã hội thật.

**Nếu phải cắt scope:** giữ `contacts` + `gift_entry` + gợi ý ở 3.3. Cắt nhập hàng loạt bằng AI (nhập tay vẫn dùng được), cắt tổng của một đám.

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

### Bổ sung cho `03 §9` — danh sách hàm cấm viết

| Hàm | Vì sao cấm |
|---|---|
| Chênh lệch đi/nhận theo từng contact | Biến quan hệ họ hàng thành sổ nợ |
| Xếp hạng contact theo số tiền | Xếp hạng họ hàng theo độ hào phóng |
| Bách phân vị / đánh giá tăng trưởng của con | Chẩn đoán y tế, không thuộc về app |
| So sánh giữa các con trong nhà | Như trên, và tệ hơn về mặt cảm xúc |
| Bất kỳ gợi ý nào về hoãn hoặc bỏ mũi tiêm | Gây hại thật |

---

## 6. Vẫn còn treo

`06 §12` mục 1 chưa chốt: **phân khúc ở riêng hay ở chung bố mẹ.**

Việc chọn cả hai module này làm nghiêng cán cân: hồ sơ con phục vụ cặp mới có con, mà nhóm này ở VN có tỷ lệ sống chung ông bà rất cao. Nếu đó là phân khúc chính thì module việc nhà nên bị hạ trọng số, và ranh giới tài chính với bố mẹ hai bên nên được nâng lên.

Đây là quyết định cần chốt trước khi dựng tuần 3.
