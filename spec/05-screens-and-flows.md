# 05 — Màn hình & luồng

Danh mục màn hình, bố cục, và luồng hoạt động. Tokens và ngôn ngữ ở `04`.

Cột **Mức**: `P0` bắt buộc cho MVP · `P1` làm nếu không chậm MVP · `P2` sau MVP.

> Thay đổi so với bản trước: xem `06-delta-v2.md`, `08-addendum-v2.1.md`, `10-delta-v3.md`.

## 0. Phân khúc — đã chốt

**Cặp ở riêng.** Đóng câu treo ở `06 §12` mục 1 và `07 §6`.

Lý do: cả năm module đều hoạt động đầy đủ với nhóm này. Cặp ở chung bố mẹ có nhu cầu khác rõ rệt — việc nhà bớt quan trọng, ranh giới tài chính với bố mẹ hai bên lại quan trọng hơn hẳn — và phục vụ cả hai nhóm cùng lúc là phục vụ không nhóm nào.

Hệ quả:
- Module việc nhà **không** bị hạ trọng số.
- Ranh giới tài chính với bố mẹ hai bên **không** được nâng lên — đó là kịch bản của phân khúc kia.
- Quỹ chung (§6.9) hợp với phân khúc này: cặp ở riêng có tiền nhà, ăn uống, điện nước để gộp.

**App chỉ phục vụ được nhóm cả hai đều muốn minh bạch nhưng lười.** Người không muốn cho vợ/chồng biết sẽ đơn giản là không ghi — công cụ không giải được vấn đề đó.

---

## 1. Bản đồ route

Expo Router, file-based.

```
app/
  _layout.tsx                     gate: chờ auth → chọn nhánh
  (auth)/
    sign-in.tsx                   P0
    setup.tsx                     P0   tạo hoặc tham gia household
    threshold.tsx                 P0   ngưỡng ghi — một câu, bốn nút
    seed.tsx                      P0   gói khởi tạo — danh sách tick
    join/[code].tsx               P0   đích của deep link
  (app)/
    _layout.tsx                   tab bar 4 tab + nút thêm nhanh
    home/index.tsx                P0
    plan/                         tab "Việc & Sự kiện"
      index.tsx                   P0   tab con Việc | Mua sắm | Sự kiện
      task/[id].tsx               P0
      event/[id].tsx              P0
    money/
      index.tsx                   P0
      upcoming.tsx                P0   ★ "Sắp tới nhà mình cần bao nhiêu"
      assets.tsx                  P0
      asset/[id].tsx              P0
      payments.tsx                P0
      payment/[id].tsx            P0
      debts.tsx                   P0
      debt/[id].tsx               P0
      attention.tsx               P0
      history.tsx                 P0   lịch sử biến động (08 §1.5)
      goals.tsx                   P0   nâng từ P2 ở 08 §2
      goal/[id].tsx               P0
      fund.tsx                    P0   quỹ chung (v3 §7.6)
      fund/[id].tsx               P0
    docs/
      index.tsx                   P0
      [id].tsx                    P0
      viewer/[fileId].tsx         P0
    search.tsx                    P2
    settings/
      index.tsx                   P0
      household.tsx               P0   + ngưỡng ghi
      invite.tsx                  P0
      subscription.tsx            P0
      notifications.tsx           P1
      storage.tsx                 P1
      data.tsx                    P1   xuất / xoá dữ liệu
  (modals)/
    quick-add.tsx                 P0   sheet
    capture-review.tsx            P0   ★ xác nhận kết quả AI đọc ảnh
    task-form.tsx                 P0
    event-form.tsx                P0
    event-actual-cost.tsx         P0   ★ hỏi một lần sau khi sự kiện qua
    asset-form.tsx                P0
    update-asset-value.tsx        P0
    payment-form.tsx              P0
    debt-form.tsx                 P0
    doc-form.tsx                  P0
    flag-attention.tsx            P0
    paywall.tsx                   P0
    goal-form.tsx                 P0
    goal-contribute.tsx           P0
    fund-form.tsx                 P0
    fund-entry.tsx                P0   nạp / rút quỹ chung
    gift-form.tsx                 P0
    contact-form.tsx              P0
    dose-mark.tsx                 P0   đánh dấu đã tiêm
    growth-form.tsx               P0
```

**Đã bỏ:** `snapshot-update.tsx`. Không còn nghi thức cập nhật định kỳ.

### Quy ước điều hướng

- **Push** cho đi sâu vào chi tiết (danh sách → chi tiết).
- **Modal toàn màn hình** cho form tạo/sửa.
- **Sheet** cho thao tác một mục đích, ngắn: thêm nhanh, gắn cờ, cập nhật giá trị tài sản.
- Nút quay lại luôn quay về đúng chỗ đã đi tới, không nhảy về tab gốc.
- Form có thay đổi chưa lưu → hỏi trước khi đóng. Form chưa gõ gì → đóng thẳng.

---

## 2. Tab bar

```
Nhà mình  ·  Việc & Sự kiện  ·  Tiền  ·  Giấy tờ        [+]
```

Vẫn bốn tab. Mua sắm là **tab con** trong "Việc & Sự kiện", không phải tab thứ năm — nhưng nó cũng có card thường trực trên Nhà mình, nên vẫn một chạm từ trong siêu thị.

Nút thêm nhanh nổi góc phải dưới, có mặt trên cả bốn tab. Cài đặt vào qua avatar ở header.

**Hai module bản địa không có tab riêng.** Sổ hiếu hỉ vào từ tab Tiền (khối `SỔ HIẾU HỈ`) và từ chi tiết sự kiện loại cưới/giỗ. Hồ sơ con vào từ tab Giấy tờ (thẻ mỗi con) và từ `CẦN CHÚ Ý` trên Nhà mình khi có mốc tiêm gần. Tab thứ năm sẽ làm loãng câu hỏi trung tâm.

**Không có tab Trao đổi.** Cờ cần trao đổi hiện trong ngữ cảnh khoản tiền và trên màn hình chính.

Badge trên tab: chỉ tab Tiền, chỉ khi trạng thái là `tight`. Không badge đếm số — đếm số tạo áp lực và mâu thuẫn với nguyên tắc không kiểm soát.

---

## 3. Onboarding

### 3.1 Sign in `P0`

Một màn hình. Tên app, một dòng định vị, hai nút.

> **Nhà mình**
> Hai người cùng nhìn thấy những gì sắp tới — và cần chuẩn bị bao nhiêu.
>
> [ Tiếp tục với Google ]
> [ Tiếp tục với Apple ]

Dòng định vị đổi theo concept v2: nói về *phía trước*, không liệt kê bốn module.

Không có màn hình giới thiệu nhiều trang. Giá trị phải hiện ra từ dữ liệu thật, không từ slide.

### 3.2 Setup `P0`

```
Bắt đầu

[ Tạo nhà mới ]
[ Tôi có mã mời ]
```

Nhánh tạo mới: hỏi **một** trường — tên hiển thị của bạn ("Vợ", "Chồng", hoặc tên riêng). Tên household mặc định "Nhà mình", sửa sau được.

Nhánh mã mời: ô 6 ký tự, tự viết hoa, tự bỏ khoảng trắng. **Người tham gia bỏ qua 3.3 và 3.4** — họ vào thẳng dữ liệu đã có.

### 3.3 Ngưỡng ghi `P0`

Một câu, bốn nút, bỏ qua được.

```
Khoản từ bao nhiêu trở lên
thì nhà mình ghi lại?

[ 500 nghìn ]  [ 1 triệu ]
[ 2 triệu   ]  [ Tự quyết ]

Đổi lúc nào cũng được.
```

