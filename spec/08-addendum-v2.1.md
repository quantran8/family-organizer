# 08 — Addendum v2.1

Hai điều chỉnh so với `06-delta-v2.md`. Cả hai đều là **đảo ngược** một quyết định trước đó.

| | `06` nói | `08` chốt lại |
|---|---|---|
| Mục tiêu (goals) | hạ xuống P2 | **giữ, P0** |
| Lịch sử biến động tài sản | không có màn hình | **có, P0** |

---

## 1. Lịch sử biến động tài sản

### 1.1 Vấn đề: dữ liệu đã ghi nhưng chưa bao giờ được nhìn thấy

`money_events` vẫn được ghi từ ngày đầu, và ranh giới của nó đã đúng: *log thay đổi của bức tranh, không log giao dịch chi tiêu*. Sổ tiết kiệm từ 250tr xuống 220tr thì vào; đổ xăng 500k thì không.

Nhưng ở `06 §3` tôi cắt phần "nhìn về quá khứ" mà **không** phân biệt hai thứ rất khác nhau:

| | Trung thực khi dữ liệu thiếu? |
|---|---|
| **Liệt kê** những gì đã được ghi | Có |
| **Cộng tổng** rồi trình bày như bức tranh đầy đủ | Không |

Kết quả là dữ liệu được ghi nhưng không có đường nào để xem. Đó là lỗi của bản `06`, và mục này sửa nó.

### 1.2 Đường phân giới

**Liệt kê thì trung thực khi thiếu. Cộng tổng thì không.**

Một danh sách *"Sửa xe −2.000.000 ₫ · 15/9"* vẫn đúng dù nhà mình còn mười khoản khác chưa ghi. Nó không tự nhận là đầy đủ.

Một con số *"Tháng 9 chi 12 triệu"* thì tự nhận là đầy đủ, và sẽ sai 30–40% mãi mãi. Đó là thứ bị cấm — không phải bản thân việc nhìn về quá khứ.

### 1.3 Được làm

**Lịch sử của một khoản.** Trong chi tiết tài sản: mọi lần giá trị đổi, kèm delta, ngày, ghi chú, và ai khai.

```
LỊCH SỬ

15/9   250.000.000 → 220.000.000    −30.000.000
       "rút sửa nhà"          Anh khai

12/7   235.000.000 → 250.000.000    +15.000.000
       Em khai
```

**Dòng thời gian của cả nhà.** Màn hình mới `money/history.tsx`: mọi `money_events` của household, sắp theo ngày, lọc được theo khoản và theo khoảng thời gian.

Đây chính là thứ khiến người không giữ tiền cảm thấy nắm tình hình — niềm tin đến từ việc **thấy được thay đổi**, không phải từ con số hiện tại.

**Tổng của những gì đã ghi**, nếu và chỉ nếu kèm đủ hai thứ: số lượng bản ghi, và nhãn "đã ghi".

```
Tháng 9 · 5 khoản nhà mình đã ghi
−12.000.000 ₫
```

Câu này đúng theo đúng nghĩa đen của nó. *"Tháng 9 chi 12 triệu"* thì không.

### 1.4 Không được làm

**Biểu đồ xu hướng theo tháng.** Đây là chỗ cấm sắc nhất. Khi vẽ tổng theo tháng thành một đường, **khoảng trống trong việc ghi chép trông y hệt như thay đổi trong chi tiêu**. Tháng nào hai người bận và quên ghi sẽ hiện ra như một tháng tiết kiệm. Người dùng sẽ đọc biểu đồ đó như sự thật, và app vừa nói dối một cách rất thuyết phục.

Danh sách không có vấn đề này, vì không ai nhìn một danh sách rồi kết luận nó đầy đủ.

**So sánh giữa các kỳ.** Không "tháng này nhiều hơn tháng trước 20%". Cùng lý do.

**Phân loại chi tiêu.** Không danh mục, không nhóm, không phần trăm theo nhóm. Đây là đường ranh với app thu chi.

**Tổng hợp theo người.** `actor_profile_id` đã có trong `money_events` để trả lời "ai khai con số này" trong lịch sử của một khoản. Nó không bao giờ được nhóm lại thành "anh rút bao nhiêu, em rút bao nhiêu" — xem `03 §9`.

### 1.5 Thay đổi cụ thể

| Tài liệu | Thay đổi |
|---|---|
| `02` | thêm `MoneyEvent`, `MoneyEventsRepo`; thêm view type `MoneyHistoryItem` |
| `03` | thêm `groupHistoryByMonth()`; bổ sung §9 hai dòng cấm |
| `05` | thêm route `money/history.tsx` P0; thêm khối LỊCH SỬ vào 6.3 |
| schema | view `money_history` (migration `2026-08-03`) |

---

## 2. Mục tiêu — giữ lại

### 2.1 Vì sao đảo ngược

Tôi hạ mục tiêu xuống P2 vì gộp nhầm nó với phần theo dõi tài sản bị cắt. Sai: **mục tiêu nhìn về phía trước**, cùng hướng với trái tim sản phẩm.

*"Mua nhà: cần 800tr, đang có 320tr"* là một câu về tương lai, không cần giả định đã-ghi-đủ nào. Nó thuộc về mô hình này.

### 2.2 Áp dụng cùng quy tắc số khai

`goals.current_amount` là số một người khai, y hệt `assets.current_value`. Nên nó phải chịu cùng ràng buộc:

- Thêm cột `as_of_date` và `updated_by_member_id`.
- Mọi chỗ hiện tiến độ đều kèm `formatDeclaredAt`.
- Không có nhắc cập nhật định kỳ.

```
Mua nhà
████████░░░░░░░░  320 / 800 triệu
Em cập nhật 5 tuần trước
```

