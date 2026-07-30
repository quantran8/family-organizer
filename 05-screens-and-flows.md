# 05 — Màn hình & luồng

Danh mục màn hình, bố cục, và luồng hoạt động. Tokens và ngôn ngữ ở `04`.

Cột **Mức**: `P0` bắt buộc cho MVP · `P1` làm nếu không chậm MVP · `P2` sau MVP.

---

## 1. Bản đồ route

Expo Router, file-based.

```
app/
  _layout.tsx                     gate: chờ auth → chọn nhánh
  (auth)/
    sign-in.tsx                   P0
    setup.tsx                     P0   tạo hoặc tham gia household
    join/[code].tsx               P0   đích của deep link
  (app)/
    _layout.tsx                   tab bar 4 tab + nút thêm nhanh
    home/index.tsx                P0
    plan/                         tab "Việc & Sự kiện"
      index.tsx                   P0   tab con Việc | Sự kiện
      task/[id].tsx               P0
      event/[id].tsx              P0
    money/
      index.tsx                   P0
      assets.tsx                  P0
      asset/[id].tsx              P0
      payments.tsx                P0
      payment/[id].tsx            P0
      debts.tsx                   P0
      debt/[id].tsx               P0
      goals.tsx                   P1
      goal/[id].tsx               P1
      attention.tsx               P0
    docs/
      index.tsx                   P0
      [id].tsx                    P0
      viewer/[fileId].tsx         P0
    search.tsx                    P1
    settings/
      index.tsx                   P0
      household.tsx               P0
      invite.tsx                  P0
      notifications.tsx           P1
      storage.tsx                 P1
      subscription.tsx            P0
      data.tsx                    P1   xuất / xoá dữ liệu
  (modals)/
    quick-add.tsx                 P0   sheet
    task-form.tsx                 P0
    event-form.tsx                P0
    asset-form.tsx                P0
    update-asset-value.tsx        P0
    payment-form.tsx              P0
    debt-form.tsx                 P0
    goal-form.tsx                 P1
    doc-form.tsx                  P0
    snapshot-update.tsx           P0   nghi thức cập nhật tuần
    flag-attention.tsx            P0
    paywall.tsx                   P0
```

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

Đúng bốn nhóm thông tin trong tài liệu sản phẩm, không thêm. Nút thêm nhanh nổi góc phải dưới, có mặt trên cả bốn tab. Cài đặt vào qua avatar ở header, không chiếm một tab.

**Không có tab Trao đổi.** Cờ cần trao đổi hiện trong ngữ cảnh khoản tiền và trên màn hình chính.

Badge trên tab: chỉ tab Tiền, chỉ khi trạng thái là `tight`. Không badge đếm số — đếm số tạo áp lực và mâu thuẫn với nguyên tắc không kiểm soát.

---

## 3. Onboarding

### 3.1 Sign in `P0`

Một màn hình. Tên app, một dòng định vị, hai nút.

> **Nhà mình**
> Nơi hai người cùng nhớ việc nhà, sự kiện hai bên, khoản tiền và giấy tờ quan trọng.
>
> [ Tiếp tục với Google ]
> [ Tiếp tục với Apple ]

Không có màn hình giới thiệu nhiều trang. Giá trị phải hiện ra từ dữ liệu thật, không từ slide.

### 3.2 Setup `P0`

```
Bắt đầu

[ Tạo nhà mới ]
[ Tôi có mã mời ]
```

Nhánh tạo mới: hỏi **một** trường — tên hiển thị của bạn ("Vợ", "Chồng", hoặc tên riêng). Tên household mặc định "Nhà mình", sửa sau được.

Nhánh mã mời: ô 6 ký tự, tự viết hoa, tự bỏ khoảng trắng.

### 3.3 Sau khi vào `P0`

**Không** ép nhập dữ liệu ban đầu. Đi thẳng vào màn hình chính ở trạng thái rỗng — trạng thái rỗng đã là lời mời hành động.

Ngoại lệ duy nhất: thẻ mời người thứ hai nằm ngay trên màn hình chính, không nhét vào cài đặt.