Đây không phải cài đặt kỹ thuật — đây là hai người tự chốt một quy ước, app chỉ lưu lại kết quả. Nhờ nó, việc người kia không ghi gì có nghĩa rõ ràng.

Sau đó **không bao giờ hỏi lại**, và không bao giờ chặn ai ghi khoản nhỏ hơn ngưỡng.

### 3.4 Gói khởi tạo `P0`

Danh sách tick, **không phải form**. Dưới 20 giây.

```
Nhà mình thường có những việc này.
Chọn cái nào đúng:

☑ Tết Nguyên đán
☐ Giỗ — chọn ngày sau
☑ Sinh nhật bố mẹ hai bên
☑ Đăng kiểm xe
☑ Bảo hiểm xe
☐ Học phí

[ Thêm vào ]        [ Để sau ]
```

Nguyên tắc "không ép nhập dữ liệu ban đầu" vẫn giữ — tick một danh sách gợi ý không phải nhập liệu. Nhưng app phụ thuộc mật độ dữ liệu: một household trống ngày đầu là một household chết.

Mục nào cần ngày (giỗ, học phí) thì tạo ở trạng thái chưa có ngày và hiện trong CẦN CHÚ Ý cho tới khi được bổ sung.

### 3.5 Sau khi vào `P0`

Đi thẳng vào màn hình chính. Thẻ mời người thứ hai nằm ngay trên đó, không nhét vào cài đặt.

---

## 4. Nhà mình `P0`

Trả lời trong ba giây: *nhà mình sắp có gì và cần chuẩn bị bao nhiêu?*

```
┌─────────────────────────────────────────┐
│ ┌──────┐                                │
│ │  30  │   Nhà mình              (avt)  │
│ │Thứ 5 │                                │
│ │16/6 â│                                │
│ └──────┘                                │
├─────────────────────────────────────────┤
│  BA THÁNG TỚI                           │
│  32.000.000 ₫                           │
│  ● Ổn — không có khoản nào gấp          │
│                                         │
│  Tài sản dùng ngay 45.000.000 ₫         │
│  Anh cập nhật 2 tuần trước          ›   │
├─────────────────────────────────────────┤
│  CẦN MUA                            3 › │
│  Nước mắm · Giấy vệ sinh · Sữa cho bé   │
├─────────────────────────────────────────┤
│  HÔM NAY                                │
│  ○ Đổ rác                               │
│  ○ Thanh toán tiền internet             │
├─────────────────────────────────────────┤
│  CUỐI TUẦN                              │
│  ◆ Giỗ ông ngoại — CN 15/8 âm           │
│    Chuẩn bị quà ~1.000.000 ₫            │
├─────────────────────────────────────────┤
│  CẦN CHÚ Ý                              │
│  ▸ Bảo hiểm xe hết hạn sau 25 ngày      │
│  ▸ Đám cưới tháng sau chưa ghi chi phí  │
└─────────────────────────────────────────┘
```

**Thẻ hero là "BA THÁNG TỚI".** Đây là thay đổi lớn nhất so với bản trước: thẻ trạng thái tài chính không còn đứng riêng mà gộp vào đây. Con số cần chuẩn bị là thứ người dùng đến app để biết; trạng thái chỉ là một dòng bổ nghĩa.

**Nhãn thời gian bắt buộc.** Mọi con số tổng đều kèm `formatDeclaredAt`. Không có đường nào hiển thị "45.000.000 ₫" trần trụi.

**Dữ liệu:** một lần fetch — `home_feed` + `finance_metrics` + `upcoming_needs`. Trạng thái và dự tính tính ở client.

**Nhóm:** `BA THÁNG TỚI` · `CẦN MUA` · `HÔM NAY` · `CUỐI TUẦN` · `CẦN CHÚ Ý`. Nhóm rỗng ẩn hẳn.

**`CẦN MUA` là nhóm duy nhất được hiện cả khi mọi thứ khác rỗng** — nó là bề mặt hằng ngày, và là lý do app được mở khi không có sự kiện nào.

Không biểu đồ, không phần trăm hoàn thành, **không so sánh giữa hai người ở bất kỳ đâu**.

**Rỗng lần đầu:**

> **Bắt đầu từ điều gần nhất**
> Thêm một việc, một ngày giỗ, hay một khoản sắp phải trả — thứ nào cũng được.
>
> [ Thêm việc ]  [ Thêm sự kiện ]  [ Chụp màn hình Zalo ]

Kéo xuống để làm mới. Không auto-refresh theo chu kỳ.

---

## 5. Việc & Sự kiện

Tab con: **Việc** | **Mua sắm** | **Sự kiện**. Ghi nhớ tab con đã chọn lần trước.

### 5.1 Việc `P0` — hai danh sách

Tab con thứ nhất chia làm hai: **Định kỳ** | **Linh hoạt**. Hai loại việc này khác bản chất, ép chung một mô hình thì hỏng cả hai (`03 §4b`).

Điểm chung của cả hai: chạm ô tròn → xong ngay (optimistic + rung nhẹ). Không hộp xác nhận, không hoạt ảnh ăn mừng, không điểm, không chuỗi ngày. Đúng hai trạng thái — không có "đang làm", không có bước nhận việc.

#### Định kỳ

Việc lặp lại, có giờ: rửa bát, đổ rác, tưới cây.

Nhóm theo ngày: Quá hạn · Hôm nay · Ngày mai · Tuần này · Sau đó · Không có hạn.

**Nhóm theo ngày, không bao giờ nhóm theo người.** Không có hai cột trong đó một cột dài hơn.

Mỗi dòng: ô đánh dấu tròn · tên việc · chip người phụ trách (nếu có) · biểu tượng lặp.

- **Chạm chip người phụ trách → đổi ngay tại chỗ.** Ai cũng đổi được, bất cứ lúc nào, không hỏi, không sinh thông báo. Chính quyền sửa tự do này khiến cái tên là thỏa thuận chứ không phải mệnh lệnh.
- **Không vuốt để hoãn.** Việc định kỳ không hoãn được: `dueDate` của việc lặp là *mốc neo*, không phải một lần xảy ra — hoãn một lần sẽ âm thầm dời cả chuỗi. Chỉ còn vuốt để xoá (hoàn tác 5 giây).
- Chạm dòng → chi tiết.

**Chỉ hai chế độ người phụ trách:** không gán (việc của nhà) hoặc có tên. **Không có luân phiên tự động** — lý do ở `10 §2.2`.

#### Linh hoạt

Việc phát sinh, không gấp, ai làm cũng được: lau quạt trần, gọi thợ sửa ống nước, đặt vé máy bay.

Một danh sách phẳng, không chia nhóm: chưa xong trước, rồi theo thứ tự thêm vào. **Không bao giờ sắp hay nhóm theo người** — một danh sách tồn đọng xếp theo tên là hai cột trong đó một cột dài hơn.

**Mặc định không có tên, và không gán được cho người kia.** Ai rảnh thì tự nhận, hoặc làm xong tick luôn. Chip người phụ trách hoặc ẩn hẳn, hoặc chỉ chọn được chính mình.

> Đây là ranh giới giữ cho nó là **danh sách việc của nhà**, chứ không phải hộp thư nhiệm vụ mà một người gửi cho người kia.

Vuốt trái → hoãn sang mai (ở đây thì hoãn được — việc một lần có một cái hạn thật). Vuốt phải → xoá.

Nhắc chuẩn bị của sự kiện (`03 §5b`) sinh việc vào **danh sách này**.

### 5.2 Chi tiết việc `P0`

