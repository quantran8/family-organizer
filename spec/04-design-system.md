# 04 — Hệ thống thiết kế & ngôn ngữ

Tokens, chữ, mẫu trạng thái, quy tắc dùng từ. **Không** chứa mô tả màn hình (xem `05`).

Tokens và primitive nằm ở `apps/mobile/src/design` — không tách package, vì Edge Function không render gì (xem `01 §1`).

---

## 1. Điểm neo

Sản phẩm thuộc về **không gian trong nhà của một cặp vợ chồng Việt**, không phải bàn làm việc. Vật liệu lấy cảm hứng là đồ vật thật: tờ lịch bloc bóc hằng ngày, ngăn kéo đựng giấy tờ, chiếc phong bì.

Rủi ro lớn nhất là làm ra một dashboard fintech. Fintech gợi ý kiểm soát và hiệu suất — đúng hai thứ tài liệu sản phẩm yêu cầu tránh.

---

## 2. Màu — bảng sơn mài

```ts
export const color = {
  ink:      '#1A1614',  // đen sơn mài, chữ chính
  paper:    '#F0F1EC',  // vỏ trứng ngả xanh, nền
  surface:  '#FFFFFF',  // thẻ nổi
  jade:     '#2F5D50',  // xanh ngọc — nhấn chính, trạng thái ổn
  amber:    '#8C5A2B',  // cánh gián — cần chú ý
  son:      '#D8452E',  // son đỏ — dùng rất dè
  muted:    '#6E7B74',  // chữ phụ
  hairline: '#DDDED7',  // đường kẻ
};
```

**Quy tắc màu son.** Chỉ ba chỗ được dùng: số ngày âm trên khối lịch, trạng thái `tight`, nhãn quá hạn. Không dùng cho nút, không dùng cho badge thường. Đây là màu tờ lịch bloc đánh dấu ngày lễ — dùng nhiều một cái là mất hết sức nặng.

**Trạng thái tài chính** ánh xạ jade / amber / son, không phải xanh–vàng–đỏ đèn giao thông. Đèn giao thông đọc như phán xét.

| Trạng thái | Màu | Nhãn |
|---|---|---|
| `ok` | jade | Ổn |
| `watch` | amber | Cần chú ý |
| `tight` | son | Căng |
| `no_data` | muted | Chưa đủ dữ liệu |

---

## 3. Chữ

| Vai trò | Font | Dùng ở |
|---|---|---|
| Hiển thị | Source Serif 4 | tiêu đề màn hình, số ngày khối lịch |
| Thân | Be Vietnam Pro | toàn bộ UI |
| Số liệu | IBM Plex Mono | số tiền, ngày tháng |

Điều kiện bắt buộc khi thay font: **phủ đủ dấu tiếng Việt**, gồm các tổ hợp khó `ự ữ ặ ỗ ỡ`. Rất nhiều font đẹp gãy ở đây.

Thang: 32 / 24 / 18 / 16 / 14 / 12. Số tiền dùng `tabular-nums` để không nhảy khi cập nhật.

---

## 4. Chi tiết đặc trưng — khối lịch bloc

Góc trên màn hình chính:

```
┌──────────────┐
│      30      │  Source Serif 4 32px, ink
│  Thứ Năm     │  Be Vietnam Pro 12px, muted
│  16/6 âm     │  IBM Plex Mono 12px, son
└──────────────┘
```

Đây là chỗ **duy nhất** được phép trang trí. Mọi chỗ khác giữ yên tĩnh. Nó cũng làm việc thật: lịch âm là bối cảnh app này tồn tại, và không app phương Tây nào có.

---

## 5. Bố cục

Bo góc 12px cho thẻ, 8px cho input. Bóng đổ rất nhẹ, chỉ để tách thẻ khỏi nền. Khoảng cách theo bội số 4. Vùng chạm tối thiểu 44×44.

---

## 6. Primitive