---

## 4. Nhà mình `P0`

Trả lời trong ba giây: *nhà mình sắp có gì và cần chuẩn bị gì?*

```
┌─────────────────────────────────────────┐
│ ┌──────┐                                │
│ │  30  │   Nhà mình              (avt)  │
│ │Thứ 5 │                                │
│ │16/6 â│                                │
│ └──────┘                                │
├─────────────────────────────────────────┤
│  ● Ổn                                   │
│  Không có khoản nào cần chuẩn bị gấp.   │
│  Cập nhật 3 ngày trước              ›   │
├─────────────────────────────────────────┤
│  HÔM NAY                                │
│  ○ Chồng đổ rác                         │
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

**Dữ liệu:** một lần fetch — view `home_feed` + `finance_metrics`. Trạng thái tính ở client bằng `computeFinanceStatus`.

**Thẻ trạng thái:** chấm màu + một từ + **một câu giải thích** + độ mới dữ liệu. Nhãn không kèm lý do sẽ bị đọc là phán xét. Chạm → tab Tiền.

**Nhóm:** `HÔM NAY` · `CUỐI TUẦN` (hoặc `TUẦN NÀY`) · `CẦN CHÚ Ý`. Nhóm rỗng ẩn hẳn, không hiện "không có gì".

Không biểu đồ, không phần trăm hoàn thành, không so sánh giữa hai người.

**Rỗng lần đầu:**

> **Bắt đầu từ điều gần nhất**
> Thêm một việc, một ngày giỗ, hay một khoản sắp phải trả — thứ nào cũng được.
>
> [ Thêm việc ]  [ Thêm sự kiện ]

Kéo xuống để làm mới. Không auto-refresh theo chu kỳ.

---

## 5. Việc & Sự kiện

Tab con: **Việc** | **Sự kiện**. Ghi nhớ tab con đã chọn lần trước.

### 5.1 Việc `P0`

Nhóm theo ngày: Quá hạn · Hôm nay · Ngày mai · Tuần này · Sau đó · Không có hạn.

Mỗi dòng: ô đánh dấu tròn · tên việc · chip người phụ trách · biểu tượng lặp.

- Chạm ô tròn → xong ngay (optimistic + rung nhẹ). Không hộp xác nhận, không hoạt ảnh ăn mừng, không điểm, không chuỗi ngày.
- Vuốt trái → hoãn sang mai. Vuốt phải → xoá (có hoàn tác 5 giây).
- Chạm dòng → chi tiết.

Đúng hai trạng thái. Không có "đang làm".

### 5.2 Chi tiết việc `P0`

Tên · người phụ trách · ngày & giờ · lặp lại · nhắc trước · ghi chú · sự kiện liên quan.

Việc lặp: hiện 5 lần gần nhất đã xong, để trả lời "tuần trước có đổ rác không". Đây là dữ liệu cần cho chính giả thuyết validate của bạn.

Sửa trực tiếp tại chỗ, không cần vào form riêng.

### 5.3 Sự kiện `P0`

Danh sách theo thời gian, sắp theo `nextOccurrenceDate`. Chia mốc theo tháng.

```
THÁNG 10
◆ Giỗ ông ngoại          15/8 âm — CN 5/10
  Nhà vợ · ~1.000.000 ₫
◆ Đăng kiểm xe                      20/10
  2 việc cần chuẩn bị
```

Ngày âm hiện **cả hai** và ngày âm màu son. Đây là điểm khác biệt bản địa rõ nhất — đừng giấu.

Chip bên gia đình: `Nhà chồng` / `Nhà vợ` / `Cả hai`.

### 5.4 Chi tiết sự kiện `P0`

Sự kiện là **trung tâm ngữ cảnh** của cả app. Màn hình này gom bốn thứ:

```
Giỗ ông ngoại
Chủ nhật 5/10 · 15/8 âm lịch
Nhà vợ · Quê ngoại

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

Lặp hằng năm: hiện dòng "Năm ngoái: 3/10/2025".

### 5.5 Form sự kiện `P0` — cần cẩn thận nhất