Tên · người phụ trách · ngày & giờ · lặp lại · nhắc trước · ghi chú · sự kiện liên quan.

Việc lặp: hiện 5 lần gần nhất — **chỉ làm/không làm theo ngày, không hiện ai làm**. `completed_by` vẫn ghi trong DB để hoàn tác, không bao giờ lên UI.

```
Bốn lần gần nhất
T6 26/9  ✓      T3 23/9  ✓
T6 19/9  —      T3 16/9  ✓
```

Sửa trực tiếp tại chỗ, không cần vào form riêng.

### 5.3 Mua sắm `P0`

Danh sách phẳng. Một ô nhập cố định trên cùng, bàn phím giữ nguyên sau khi thêm để gõ liên tiếp.

```
[ Thêm đồ cần mua…                    ]

○ Nước mắm
○ Giấy vệ sinh
○ Sữa cho bé
✓ Bột giặt          (mờ dần, biến mất sau 24h)
```

Cố ý **không có**: số lượng, giá, phân loại, cửa hàng, gán người mua. Thêm bất kỳ thứ nào trong số đó là biến danh sách thành việc được giao — và mất đúng lý do module này tồn tại.

**Không có thông báo khi người kia thêm đồ.** Push mỗi lần thêm một chai nước mắm sẽ khiến người dùng tắt thông báo trong tuần đầu.

### 5.4 Sự kiện `P0`

Danh sách theo thời gian, sắp theo `nextOccurrenceDate`. Chia mốc theo tháng.

```
THÁNG 10
◆ Giỗ ông ngoại          15/8 âm — CN 5/10
  Nhà vợ · ~1.000.000 ₫ · năm ngoái 3.200.000 ₫
◆ Đăng kiểm xe                      20/10
  2 việc cần chuẩn bị
```

Ngày âm hiện **cả hai** và ngày âm màu son. Đây là điểm khác biệt bản địa rõ nhất — đừng giấu.

Chip bên gia đình: `Nhà chồng` / `Nhà vợ` / `Cả hai`.

### 5.5 Chi tiết sự kiện `P0`

Sự kiện là **trung tâm ngữ cảnh** của cả app.

```
Giỗ ông ngoại
Chủ nhật 5/10 · 15/8 âm lịch
Nhà vợ · Quê ngoại

NĂM NGOÁI
3/10/2025 — thực tế 3.200.000 ₫

VIỆC CẦN CHUẨN BỊ
○ Mua quà
○ Đặt xe

CHI PHÍ
Quà biếu            1.000.000 ₫

GIẤY TỜ
(chưa có)

[ Thêm việc ] [ Thêm khoản ] [ Gắn giấy tờ ]
```

Ba nút dưới tạo bản ghi đã gắn sẵn `eventId`. Đây là cách nguyên tắc "mọi thông tin phải có ngữ cảnh" được thực thi mà không bắt người dùng hiểu khái niệm liên kết.

**Khối NĂM NGOÁI** là lý do người dùng không hủy gói vào năm thứ hai. Nếu household chưa trả phí và bản ghi cũ hơn 12 tháng: hiện khối mờ kèm một dòng giải thích, không doạ.

### 5.6 Form sự kiện `P0` — cần cẩn thận nhất

Chọn lịch âm thì bộ chọn ngày đổi sang **ngày–tháng âm**, có ô "tháng nhuận", và hiện ngay dòng xem trước:

> Năm nay rơi vào **Chủ nhật 5/10**

Không có dòng xem trước đó, người dùng sẽ không tin app hiểu lịch âm — và mất niềm tin ở đúng tính năng khác biệt nhất.

Mặc định cho `kind = death_anniversary` hoặc `birthday`: lịch âm, lặp hằng năm, nhắc trước 3 ngày.

Nếu sự kiện này đã có lần diễn ra trước: ô chi phí dự kiến điền sẵn số thực tế năm ngoái.

**Nhắc kép** (`03 §5b`): ngoài "Nhắc trước" đã có, thêm trường **"Nhắc chuẩn bị"** — 1, 2 hoặc 3 ngày, hoặc không. Dòng giải thích ngay dưới: *"Sẽ thêm một việc vào danh sách linh hoạt"* — người dùng cần biết nó **sinh việc**, không phải bắn thêm một thông báo nữa.

**Thẻ của con** (`kind = 'child'`): chọn `kind` này thì hiện thêm ô chọn con. Mỗi con một màu, lấy từ `Member.colorKey`. Dùng cho lịch tiêm, họp phụ huynh, thi học kỳ, sinh nhật bạn cùng lớp, lịch học bơi.

### 5.7 Hỏi chi phí thực tế `P0`

Sau khi một sự kiện có `estimatedCost` trôi qua, lần mở app kế tiếp hiện **một** sheet, bỏ qua được:

```
Giỗ ông ngoại đã xong.
Thực tế hết bao nhiêu?

[ 3.200.000        ]

[ Lưu ]   [ Bỏ qua ]
```

Hỏi **một lần duy nhất**. Bỏ qua thì không bao giờ hỏi lại về sự kiện đó. Đây là chỗ duy nhất app hỏi về một con số đã qua, và nó tồn tại chỉ để nuôi trí nhớ năm sau.

---

## 6. Tiền

### 6.1 Sắp tới `P0` — màn hình chính của module

```
┌─────────────────────────────────────────┐
│  BA THÁNG TỚI                           │
│  32.000.000 ₫                           │
│  theo những khoản nhà mình đã ghi       │
├─────────────────────────────────────────┤
│  THÁNG 9                 25.000.000 ₫   │
│  Học phí con             25.000.000 ₫   │
│                                         │
│  THÁNG 10                 5.000.000 ₫   │
│  Giỗ ông ngoại            3.000.000 ₫   │
│  Cưới em Hằng             2.000.000 ₫   │
│                                         │
│  THÁNG 11                 2.000.000 ₫   │
│  Đăng kiểm xe             2.000.000 ₫   │
├─────────────────────────────────────────┤
│  Tài sản dùng ngay       45.000.000 ₫   │
│  Anh cập nhật 6 tuần trước              │
│                                         │
│  Còn lại dự kiến         13.000.000 ₫   │
├─────────────────────────────────────────┤
│  MỤC TIÊU — CÓ THỂ HOÃN                 │
│  Góp quỹ du lịch          5.000.000 ₫   │
├─────────────────────────────────────────┤
│  Tính toán này dựa trên số dư ghi       │
│  6 tuần trước — còn đúng không?         │
│  [ Cập nhật ]        [ Bỏ qua ]         │
└─────────────────────────────────────────┘
```

Ba nguồn được trộn vào một danh sách: khoản sắp trả, chi phí sự kiện, phí gia hạn giấy tờ. Người dùng không cần biết chúng đến từ ba bảng.

**Dòng "theo những khoản nhà mình đã ghi" là bắt buộc và không được rút gọn.** Đây là một dự tính, không phải một báo cáo.

**Dòng hỏi lại ở cuối chỉ hiện khi `shouldAskForRefresh()` trả true** — tức là có khoản lớn sắp tới *và* số dư đã cũ. Không theo lịch. Bỏ qua thì im 14 ngày.

Nếu thiếu: dòng "Còn lại dự kiến" đổi thành `Thiếu khoảng 14.000.000 ₫`, màu theo token `tight`, không kèm lời khuyên.

#### Hai khối, một con số

Khối `MỤC TIÊU — CÓ THỂ HOÃN` nằm **dưới** khối đối chiếu, và **không nằm trong bất kỳ phép cộng nào**: không vào con số hero, không vào tổng tháng, không vào "Còn lại dự kiến", không vào "Thiếu khoảng".