`Screen` · `Card` · `SectionHeader` · `Row` · `MoneyText` · `DateBlock` · `StatusPill` · `MemberChip` · `Checkbox` · `Sheet` · `Field` · `AmountInput` · `EmptyState` · `ErrorState` · `Skeleton`

`MoneyText` và `AmountInput` là hai thành phần dễ làm sai nhất: bàn phím số, phân tách hàng nghìn khi gõ, không có phần lẻ với VND, tự thu nhỏ cỡ chữ khi số quá dài.

---

## 7. Ngôn ngữ

Ràng buộc sản phẩm, không phải gợi ý phong cách. Một nhãn sai làm hỏng định vị nhanh hơn một layout xấu.

| Dùng | Không dùng |
|---|---|
| Việc của nhà mình | Nhiệm vụ được giao |
| Khoản cần chú ý | Cảnh báo · Vượt chi |
| Cần trao đổi | Cần phê duyệt · Chờ xác nhận |
| Sắp đến hạn | Quá hạn nghiêm trọng |
| Cần chuẩn bị | Bắt buộc hoàn thành |
| Cập nhật gần nhất | Lần chỉnh sửa cuối |
| Vợ giữ · Chồng giữ | Người chịu trách nhiệm |
| Tình hình nhà mình | Báo cáo tài chính |

Nút đặt tên bằng việc nó làm, và giữ nguyên tên đó suốt luồng: nút "Lưu cập nhật" sinh ra toast "Đã cập nhật", không phải "Thành công".

Xưng hô: gọi thẳng "vợ", "chồng" theo tên hiển thị người dùng tự đặt. Không dùng "đối phương", "thành viên còn lại", "partner".

---

## 8. Mẫu trạng thái

**Rỗng** là lời mời hành động, không phải minh hoạ buồn. Một câu nói được gì, một nút.

**Tải:** skeleton cho lần đầu. Đã có cache thì hiện dữ liệu cũ ngay và refetch nền — không bao giờ chớp skeleton lên trên dữ liệu đang có.

**Lỗi:** nói rõ chuyện gì và cách sửa. Không xin lỗi, không mơ hồ.

| Tình huống | Câu |
|---|---|
| Mất mạng khi ghi | Chưa gửi được. Sẽ tự lưu khi có mạng. |
| Hết dung lượng | Đã dùng 48MB trên 50MB. Nâng cấp để thêm dung lượng, hoặc xoá bớt file. |
| Không tìm thấy | Mục này đã bị xoá. |
| Cần bản trả phí | Lưu file cần bản Pro. Bạn vẫn ghi được thông tin và vị trí bản giấy. |

M��t mạng khi ghi **không phải lỗi** — thao tác nằm trong hàng đợi và sẽ chạy. Dùng banner, không dùng hộp thoại.

---

## 9. Không làm ở MVP

Chat trong app · chia sẻ vị trí · lên thực đơn · danh sách mua sắm · album ảnh · gamification việc nhà · bảng xếp hạng giữa hai người · biểu đồ chi tiêu · kết nối ngân hàng · widget màn hình chính · chế độ tối.

Chế độ tối hoãn không phải vì khó, mà vì bảng màu neo vào nền vỏ trứng. Bản tối tử tế cần một bảng màu thứ hai thiết kế riêng, không phải đảo màu.

---

## 10. Tiếp cận — mức sàn, không thương lượng

- Vùng chạm ≥ 44×44.
- Tương phản ≥ 4.5:1 (đã kiểm: `ink`/`paper` = 13.2:1, `muted`/`paper` = 4.7:1).
- Mọi biểu tượng đơn lẻ có `accessibilityLabel`.
- Trạng thái tài chính **không chỉ dùng màu** — luôn có nhãn chữ.
- Tôn trọng cỡ chữ hệ thống đến 200%. Số tiền dùng `tabular-nums` và được phép xuống dòng.
- Tôn trọng thiết lập giảm chuyển động.