Chọn lịch âm thì bộ chọn ngày đổi sang **ngày–tháng âm**, có ô "tháng nhuận", và hiện ngay dòng xem trước:

> Năm nay rơi vào **Chủ nhật 5/10**

Không có dòng xem trước đó, người dùng sẽ không tin app hiểu lịch âm — và mất niềm tin ở đúng tính năng khác biệt nhất.

Mặc định cho `kind = death_anniversary` hoặc `birthday`: lịch âm, lặp hằng năm, nhắc trước 3 ngày.

---

## 6. Tiền

### 6.1 Tổng quan `P0`

```
┌─────────────────────────────────────────┐
│  ● Cần chú ý                            │
│  Có 2 khoản đến hạn trong 7 ngày.       │
│  [ Cập nhật tình hình ]                 │
├─────────────────────────────────────────┤
│  Có thể dùng ngay        45.000.000 ₫ › │
│  Tiết kiệm & dự phòng   250.000.000 ₫ › │
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
│  MỤC TIÊU                               │
│  Mua nhà        ████████░░░░  40%       │
└─────────────────────────────────────────┘
```

**Ràng buộc quan trọng nhất của cả spec: không bao giờ tổng hợp tiền theo người.** Không có "Chồng giữ 210tr / Vợ giữ 40tr" ở bất cứ đâu — không biểu đồ, không tổng, không xếp hạng. Người đang giữ chỉ hiện ở cấp từng khoản.

`holderMemberId` tồn tại để trả lời "tiền đang ở đâu", không phải để đối chiếu hai người. Tổng hợp theo người là cách nhanh nhất biến sản phẩm thành công cụ kiểm soát, và người giữ tiền sẽ rời app ngay.

### 6.2 Cập nhật tình hình `P0` — nghi thức chính

Vòng lặp thói quen duy nhất có nhịp rõ. Một màn hình, bốn ô, xong dưới 30 giây.

```
Cập nhật tình hình

Tiền có thể dùng ngay   [ 45.000.000 ]
Tiết kiệm & dự phòng    [250.000.000 ]
Tài sản dài hạn         [800.000.000 ]
Đang nợ                 [180.000.000 ]

Có gì cần ghi lại không?
[ tuỳ chọn                            ]

[ Lưu cập nhật ]
```

Điền sẵn giá trị lần trước. Bàn phím số. Lưu xong: toast "Đã cập nhật" + push cho người kia — *"Tình hình tài chính gia đình vừa được cập nhật."* Không bao giờ viết "X đã thay đổi số tiền".

Ghi `money_snapshots`, không ghi đè từng `assets`. Nếu người dùng muốn sửa từng khoản thì vào danh sách tài sản.

### 6.3 Tài sản `P0`

Danh sách nhóm theo `liquidity`. Mỗi dòng: tên · nơi giữ · giá trị · chip người giữ · ngày cập nhật nếu cũ hơn 30 ngày.

Chi tiết → nút chính là **Cập nhật giá trị** (sheet: một ô số + ngày + ghi chú). Gọi RPC `update_asset_value`, tự ghi lịch sử.

Form tạo: tên · loại tài sản · giá trị · nơi giữ · người giữ. **Thanh khoản không hỏi** — suy ra từ loại, ẩn sau dòng nhỏ "Đổi cách phân loại".

### 6.4 Khoản sắp trả `P0`

Bộ lọc: 7 ngày · 30 ngày · Quá hạn · Đã trả · Lặp lại.

Chi tiết → nút chính **Đã trả** (chọn ngày, mặc định hôm nay). Gọi RPC `settle_payment`. Nếu khoản này sinh từ một khoản nợ, hiện thêm dòng xác nhận: *"Dư nợ Vay mua nhà BIDV sẽ còn 172.000.000 ₫."*

### 6.5 Nợ `P0`

Danh sách: tên · bên cho vay · dư nợ · kỳ trả tiếp theo.

Chi tiết: gốc · dư nợ · lãi suất · tiền mỗi kỳ · ngày tất toán dự kiến · thanh tiến độ đã trả · lịch sử các kỳ đã trả.