Vì sao vẫn để cùng màn hình: hai người cần thấy tháng 9 đóng học phí xong thì quỹ du lịch phải chậm lại. Nhưng **cùng màn hình không phải cùng một con số** — nghĩa vụ và nguyện vọng trộn vào một số làm số đó mất nghĩa (`08 §2.3`, sửa cơ chế ở `10 §5`).

Khối này ẩn hẳn khi chưa có mục tiêu nào có `targetDate`.

### 6.2 Tổng quan `P0`

```
┌─────────────────────────────────────────┐
│  ● Cần chú ý                            │
│  Có 2 khoản đến hạn trong 7 ngày.       │
│  [ Xem những gì sắp tới ]               │
├─────────────────────────────────────────┤
│  Có thể dùng ngay        45.000.000 ₫ › │
│  Anh cập nhật 2 tuần trước              │
│  Tiết kiệm & dự phòng   250.000.000 ₫ › │
│  Em cập nhật 3 tháng trước              │
│  Tài sản dài hạn        800.000.000 ₫ › │
│  Đang nợ                180.000.000 ₫ › │
├─────────────────────────────────────────┤
│  SẮP PHẢI TRẢ                       Xem │
│  Học phí       25.000.000 ₫  còn 5 ngày │
│  Tiền nhà       8.000.000 ₫  còn 12 ngày│
├─────────────────────────────────────────┤
│  CẦN TRAO ĐỔI                           │
│  ▸ Sửa xe phát sinh 4.000.000 ₫         │
├─────────────────────────────────────────┤
│  QUỸ CHUNG                          Xem │
│  42.000.000 ₫                           │
│  Ghi lần cuối 5 ngày trước              │
├─────────────────────────────────────────┤
│  MỤC TIÊU                               │
│  Mua nhà      320 / 800 triệu           │
│  ████████░░░░░░░░                       │
│  Em cập nhật 5 tuần trước               │
├─────────────────────────────────────────┤
│  LỊCH SỬ BIẾN ĐỘNG                  Xem │
│  15/9  Sổ tiết kiệm VCB  −30.000.000 ₫  │
│  12/9  Sửa xe             −4.000.000 ₫  │
├─────────────────────────────────────────┤
│  SỔ HIẾU HỈ                         Xem │
│  Tháng này đã đi 3 đám · 6.000.000 ₫    │
└─────────────────────────────────────────┘
```

**Đã bỏ** nút "Cập nhật tình hình".

Khối `MỤC TIÊU` đặt **dưới** tài sản và khoản sắp trả: nó là nguyện vọng, không phải nghĩa vụ. Chỉ ba con số — đã có, mục tiêu, còn thiếu. **Không có tiến độ theo thời gian, không có "mỗi tháng cần góp bao nhiêu", không có đóng góp theo người.**

**Ràng buộc quan trọng nhất của cả spec: không bao giờ tổng hợp tiền theo người.** Không có "Chồng giữ 210tr / Vợ giữ 40tr" ở bất cứ đâu — không biểu đồ, không tổng, không xếp hạng. Người đang giữ chỉ hiện ở cấp từng khoản.

`holderMemberId` tồn tại để trả lời "tiền đang ở đâu", không phải để đối chiếu hai người.

**Mỗi con số tổng kèm nhãn thời gian của chính nó.** Bốn dòng có thể có bốn độ mới khác nhau, và người đọc cần thấy điều đó.

### 6.3 Tài sản `P0`

Danh sách nhóm theo `liquidity`. Mỗi dòng: tên · nơi giữ · giá trị · chip người giữ · **nhãn thời gian luôn hiện**, không chỉ khi cũ hơn 30 ngày.

Chi tiết → nút chính là **Cập nhật giá trị** (sheet: một ô số + ngày + ghi chú). Gọi RPC `update_asset_value`, tự ghi lịch sử và `updated_by`.

Chi tiết có khối **LỊCH SỬ** — mọi lần giá trị đổi:

```
LỊCH SỬ

15/9   250.000.000 → 220.000.000    −30.000.000
       "rút sửa nhà"                    Anh khai

12/7   235.000.000 → 250.000.000    +15.000.000
                                        Em khai
```

Tên người ở đây trả lời *"ai khai con số này"* trong lịch sử của một khoản. Nó không bao giờ được nhóm lại thành tổng theo người.

Form tạo: tên · loại tài sản · giá trị · nơi giữ · người giữ. **Thanh khoản không hỏi** — suy ra từ loại, ẩn sau dòng nhỏ "Đổi cách phân loại".

**Hình dạng form đổi theo loại** — bảng đầy đủ ở `03 §2b`. Bốn trường chung (tên · loại · giá trị · ghi chú) giữ nguyên thứ tự và vị trí khi đổi loại, nên đổi loại không làm form nhảy chỗ; ba thứ đổi là nhãn của ô nơi giữ (hoặc ẩn hẳn với tiền mặt), khối số lượng (chỉ vàng, đặt **trước** ô giá trị vì nó là dữ liệu gốc), và ngày hẹn trả + ẩn người giữ (chỉ khoản cho vay). Ô loại đứng **trước** giá trị và nơi giữ vì nó quyết định hai khối bên dưới hỏi gì — đổi loại ở cuối form sẽ làm những ô vừa điền biến mất.

Màn chi tiết đọc lại **đúng nhãn mà form đã hỏi** (cùng `assetShape()`): hiện "Nơi giữ: Chú Ba" cho một khoản cho vay là gọi sai tên chính dữ liệu người dùng vừa ghi.

Dưới ô nhập tiền, nếu household có ngưỡng: *"Nhà mình ghi từ 2 triệu trở lên"* — một dòng nhắc nhẹ, **không chặn**.

### 6.4 Khoản sắp trả `P0`

Bộ lọc: 7 ngày · 30 ngày · Quá hạn · Đã trả · Lặp lại.

Chi tiết → nút chính **Đã trả** (chọn ngày, mặc định hôm nay). Gọi RPC `settle_payment`. Nếu khoản này sinh từ một khoản nợ, hiện thêm dòng xác nhận: *"Dư nợ Vay mua nhà BIDV sẽ còn 172.000.000 ₫."*

### 6.5 Nợ `P0`

Danh sách: tên · bên cho vay · dư nợ · kỳ trả tiếp theo.

Chi tiết: gốc · dư nợ · lãi suất · tiền mỗi kỳ · ngày tất toán dự kiến · thanh tiến độ đã trả · lịch sử các kỳ đã trả.

### 6.6 Cần trao đổi `P0`

Danh sách cờ đang mở, mỗi mục dẫn tới khoản liên quan.

Gắn cờ: từ chi tiết bất kỳ khoản nào, nút "Cần trao đổi" + ô ghi chú tuỳ chọn.

**Không có luồng bình luận.** Đóng cờ bằng nút "Đã rõ", có thể kèm kết luận ngắn. Cờ tự hết hiệu lực sau 14 ngày.

Gợi ý gắn cờ tự động (Phase 2) **chỉ hiện cho người vừa thay đổi giá trị**, không bao giờ cho người kia — nếu cả hai cùng nhận, nó thôi là ghi chú tự nguyện và thành lời triệu tập.

### 6.7 Mục tiêu `P0`

Danh sách thẻ. Mỗi thẻ: tên · thanh tiến độ · `đã có / mục tiêu` · nhãn thời gian.

Chi tiết: ba con số (đã có, mục tiêu, còn thiếu) + nút **Góp thêm** (RPC `contribute_to_goal`) + lịch sử các lần góp.

