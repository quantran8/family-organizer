# 09 — Đặc tả dựng UI (Figma / HTML demo)

Tài liệu này đủ để **dựng lại toàn bộ giao diện app mà không cần đọc code**. Nó
viết cho người/agent làm Figma hoặc HTML demo tĩnh.

**Cách đọc:** §A là hệ thống thị giác — dựng xong phần này rồi mới sang màn.
§B–§H là từng màn: mỗi màn có sơ đồ khối, số đo, và **danh sách trạng thái phải
vẽ**. §I là checklist nghiệm thu.

**Ba quy ước của tài liệu:**
- Mọi số là **px**, đã quy đổi sẵn — không cần tra bảng.
- Chữ trong `« »` là **nội dung thật** hiện trên màn, chép nguyên văn (tiếng
  Việt có dấu, đúng hoa thường).
- Khối đánh dấu **[đk]** là khối **có điều kiện** — phải vẽ cả hai trạng thái
  (có và không).

**Không cần biết:** tên hàm, tên hook, cấu trúc database, cách gọi API. Nếu tài
liệu này nhắc tới một cái tên kỹ thuật thì chỉ để bạn đặt tên layer cho khớp.

---

## Mục lục

- [A. Hệ thống thị giác](#a-hệ-thống-thị-giác)
- [B. Khung app](#b-khung-app) — tab bar, header, nút [+]
- [C. Nhà mình](#c-nhà-mình) — tab 1
- [D. Việc & Sự kiện](#d-việc--sự-kiện) — tab 2, «Định kỳ» + «Linh hoạt» hiện cùng lúc
- [E. Tiền](#e-tiền) — tab 3, gồm quỹ chung (§E.9)
- [F. Giấy tờ](#f-giấy-tờ) — tab 4
- [G. Form & Sheet](#g-form--sheet)
- [H. Khởi động & Cài đặt](#h-khởi-động--cài-đặt)
- [I. Checklist nghiệm thu](#i-checklist-nghiệm-thu)

---

## A. Hệ thống thị giác

### A.1 Màu

Dựng đúng 18 màu này. **Không thêm màu nào ngoài bảng** — không có màu thứ hai
cho "nhấn nhẹ", không có sắc độ trung gian.

| Tên layer | Hex | Dùng cho |
|---|---|---|
| `canvas` | `#F4F4F6` | nền màn có nhiều thẻ nổi |
| `surface` | `#FFFFFF` | nền mặc định — **đây là nền chính, không phải màu nhấn** |
| `soft` | `#F7F7F9` | nền nhạt: ô nhập phụ, thumbnail rỗng, track, skeleton |
| `ink` | `#101014` | chữ chính |
| `muted` | `#707078` | chữ phụ |
| `subtle` | `#A4A4AD` | chữ mờ, placeholder, dấu `›` |
| `line` | `#ECECF0` | đường kẻ, viền ô nhập |
| `action` | `#111114` | **nền nút chính** |
| `action-pressed` | `#29292F` | nút chính lúc nhấn |
| `brand` | `#6257F6` | tab đang mở, link phụ, thanh tiến độ |
| `brand-deep` | `#4C43D8` | chữ brand trên nền nhạt |
| `brand-soft` | `#F0EFFF` | nền chip đang chọn, nền khối nhấn |
| `brand-line` | `#DEDBFF` | viền brand nhạt |
| `positive` | `#13A86B` | + `positive-soft` `#E9F9F1` |
| `attention` | `#FF643A` | + `attention-soft` `#FFF0EB` — hạn chót, sắp phải trả |
| `critical` | `#D64545` | + `critical-soft` `#FFF0F0` — **chỉ** lỗi và việc không hoàn tác được |

**Ba luật màu — vi phạm là dựng sai, không phải khác gu:**

1. **Nút chính màu ĐEN (`action`), không phải màu brand.** Đây là luật dễ vi
   phạm nhất vì "nút chính = màu thương hiệu" là phản xạ mặc định của gần như
   mọi design system khác. Ở đây ngược lại: brand dành cho **nhận diện và ngữ
   cảnh thời gian** (ngày được chọn, tab đang mở). Nếu nút chính cũng mang màu
   đó thì trên màn có cả hai, mắt không phân biệt được "chỗ này là hành động"
   với "chỗ này là thông tin", và cả hai cùng mất tác dụng.
2. **Tối đa MỘT mảng màu lớn mỗi màn.** Không tô nền màu cho mọi section.
3. **Số tiền không tự động đỏ/xanh theo dấu.** Đây là bức tranh tình hình, không
   phải điểm số. Số âm dùng dấu trừ thật `−` (U+2212), không phải gạch nối.

**`subtle` là màu CHỮ, không phải màu nền.** Nền nhạt tên là `soft`. Nhầm hai cái
này cho ra màn hình chữ gần như vô hình trên nền trắng.

### A.2 Chữ

Font: **Be Vietnam Pro**, ba nét — Regular 400 · Medium 500 · SemiBold 600.
(Lý do không dùng font hệ thống: tiếng Việt có dấu chồng tầng, font hệ thống trên
Android dựng dấu ngã trên chữ ơ lệch hẳn sang phải.)

| Tên | Cỡ / Dòng | Dùng cho |
|---|---|---|
| `display` | 30 / 36 | số tiền lớn ở màn chi tiết, mã mời |
| `title1` | 26 / 32 | tiêu đề màn, tên bản ghi |
| `title2` | 23 / 29 | tiêu đề sheet, tên ở màn phụ |
| `heading` | 16 / 22 | tiêu đề nhóm, số tiền cỡ vừa |
| `body` | 15 / 22 | **chữ mặc định** |
| `label` | 14 / 18 | nhãn trường, nhãn nhóm |
| `caption` | 12 / 16 | chữ phụ, nhãn thời gian |
| `micro` | 11 / 14 | nhãn nhỏ nhất, chữ tab bar |

**Số tiền luôn bật `tabular-nums`** (chữ số đều bề ngang). Không có nó, một cột
số tiền sẽ so le vì chữ `1` hẹp hơn `8`, và mắt không quét được theo cột.

**Không viết hoa toàn bộ bằng thuộc tính** (`text-transform: uppercase`): tiếng
Việt có dấu, viết hoa máy làm dấu chồng lên nhau khó đọc. Nhóm nào cần chữ hoa
thì gõ hoa thẳng.

### A.3 Khoảng cách, bo góc, bóng

**Thang 4px.** Mọi khoảng cách là bội của 4: `4 · 8 · 12 · 16 · 20 · 24 · 28 ·
32 · 36 · 40 · 48`.

**Lề ngang màn = 16px**, gần như không đổi trên toàn app (ngoại lệ duy nhất:
màn Ngưỡng ghi dùng 24px).

**Vùng chạm tối thiểu 44×44px** — mức sàn không thương lượng. Ô vẽ có thể nhỏ
hơn (ví dụ ô tick vẽ 24px) nhưng vùng bấm phải nới ra đủ 44.

| Bo góc | px | Dùng cho |
|---|---|---|
| `control` / `icon` | 14 | ô nhập, chip vuông, ô thumbnail |
| `weekday` | 16 | ô ngày trong lịch |
| `status` | 20 | thẻ, khối viền |
| `featured` | 24 | ô ghi chú lớn, ô chọn trong sheet |
| `sheet` | 28 | mép trên bottom sheet |
| tròn hoàn toàn | 999 | **mọi nút**, chip pill, avatar, ô tick |

**Bóng — hiếm và có mục đích.** Chỉ bốn chỗ, không thêm bóng cho mọi dòng:

| Tên | Giá trị | Dùng cho |
|---|---|---|
| `section` | `0 4px 12px rgba(0,0,0,.025)` | mảng trắng của một nhóm |
| `frame` | `0 24px 80px rgba(21,21,27,.17)` | bảng [+] khi mở |
| `sheet` | `0 -16px 48px rgba(0,0,0,.18)` | bộ chọn bật lên — hắt **lên trên** |

> **Nút [+] nổi KHÔNG có bóng** — nó phẳng. Token `action` (`0 8px 22px`) đã bỏ
> hẳn, cùng với cả lớp view bóng riêng và nhịp animation thứ hai ở `fab.tsx`
> vốn chỉ tồn tại để chữa triệu chứng của chính cái bóng đó: `0 8px 22px` quanh
> một nút 56px là vệt tối gần bằng chính cái nút, nên khi nó nảy cùng nút thì
> thứ nảy rõ nhất trong khung hình là mảng bóng.
>
> `section` **đã giảm** so với bảng cũ (`0 6px 18px/.035`). Mockup là trang web
> xem trên màn hình lớn, nơi bóng phải mạnh mới đọc ra; trên điện thoại cầm tay,
> cùng con số đó đọc thành "mọi thứ đang bay lơ lửng".
>
> `frame` và `sheet` **giữ nguyên**: chúng là lớp phủ nằm trên nền đã bị làm mờ,
> và bóng ở đó làm việc tách-khỏi-nền chứ không phải trang trí. Riêng
> `picker-sheet` đã cố ý bỏ nền mờ, nên `shadow-sheet` là thứ **duy nhất** tách
> panel khỏi form bên dưới — bỏ nó là để lại một panel trắng trên nền trắng.
>
> Token `brand` (`0 10px 22px` tím) đã BỎ cùng với màu `brand` — xem `A.2`.

### A.4 Bộ component — dựng trước, dùng lại

Đây là bộ đầy đủ. **Mọi màn chỉ được ghép từ bộ này**; gặp thứ không có trong
đây thì đó là ngoại lệ và tài liệu sẽ nói rõ.

**Nút** — cao tối thiểu 44, padding `12×20`, bo tròn hoàn toàn, chữ `body`
SemiBold, icon (nếu có) cách chữ 8px. Bốn kiểu:

| Kiểu | Nền | Viền | Chữ |
|---|---|---|---|
| Chính | `action` | không | trắng |
| Phụ | trắng | 1px `line` | `ink` |
| Chìm | trong suốt | không | `brand-deep` |
| Nguy hiểm | trắng | 1px `critical` | `critical` |

Mặc định **rộng hết khung**. Trạng thái: thường · nhấn (nền đậm hơn / nền `soft`)
· mờ (`opacity 50%`) · **đang chạy** (vòng quay **thay** chữ, không phải đứng
cạnh chữ — vòng quay cùng màu với chữ của kiểu đó).

**Mỗi màn chỉ nên có MỘT nút chính.** Nhiều hơn nghĩa là chưa quyết định đâu là
việc chính.

**Ô nhập** — cao tối thiểu 44, bo 14, viền 1px `line`, nền trắng, padding
`12×16`, chữ `body`, placeholder màu `subtle`. Nhãn nằm **trên** ô, `label`
Medium màu `muted`, cách ô 6px.

Dưới ô có **một** dòng phụ, cách 6px: hoặc lỗi (`caption` màu `critical`, và
viền ô đổi thành `critical`), hoặc gợi ý (`caption` màu `subtle`).
**Lỗi đè gợi ý — không bao giờ hiện cả hai.**

**Thẻ** — bo 20, viền 1px `line`, nền trắng, padding 16. Biến thể nhấn: viền
`brand-soft` (không dùng bóng).

**Dòng danh sách** — cao tối thiểu 44, padding dọc 12, các phần cách nhau 12,
đường kẻ 1px `line` **giữa** các dòng.

> **Luật quan trọng:** danh sách dùng **khoảng cách và đường kẻ**, KHÔNG dùng thẻ
> lặp lại. Đây là luật hay bị vi phạm nhất khi dựng màn mới, vì thẻ trông "gọn"
> hơn lúc vẽ ba dòng và chỉ lộ ra khi có mười dòng thật. Ngoại lệ duy nhất trong
> cả app: thẻ mục tiêu (§E.6).

**Dòng điều hướng** — như dòng danh sách, thêm giá trị hiện tại ở bên phải
(`body` màu `subtle`, rộng tối đa 55% để tên dài không đẩy nhãn) và dấu `›` màu
`subtle`. Giá trị hiện ngay trên dòng là khác biệt giữa danh sách đọc được trong
ba giây và danh sách phải mở từng cái ra xem.

**Dòng trong form** — cao tối thiểu 72, gồm ô icon rộng 32 dẫn đầu, rồi nhãn
(`label` Medium `muted`) **nằm trên** giá trị (`body` Medium `ink`), tuỳ chọn
thêm dòng phụ (`caption` `muted`), cuối dòng là `›` 20px. Chưa chọn thì giá trị
hiện màu `subtle` (chữ vẫn có, ví dụ «Chưa phân» — không để trống).

**Nhãn trạng thái (pill)** — bo tròn, padding `6×12`, chấm tròn 6px + chữ
`caption` SemiBold. Bốn trạng thái, **luôn kèm chữ**:

| Trạng thái | Nền | Chữ + chấm | Chữ hiện |
|---|---|---|---|
| ổn | `positive-soft` | `positive` | «Ổn» |
| cần để ý | `attention-soft` | `attention` | «Cần để ý» |
| căng | `critical-soft` | `critical` | «Căng» |
| chưa có số | `soft` | `muted` / chấm `subtle` | «Chưa có số» |

> **Không bao giờ dùng màu một mình.** Một phần người dùng không phân biệt được
> xanh/đỏ, và với họ một chấm màu không chữ là không có thông tin. Luật này áp
> cho cả app, không riêng pill.

**Chip chọn** — bo tròn, cao tối thiểu 44, padding ngang 16, chữ `label` Medium.
Chưa chọn: nền trắng, viền `line`, chữ `ink`. Đang chọn: nền `brand-soft`, viền
`brand`, chữ `brand-deep`. Nhiều hơn ~4 chip thì cuộn ngang, cách nhau 8.

**Tab con (segmented)** — nền rãnh `soft`, bo 14, padding 4; viên đang chọn nền
**trắng** bo 14, chữ `label` SemiBold `ink`; viên không chọn chữ `label` Medium
`muted`. Mỗi viên cao tối thiểu 44 và chia đều bề ngang.

**Ô tick** — vòng tròn 24px viền 2px. Chưa tick: viền `subtle`, nền trắng. Đã
tick: viền và nền `brand`, dấu `✓` trắng `caption` SemiBold. **Vùng bấm nới ra
44** (thêm 10 mỗi phía).

**Thanh tiến độ** — cao 8, bo tròn, nền `soft`, phần đã đạt màu **`brand`**, cách
khối trên 8. Vượt 100% vẫn vẽ đầy chứ không tràn khung.

> Màu `brand` chứ không phải xanh "đạt chỉ tiêu": một mục tiêu chưa xong không
> phải lỗi cần cảnh báo, và tô màu trạng thái vào đây làm nó đọc thành điểm số.

**Avatar** — tròn, ba cỡ: 24 / 36 / 48. Nền chỉ hai sắc rất nhạt — `soft` hoặc
`brand-soft`, chọn theo tên. Chữ cái đầu SemiBold màu `ink`.

> **Không gán màu cho thành viên theo vai trò hay giới tính.** Một bảng bốn màu
> tươi nghe vô hại, nhưng với một nhà đúng hai người thì nó luôn cho ra "một màu
> của vợ, một màu của chồng" — trong khi ràng buộc lớn nhất của sản phẩm là
> **hai thành viên được thể hiện ngang nhau**. Nhạt và gần giống nhau là đúng ý
> đồ: avatar để phân biệt, không phải để gán danh tính.

**Khối chờ (skeleton)** — hình chữ nhật bo 14 màu `soft`. Dạng danh sách: mỗi
dòng gồm ô tròn 24 + hai vạch (cao 16 rộng 60%, cao 12 rộng 40%), các dòng cách
nhau 12. **Cố ý không nhấp nháy** — skeleton chỉ hiện vài trăm ms và chuyển động
trong khoảng đó chỉ làm màn hình giật.

**Trạng thái rỗng** — căn giữa, padding `48×24`: tiêu đề `heading` SemiBold
`ink`, thân `body` `muted` cách 8, nút (nếu có) cách 24 rộng tối đa 320.

> Trạng thái rỗng **không phải lỗi và không được trông như lỗi**. Nó là lời mời
> làm một việc cụ thể. Không dùng minh hoạ to, không viết «Chưa có dữ liệu».

**Trạng thái lỗi** — cùng bố cục, thân `body` `ink`, nút phụ «Thử lại» cách 20.

**Toast** — dải nổi cách đáy 24, hai bên 16, nền `ink`, bo 14, padding `12×16`,
chữ `label` trắng. Bản có hoàn tác thêm chữ «Hoàn tác» SemiBold trắng bên phải.

### A.5 Từ vựng — chép đúng, đừng viết lại

Đây là **ràng buộc sản phẩm**, không phải gợi ý văn phong. Mỗi cặp là một quyết
định về việc app đứng ở đâu giữa hai người dùng nó.

| DÙNG | KHÔNG DÙNG |
|---|---|
| Việc của nhà mình | Nhiệm vụ được giao |
| Khoản cần chú ý | Cảnh báo · Vượt chi |
| Cần trao đổi | Cần phê duyệt · Chờ xác nhận |
| Sắp đến hạn | Quá hạn nghiêm trọng |
| Cần chuẩn bị | Bắt buộc hoàn thành |
| Cập nhật gần nhất | Lần chỉnh sửa cuối |
| Vợ giữ · Chồng giữ | Người chịu trách nhiệm |
| Tình hình nhà mình | Báo cáo tài chính |
| Bỏ vào · Rút ra | Đóng góp · Nghĩa vụ góp |
| Ghi lần cuối | Cập nhật lần cuối *(chỉ cho quỹ — xem §E.9)* |
| Mục đích | Lý do chi · Hạng mục |
| — | **Còn thiếu · Chưa góp · Nợ quỹ · Đóng góp bắt buộc** |

Bốn chữ ở dòng cuối **không được xuất hiện ở bất kỳ đâu trong app**. Chúng biến
một cuốn sổ ghi chép thành một bản cáo trạng. Kiểm được bằng một lệnh:

```bash
grep -rn "còn thiếu\|chưa góp\|nợ quỹ\|bắt buộc góp" apps/mobile/src/i18n/
```

**Nút đặt tên bằng việc nó làm, và giữ nguyên tên đó suốt luồng:** nút «Lưu cập
nhật» sinh ra toast «Đã cập nhật» — không phải «Thành công».

**Câu báo lỗi nói rõ chuyện gì và cách sửa, không xin lỗi:** «Mật khẩu cần ít
nhất 8 ký tự.» chứ không phải «Đã xảy ra lỗi.»

---

## B. Khung app

### B.1 Thanh tab — bốn mục

Nền trắng, viền trên 1px `line`. Bốn mục **chia đều**: «Nhà mình» · «Lịch» ·
«Tiền» · «Giấy tờ». Icon 24 + chữ `micro` (11px) Medium.

| Trạng thái | Icon | Chữ |
|---|---|---|
| đang mở | **nét đặc** `brand` | `brand` |
| không mở | nét mảnh `subtle` | `subtle` |

> Tab đang mở phải đổi **hình** (nét mảnh → nét đặc), không chỉ đổi màu — vì
> không bao giờ dùng màu một mình.

**Không có tab thứ năm.** Cài đặt vào qua avatar ở góc phải màn Nhà mình. Sổ hiếu
hỉ vào từ cuối tab Tiền. Hồ sơ con vào từ cuối tab Giấy tờ.

**Chấm báo:** chỉ trên tab Tiền, chỉ khi tình hình ở mức «Căng», **và không đếm
số**. Một con số đỏ trên tab Việc biến việc nhà thành danh sách nợ phải trả.

### B.2 Header của màn phụ

Nền trắng, **không có đường kẻ dưới, không bóng**. Mũi tên back bên trái màu
`ink`, không có chữ cạnh mũi tên. Tiêu đề giữa: 16px SemiBold.

**Mọi màn chi tiết đều để tiêu đề header TRỐNG** — tên bản ghi đã là dòng chữ to
đầu màn, nhắc lại ở header là nói hai lần.

Bốn màn tab không có header — tự dựng phần đầu của mình.

### B.3 Nút [+] — nó **biến hình**, không phải mở panel

Nút tròn **56×56**, nền `action`, icon `+` 26px trắng, bóng `action`. Vị trí:
cách phải 20, cách đáy 24 (nằm trên tab bar).

Chạm vào: **chính nút đó giãn ra thành bảng.** Vẽ theo ba khung hình:

| Khung | Hình |
|---|---|
| 0% | tròn 56×56, nền `action`, icon `+` |
| 50% | hình đang giãn, bo góc đang mở, nền đang sáng lên — **nội dung chưa hiện** |
| 100% | bảng bo 28, neo mép phải, nền sáng, bóng `frame`, 6 dòng hiện đủ |

Nền phía sau phủ `ink` 30%.

> Nút **không** đứng yên rồi bảng nở ra cạnh nó — nút **biến thành** bảng. Người
> dùng nhìn thấy đúng một vật thể suốt quá trình, nên không phải hỏi "panel này
> đến từ đâu" hay "nút vừa rồi đi đâu mất". Cũng vì vậy nút `+` **biến mất hẳn**
> khi bảng mở, thay vì xoay 45° — hai vật cùng lúc ở cùng một chỗ là hai vật, dù
> một cái đang xoay.

Bảng chứa **6 dòng, thứ tự cố định**, mỗi dòng cao 44+: ô tròn 44 nền `ink` 6% +
icon, cách 12, rồi chữ `body` Medium `ink`. Dòng cách nhau 8.

«Thêm việc» · «Thêm sự kiện» · «Thêm khoản phải trả» · «Thêm tài sản» ·
«Thêm giấy tờ» · «Chụp / dán»

> Mỗi mục một hàng ngang (không phải lưới ô vuông): nhãn nằm cạnh icon nên đọc
> thẳng thành câu, và vùng chạm chạy hết bề ngang bảng — rộng hơn hẳn một ô
> lưới, và cỡ ngón tay không đổi khi số mục tăng.

Nút [+] có mặt trên **cả bốn tab**, vị trí y hệt nhau.

### B.4 Bottom sheet (mọi form)

Trượt lên từ đáy, chiếm **70% chiều cao màn**, mép trên bo 24, nền trắng. Nền
phía sau tối đi. Thanh nắm nhỏ ở mép trên do hệ điều hành vẽ — **đừng vẽ thêm
một cái nữa**.

Header sheet là **ba cột**: ô rỗng 44 bên trái | tiêu đề `title2` SemiBold căn
giữa (một dòng, dài thì cắt bằng `…`) | nút `✕` 44×44 tròn nền `soft`, icon 18px
`ink`.

> Ô rỗng bên trái rộng đúng bằng nút bên phải, nên tiêu đề căn giữa **màn hình**
> chứ không phải giữa khoảng trống còn lại — và nó ở yên một chỗ dù nhãn dài
> ngắn khác nhau.
>
> Nút `✕` có nền tròn vì một icon trần trên nền trắng là vùng chạm vô hình:
> người dùng phải đoán nó bắt đầu và kết thúc ở đâu.

Thân sheet cuộn được, lề 16, đáy 24. Nút chính **ghim đáy** (lề 16, trên 12,
dưới 8) — **không có đường kẻ trên, không có dải nền riêng**: nút Lưu đã là một
khối đen đặc, tự nó đủ nặng để đọc ra là hành động chính; thêm kẻ và nền là dựng
một thanh công cụ quanh một nút duy nhất.

### B.5 Bộ chọn bật lên (sheet cấp hai)

Khi chạm một dòng trong form đang mở, một bộ chọn trượt lên **đè trên** sheet đó.
Mép trên bo 28, nền trắng, bóng `sheet` hắt lên, cao **theo nội dung** (trần
80% màn).

**Khác sheet chính hai chỗ:** (a) tự vẽ thanh nắm (vạch 36×6 bo tròn màu `line`,
cách trên 10); (b) **nền phía sau KHÔNG tối thêm**.

> Không phủ tối lần nữa vì form phía dưới đã nằm trong một sheet có nền mờ của
> riêng nó — phủ thêm một lớp làm màn hình tối dần theo từng cấp, và người dùng
> đọc ra là "đã đi sâu ba tầng" trong khi họ chỉ đang chọn một ngày. Bóng của
> panel là thứ tách hai lớp, thay cho nền mờ.

Mỗi lựa chọn: cao tối thiểu 60, bo 24, padding ngang 12, chữ `body` Medium `ink`.
Đang chọn: nền `brand-soft` **và** dấu `✓` `brand` 20px bên phải — hai dấu hiệu,
không chỉ màu.

---

## C. Nhà mình

Nền trắng, lề 16, chừa đáy **96** (cho nút [+] và tab bar). Kéo xuống để làm mới.

### C.1 Thứ tự khối

| # | Khối | Cách khối trên |
|---|---|---|
| 1 | Đầu màn (ngày · tên nhà · avatar) | 8 |
| 2 | **[đk]** Thẻ tình hình tiền | 20 |
| 3 | **[đk]** Thẻ mua sắm | 20 |
| 4 | **[đk]** Thẻ mời người kia | 20 |
| 5 | **[đk]** Nhóm «HÔM NAY» | 24 |
| 6 | **[đk]** Nhóm «TUẦN NÀY» | 24 |
| 7 | **[đk]** Trạng thái rỗng | 40 |

Nổi lên trên: toast hoàn tác (đáy 24) và nút [+].

### C.2 Đầu màn — ba cột

Cao 56, các cột cách nhau 16.

- **Trái** — ô vuông **56×56** bo 14 nền `soft`: số ngày dương `heading` SemiBold
  `ink` (tabular-nums) ở trên, ngày âm `micro` Medium `muted` ở dưới (ví dụ
  «12/7»).
- **Giữa** (giãn) — tên nhà `title1` SemiBold `ink`; dưới đó `caption` `subtle`:
  «Thứ Bảy · âm 12/7».
- **Phải** — avatar 36px, vùng chạm 44. **Đây là đường vào Cài đặt duy nhất.**

### C.3 Ba thẻ có điều kiện

**Thẻ tình hình tiền** — thẻ thường. Bên trong: nhãn trạng thái (pill), rồi câu
giải thích `body` `ink` cách 8, rồi **nhãn thời gian** `caption` `subtle` cách 4
— ví dụ «Cập nhật 5 tuần trước».

> Nhãn thời gian là **bắt buộc, không ngoại lệ**. Một con số tiền là thứ *một
> người đã nói ra tại một thời điểm*, không phải sự thật hiện tại — hiển thị trần
> trụi làm hai người cùng tin vào một thứ có thể đã sai.

Ẩn hoàn toàn khi chưa đủ dữ liệu (không hiện thẻ rỗng).

**Thẻ mua sắm** — hàng trên: nhãn `label` SemiBold `muted` bên trái, **số món**
`label` Medium `brand` bên phải. Hàng dưới: tối đa 3 tên món nối bằng « · », một
dòng, cắt bằng `…`. **Không có ô tick ở đây** — chạm là mở danh sách, không tick.

**Thẻ mời người kia** — thẻ **viền `brand-soft`**. Tiêu đề `heading` SemiBold,
thân `body` `muted` cách 4, nút phụ rộng hết khung cách 16. **Không có nút đóng.**

### C.4 Hai nhóm việc

Nhãn nhóm: `label` SemiBold `muted`, cách dòng đầu 4 — «HÔM NAY» / «TUẦN NÀY».
(Nhỏ hơn tiêu đề nhóm ở màn khác — cố ý.)

**Dòng việc** — cao tối thiểu 44, padding dọc 12, các phần cách 12:

```
[ô tick 24]  Tên việc (giãn)              [↻] [chip người] [hạn]
```

- Tên: `body` `ink`, tối đa 2 dòng. **Đã xong: màu `subtle` + gạch ngang.**
- `↻` chỉ khi việc lặp lại (`caption` `subtle`).
- Chip người: nền `soft` bo tròn, padding `4×8`, chữ `micro` Medium `muted`.
  **Chưa phân người thì không hiện chip trống.**
- Hạn: `caption` `subtle`.

**Vuốt sang trái hiện nút «Xoá»**: nền `critical-soft`, chữ `label` Medium
`critical`, cao hết dòng, padding ngang 20. Ở màn này **chỉ có một chiều vuốt**.

Xoá xong dòng **biến mất ngay** và toast hoàn tác hiện ra 5 giây.

### C.5 Trạng thái phải vẽ

1. Đang tải — 4 dòng skeleton
2. Đủ cả: 3 thẻ + 2 nhóm việc
3. Chỉ có việc, không có thẻ nào
4. Rỗng hoàn toàn — trạng thái rỗng **không có nút**
5. Có toast hoàn tác
6. Bảng [+] đang mở

---

## D. Việc & Sự kiện

Vỏ chung: dòng dẫn «Nhà mình» (`caption` Medium `muted`) rồi tiêu đề màn
«Việc & Sự kiện» (`title1` SemiBold, tracking −0.9). Cách dưới 24 là tab con ba
mục — «Việc» · «Mua sắm» · «Sự kiện». Tab đang chọn được **nhớ lại cho lần mở
app sau**.

Thêm mới qua **FAB nổi** góc dưới phải như ba tab còn lại (`AddFab`).

> Mockup vẽ một viên thuốc «+ Thêm» trong header và bản dựng đầu đã làm theo,
> nhưng nó bị bỏ: cách thêm là thứ người dùng học một lần, và một tab đặt nút ở
> chỗ khác bắt họ tìm lại.

Nền màn là `canvas`. Mỗi nhóm nội dung là **một mảng trắng** (`Section`: bo 24,
đệm 20, `shadow-section`) có badge đếm ở tiêu đề; bên trong, từng dòng PHẲNG
cách nhau 20 (§8, §13.1). Cùng ngôn ngữ với màn Nhà mình, nên hai màn đọc như
một app chứ không phải hai.

### D.1 Tab «Việc» — hai danh sách con

**Cả hai danh sách hiện CÙNG LÚC**, xếp chồng trong một lần cuộn: mảng «Định kỳ»
trước, «Linh hoạt» sau. Không còn bộ chọn `Segmented` con.

Thứ tự đó không tuỳ ý: việc định kỳ là thứ có hạn hôm nay, tức là câu hỏi người
dùng mở app để trả lời; việc linh hoạt theo đúng định nghĩa của nó thì không gấp.

> Vì sao bỏ bộ chọn con (bản trước có, và lựa chọn được nhớ lại): nó bắt trả một
> cái giá mỗi ngày — người dùng phải nhớ mình đang đứng ở danh sách nào, và việc
> ở danh sách kia thì **vô hình**. Với một nhà có chừng năm việc định kỳ và vài
> việc phát sinh, hai mảng chồng nhau vừa một màn hình rưỡi; ẩn một nửa để tiết
> kiệm chỗ mà không có chỗ nào để tiết kiệm là đổi thông tin lấy một cử chỉ.
>
> `ui-prefs.taskListTab` vì thế **không còn ai đọc**. Khoá vẫn nằm trong store vì
> nó đã persist trên máy người dùng — dọn nó là một việc riêng, có migration.

Danh sách rỗng thì **ẩn hẳn mảng của nó**. Cả hai cùng rỗng → **một** trạng thái
rỗng cho cả màn (có nút «Thêm việc»), không phải hai thẻ mỗi thẻ một câu «chưa có
gì»: hai lời mời cạnh nhau cho cùng một hành động là hai lần nhắc người dùng rằng
họ chưa làm gì.

**Một toast hoàn tác dùng chung cho cả hai danh sách.** Hai toast riêng sẽ chồng
nhau khi người dùng xoá nhanh một dòng ở mỗi bên, và cái thứ hai che mất cái thứ
nhất trước khi ai kịp bấm «Hoàn tác».

Badge đếm trên mỗi tiêu đề đếm việc **chưa xong** («{n} việc»), không đếm tổng:
con số hữu ích là "còn bao nhiêu", không phải "đã từng có bao nhiêu".

Hai danh sách khác nhau ở **ba** điểm, và cả ba đều có lý do sản phẩm — không
được san bằng cho "nhất quán".

| | D.1a «Định kỳ» | D.1b «Linh hoạt» |
|---|---|---|
| Chia nhóm | sáu nhóm theo hạn | **một danh sách phẳng** |
| Vuốt | **chỉ phải** («Xoá») | trái («Hoãn») + phải («Xoá») |
| Chip người | bấm được để xoay vòng | **chỉ nhận được về mình** |

#### D.1a «Định kỳ»

Chia nhóm **bên trong mảng trắng**, `nhãn nhóm không dính khi cuộn`. Nhãn nhóm:
`label` SemiBold `muted`; nhóm đầu không có lề trên (tiêu đề mảng ngay trên nó
đã tạo khoảng cách), các nhóm sau cách trên 4.

Sáu nhóm theo thứ tự: «Quá hạn» · «Hôm nay» · «Ngày mai» · «Tuần này» ·
«Sau đó» · «Chưa có hạn». **Nhóm rỗng không hiện.**

Dòng việc như §C.4, thêm hai điểm:

- **Chỉ một chiều vuốt** — phải hiện «Xoá» (nền `critical-soft`, chữ `critical`).
  **Không có «Hoãn».**

  > Vì sao khác bản trước: hạn của việc lặp là **mốc neo**, không phải một lần
  > xảy ra. Vuốt để hoãn ở đây đang âm thầm dời cả chuỗi — người dùng tưởng mình
  > lùi hôm nay một ngày, thật ra vừa đổi lịch rửa bát mãi mãi.

- **Chip người bấm được** để xoay vòng người phụ trách — nhưng chỉ khi nhà có từ
  2 người lớn trở lên. Một người thì chip chỉ để đọc.

- **Nhãn ngày mang màu `attention`** ở nhóm «Quá hạn», `muted` ở năm nhóm còn
  lại. Màu, KHÔNG phải icon cảnh báo hay nền đỏ cả dòng: quá hạn ở đây là một
  việc nhà chưa làm, không phải một lỗi. §15 đòi màu không đứng một mình, nên
  chính chữ đã nói («Quá hạn») — màu chỉ giúp mắt tìm ra nó nhanh hơn.

Trạng thái phải vẽ: đang tải (5 dòng skeleton) · lỗi · **ẩn hẳn khi rỗng** (trạng
thái rỗng do cả tab lo, xem §D.1) · có dữ liệu · đang vuốt · có toast hoàn tác.

#### D.1b «Linh hoạt»

**Không chia nhóm, không nhãn nhóm.** Một danh sách phẳng: chưa xong trước, rồi
theo thứ tự thêm vào. Việc đã xong mờ đi và gạch ngang, không biến mất ngay.

**Không bao giờ sắp hay nhóm theo người.** Một danh sách tồn đọng xếp theo tên
là hai cột trong đó một cột dài hơn — và đó là bảng điểm.

Dòng việc như §C.4, nhưng chỗ của chip người phụ trách hoạt động **khác hẳn**
§D.1a — và đây là điểm dễ san bằng nhất:

- Dòng **chưa ai nhận** → nút **«＋ Nhận»**: nền `accent-soft` bo tròn, cao 28,
  chữ `micro` SemiBold `ink`, vùng chạm nới lên 44 bằng `hitSlop`. Bấm nó gán
  việc cho **chính người đang chạm**. Không mở danh sách người, không có vòng
  xoay tên.
- Dòng **của chính mình** → chip avatar + tên; chạm lại để **bỏ nhận**.
- Dòng **của người kia** → chip avatar + tên, **chỉ để đọc**.

> Nền `accent-soft` chứ không `accent` đặc: đây là hành động phụ, và một nút
> chanh nguyên khối trên mỗi dòng chưa ai nhận vượt ngưỡng 8–10% của §5.3 ngay
> khi danh sách có bốn dòng.

Khác biệt với vòng xoay của §D.1a là **toàn bộ vấn đề**: xoay vòng đặt được tên
người kia lên một dòng việc; «Nhận» thì không — nó chỉ nói *"cái này để tôi"*.

> Đây là ranh giới giữ cho nó là danh sách việc **của nhà**, chứ không phải hộp
> thư nhiệm vụ một người gửi cho người kia. Ở danh sách định kỳ, nơi việc đã là
> thoả thuận sẵn có, xoay vòng là đúng; ở danh sách việc phát sinh thì cùng cử
> chỉ đó biến thành đường giao việc.

**Không bao giờ sắp hay nhóm theo người** — kể cả sau khi đã nhận.

Có đủ hai chiều vuốt: trái «Hoãn» (nền `soft`, chữ `muted`), phải «Xoá».

Trạng thái phải vẽ: đang tải · lỗi · **ẩn hẳn khi rỗng** (xem §D.1) · có dữ liệu ·
đang vuốt hai chiều · có toast hoàn tác · ba trạng thái chip ở trên.

### D.2 Tab «Mua sắm»

Cả danh sách nằm trong **một mảng trắng**. Tiêu đề «Cần mua» + dòng phụ «Cả hai
cùng thêm» (`caption` `muted`), badge đếm nền `accent` đếm món **chưa mua**.

> Dòng phụ đó là chỗ **duy nhất** nói ra rằng đây là danh sách chung — từng dòng
> cố ý không có nhãn "ai thêm" (06 §4). Nó nói một lần cho cả danh sách.

Ngay dưới tiêu đề là **ô nhập**, tức dòng đầu tiên của chính mảng đó: khối nền
`soft` bo 14 đệm 6, chứa ô gõ (placeholder «Thêm đồ cần mua…») và **nút gửi**
44×44 nền `action` bo 14 với dấu `+` trắng.

> Nút gửi song song với phím Enter, **không thay nó**: bàn phím iOS có nút «Xong»
> nhưng nhiều bàn phím Android thì không, và một ô nhập không có cách gửi nào
> ngoài một phím ẩn là một ô nhập trông như bị hỏng.

> Vì sao ô nhập chuyển từ dải ghim cứng đầu màn vào trong mảng: trước đây nó tách
> khỏi danh sách bằng một đường kẻ, đọc như một thanh công cụ đứng trên. Giờ nó
> là dòng đầu của chính cái thẻ chứa danh sách — cùng một vật. **Thêm món vẫn
> phải luôn làm được**: mọi trạng thái khác (đang tải, lỗi, rỗng) chèn xuống
> *dưới* ô nhập, không thay nó. Danh sách của một nhà hai người hiếm khi dài quá
> một màn nên cuộn nó khỏi tầm mắt gần như không xảy ra.

Gõ xong nhấn Enter: món hiện ngay đầu danh sách, ô nhập trống lại, **bàn phím
không tắt** để gõ món tiếp theo.

Dòng món đơn giản hơn dòng việc: ô tick + tên (+ ghi chú `caption` `subtle` nếu
có). **Không bấm được** — không có màn chi tiết. Vuốt trái để xoá, **xoá ngay,
không có hoàn tác**.

Món đã tick **mờ đi và gạch ngang, không biến mất** (hệ thống tự dọn sau 24h).

Trạng thái rỗng ở đây **không có nút** — ô nhập đã ở ngay trên.

### D.3 Tab «Sự kiện»

**Mỗi tháng là một mảng trắng riêng** («Tháng 8/2026»), badge đếm số sự kiện của
tháng. Nhóm chưa tính được ngày để cuối, nhãn «Đang tính ngày».

**Dòng sự kiện — ngày là MỐC QUÉT, đứng đầu dòng:**

```
┌────┐
│ T6 │  Tên sự kiện
│ 30 │  15/8 âm · Cả ngày · Nhà ngoại
└────┘  🏷 3 triệu   ⏱ 3 việc cần chuẩn bị          ›
```

- **Ô ngày** 56×64 bo 16 (`DateTile`): thứ viết tắt `micro` SemiBold ở TRÊN, số
  ngày `title2` SemiBold hai chữ số (`05`) ở DƯỚI, `tabular-nums`. Nền `soft`;
  **đúng một dòng** trong cả danh sách mang nền `accent` — sự kiện gần nhất.
- Tên `body` Medium `ink`, một dòng.
- Dòng phụ `caption` `muted`, ghép bằng « · »: **ngày âm trước** · giờ (hoặc «Cả
  ngày») · bên gia đình · địa điểm.
- Dòng thứ ba, chỉ khi có: chi phí dự kiến (icon + `MoneyText` rút gọn `muted`)
  và số việc cần chuẩn bị (icon + `caption` Medium **`attention`**).
- Dấu `›` `subtle` ở mép phải.

> **Vì sao ngày chuyển từ mép phải sang đầu dòng:** câu hỏi mang tới màn này là
> *"sắp tới nhà mình có dịp gì"*, và câu trả lời được đọc theo trục thời gian.
> Đặt ngày ở mép phải bắt mắt quét ngang từng dòng để dựng lại một thứ tự vốn đã
> có sẵn. Ô ngày vì thế có **kích thước cố định** — nó là cột neo của danh sách,
> và một ô rộng 52 cạnh một ô rộng 58 làm cả cột lệch.

> Ngày âm vẫn **luôn hiện cùng** ngày dương và đứng đầu dòng phụ — ngày dương là
> ngày người ta thật sự đến (nên nó ở trong ô ngày), ngày âm là ngày người ta
> NHỚ. Thiếu vế nào cũng bắt họ tự quy đổi trong đầu.

> Số việc cần chuẩn bị mang `attention` chứ không `muted`: nó có hạn và chưa
> xong. KHÔNG phải `critical` — chưa chuẩn bị xong một cái giỗ còn ba tuần nữa
> không phải một lỗi (§5.4).

Sự kiện chưa tính được ngày: ô giữ **nguyên kích thước** (để cột neo không gãy)
nhưng chứa chữ «Đang tính ngày» `micro` `subtle` — bỏ trống ở đúng vị trí ngày
trông như dữ liệu hỏng.

**Không có ô tick, không vuốt được.**

### D.4 Sửa việc — MODAL, không còn màn chi tiết

Chạm một dòng việc (ở bất cứ đâu: hai danh sách của tab Việc, nhóm việc trên Nhà
mình, dòng «Cần chú ý», danh sách việc chuẩn bị trong chi tiết sự kiện) mở
`(modals)/task-edit` — sheet fill sẵn dữ liệu, có nút «Lưu».

**Route `/(app)/plan/task/[id]` đã BỎ.**

> **Đảo ngược so với bản trước**, vốn quy định *"sửa tại chỗ, không có nút «Lưu»
> chung — mỗi trường tự lưu khi rời khỏi nó"*, với lý do "bản ghi đã tồn tại nên
> huỷ không có nghĩa".
>
> Lý do đảo: một tấm sheet vuốt xuống được là một tấm sheet có thể bị đóng giữa
> chừng — bằng **cử chỉ**, không phải bằng một nút ta kiểm soát. Nếu mỗi trường
> đã tự lưu thì cú vuốt ấy không huỷ được gì, và người dùng vừa đổi bốn trường
> rồi vuốt xuống sẽ tưởng mình vừa thoát mà không lưu. Mô hình tự-lưu đúng cho
> một màn hình đẩy ngang; nó sai cho một tấm sheet.

Đóng sheet khi **có thay đổi** thì hỏi lại («Bỏ thay đổi?»). Không có thay đổi
thì đóng thẳng — `dirty` so từng trường với bản ghi, không so với giá trị mặc
định. Một hộp thoại luôn hiện là một hộp thoại không ai đọc.

**Hai thao tác KHÔNG đi qua nút «Lưu»** — chúng ghi ngay:

- **Ô tròn đánh dấu xong.** Phải giữ lời hứa một-chạm-là-xong của F3; bắt tick
  rồi bấm Lưu là thêm một nhịp vào thao tác được dùng nhiều nhất app.
- **Nút Xoá.** Không phải "sửa một trường" mà là hành động trên chính bản ghi.

Nút Xoá **hỏi lại** bằng hộp thoại (khác vuốt-xoá ở danh sách, vì sheet đóng
luôn khi xoá nên không có chỗ đặt toast hoàn tác), và nằm **cuối form** — cách xa
nút «Lưu» ghim ở đáy sheet, vì hai nút cạnh nhau, một nguy hiểm một không, là
chỗ ngón tay chạm nhầm.

| # | Khối | Điều kiện |
|---|---|---|
| 1 | Ô tick + tên (`title2` SemiBold, gõ được, nhiều dòng) | luôn |
| 2 | Nhãn hạn `caption` `subtle`, **thụt vào 36** cho thẳng với tên | có hạn |
| 3 | Trường «Ngày đến hạn» → bộ chọn ngày | luôn |
| 4 | Trường «Người phụ trách» → chip (có nấc «Chưa phân») | luôn |
| 5 | Trường «Lặp lại» → chip | **chỉ khi có hạn** |
| 6 | Trường «Nhắc trước» → chip | **chỉ khi có hạn** |
| 7 | Trường «Ghi chú» → ô nhiều dòng | luôn |
| 8 | Nhóm «5 lần gần nhất» | **chỉ khi việc lặp lại ĐÃ LƯU** |
| 9 | Nút «Xoá» (nguy hiểm), cách trên 32 | luôn |

**Liên động phải vẽ:** bỏ ngày đến hạn thì **ba khối biến mất cùng lúc** — Lặp
lại, Nhắc trước, và nhóm «5 lần gần nhất».

Nhóm «5 lần gần nhất»: mỗi dòng là `✓` màu `positive` + ngày. **Cố ý không hiện
ai làm** — chỉ ngày. Khối này đọc theo `recur` **đã lưu**, không theo chip đang
sửa: cho nó hiện ra lúc người dùng vừa chạm «hằng tuần» là hứa một lịch sử chưa
tồn tại.

**Lặp lại và danh sách đi cùng một patch.** Đặt lặp → việc sang danh sách «Định
kỳ»; bỏ lặp → về «Linh hoạt». Ghi hai lệnh riêng thì một lần mạng hỏng giữa
chừng để lại việc có `recur` nhưng vẫn nằm ở tab Linh hoạt — một dòng kẹt không
có đường nào sửa từ UI.

### D.5 Chi tiết sự kiện

Màn này **GIỮ LẠI** dạng full-screen, khác việc — và đó không phải thiếu nhất
quán. Nó là **trung tâm ngữ cảnh** (05 §5.4): việc chuẩn bị · chi phí · giấy tờ ·
khối «NĂM NGOÁI» · ba nút tạo bản ghi đã gắn sẵn `eventId`. Một modal sửa không
chứa được những thứ đó, và nhét chúng vào thì nó thôi là form sửa.

Chạm một dòng sự kiện ở tab Sự kiện mở thẳng **modal sửa** (`(modals)/event-form`
kèm param `id`); màn chi tiết này tới từ nhóm «Sự kiện sắp tới» trên Nhà mình.
Trong màn chi tiết có nút **«Sửa»** cạnh tên, mở đúng modal đó.

> Cùng một form dùng cho thêm mới và sửa — có `id` thì nạp bản ghi và gọi
> `update`, không có thì `create`. Mười bốn trường, liên động lịch âm/dương với
> «Lặp hằng năm», luật `childMemberId` chỉ giữ khi loại là "của con": tất cả phải
> giống hệt ở hai chế độ. Hai bản sao sẽ lệch nhau ở lần sửa thứ nhất, và lệch
> **âm thầm** — form thêm đúng, form sửa sai, không có gì báo.

Ở chế độ sửa, ngày dương của sự kiện âm lịch được **tính lại tại chỗ** bằng
`nextLunarOccurrence`, KHÔNG đọc `nextOccurrenceDate`: cột đó là cache do Edge
ghi (ràng buộc #2) và có thể còn `null`, làm form mở ra với ô ngày trống — người
dùng thấy sự kiện của mình mất ngày.

| # | Khối | Rỗng thì sao |
|---|---|---|
| 1 | Tên `title1` SemiBold + nút «Sửa» cùng hàng | — |
| 2 | Hàng ngày: dương `body` `ink` + âm `body` Medium `brand-deep` | — |
| 3 | Dòng phụ `caption` `subtle` (bên nội/ngoại · địa điểm) | — |
| 4 | **[đk]** Ghi chú `body` `muted` | ẩn |
| 5 | **[đk]** Nhóm «NĂM NGOÁI» | **ẩn hẳn** |
| 6 | Nhóm «Việc cần chuẩn bị» | hiện «Chưa có gì» |
| 7 | Nhóm «Chi phí» | hiện «Chưa có gì» |
| 8 | Nhóm «Giấy tờ» | hiện «Chưa có gì» |
| 9 | Ba nút phụ xếp dọc, cách nhau 12 | — |
| 10 | Nút «Xoá» (nguy hiểm) | — |

**Thứ tự có chủ ý:** «NĂM NGOÁI» đứng **trước** «Việc cần chuẩn bị», vì câu hỏi
đầu tiên trong đầu người dùng là *"lần trước hết bao nhiêu"*.

Ba nhóm 6–8 **giữ nguyên khi rỗng** (nói «Chưa có gì») để cấu trúc màn ổn định —
khác ba thẻ ở màn Nhà mình vốn ẩn hẳn.

Ba nút cuối: «Thêm việc» · «Thêm khoản» · «Gắn giấy tờ» — đều kiểu phụ.

---

## E. Tiền

> **Ba ràng buộc chi phối cả nhóm này. Vi phạm là sai sản phẩm, không phải sai
> thẩm mỹ:**
>
> 1. **Không bao giờ tổng hợp tiền theo người.** Tên người chỉ xuất hiện ở **cấp
>    từng khoản** — không tổng, không biểu đồ, không xếp hạng, không lọc theo người.
> 2. **Mọi số tổng phải kèm nhãn thời gian.** Không ngoại lệ.
> 3. **Không vẽ tổng theo tháng thành biểu đồ đường.** Danh sách thì được. Khoảng
>    trống trong việc ghi chép trông y hệt thay đổi trong chi tiêu, và tháng nào
>    hai người bận quên ghi sẽ hiện ra như một tháng tiết kiệm.

### E.1 Tổng quan

| # | Khối | Cách trên |
|---|---|---|
| 1 | Tiêu đề «Tiền» `title1` SemiBold | 8 |
| 2 | Thẻ trạng thái (viền `brand-soft` khi không ở mức «Ổn») | 12 |
| 3 | Nút chính «Sắp tới» | 16 |
| 4 | Khối bốn dòng nhóm | 24 |
| 5 | Hai nút phụ cạnh nhau | 12 |
| 6 | **[đk]** «Sắp phải trả» (tối đa 3 dòng) | 24 |
| 7 | **[đk]** «Cần trao đổi» | 24 |
| 8 | **[đk]** «Quỹ chung» — số dư + nhãn thời gian | 24 |
| 9 | **[đk]** «Mục tiêu» | 24 |
| 10 | Dòng «Sổ hiếu hỉ» — **luôn hiện** | 24 |

Nút «Sắp tới» cố ý đặt **trên** bốn dòng nhóm.

**Khối bốn dòng** — một khung bo 20 viền `line`, bốn dòng bên trong cách nhau
bằng đường kẻ (dòng cuối không kẻ). Mỗi dòng: nhãn `body` `ink` bên trái, số tiền
`heading` SemiBold bên phải, rồi `›`.

Thứ tự: «Có thể dùng ngay» · «Để dành» · «Dài hạn» · «Đang nợ».

**Số tiền ở màn này rút gọn** — «25 triệu ₫» chứ không «25.000.000 ₫». Con số đầy
đủ ở đây không giúp quyết định gì mà lại bắt đếm số 0.

Mục ở nhóm «Mục tiêu»: tên + phần trăm cùng hàng, thanh tiến độ, rồi **nhãn thời
gian** `caption` `subtle`.

Dòng «Sổ hiếu hỉ» là dòng điều hướng thường, **hiện cả khi sổ trống**.

### E.2 Sắp tới

Số lớn nhất app có: `display` (30px) SemiBold, **số đầy đủ, không rút gọn**. Trên
nó là nhãn `label` SemiBold `muted` viết hoa; dưới nó là câu bắt buộc `caption`
`subtle`: «theo những khoản nhà mình đã ghi».

Nhóm theo tháng, mỗi tháng: hàng tiêu đề (tên tháng `label` SemiBold `muted` viết
hoa | tổng tháng `heading` SemiBold), rồi các dòng.

**Dòng nhu cầu không có nhãn nguồn** — ba nguồn (khoản phải trả, sự kiện, giấy
tờ) trộn làm một danh sách. Mỗi dòng: tên + ngày `caption` `subtle` bên dưới |
số tiền bên phải.

Khối đối chiếu cuối (bo 20, viền `line`, padding 16): dòng «Có thể dùng ngay» +
số, rồi **nhãn thời gian**, rồi kẻ ngang, rồi **một trong hai**:

| Trường hợp | Hiện |
|---|---|
| đủ | «Còn lại» + số, `heading` SemiBold |
| thiếu | **một câu** `heading` SemiBold màu `critical` nói rõ thiếu bao nhiêu |

> Thiếu thì **đổi hẳn câu chữ**, không phải chỉ tô đỏ một số âm. Và **nói thiếu
> thôi, không kèm lời khuyên** — app không bảo người dùng phải làm gì.

**[đk]** Khối «Mục tiêu — có thể hoãn», cách trên 24, **dưới** khối đối chiếu.
Nhãn nhóm `label` SemiBold `muted` viết hoa. Mỗi dòng: tên | số tiền — dựng như
dòng nhu cầu thường, **không thanh tiến độ, không phần trăm**.

> **Ràng buộc quan trọng nhất của cả màn:** con số ở khối này **không nằm trong
> bất kỳ phép cộng nào** — không vào số hero, không vào tổng tháng, không vào
> «Còn lại», không vào câu «Thiếu khoảng». Nghĩa vụ và nguyện vọng đứng cùng một
> màn hình để hai người thấy tháng 9 đóng học phí xong thì quỹ du lịch phải chậm
> lại — nhưng **cùng màn hình không phải cùng một con số**.

Khối này ẩn hẳn khi chưa có mục tiêu nào có ngày mong muốn.

**[đk]** Khối hỏi lại số dư (nền `soft` bo 20, padding 16): một câu + hai nút
cạnh nhau «Cập nhật» / «Bỏ qua».

### E.3 Tài sản

Ba nhóm theo thứ tự «Có thể dùng ngay» · «Để dành» · «Dài hạn». Nhãn nhóm `label`
SemiBold `muted`. Nhóm rỗng ẩn — **trừ** nhóm vừa được mở từ màn tổng quan (nhóm
đó hiện kèm dòng «Chưa có gì»).

**Dòng khoản:**

```
Tên khoản (giãn)                    12.500.000 ₫
Vietcombank · Vợ giữ            Vợ cập nhật 3 tuần trước    ›
```

- Số tiền `body`, **đầy đủ** (khác màn tổng quan).
- Nhãn thời gian `micro` `subtle`, **có tên người khai**, **luôn hiện** kể cả khi
  vừa cập nhật hôm nay.
- Dòng phụ ghép «nơi giữ · người giữ» — người giữ chỉ là **ngữ cảnh của khoản
  này**, không bao giờ là chiều để gộp.

**Chi tiết tài sản:** tên `title1` → số tiền `display` → **nhãn thời gian đủ hai
nửa** (ai khai + khai lúc nào, giọng trung tính: «Vợ cập nhật 6 tuần trước», KHÔNG
phải «Quá hạn 6 tuần») → khối thông tin (khung bo 20, các dòng nhãn|giá trị) →
ba nút xếp dọc → nhóm «Thay đổi gần nhất» → nút «Xoá».

**Nút chính là «Cập nhật giá trị», không phải «Sửa».**

Nhóm «Thay đổi gần nhất» **chỉ đọc, không có nút sửa/xoá**. Mỗi dòng: câu mô tả +
dòng phụ (ngày · người) + mức chênh lệch bên phải — **chênh lệch không tô màu
theo dấu**.

### E.4 Nợ

Tab con «Đang nợ | Đã tất toán» — **thanh tab giữ nguyên ở cả ba trạng thái**
(đang tải, lỗi, có dữ liệu) để không nhấp nháy.

Dòng nợ: tên + dòng phụ («người cho vay · kỳ tới ...») | số dư `body` | `›`.
**Số dư không tô đỏ** — một khoản nợ không phải một lỗi lầm.

**Chi tiết nợ** khác chi tiết tài sản ba điểm:
- **Không có nhãn thời gian** — số dư không phải "số khai", nó giảm theo từng kỳ trả.
- Có thanh tiến độ (khi biết số gốc), màu `brand`, kèm dòng «đã trả X trên Y».
- **Không có nút «Đã trả»** — dư nợ chỉ giảm bằng cách chốt **một kỳ cụ thể** ở
  màn khoản phải trả.

### E.5 Khoản phải trả

Tab con **bốn mốc**: «7 ngày» · «30 ngày» · «Quá hạn» · «Đã trả». Mặc định 30 ngày.

Dòng: tên | nhãn hạn `caption` bên dưới | số tiền | `›`. Đã trả thì tên và số
chuyển màu `muted`. Quá hạn thì **chỉ dòng nhãn hạn nhỏ** đổi màu `critical` —
**không tô đỏ cả dòng**.

**Chi tiết khoản — hai trạng thái phải vẽ:**

| Trạng thái | Hiện |
|---|---|
| thường | nút chính «Đã trả» |
| đang chốt | **nút đó biến mất**, thay bằng khối bo 20 viền `line` chứa bộ chọn ngày + nút xác nhận + nút chìm «Huỷ» |

**[đk]** Thẻ viền `brand-soft` nói dư nợ sau khi trả — hiện **cả khi chưa bấm gì**
(khi khoản này gắn với một khoản nợ). Đây là xem trước, app chưa ghi gì.

Khoản đã trả **không có nút «Bỏ đánh dấu»**.

### E.6 Mục tiêu

**Ngoại lệ duy nhất của luật "danh sách không dùng thẻ".** Mỗi mục tiêu là một
thẻ (bo 20, viền `line`, padding 16, cách nhau 16): tên `body` Medium → thanh
tiến độ → **hai con số cạnh nhau** «đã có / cần đạt» → nhãn thời gian.

> Hai con số chứ **không phải phần trăm** — phần trăm giấu mất quy mô.

**Chi tiết mục tiêu:** tên → thanh tiến độ → khung ba dòng (đã có · cần đạt · còn
thiếu, số `heading`) → nhãn thời gian → nút «Góp thêm» → nút «Sửa» → nhóm «Các
lần góp» → nút xoá.

Khi đã đạt, dòng thứ ba **đổi hẳn** thành chữ «Đã đạt» màu `positive` — không
phải một số 0.

> **Không có:** cần góp bao nhiêu mỗi tháng · còn bao lâu · ai góp bao nhiêu ·
> đánh giá tiến độ nhanh/chậm. Mục tiêu cũng không chảy vào số ở màn «Sắp tới»
> và không hiện trên màn Nhà mình.

### E.7 Hai màn lịch sử

**«Nhà mình qua từng mốc»** — mỗi mốc: ngày `body` Medium + nhãn trạng thái cỡ
nhỏ; dưới đó bốn dòng tổng, mỗi dòng: nhãn `caption` `muted` | số | **cột chênh
lệch rộng 96 căn phải**.

> Mốc đầu tiên để **cột chênh lệch trống hoàn toàn** — không «+0», không gạch
> ngang. Mốc đầu là *"chưa biết"*, không phải *"không đổi"*.

**«Lịch sử biến động»** — chip lọc theo **loại khoản** (Tất cả · Tài sản · Nợ ·
Khoản phải trả · Mục tiêu). **Sẽ không bao giờ có bộ lọc theo người.**

Mỗi tháng có hàng tổng — và hàng này **bắt buộc đủ hai thứ**:

```
THÁNG 7, 2026                                   +12.500.000
đã ghi 8 khoản
```

> Bỏ dòng «đã ghi N khoản» thì con số tự nhận là bức tranh đầy đủ, trong khi nó
> chỉ là những gì hai người kịp ghi. **Đây là màn mà luật "không biểu đồ" áp rõ
> nhất — tuyệt đối không vẽ đường, cột, hay so sánh giữa các kỳ.**

Mỗi dòng: tên khoản (`body` `ink`) **trước** → câu mô tả (`caption` `muted`) →
ngày · người (`micro` `subtle`) → chênh lệch bên phải, không tô màu.

Cuộn tới đáy thì nạp thêm — vẽ vòng quay nhỏ màu `brand` ở đáy.

### E.8 Cần trao đổi

Mỗi mục có **ba tầng chữ**, rồi nút riêng bên dưới:

```
▸  Chỗ này em thấy hơi cao, mình xem lại nhé     (body ink)
   Thẻ tín dụng ACB · gắn ngày 12/07/2026        (caption subtle)
   Tự hết hiệu lực sau 9 ngày                     (micro subtle)
                                              ›
   [ Đã rõ ]   ← nút phụ, co theo nội dung
```

- `▸` màu `attention`.
- **Ghi chú của người gắn là dòng CHÍNH**, tên khoản chỉ là ngữ cảnh ở dòng phụ.
- Nút «Đã rõ» **co theo nội dung**, không rộng hết khung.

Khoản đã bị xoá: dòng phụ đổi thành «Khoản này đã được xoá», **mất dấu `›`**, và
dòng không bấm được nữa — nhưng nút «Đã rõ» vẫn dùng được.

> **Không có luồng bình luận, không có ô trả lời.** Cờ này là một lời nhắc "mình
> nói chuyện này nhé", không phải một cuộc trao đổi trong app.

---

### E.9 Quỹ chung

**Đây là màn duy nhất trong toàn app được phép hiện tổng tiền theo người.** Mọi
số đo và mọi câu chữ dưới đây phục vụ việc giữ ngoại lệ đó ở đúng chỗ.

| # | Khối | Cách trên |
|---|---|---|
| 1 | Tên quỹ `title1` SemiBold | 8 |
| 2 | Số dư `display` (30px) SemiBold, **số đầy đủ** | 8 |
| 3 | Nhãn thời gian `caption` `subtle` | 4 |
| 4 | Hai nút cạnh nhau «Bỏ vào» / «Rút ra» | 20 |
| 5 | Bộ chọn tháng | 28 |
| 6 | Khối tổng tháng | 16 |
| 7 | **[đk]** Khối «Người bỏ vào» | 24 |
| 8 | Danh sách khoản trong tháng | 24 |

**Nhãn thời gian dùng chữ «Ghi lần cuối …», không phải «… cập nhật …».** Số dư
quỹ là **tổng của những khoản đã ghi**, khác `assets` vốn là một con số ai đó
nói ra. Dùng lại câu chữ của tài sản ở đây là nói sai bản chất dữ liệu.

**Bộ chọn tháng** — một hàng: `‹` | tên tháng `label` SemiBold `muted` viết hoa,
căn giữa, giãn | `›`. Vùng chạm mũi tên 44×44. Tháng chưa có bản ghi thì mũi tên
vẫn đi được, và danh sách hiện «Tháng này chưa ghi khoản nào».

**Khối tổng tháng** (khung bo 20, viền `line`, padding 16): dòng «Bỏ vào» + số
`positive`, dòng «Rút ra» + số, kẻ ngang, rồi **dòng bắt buộc** `caption`
`subtle`: «N khoản nhà mình đã ghi».

> Dòng số lượng bản ghi **không được bỏ**, cùng luật với màn lịch sử biến động:
> một con số tổng không kèm số lượng thì tự nhận là đầy đủ.

#### Khối «Người bỏ vào» — ngoại lệ, và ranh giới của nó

Nhãn nhóm `label` SemiBold `muted`. Mỗi dòng: tên `body` `ink` (giãn) | số tiền
`body` | số lần `caption` `subtle`.

**Sắp theo tên, thứ tự ABC.** Không sắp theo số tiền — sắp theo tiền là một bảng
xếp hạng, và xếp hạng hai vợ chồng đúng là thứ cả spec này tránh. ABC là thứ tự
duy nhất không mang thông điệp nào.

**Khối này chỉ hợp lệ khi tháng đang xem hiện rõ ngay phía trên nó.** Nếu dựng
lại màn này ở đâu khác mà không có bộ chọn tháng, thì khối này không được có mặt.

**Không bao giờ vẽ:** dòng tổng cộng dồn qua các tháng · chữ «còn thiếu» /
«chưa góp» / «nợ quỹ» · phần trăm so với một mức chuẩn · màu cảnh báo cho người
bỏ vào ít hơn · thanh tiến độ so sánh hai người · biểu đồ bất kỳ.

#### Dòng khoản

```
5/9    Bỏ vào              +10.000.000 ₫
       tiền nhà tháng 9              Anh
```

- Ngày `caption` `subtle` bên trái, rộng cố định 48.
- Loại `body` `ink`; số tiền `body` bên phải, **`positive` khi bỏ vào**, `ink`
  khi rút ra — **không dùng `critical` cho khoản rút**: rút tiền quỹ không phải
  một lỗi lầm.
- Dòng phụ: mục đích `caption` `subtle` bên trái, tên người bỏ vào bên phải.
  Khoản rút **không hiện tên ai** — tiền đã vào quỹ là tiền chung.

Vuốt trái để xoá. Chạm dòng để sửa.

Trạng thái phải vẽ: đang tải · lỗi · quỹ rỗng (**có** nút «Bỏ vào») · tháng rỗng
(**không** nút — ô chọn tháng đã ở ngay trên) · có dữ liệu · đang vuốt.

---

## F. Giấy tờ

### F.1 Danh sách

Thanh lọc ghim trên (ngoài vùng cuộn): tab con «Tất cả» · «Sắp hết hạn» ·
«Không có hạn».

**Dòng giấy tờ** — ô ảnh 44×44 bo 14 + ba dòng chữ + `›`:

```
[ảnh]  Bảo hiểm xe máy
       Còn 12 ngày · Chồng               ›
       Bản giấy: Ngăn kéo phòng làm việc
```

Ô ảnh có **ba dạng**: ảnh thật (phủ kín ô) · chữ «PDF» (`caption` SemiBold
`subtle` trên nền `soft`) · chữ cái đầu của tên (khi chưa có file nào).

Dòng thứ hai đổi sang **`attention` + Medium** khi còn ≤30 ngày, hôm nay, hoặc
ngày mai. **Quá hạn từ lâu KHÔNG tô màu.**

Dòng thứ ba luôn có: «Bản giấy: ...» hoặc «Chưa ghi chỗ để bản giấy».

Cuối danh sách: dòng điều hướng «Con» rồi nút phụ «Giấy tờ mới».

### F.2 Chi tiết

| # | Khối |
|---|---|
| 1 | Tên `title1` SemiBold |
| 2 | Dòng phụ `caption` `subtle` («Thuộc về Chồng») |
| 3 | Hàng hạn: nhãn trái `body` `muted` \| giá trị phải `body` Medium (màu `attention` khi ≤30 ngày) |
| 4 | **Khối «Bản giấy để đâu»** |
| 5 | **[đk]** Phí gia hạn |
| 6 | Nhóm «Ảnh và file» — lưới ô 96×96 |
| 7 | Ba nút phụ: «Chụp ảnh» · «Chọn ảnh» · «Chọn file» |
| 8 | **[đk]** Ghi chú |
| 9 | Nút «Xoá» (nguy hiểm) |

**Khối «Bản giấy để đâu» là mảng màu lớn duy nhất của màn:** nền `brand-soft`, bo
20, padding 16; nhãn `label` Medium `brand-deep`, giá trị `title2` `ink` bên dưới
(hoặc «Chưa ghi chỗ để bản giấy» màu `subtle`). Bấm được.

**Lưới file — ô 96×96 bo 14, cách nhau 12.** Ba dạng ô:

| Dạng | Hình |
|---|---|
| xong | ảnh phủ kín, hoặc chữ «PDF» trên nền `soft` |
| đang tải lên | nền `soft` + vòng quay `muted` + **phần trăm** `micro` `muted` bên dưới |
| lỗi | nền `critical-soft` + «Chưa tải lên được» + «Thử lại», cả hai màu `critical`, căn giữa |

> Dùng **con số phần trăm chứ không phải thanh tiến độ** — ở ô 96px, con số đọc
> nhanh hơn một thanh mảnh.

Ô đang tải và ô đã xong **nằm chung một lưới**, không tách khu.

---

## G. Form & Sheet

Mọi form dùng khung sheet ở §B.4. Dưới đây là những gì bên trong.

### G.1 Form việc — mẫu chuẩn của "form dạng dòng"

Toàn bộ form đọc thành **một danh sách các dòng đều nhịp**, mỗi dòng cao 72:

```
[icon]  Tên việc                      ← gõ thẳng, không viền không nền
        Đón con lúc 5 giờ
────────────────────────────────
[icon]  Ngày đến hạn                  ← chạm để mở
        Thứ Bảy, 09/08              ›
────────────────────────────────
[icon]  Người phụ trách
        Chưa phân                   ›
```

> Dòng đầu **cố ý không có viền, không có nền** để đọc như một dòng giống các
> dòng dưới, chỉ khác là gõ được. Chiều cao 72 và ô icon 32 khớp chính xác với
> dòng chạm-để-chọn.
>
> Vì sao là dòng chạm-mở-sheet chứ không phải chip hiện ngay trên form: mỗi dòng
> chiếm chiều cao cố định dù bộ chọn bên trong to đến đâu, nên cả form đều nhịp.
> Chip trải ngang làm chiều cao form nhảy theo số lựa chọn, và với ba trường trở
> lên thì không còn nhìn ra đâu là trường nào.

**Liên động phải vẽ — khi chưa chọn ngày:**
- hai dòng «Lặp lại» và «Nhắc trước» **biến mất**
- dòng «Người phụ trách» trở thành dòng cuối → **mất đường kẻ dưới**
- giá trị dòng ngày hiện màu `subtle`

**Lỗi tên việc đổi ba thứ cùng lúc:** màu đường kẻ, màu icon, màu nhãn — tất cả
sang `critical`, kèm dòng lỗi `caption` `critical` thụt vào 44.

Ô ghi chú cuối form: nền `soft` bo 24, cao tối thiểu 108, padding `14×16`,
**không viền**. Bộ đếm ký tự **chỉ hiện khi gần chạm trần** («1850/2000») — hiện
«0/2000» từ đầu chỉ là nhiễu.

### G.2 Form sự kiện — khác form việc

Không dùng dạng dòng 72 mà chia **bốn nhóm cách nhau 32**:

1. **Tiêu đề + Loại** — ô tiêu đề gõ ở cỡ `title2` SemiBold, chỉ có **đường kẻ
   dưới** (không khung), kèm bộ đếm «12/120» hiện **luôn** (khác form việc).
2. **Lịch** — một lịch tháng hiện **cả ngày dương và ngày âm**.
3. **Gia đình** — hai dòng chọn cao 58 (nhãn và giá trị **cùng hàng**, khác dòng
   72 vốn xếp chồng).
4. **Chi tiết** — địa điểm, chi phí dự kiến, ghi chú.

**Liên động quan trọng:** đổi «Loại» sang giỗ / sinh nhật / ngày lễ thì lịch
chuyển sang **chế độ âm lịch**; các loại khác dùng dương lịch. Người dùng **luôn
chọn ngày trên lịch dương**, app tự quy đổi.

Lỗi tạo ở form này là **khối cảnh báo** (vạch trái 4px `critical`, nền
`critical-soft`, padding `12×16`), không phải một dòng chữ đỏ như form việc.

### G.3 Các form còn lại

Dùng dạng **trường xếp dọc** (nhãn trên, ô dưới, cách nhau 16) — đơn giản hơn hai
form trên:

| Form | Trường |
|---|---|
| Tài sản | tên · loại (chip) · giá trị · **[đk]** thanh khoản · nơi giữ · người giữ (chip) · ghi chú |
| Cập nhật giá trị | dòng ngữ cảnh · giá trị · ngày · ghi chú |
| Nợ | tên · **[đk]** dư nợ · người cho vay · gốc · kỳ trả · ngày tới · **[đk]** kỳ lặp · hạn cuối · người vay |
| Khoản phải trả | tên · số tiền · ngày đến hạn · ghi chú |
| Mục tiêu | tên · cần đạt · **[đk]** đã có · ngày mong đạt |
| Góp thêm | dòng ngữ cảnh · số góp · ngày · ghi chú |
| Giấy tờ | tên · hết hạn · **bản giấy để đâu** · loại (chip) · thuộc về · ngày cấp · phí · ghi chú |

**Bốn liên động phải vẽ:**

| Form | Điều kiện | Hiện gì |
|---|---|---|
| Tài sản | mặc định | dòng nhỏ «Có thể dùng ngay · **Đổi**» (chữ «Đổi» màu `brand`) |
| | sau khi chạm «Đổi» | hàng chip thanh khoản đầy đủ |
| Nợ | đang **sửa** | ô dư nợ **thay bằng** một dòng chữ nền `soft` giải thích dư nợ tự giảm thế nào |
| Nợ | có ngày trả tới | hiện chip kỳ lặp |
| Mục tiêu | đang **sửa** | trường «Đã có» **biến mất** |

> Ba chỗ ẩn đi này cùng một lý do: những số đó chỉ được ghi qua **một đường duy
> nhất** (cập nhật giá trị / chốt kỳ trả / góp thêm) — đường giữ lại được cả số,
> ngày khai và người khai. Cho sửa thẳng ở form là mở một đường thứ hai làm mất
> lịch sử.

**Ô nhập tiền** — cao 44, bo 14, viền `line`, ký hiệu `₫` màu `muted` sát mép
phải. Tự chấm phân cách hàng nghìn khi gõ. **Cỡ chữ tự nhỏ lại khi số dài** (23 →
19 → 16).

### G.4 Sheet hỏi chi phí thực tế — màn đặc biệt

Sheet duy nhất **tự bật lên** mà người dùng không bấm gì (sau khi một dịp vừa
diễn ra xong), và là sheet duy nhất **không cuộn** và có **hai nút xếp dọc**.

Nội dung: một câu `body` `muted` → ô nhập tiền (đã **điền sẵn** số dự kiến) →
dòng `caption` `subtle` «Chỉ hỏi một lần thôi.»

Hai nút: «Lưu» (chính, mờ đi khi ô trống) và «Bỏ qua» (phụ).

**Ba đường thoát cho ba kết quả khác nhau — đây là cốt lõi của màn:**

| Cách thoát | Hỏi lại lần sau? |
|---|---|
| «Lưu» | không |
| «Bỏ qua» | không |
| vuốt xuống hoặc `✕` | **có** |

> Vuốt xuống là cử chỉ **điều hướng**, không phải một quyết định. Coi nó là "bỏ
> qua vĩnh viễn" là diễn giải im lặng thành đồng ý.

### G.5 Màn «Kiểm lại giúp mình»

Không phải sheet — màn thường. Tiêu đề `title2` + câu `body` `subtle` «App đọc
được thế này. Sửa lại nếu chưa đúng rồi lưu.»

Rồi: **[đk]** «Còn 8 lượt tháng này» → nút chính «Chọn ảnh» → ô dán nội dung →
nút phụ «Đang đọc…».

**Ba câu thông báo, mỗi câu một khối riêng — cố ý không gộp:**

| Khi nào | Câu |
|---|---|
| hết lượt | «Hết lượt đọc ảnh tháng này. Vẫn nhập tay được như thường.» |
| chưa bật | «Đọc ảnh chưa bật. Nhập tay giúp mình nhé.» |
| không đọc được | «Chưa đọc được gì từ ảnh này. Nhập tay giúp mình nhé.» |

> Không gộp thành «chưa dùng được» vì người dùng cần biết *chờ tháng sau* / *chờ
> bản cập nhật* / *chụp lại rõ hơn* — ba việc khác nhau.

Cuối màn: chữ «Nhập tay» màu `muted` căn giữa — **luôn hiện, không phụ thuộc
trạng thái nào.** Đó là điểm của cả màn: **AI là đường tắt, nhập tay là đường
luôn có.**

---

## H. Khởi động & Cài đặt

### H.1 Đăng nhập

Nội dung **căn giữa theo chiều dọc**, lề 16, đệm trên dưới 48.

1. Cụm tiêu đề: nhãn nhỏ `label` SemiBold **`brand`** («Chào mừng trở lại») —
   đây là **mảng màu brand duy nhất** của màn; rồi tiêu đề `display` SemiBold
   («Đăng nhập»); rồi câu `body` `muted` cách 12. Cả cụm cách khối dưới 32.
2. Hai nút mạng xã hội **cạnh nhau, chia đều** (Google · Apple) — pill trắng viền
   `line`, logo 20px giữ màu gốc. **Cả hai đang mờ đi (`opacity 40%`) và không
   bấm được** — vẽ đúng trạng thái này.
3. Dải phân cách: hai vạch 1px `line` hai bên + chữ «hoặc» `caption` `subtle`,
   cách trên dưới 24.
4. Ô Email.
5. Ô Mật khẩu — có link «Quên mật khẩu?» (`label` Medium `brand-deep`) **cùng
   hàng với nhãn**, và nút hiện/ẩn 44×44 **nằm trong ô** sát mép phải (icon con
   mắt 20px `muted`, hai dạng: mở và gạch chéo).
6. **[đk]** Dòng lỗi `caption` `critical`.
7. Nút chính «Đăng nhập».
8. Dòng cuối căn giữa: «Chưa có tài khoản? **Đăng ký**» (chữ sau `brand-deep` SemiBold).

**Ba câu lỗi khác nhau, tuỳ nguyên nhân** — sai mật khẩu / mất mạng / lỗi khác.

### H.2 Các màn khởi tạo

**Đăng ký** — như đăng nhập nhưng: có nút back (mũi tên góc trên trái, 44×44),
**không có nút mạng xã hội**, không có dải «hoặc», ba ô (Email · Mật khẩu · Nhập
lại). Hai nút hiện/ẩn hoạt động **độc lập**.

Sau khi đăng ký xong mà cần xác minh email, **toàn màn đổi** thành: cụm tiêu đề
(«Đã tạo tài khoản. Kiểm tra hộp thư để xác minh email.») + một nút phụ «Đăng
nhập». Không form, không nút back.

**Bắt đầu** — tiêu đề «Bắt đầu» (`title1`) **luôn hiện**, dưới nó là **một trong
ba cụm**:

| Cụm | Nội dung |
|---|---|
| chọn | hai nút xếp dọc: «Tạo nhà mới» (chính) · «Tôi có mã mời» (phụ) |
| tạo | ô «Tên hiển thị của bạn» + nút «Tạo nhà mình» + chữ «Quay lại» màu `muted` |
| mã | ô «Mã mời» + ô tên + nút «Tham gia» + «Quay lại» |

**Ngưỡng ghi** — màn duy nhất dùng lề **24** (không phải 16), không cuộn.

Câu hỏi `title1`: «Khoản từ bao nhiêu trở lên thì nhà mình ghi lại?», rồi câu
`body` `subtle`: «Hai người tự chốt với nhau. App chỉ nhớ hộ, không chặn gì cả.»

Bốn ô chọn xếp **2×2** (mỗi ô rộng ≥46%, cao ≥44, nền `soft`, bo 14, viền `line`,
chữ `body` Medium căn giữa): «500 nghìn» · «1 triệu» · «2 triệu» · «Tự quyết».
**Không có trạng thái đã-chọn** — chạm là đi tiếp luôn.

Cuối màn: «Đổi lúc nào cũng được.» (`caption` `subtle`) và «Để sau» (`label`
Medium `muted`).

**Gói khởi tạo** — danh sách 6 mục có ô tick, **bắt đầu từ trên** (không căn
giữa): Tết Nguyên đán · Giỗ · Sinh nhật bố mẹ hai bên · Đăng kiểm xe · Bảo hiểm
xe · Học phí. Mục cần chọn ngày sau có dòng phụ `caption` `muted`: «chọn ngày
sau». Rồi nút «Thêm vào» và chữ «Để sau».

**Tham gia bằng mã** — mã hiện dạng **đọc, không nhập**: hộp nền `soft` bo 14
padding `8×16`, **chỉ rộng bằng nội dung**, chữ `title2` SemiBold **giãn 4px**.
Dưới đó chỉ hỏi **đúng một trường**: tên hiển thị.

### H.3 Cài đặt

**Cài đặt** — ô «Tên hiển thị» → nhóm «Nhà mình» (hai dòng điều hướng: «Tên nhà»
có giá trị bên phải, «Mời») → nút phụ «Đăng xuất» cách trên 40.

**Nhà mình** — ô tên nhà → nhóm «Ngưỡng ghi» (**chip pill** với 4 mức, có trạng
thái đang chọn — khác màn onboarding vốn dùng ô vuông không trạng thái) → nhóm
«Thành viên» (avatar 36 + tên + vai trò `caption` `subtle`, kẻ ngang giữa các
dòng) → nhóm «Thêm người trong nhà» (ô tên + chip «Con»/«Người thân» + nút phụ,
nút mờ đi khi ô trống).

**Mã mời** — hộp mã là **mảng màu brand duy nhất**: nền và viền đều `brand-soft`,
bo 20, đệm dọc 32, cách trên dưới 32; mã chữ `display` (30px) SemiBold **giãn
8px**, tabular-nums.

Dưới đó: nút chính «Chia sẻ», rồi chữ «Sao chép mã» màu `brand` căn giữa (không
phải nút). Sau khi chạm, chữ đổi thành «Đã sao chép» trong 2 giây rồi trở lại.

Cuối: «Mã có hiệu lực 7 ngày.» (`caption` `subtle`).

Trạng thái đang tải: hộp brand vẫn ở đó, chỗ chữ mã thay bằng khối chờ 192×40.

---

## I. Checklist nghiệm thu

### I.1 Trạng thái phải có cho mọi màn danh sách

Thiếu một cái là thiếu một màn, không phải thiếu một chi tiết:

- [ ] **Đang tải** — skeleton, không phải vòng quay giữa màn
- [ ] **Lỗi** — có nút «Thử lại»
- [ ] **Rỗng** — có nút hành động **hoặc** không, theo đúng bảng §I.2
- [ ] **Có dữ liệu** — vẽ ít nhất 5 dòng để thấy nhịp danh sách
- [ ] **Đang làm mới** (nếu màn kéo-để-làm-mới được)

### I.2 Trạng thái rỗng — cái nào có nút, cái nào không

| Có nút | Không có nút |
|---|---|
| Việc · Sự kiện · Tài sản · Nợ · Khoản phải trả · Mục tiêu · Giấy tờ · Số đo | Nhà mình · Mua sắm · Cần trao đổi · Các mốc · Lịch sử biến động · Danh sách con · Sổ (tab Người quen) |

> Nguyên tắc: có nút khi **có việc cụ thể làm ngay tại đó**. Không có nút khi ô
> nhập đã ở ngay trên (Mua sắm), khi bản ghi do hệ thống sinh (Các mốc), hoặc khi
> việc cần làm nằm ở màn khác (Cần trao đổi).

### I.3 Rà lại luật — chín câu hỏi

- [ ] Có nút chính nào **màu brand** thay vì màu đen không?
- [ ] Có màn nào **hơn một mảng màu lớn** không?
- [ ] Có màn nào **hơn một nút chính** không?
- [ ] Có danh sách nào dựng bằng **thẻ lặp lại** thay vì đường kẻ không? (Chỉ mục
      tiêu được phép.)
- [ ] Có chỗ nào **chỉ dùng màu** để nói trạng thái, không kèm chữ không?
- [ ] Có số tiền nào **tự đỏ/xanh theo dấu** không?
- [ ] Có số tổng nào **thiếu nhãn thời gian** không?
- [ ] Có **biểu đồ** nào không? (Không được có cái nào.)
- [ ] Có chỗ nào **cộng/so sánh/xếp hạng theo người** không? — ngoại lệ **duy
      nhất**: khối «Người bỏ vào» ở §E.9, và chỉ khi tháng đang xem hiện rõ ngay
      phía trên nó. Phép thử: *con số này có vắt qua nhiều hơn một tháng không?*
      Có → sai.
- [ ] Danh sách việc **linh hoạt** có chip người phụ trách không? (Không được có.)
- [ ] Danh sách việc **định kỳ** có vuốt để hoãn không? (Không được có.)
- [ ] Khối «Mục tiêu — có thể hoãn» có bị cộng vào con số nào không? (Không.)

### I.4 Rà lại chữ

- [ ] Mọi chữ chép đúng bảng từ vựng §A.5 — không có «phê duyệt», «cảnh báo»,
      «nhiệm vụ», «báo cáo»
- [ ] Tên nút = việc nút làm, và toast dùng lại đúng từ đó
- [ ] Câu lỗi nói rõ chuyện gì và cách sửa, không xin lỗi
- [ ] Không có chữ hoa toàn bộ do máy biến đổi
- [ ] Không có chỗ nào hiện «Chưa có dữ liệu»

### I.5 Rà lại số đo

- [ ] Mọi vùng chạm ≥ 44×44
- [ ] Mọi khoảng cách là bội của 4
- [ ] Lề ngang màn = 16 (trừ Ngưỡng ghi = 24)
- [ ] Số tiền bật tabular-nums
- [ ] Chỉ bốn chỗ có bóng