### 6.6 Mục tiêu `P1`

Danh sách thẻ có thanh tiến độ. Chi tiết: đã có / cần thêm / còn bao lâu. Nút "Góp thêm".

### 6.7 Cần trao đổi `P0`

Danh sách cờ đang mở, mỗi mục dẫn tới khoản liên quan.

Gắn cờ: từ chi tiết bất kỳ khoản nào, nút "Cần trao đổi" + ô ghi chú tuỳ chọn.

**Không có luồng bình luận.** Đóng cờ bằng nút "Đã rõ", có thể kèm kết luận ngắn. Cờ tự hết hiệu lực sau 14 ngày để không tích tụ khiến trạng thái mắc kẹt ở `Cần chú ý` vĩnh viễn.

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

### 7.3 Thêm giấy tờ `P0`

Mặc định mở thẳng **máy quét** (VisionKit / ML Kit), không mở thư viện ảnh. Quét nhiều trang vào cùng một giấy tờ.

Sau khi quét, hỏi đúng ba trường: tên · ngày hết hạn · bản giấy để đâu. Còn lại để sau.

Trạng thái upload hiện từng file, cho thử lại, không chặn màn hình.

### 7.4 Xem file `P0`

Ảnh: phóng to, vuốt qua các trang. PDF: cuộn. Nút chia sẻ dùng share sheet hệ thống.

---

## 8. Cài đặt

| Màn hình | Mức | Nội dung |
|---|---|---|
| Cài đặt | P0 | tên hiển thị, ngôn ngữ, đăng xuất |
| Nhà mình | P0 | tên household, danh sách thành viên, thêm thành viên không có tài khoản (con, bố mẹ) |
| Mời | P0 | mã 6 ký tự + chia sẻ |
| Gói dịch vụ | P0 | trạng thái, ngày hết hạn, mua/khôi phục |
| Thông báo | P1 | bật/tắt theo loại, nhịp cập nhật 7 hay 30 ngày |
| Dung lượng | P1 | đã dùng / tổng, file lớn nhất |
| Dữ liệu | P1 | xuất JSON, xoá tài khoản |

---

## 9. Luồng

### F1 · Người đầu tiên, từ cài đặt đến dữ liệu đầu tiên `P0`

```
Sign in → Setup (tạo nhà, nhập tên hiển thị) → Nhà mình (rỗng)
   → thẻ mời hiện ngay
   → chạm [Thêm sự kiện] → form → lưu
   → Nhà mình đã có nội dung
```

Mục tiêu: dưới 90 giây từ mở app lần đầu tới có bản ghi đầu tiên.

### F2 · Mời và tham gia `P0` — luồng sống-còn

```
Người A: Nhà mình → thẻ mời → [Chia sẻ qua Zalo]
   → share sheet hệ thống, kèm deep link family://join/K7M2PQ

Người B: chạm link
   → chưa cài app → store → cài → mở → deep link giữ nguyên
   → Sign in → tự nhảy vào join/K7M2PQ → xác nhận tên hiển thị
   → Nhà mình ĐÃ CÓ DỮ LIỆU của A

Cả hai nhận thông báo.
```

Người thứ hai **không bao giờ** thấy màn hình rỗng — họ phải thấy giá trị ngay lần mở đầu tiên. Nếu A chưa có dữ liệu gì, hoãn thẻ mời cho tới khi A tạo được bản ghi đầu.

Nhắc lại thẻ mời vào ngày 2 và ngày 7 nếu chưa ai tham gia. Sau đó dừng.

### F3 · Nhìn lướt hằng ngày `P0`

```
Mở app → Nhà mình (cache hiện ngay, refetch nền)
   → chạm ô tròn "Chồng đổ rác" → xong, rung nhẹ
```

Không màn hình trung gian, không xác nhận. Đây là tương tác thường xuyên nhất của cả app và phải là một chạm.

### F4 · Nghi thức cập nhật tuần `P0`

```
Thông báo 09:00 → "Cập nhật nhanh tình hình tuần này?"
   → mở thẳng modal Cập nhật tình hình (không qua Nhà mình)
   → 4 ô điền sẵn số lần trước → sửa → [Lưu cập nhật]
   → toast "Đã cập nhật" → push cho người kia
```