**Không** hiện: cần góp bao nhiêu mỗi tháng, còn bao lâu theo tốc độ hiện tại, ai góp bao nhiêu, hay bất kỳ đánh giá nào về tiến độ. App không biết thu nhập và không biết hoàn cảnh; một dòng "bạn đang chậm kế hoạch" với cặp vợ chồng đang chật vật là sự tàn nhẫn được tự động hoá.

Mục tiêu **không** hiện trên Nhà mình — màn hình chính trả lời "sắp có gì và cần chuẩn bị bao nhiêu", mục tiêu không trả lời câu đó.

### 6.8 Lịch sử biến động `P0`

Dòng thời gian của cả nhà: mọi lần một khoản đổi giá trị. Lọc theo khoản và theo khoảng thời gian.

```
THÁNG 9 · 5 khoản nhà mình đã ghi        −12.000.000 ₫

15/9  Sổ tiết kiệm VCB      −30.000.000 ₫   Anh khai
      "rút sửa nhà"
12/9  Sửa xe                 −4.000.000 ₫   Em khai
 3/9  Lương tháng 9         +22.000.000 ₫   Anh khai
```

Dòng tổng **bắt buộc kèm số lượng bản ghi và chữ "đã ghi"**. Câu "5 khoản nhà mình đã ghi: −12 triệu" đúng theo đúng nghĩa đen; câu "tháng 9 chi 12 triệu" thì không.

**Chỉ danh sách, không bao giờ biểu đồ.** Khi vẽ tổng theo tháng thành đường, tháng nào hai người bận quên ghi sẽ trông y hệt một tháng tiết kiệm — và app vừa nói dối rất thuyết phục. Danh sách không có vấn đề đó vì không ai nhìn danh sách rồi kết luận nó đầy đủ.

Đây là màn hình khiến người không giữ tiền cảm thấy nắm tình hình: niềm tin đến từ việc **thấy được thay đổi**, không phải từ con số hiện tại.

---

### 6.9 Quỹ chung `P0`

Tiền nhà, ăn uống, điện nước của cặp ở riêng. Tần suất nhập cực thấp — 2–4 lần một tháng — nên nó không kéo sản phẩm về phía app thu chi.

```
┌─────────────────────────────────────────┐
│  Quỹ sinh hoạt                          │
│  42.000.000 ₫                           │
│  Ghi lần cuối 5 ngày trước              │
│                                         │
│  [ Bỏ vào ]          [ Rút ra ]         │
├─────────────────────────────────────────┤
│  ‹     THÁNG 9, 2026     ›              │
│                                         │
│  Bỏ vào            +20.000.000 ₫        │
│  Rút ra            −13.500.000 ₫        │
│  ────────────────────────────────       │
│  4 khoản nhà mình đã ghi                │
│                                         │
│  NGƯỜI BỎ VÀO                           │
│  Anh                10.000.000 ₫  2 lần │
│  Em                 10.000.000 ₫  2 lần │
├─────────────────────────────────────────┤
│  5/9   Bỏ vào       +10.000.000 ₫   Anh │
│        tiền nhà tháng 9                 │
│  5/9   Bỏ vào       +10.000.000 ₫    Em │
│  12/9  Rút ra        −8.500.000 ₫       │
│        tiền nhà                         │
│  20/9  Rút ra        −5.000.000 ₫       │
│        điện nước + internet             │
└─────────────────────────────────────────┘
```

**Số dư là "ghi lần cuối", không phải "khai lần cuối".** Khác `assets.currentValue`: số dư quỹ là tổng của những khoản đã ghi, không phải một con số ai đó nói ra. Câu chữ nhãn thời gian phải phản ánh đúng điều đó.

#### Khối NGƯỜI BỎ VÀO — ngoại lệ duy nhất, và ranh giới của nó

Đây là chỗ duy nhất trong toàn app hiện **tổng tiền theo người**. Nó hợp lệ vì và chỉ vì:

- Nằm **trong một tháng**, và tháng đó hiện rõ ngay phía trên.
- Kèm **số lần**, đúng quy tắc "tổng phải kèm số lượng bản ghi".
- Sắp **theo tên, ABC** — không theo số tiền. Sắp theo tiền là một bảng xếp hạng.
- Chỉ có ở màn hình này.

**Không bao giờ có:** dòng tổng cộng dồn qua các tháng · câu "còn thiếu" hay "chưa góp" · tỷ lệ phần trăm so với một mức chuẩn · dấu hiệu màu nào cho người góp ít hơn · khối này ở màn hình khác.

Phép thử khi review: *con số này có vắt qua nhiều hơn một tháng không?* Có → sai. Đầy đủ ở `03 §9` ngoại lệ 2 và `10 §3`.

#### Ba tình huống app phải im lặng

1. **Một người bỏ vào ít hơn tỷ lệ đã chốt.** Không đánh dấu, không đổi màu, không cảnh báo. Con số hiện đúng như nó là, hai người tự nói với nhau.
2. **Đóng góp không bằng tiền.** Nghỉ thai sản, chăm con, bên nội ngoại đỡ tiền nhà — quỹ không có ô nào ghi được, nên mọi kết luận rút từ riêng con số đều thiếu.
3. **Chi cho nhà bằng tiền riêng.** Ghi ở khoản vừa và lớn, **không cộng vào phần bỏ vào quỹ** — hai loại không cùng đơn vị.

#### Form nạp / rút

Một sheet, bốn trường: số tiền · ngày · **mục đích** · người bỏ vào.

- **Mục đích bắt buộc khi rút**, tuỳ chọn khi bỏ vào. Rút mà không ghi để làm gì thì tháng sau không ai nhớ.
- **Người bỏ vào là ô chữ tự do**, điền sẵn tên hai vợ chồng dưới dạng chip bấm nhanh — nhưng gõ được tên khác (bố mẹ đưa, em ruột góp). Không phải khoá ngoại.
- Chỉ hiện ô "người bỏ vào" khi nạp. Rút thì **không hỏi ai rút** — tiền đã vào quỹ là tiền chung.

Sửa và xoá được một khoản đã ghi: gõ nhầm số tiền phải sửa được, và số dư tính lại từ các dòng còn lại.

---

## 6b. Sổ hiếu hỉ `P0`

Trước gọi là "sổ mừng cưới". Cưới chỉ là **một trong tám dịp** — tân gia, đầy tháng, giỗ, thôi nôi là những dịp ngang hàng, không phải ngoại lệ của cưới (`07 §3`).

### 6b.1 Danh sách

Ba tab con: **Đã đi** | **Đã nhận** | **Chưa đáp lễ**. Mặc định sắp theo **ngày**, mới nhất trước.

```
THÁNG 10
Chú Ba          cưới con      2.000.000 ₫  ›
Cô Tư           tân gia       1.000.000 ₫  ›
```

Sắp theo số tiền là **tuỳ chọn**, và không bao giờ kèm nhãn kiểu "mừng nhiều nhất". Xếp hạng họ hàng theo độ hào phóng là thứ khiến người dùng thấy app bẩn.

Tab **Chưa đáp lễ** sắp theo **ngày nhận**, cũ nhất trước — nghĩa vụ lâu nhất nằm trên. **Không có dòng tổng ở cuối** (`07 §3.6`):

```
CHƯA ĐÁP LỄ
Chú Ba          cưới, 3/2023      2.000.000 ₫  ›
Cô Tư           đầy tháng, 5/2024   500.000 ₫  ›
                      ← không có "tổng 2.5 triệu"
```

### 6b.2 Chi tiết một contact