### 2.3 Ba ranh giới

**Mục tiêu không chảy vào "sắp tới cần bao nhiêu".** Nghĩa vụ khác với nguyện vọng. Học phí tháng 9 là thứ phải trả; góp quỹ mua nhà là thứ muốn làm. Trộn hai loại vào một con số làm con số đó mất nghĩa, và làm màn hình hero trở nên đáng sợ mà không có lý do.

Chúng nằm ở hai khối riêng trên tab Tiền.

**Không có tiến độ theo thời gian, không có lời khuyên.** Không "để đạt mục tiêu, mỗi tháng cần góp 20 triệu", không "bạn đang chậm so với kế hoạch". App không biết thu nhập, không biết hoàn cảnh, và một lời nhắc kiểu đó với cặp vợ chồng đang chật vật là sự tàn nhẫn được tự động hoá.

Chỉ hiện ba con số: đã có, mục tiêu, còn thiếu.

**Không có đóng góp theo người.** Không "anh góp 200tr, em góp 120tr". Đây là bảng điểm ở dạng dễ chấp nhận nhất, và cũng là dạng nguy hiểm nhất — vì nó trông như minh bạch.

### 2.4 Vị trí

- `money/goals.tsx` và `money/goal/[id].tsx` → **P0**
- Khối `MỤC TIÊU` trở lại tab Tiền (6.2), đặt **dưới** khối tài sản và khoản sắp trả
- Nút "Góp thêm" ghi `money_events` với `event_type = 'value_updated'`, y hệt tài sản

Trên màn hình Nhà mình thì **không** hiện mục tiêu. Màn hình chính trả lời "sắp có gì và cần chuẩn bị bao nhiêu" — mục tiêu không trả lời câu đó, và mỗi dòng thêm vào đó làm loãng câu trả lời.

---

## 3. Tóm tắt cho `03 §9` — danh sách hàm cấm, bản đầy đủ

| Hàm | Vì sao cấm |
|---|---|
| Tổng tiền theo người | Công cụ kiểm soát; người giữ tiền rời app |
| Tỷ lệ hoàn thành việc theo người | Bảng điểm giữa hai vợ chồng |
| Chuỗi ngày, điểm thưởng, huy hiệu | Gamification việc nhà |
| **Biểu đồ xu hướng chi tiêu theo tháng** | Khoảng trống ghi chép trông như thay đổi chi tiêu |
| **So sánh giữa các kỳ** | Như trên |
| **Phân loại chi tiêu theo danh mục** | Ranh giới với app thu chi |
| **Đóng góp vào mục tiêu theo người** | Bảng điểm ở dạng trông như minh bạch |
| **Gợi ý số tiền cần góp mỗi tháng** | App không biết thu nhập hay hoàn cảnh |
| Chênh lệch đi/nhận theo contact | Biến quan hệ họ hàng thành sổ nợ |
| Xếp hạng contact theo số tiền | Xếp hạng họ hàng theo độ hào phóng |
| Bách phân vị / đánh giá tăng trưởng của con | Chẩn đoán y tế |
| So sánh giữa các con trong nhà | Như trên |
| Gợi ý hoãn hoặc bỏ mũi tiêm | Gây hại thật |

**Được phép, có điều kiện:** tổng của những gì đã ghi trong một kỳ — bắt buộc kèm số lượng bản ghi và chữ "đã ghi", và không bao giờ được vẽ thành đường.


---

## 4. Bỏ "giá trị đã cứu"

View `value_saved`, hàm `summarizeValueSaved()`, và card trong màn hình Gói dịch vụ — bỏ hết. `reminders.acknowledged_at` **được giữ**: nó vẫn cần cho cột mốc trial và để không nhắc lại cùng một hạn.

### Vì sao

Ở `06 §9` tôi gọi đây là "câu biện minh cho gói năm mạnh hơn bất kỳ tính năng mới nào". Nhận định đó sai theo một cách đáng chú ý: nó đúng về mặt marketing và sai về mặt nhất quán.

*"App đã nhắc bạn 6 hạn, tổng giá trị 47 triệu"* là một **khẳng định phản thực**. Nó ngầm nói rằng nếu không có app thì người dùng đã mất 47 triệu — mà không ai biết điều đó. Có thể họ vẫn tự nhớ. Có thể họ đã ghi vào lịch. Con số không kiểm chứng được bằng bất kỳ cách nào, kể cả bởi chính người dùng.

Cả spec này được xây trên nguyên tắc ngược lại:

- số khai phải kèm nhãn thời gian (`formatDeclaredAt`)
- dự tính phải ghi *"theo những khoản nhà mình đã ghi"* (`basis: 'declared'`)
- tổng phải kèm số lượng bản ghi (`groupHistoryByMonth` bắt buộc trả `count`)
- `summarizeOccasion` không nội suy, không điều chỉnh lạm phát

Đặt một con số không kiểm chứng được cạnh những con số đó không làm nó đáng tin hơn — nó làm những con số kia kém đáng tin đi. Một sản phẩm cẩn thận về sự thật ở mười chỗ và tự khen ở chỗ thứ mười một sẽ bị nhớ vì chỗ thứ mười một.

Lý do phụ, thực dụng hơn: 6 hạn/năm là quá thưa. Phần lớn thời gian card sẽ hiện *"1 hạn"* hoặc không hiện gì — và một card trống ở màn hình bán hàng còn tệ hơn không có card.

### Thay bằng gì

Không gì cả ở màn hình Gói dịch vụ. Thứ giữ người trả tiếp là **trí nhớ năm ngoái** (`§7.9`) — cái họ thật sự mất khi hủy — chứ không phải một lời tự khen. Nó cũng kiểm chứng được: người dùng nhìn vào và thấy đúng dữ liệu của mình.