Deep link của thông báo phải mở **thẳng** modal. Mỗi màn hình trung gian là một chỗ người dùng bỏ cuộc, và đây là vòng lặp giữ chân chính.

### F5 · Sự kiện âm lịch với đầy đủ ngữ cảnh `P0`

```
[+] → Sự kiện → tên "Giỗ ông ngoại"
   → chọn Âm lịch → 15/8 → xem trước "CN 5/10" → lưu
Chi tiết sự kiện
   → [Thêm việc] "Mua quà"        (eventId gắn sẵn)
   → [Thêm khoản] 1.000.000 ₫     (eventId gắn sẵn)
→ Nhà mình: việc và khoản tự xuất hiện đúng tuần đó
```

### F6 · Thêm giấy tờ bằng máy quét `P0`

```
[+] → Giấy tờ → máy quét mở ngay
   → quét 2 trang → xong
   → 3 trường: tên · hết hạn · bản giấy ở đâu → lưu
   → upload chạy nền, có thể rời màn hình
   → tự tạo reminder trước hạn 30 ngày
```

Nếu chưa trả phí: vẫn lưu được thông tin và vị trí bản giấy, chỉ chặn phần lưu file, kèm câu giải thích ở `04 §8`.

### F7 · Gắn cờ và gỡ cờ `P0`

```
Chi tiết khoản → [Cần trao đổi] → ghi chú tuỳ chọn → lưu
   → push cho người kia: "Có một khoản cần hai người xem lại."
   → hiện trên Nhà mình mục CẦN CHÚ Ý
Sau khi hai người đã nói chuyện:
   → [Đã rõ] + kết luận ngắn → cờ đóng
```

Nếu quá 14 ngày không ai đóng, cờ tự hết hiệu lực và biến mất khỏi tính trạng thái.

### F8 · Trả một kỳ nợ `P0`

```
Tiền → Sắp phải trả → "Trả góp nhà tháng 10" → [Đã trả]
   → xác nhận: "Dư nợ sẽ còn 172.000.000 ₫"
   → RPC settle_payment (một transaction)
   → kỳ tiếp theo được Edge sinh ra trong lần cron kế
```

### F9 · Giấy tờ sắp hết hạn `P0`

```
Thông báo local (đặt sẵn từ trước, chạy cả khi offline)
   → mở chi tiết giấy tờ
   → [Tạo việc gia hạn] → việc mới gắn documentId
   → [Ghi khoản chi] → khoản mới với renewalCost điền sẵn
```

### F10 · Nâng cấp `P0`

```
Chạm tính năng cần trả phí → paywall
   → giải thích cụ thể đang bị chặn gì, không doạ
   → mua qua RevenueCat → webhook → households.subscriptionStatus
   → client refetch household → mở khoá
```

Quyền thuộc household: người kia được dùng ngay, không phải mua lại.

---

## 10. Thứ tự dựng màn hình

Theo phụ thuộc, không theo độ khó:

1. Sign in · Setup · Nhà mình rỗng — có khung mới thấy được gì thiếu
2. Thêm nhanh · Việc · Chi tiết việc — vòng lặp đơn giản nhất, kiểm chứng hạ tầng dữ liệu
3. Mời · Tham gia — sớm, vì nó quyết định sản phẩm có nghĩa hay không
4. Sự kiện + lịch âm — tính năng khác biệt nhất, cần nhiều thời gian sửa nhất
5. Tiền: tổng quan · tài sản · khoản sắp trả · cập nhật tình hình
6. Giấy tờ + máy quét + upload — nặng nhất về hạ tầng
7. Nợ · Cần trao đổi
8. Cài đặt · Gói dịch vụ
9. Mục tiêu · Tìm kiếm · các màn hình P1

Mời (bước 3) đứng trước cả tính năng chính là có chủ ý: nếu người thứ hai không tham gia được, mọi thứ xây thêm đều vô nghĩa (`18` trong tài liệu sản phẩm).