```
Chú Ba
Chú ruột bên nội

ĐÃ MỪNG NHÀ MÌNH        2 lần
3/2023  cưới       2.000.000 ₫   đã đáp lễ
8/2021  đầy tháng  1.000.000 ₫   chưa đáp lễ

NHÀ MÌNH ĐÃ ĐI          1 lần
11/2026 cưới con   2.000.000 ₫
```

Hai chiều **song song**, không bao giờ trừ nhau. Không có dòng "còn thiếu 1 triệu" — dữ liệu đủ để tính, và đó chính là lý do phải nói rõ là không tính.

Trạng thái đáp lễ hiện bằng **chữ thường, màu phụ** — không màu cảnh báo, không chấm đỏ, không đậm. "Chưa đáp lễ" là một việc chưa có dịp làm, không phải một hạn đã trôi qua: nghĩa vụ đáp lễ **không có hạn**. Một chấm đỏ ở đây biến quyển sổ họ hàng thành danh sách nợ quá hạn.

Chạm một khoản **nhận** để bật/tắt *"không cần đáp lễ"* (`07 §3.4b`) — bố mẹ mừng con, người trên mừng người dưới, người đã mất. Hỏi lại trước khi bật vì đó là một khẳng định về quan hệ; tắt thì không hỏi.

### 6b.3 Ghi một khoản mừng — vòng lặp quan trọng nhất

Cùng dịp → có nút. Đây là trường hợp module tồn tại vì nó:

```
Cưới con chú Ba — 12/11

Dịp                 [ Cưới ]  ← không chip nào chọn sẵn
Số tiền mừng        [                ]

  Chú Ba đã mừng nhà mình
  2.000.000 ₫ — cưới, 3/2023
  Chưa đáp lễ
  [ Dùng số này ]
```

Khác dịp → **có dữ kiện, không có nút**. Mức tiền gắn với dịp, không gắn với nhà (`07 §3.4`):

```
Tân gia nhà chú Ba — 12/11

  Chú Ba đã mừng nhà mình
  2.000.000 ₫ — cưới, 3/2023
  Chưa đáp lễ
                    ← không có [ Dùng số này ]
```

Khi nhà này còn khoản chưa đáp lễ, form hiện thêm ô chọn **"Khoản nào?"** để ghép cặp — **nằm dưới ô số tiền**, không phải trên: dòng gợi ý vừa nói nhà này đã mừng mình bao nhiêu và chưa đáp lễ, nên hỏi "đáp khoản nào" trước khi người dùng đọc được điều đó là hỏi một câu chưa có ngữ cảnh.

Ghép cặp là **tuỳ chọn** — không phải lần đi nào cũng để đáp một lần nhận cụ thể, và bỏ qua vẫn lưu bình thường. Chạm lại chip đang chọn để **bỏ chọn**. Nhãn mỗi lựa chọn là *dịp · ngày*, **không có số tiền**: đây là chọn "đáp lần nào", không phải "trả bao nhiêu".

Đây cũng là **chỗ duy nhất** app nhắc nghĩa vụ đáp lễ. Không có thông báo đẩy, không có nhắc định kỳ — không có dịp thì không làm gì được, và một lời nhắc không hành động được chỉ tạo áy náy.

Ở chiều **nhận** (và dịp ≠ tang lễ), form hiện thêm ô tích *"Không cần đáp lễ"* (`07 §3.4b`). Đặt ngay ở form tạo chứ không chỉ ở màn chi tiết: người ghi **biết ngay lúc nhập** rằng đây là bố mẹ mừng con — bắt họ lưu xong rồi đi tìm lại khoản đó để tắt là ba bước cho một điều họ đã biết từ đầu.

Đổi chiều hoặc đổi sang dịp tang lễ thì **xoá cả hai trạng thái trên**. Giữ lại thì ô tích vẫn hiện đã bật trong khi lệnh lưu đã lọc nó đi — người dùng thấy một thứ và app ghi một thứ khác.

Không có dòng gợi ý đó thì module này chỉ là một cái Excel có màu. Có nó thì app trả lời được câu mà không ai trả lời được.

### 6b.4 Nhập nhanh — 100 phong bì

Chiều, **dịp**, và ngày chọn **một lần cho cả mẻ**; mỗi dòng chỉ gõ tên và số tiền.

Dịp cũng **không có mặc định**, và ở đây hậu quả nặng hơn form đơn: chip "Cưới" sáng sẵn trong lúc người nhập đang tập trung gõ tên với số tiền sẽ ghi sai dịp cho **cả mẻ** mà không ai nhìn lại. Nút lưu **nói ra** vì sao chưa lưu được ("Chọn dịp") thay vì mờ đi không lý do.

**Không có ô "không cần đáp lễ" cho cả mẻ.** Một mẻ 100 phong bì ở đám cưới mình gồm cả bố mẹ (không cần đáp) lẫn họ hàng bạn bè (có nghĩa vụ). Một cái tích cho cả mẻ sẽ tắt sạch nghĩa vụ của 99 nhà để đúng cho một nhà, và không ai đi kiểm lại 100 dòng. Tắt từng khoản ở màn chi tiết từng nhà — chậm hơn nhưng đúng.

App đưa ra một dữ kiện, người dùng quyết định. **Không nội suy, không điều chỉnh lạm phát, không làm tròn "cho đẹp"** — mọi phép điều chỉnh đều là app có ý kiến về chuyện nên đi bao nhiêu, mà chuyện đó thuộc về hai vợ chồng.

### 6b.4 Nhập hàng loạt

Ngày cưới nhận 100 phong bì. Chế độ nhập nhanh: tên + số tiền, Enter, lặp lại, bàn phím không tắt, gợi ý tên từ contact đã có.

Kèm luồng AI: **chụp ảnh trang sổ ghi tay → parse thành danh sách tên + tiền → xác nhận từng dòng.** Đây là chỗ AI capture có giá trị rõ nhất trong toàn app, vì thay thế đúng 30 phút gõ tay.

Sau đám: hiện tổng — nhận được bao nhiêu, từ bao nhiêu nhà.

### 6b.5 Không có

Không xuất file, không chia sẻ ảnh, không link ra ngoài household. Dữ liệu này lộ ra là một sự cố xã hội thật.

---

## 6c. Hồ sơ con `P0`

Vào từ tab Giấy tờ (thẻ mỗi con), hoặc từ `CẦN CHÚ Ý` khi có mốc tiêm gần.

```
Bé An · 14 tháng

SẮP TỚI
◆ Sởi - Rubella (MR)      mũi 1     còn 9 ngày
◆ Khám định kỳ 15 tháng             25/9

ĐÃ TIÊM                                12 mũi ›
CHIỀU CAO · CÂN NẶNG                        ›
GIẤY TỜ                                4 mục ›
HỌC PHÍ, BHYT                               ›
```

### 6c.1 Lịch tiêm

Sinh tự động từ `birthday` khi thêm member role `child`. Đây là nguồn mật độ dữ liệu lớn nhất trong toàn app — một hộ mới có con sẽ có ngay hàng chục mốc **thật**, không phải dữ liệu mẫu.

Mỗi mũi: tên · mốc tuổi · ngày dự kiến · trạng thái. Đánh dấu đã tiêm = một sheet: ngày + nơi tiêm.

**Luôn có dòng này ở đầu danh sách:**

> Lịch tham khảo theo Chương trình Tiêm chủng mở rộng. Hãy xác nhận với cơ sở tiêm chủng.

Mũi trễ hiện là **"quá lịch 12 ngày"** kèm gợi ý liên hệ cơ sở tiêm. Không dùng chữ trách móc: không "bạn đã bỏ lỡ", không "chưa hoàn thành".

**Không có** nút bỏ mũi, hoãn mũi, hay đổi thứ tự. App không bao giờ gợi ý những việc đó.

Nhắc trước 7 ngày, hiện cả trên `CẦN CHÚ Ý` ở Nhà mình.

### 6c.2 Chiều cao cân nặng

Nhập: ngày + chiều cao + cân nặng. Hiện dạng bảng và một đường đơn giản theo thời gian.

**Không diễn giải.** Không bách phân vị, không "so với chuẩn WHO", không màu xanh đỏ, không cảnh báo, không so sánh giữa các con. Bố mẹ mới rất dễ lo lắng, và một nhãn đỏ do app tự tính sẽ gây hoảng mà không giúp được gì — việc đánh giá thuộc về bác sĩ.

### 6c.3 Phần còn lại

Giấy tờ của con (khai sinh, BHYT, hồ sơ trường), học phí, lịch khám: **không có cấu trúc mới**. Đó là `documents`, `upcoming_payments`, `events` đã có, chỉ được lọc theo `owner_member_id`.

---

## 7. Giấy tờ

### 7.1 Danh sách `P0`

Lưới thumbnail hoặc danh sách (đổi được). Mặc định sắp theo ngày hết hạn gần nhất. Sắp hết hạn trong 30 ngày: viền amber.

Lọc: Tất cả · Sắp hết hạn · Theo người · Theo loại.

### 7.2 Chi tiết `P0`

```
Bảo hiểm xe
Thuộc về: chồng

Hết hạn 15/10                  còn 25 ngày
Bản giấy: ngăn kéo phòng làm việc
Phí gia hạn dự kiến: 12.000.000 ₫

[ ảnh 1 ] [ ảnh 2 ] [ + ]

Liên quan: Đăng kiểm xe 20/11
```

**Vị trí bản giấy là trường quan trọng nhất** trên màn hình này và phải nổi bật. Đây là thứ Google Drive không làm được, và là nhu cầu thật: giấy tờ quan trọng thường chỉ một người biết chỗ.

`renewalCost` tự động chảy vào màn hình "Sắp tới" (6.1) khi ngày hết hạn lọt vào 90 ngày.

### 7.3 Thêm giấy tờ `P0`

Mặc định mở thẳng **máy quét** (VisionKit / ML Kit), không mở thư viện ảnh. Quét nhiều trang vào cùng một giấy tờ.

Sau khi quét, AI đọc thử và **điền sẵn** ba trường: tên · ngày hết hạn · loại. Người dùng luôn nhìn thấy và sửa được trước khi lưu — không bao giờ lưu thẳng.

Trường thứ tư, **bản giấy để đâu**, luôn phải tự gõ. AI không đoán được, và đây là trường có giá trị nhất.

Trạng thái upload hiện từng file, cho thử lại, không chặn màn hình.

### 7.4 Xem file `P0`

Ảnh: phóng to, vuốt qua các trang. PDF: cuộn. Nút chia sẻ dùng share sheet hệ thống.

---

## 8. Cài đặt

| Màn hình | Mức | Nội dung |
|---|---|---|
| Cài đặt | P0 | tên hiển thị, ngôn ngữ, đăng xuất |
| Nhà mình | P0 | tên household, thành viên, thêm thành viên không có tài khoản (con, bố mẹ), **ngưỡng ghi** |
| Mời | P0 | mã 6 ký tự + chia sẻ |
| Gói dịch vụ | P0 | trạng thái, ngày hết hạn, mua/khôi phục |
| Thông báo | P1 | bật/tắt theo loại |
| Dung lượng | P1 | đã dùng / tổng, file lớn nhất |
| Dữ liệu | P1 | xuất JSON, xoá tài khoản |

**Đã bỏ** mục "nhịp cập nhật 7 hay 30 ngày" và card "giá trị đã cứu".

Màn hình Gói dịch vụ không có con số thuyết phục nào do app tự tính. Lý do ở `08 §4`: một khẳng định phản thực (*"app đã cứu bạn 47 triệu"*) không kiểm chứng được, và đặt nó cạnh những con số được gắn nhãn cẩn thận ở khắp phần còn lại sẽ làm hỏng niềm tin vào cả hai.

Thứ thuyết phục người dùng trả tiếp là **trí nhớ năm ngoái** — thứ họ thật sự mất khi hủy — chứ không phải một lời tự khen.

> v3 §7.7 đề nghị khôi phục card này. **Vẫn không khôi phục** — lập luận của `08 §4` không bị v3 phản bác, và chính v3 §10.8 giữ nguyên tắc ngược lại. Xem `10 §6`.

### Giá thử nghiệm

Chưa phải giá chính thức. Giả thuyết: quy đổi dưới ~70.000đ/tháng dễ cân nhắc hơn.

| Gói | Giá |
|---|---|
| 12 tháng | 499.000đ |
| 6 tháng | 299.000đ |
| Tháng | có tồn tại, **không nêu bật** |

**Gói năm nêu trước, gói tháng ở dòng nhỏ.** App tần suất thấp mà bán gói tháng thì bắt người dùng tự hỏi *"mình còn cần cái này không?"* 12 lần mỗi năm, và 8 trong 12 tháng đó không có sự kiện gì.

Một gói cho cả household. **Quyền xem không bao giờ bị khoá** — người thứ hai gặp paywall là app chết.

---

## 9. Luồng

### F1 · Người đầu tiên, từ cài đặt đến dữ liệu đầu tiên `P0`

```
Sign in → Setup (tạo nhà, tên hiển thị)
   → Ngưỡng ghi (một chạm)
   → Gói khởi tạo (tick 4 mục, [Thêm vào])
   → Nhà mình ĐÃ CÓ NỘI DUNG ngay lần mở đầu
   → thẻ mời hiện ngay
```

Mục tiêu: dưới 90 giây từ mở app lần đầu tới màn hình chính có nội dung. Khác bản trước ở chỗ **nội dung đầu tiên đến từ gói khởi tạo**, không phải từ việc người dùng tự nghĩ ra thứ để nhập.

### F2 · Mời và tham gia `P0` — luồng sống-còn

```
Người A: Nhà mình → thẻ mời → [Chia sẻ qua Zalo]
   → share sheet hệ thống, kèm deep link family://join/K7M2PQ

Người B: chạm link
   → chưa cài app → store → cài → mở → deep link giữ nguyên
   → Sign in → tự nhảy vào join/K7M2PQ → xác nhận tên hiển thị
   → Nhà mình ĐÃ CÓ DỮ LIỆU của A (bỏ qua ngưỡng ghi và gói khởi tạo)

Cả hai nhận thông báo.
```

Người thứ hai **không bao giờ** thấy màn hình rỗng.

Nhắc lại thẻ mời vào ngày 2 và ngày 7 nếu chưa ai tham gia. Sau đó dừng.

**App phải dùng được đầy đủ khi chỉ một người.** Không có tính năng nào bị chặn vì "chưa có người thứ hai", không có màn hình nào nói app chưa hoạt động. Người thứ hai là phần thưởng, không phải điều kiện.

### F3 · Nhìn lướt hằng ngày `P0`

```
Mở app → Nhà mình (cache hiện ngay, refetch nền)
   → chạm ô tròn "Đổ rác" → xong, rung nhẹ
```

Không màn hình trung gian, không xác nhận. Đây là tương tác thường xuyên nhất của cả app và phải là một chạm.

### F4 · Chụp màn hình Zalo → sự kiện `P0` — luồng sống-còn thứ hai

Thay cho luồng cập nhật tuần cũ.

```
Trong Zalo: nhóm họ hàng chốt "giỗ ông 15/8 âm, mỗi nhà góp 2 triệu"
   → chụp màn hình → share sheet → chọn Nhà mình
   → capture-review mở, AI đã điền sẵn:
        Sự kiện: Giỗ ông
        Ngày: 15/8 âm lịch  → xem trước "CN 5/10"
        Chi phí dự kiến: 2.000.000 ₫
   → người dùng sửa nếu cần → [Lưu]
   → Nhà mình + màn hình Sắp tới cập nhật ngay
```

Ba ràng buộc:

- **Luôn xác nhận.** Không bao giờ tự tạo bản ghi từ AI. Một ngày giỗ sai do AI đoán sẽ phá niềm tin ở đúng tính năng khác biệt nhất.
- **Kết quả AI chạy qua zod của entity tương ứng** trước khi đổ vào form.
- Hết quota free (5 lần/tháng) → paywall giải thích cụ thể, và **vẫn cho nhập tay** từ chính màn hình đó.

App nằm ở hạ nguồn của Zalo. Nếu luồng này chậm hoặc sai, mọi module đều rỗng — nên nó được dựng ở bước 4, trước cả module tiền.

### F5 · Sự kiện âm lịch với đầy đủ ngữ cảnh `P0`

```
[+] → Sự kiện → tên "Giỗ ông ngoại"
   → chọn Âm lịch → 15/8 → xem trước "CN 5/10" → lưu
Chi tiết sự kiện
   → [Thêm việc] "Mua quà"        (eventId gắn sẵn)
   → [Thêm khoản] 1.000.000 ₫     (eventId gắn sẵn)
→ Nhà mình: việc và khoản tự xuất hiện đúng tuần đó
→ Màn hình Sắp tới: 1.000.000 ₫ vào tháng tương ứng
```

### F6 · Thêm giấy tờ bằng máy quét `P0`

```
[+] → Giấy tờ → máy quét mở ngay
   → quét 2 trang → AI điền sẵn tên, hạn, loại
   → người dùng sửa + gõ "bản giấy ở đâu" → lưu
   → upload chạy nền, có thể rời màn hình
   → tự tạo reminder trước hạn 30 ngày
   → renewalCost (nếu có) chảy vào màn hình Sắp tới
```

Nếu chưa trả phí: vẫn lưu được thông tin và vị trí bản giấy, chỉ chặn phần lưu file.

### F7 · Cần mua, trong siêu thị `P0`

```
Mở app → Nhà mình → card CẦN MUA → chạm
   → danh sách phẳng → tick từng món khi bỏ vào giỏ
   → không rời màn hình, bàn phím không bật
```

Hai chạm từ lúc mở app. Đây là luồng có tần suất cao nhất của cả sản phẩm và là lý do icon app không trôi khỏi màn hình chính.

### F8 · Gắn cờ và gỡ cờ `P0`

```
Chi tiết khoản → [Cần trao đổi] → ghi chú tuỳ chọn → lưu
   → push cho người kia: "Có một khoản cần hai người xem lại."
   → hiện trên Nhà mình mục CẦN CHÚ Ý
Sau khi hai người đã nói chuyện:
   → [Đã rõ] + kết luận ngắn → cờ đóng
```

Nội dung push không bao giờ nêu tên người hay số tiền.

Nếu quá 14 ngày không ai đóng, cờ tự hết hiệu lực.

### F9 · Trả một kỳ nợ `P0`

```
Tiền → Sắp phải trả → "Trả góp nhà tháng 10" → [Đã trả]
   → xác nhận: "Dư nợ sẽ còn 172.000.000 ₫"
   → RPC settle_payment (một transaction)
   → kỳ tiếp theo được Edge sinh ra trong lần cron kế
```

### F10 · Giấy tờ sắp hết hạn `P0`

```
Thông báo local (đặt sẵn từ trước, chạy cả khi offline)
   → mở chi tiết giấy tờ
   → [Tạo việc gia hạn] → việc mới gắn documentId
   → [Ghi khoản chi] → khoản mới với renewalCost điền sẵn
   → reminder.acknowledged_at được ghi
        → đánh dấu cột mốc trial
        → không nhắc lại cùng một hạn
```

### F12 · Đi đám cưới, có gợi ý `P0`

```
Nhận thiệp cưới con chú Ba
   → [+] → Sự kiện "Cưới con chú Ba" 12/11
   → [Thêm khoản mừng] → chọn contact "Chú Ba"
   → app hiện: "Chú Ba đã mừng nhà mình 2.000.000 ₫ — cưới, 3/2023"
   → [Dùng số này] → lưu
   → khoản 2.000.000 ₫ chảy vào màn hình Sắp tới, tháng 11
```

Đây là vòng lặp mà không công cụ nào khác làm được, và là lý do module sổ hiếu hỉ tồn tại.

### F13 · Mũi tiêm sắp tới `P0`

```
Thêm member role='child' + birthday
   → Edge sinh toàn bộ child_vaccine_doses từ vaccine_schedule_items
   → hàng chục mốc thật xuất hiện ngay
Trước hạn 7 ngày:
   → thông báo → mở hồ sơ con
   → [Đặt lịch tiêm] → tạo việc, gắn memberId
Sau khi tiêm:
   → [Đã tiêm] → ngày + nơi tiêm → status = 'done'
```

### F11 · Nâng cấp `P0`

```
Chạm tính năng cần trả phí → paywall
   → giải thích cụ thể đang bị chặn gì, không doạ
   → gói 12 tháng nêu trước, gói tháng ở dòng nhỏ
   → mua qua RevenueCat → webhook → households.subscriptionStatus
   → client refetch household → mở khoá
```

Quyền thuộc household: người kia được dùng ngay, không phải mua lại.

Trial kết thúc theo **cột mốc**, không theo ngày: đã qua 30 ngày *và* đã có ít nhất một nhắc hạn được xác nhận *và* một sự kiện có chi phí đã diễn ra. Trần cứng 90 ngày. Lý do: 30 ngày có thể trôi qua mà không có hạn nào tới, khi đó người dùng chưa từng nhìn thấy sản phẩm hoạt động.

---

## 10. Thứ tự dựng màn hình

Theo phụ thuộc, không theo độ khó:

1. Sign in · Setup · Ngưỡng ghi · Nhà mình rỗng
2. Thêm nhanh · Việc · **Mua sắm** · Chi tiết việc — vòng lặp hằng ngày
3. Mời · Tham gia
4. **Chụp màn hình → capture-review** — kiểm chứng sớm giả thuyết sống còn
5. Sự kiện + lịch âm + gói khởi tạo
6. Tiền: tài sản · khoản sắp trả · **màn hình Sắp tới** · lịch sử biến động
7. Giấy tờ + máy quét + upload
8. **Sổ hiếu hỉ** — đơn giản, không rủi ro, có thứ làm content ngay
9. **Hồ sơ con** — bắt đầu sau khi file lịch tiêm đã được xác nhận
10. Nợ · Cần trao đổi · Mục tiêu
11. Cài đặt · Gói dịch vụ
12. Trí nhớ năm ngoái · Tìm kiếm (P2)

**Bước 9 có một phụ thuộc không lập trình được:** file lịch tiêm phải được một người có chuyên môn y tế đọc và xác nhận trước khi phát hành. Khởi động việc đó từ tuần đầu, song song với mọi thứ khác — nó không rút ngắn được.

Hai chỗ đứng sớm là có chủ ý:

- **Mời (bước 3)**: nếu người thứ hai không tham gia được, mọi thứ xây thêm đều vô nghĩa.
- **Chụp màn hình (bước 4)**: nếu luồng này không hoạt động, mọi module đều rỗng — và ta sẽ không biết cho tới khi đã xây xong tất cả.
