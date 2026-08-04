/**
 * Design system — nguồn sự thật là `design.md`, mục §17–18.
 *
 * File này là bản dịch NGUYÊN VĂN của hai mục đó sang Tailwind. Không thêm
 * token nào không có trong design.md, không giữ token nào design.md đã bỏ: một
 * token tồn tại ở đây mà không có trong design.md là một token không ai rà
 * được, và nó sẽ được dùng.
 *
 * 04-design-system.md (bảng sơn mài jade/amber/son, nền vỏ trứng, Source Serif +
 * IBM Plex Mono, khối lịch bloc) đã LỖI THỜI cho phần thị giác. Bốn phần còn
 * giữ từ 04: §6 danh sách primitive, §7 bảng từ vựng, §9 không-làm-ở-MVP,
 * §10 mức sàn tiếp cận — đó là ràng buộc sản phẩm, không phải quyết định màu.
 *
 * ── Ba luật màu dễ vi phạm nhất (design.md §5.5, §8, §10.1) ──
 *
 *   1. **CTA chính màu ĐEN** (`bg-action`), không phải màu accent. Accent không
 *      được cạnh tranh với nút chính.
 *   2. **Accent là TÍN HIỆU, không phải nền module** (§5.3) — dưới 8–10% một
 *      màn hình. Không tô nền accent cho cả một section.
 *   3. **Section là mảng trắng trên nền `canvas`; dòng bên trong PHẲNG** (§4.1,
 *      §8). Mỗi dòng KHÔNG có nền, bo góc, hay bóng riêng — một danh sách mà
 *      mỗi dòng là một thẻ trông "gọn" lúc viết và chỉ lộ ra khi có mười dòng.
 *
 * ── Hai cảnh báo khi đọc code cũ ──
 *
 * 1. `subtle` từng là tên của một màu NỀN trong bản config trước. Trong
 *    design.md nó là **màu CHỮ** cho điều hướng không hoạt động và dấu `›`
 *    (§5.1); nền nhạt giờ tên là `soft`. Đổi nhầm hai cái này cho ra một màn
 *    hình chữ gần như vô hình trên nền trắng — và nó vẫn biên dịch bình thường.
 *
 * 2. **`brand` (chàm `#6257F6`) ĐÃ BỎ, thay bằng `accent` (chanh `#D9F06F`).**
 *    Đây KHÔNG phải một phép đổi mã màu: hai token ngược nhau về độ sáng.
 *    `brand` là màu TỐI — chữ trắng nằm trên nó, và bản thân nó dùng được làm
 *    màu chữ trên nền trắng. `accent` là màu SÁNG — chỉ dùng làm NỀN với chữ
 *    `accent-ink` (đen) ở trên. Đổi `text-brand` thành `text-accent` cho ra chữ
 *    vàng chanh trên nền trắng, gần như không đọc được, mà vẫn biên dịch. Chữ
 *    từng mang màu brand giờ mang `text-ink`, không phải `text-accent`.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Trung tính (§5.1) — xám LẠNH hơi mềm.
        // Không phải xám-xanh doanh nghiệp, cũng không phải be wellness.
        //
        // `canvas` phải NHẠT hơn hẳn bản cũ (#F4F4F6 → #FAFAF8): giờ nó là nền
        // đứng sau các mảng `surface` trắng, nên khoảng cách giữa hai màu này
        // chính là thứ tách section ra khỏi nhau (§4.1). Đủ khác để thấy ranh
        // giới, đủ gần để không đọc thành xám.
        canvas: '#FAFAF8',
        surface: '#FFFFFF',
        soft: '#F6F6F7',
        ink: '#111114',
        muted: '#717177',
        /** MÀU CHỮ: điều hướng không hoạt động và dấu `›`. KHÔNG phải nền. */
        subtle: '#A2A2A8',
        /** Đường kẻ HIẾM — §8 nói khoảng cách là dải phân cách mặc định. */
        line: '#ECECEE',

        // Cùng là #FFFFFF với `surface` nhưng mang nghĩa ngược lại: `surface`
        // là nền, token này là thứ nằm LÊN nền đen. Tách tên theo nền để đọc
        // code là thấy ngay cặp nền–chữ có khớp không, và để hôm nào nền tối
        // đổi màu thì chữ đi theo mà không phải rà từng chỗ. Cặp song song của
        // nó là `accent-ink` — chữ nằm trên nền accent (sáng), nên là màu đen.
        /** Chữ/viền trên `bg-action` (đen) và trên toast. */
        'on-action': '#FFFFFF',

        // ── Hành động (§5.2) — CTA chính là ĐEN, không phải accent.
        action: {
          DEFAULT: '#111114',
          pressed: '#29292F',
          disabled: '#D8D8DE',
          disabledText: '#8B8B94',
        },

        // ── Accent (§5.3) — chanh điện.
        //
        // Dùng cho con số đếm, ngày, dấu đang-chọn và ô icon nhỏ. Đây là màu
        // NỀN: nó sáng, nên chữ nằm trên nó phải là `accent-ink` (đen). Không
        // có biến thể `deep` để làm màu chữ — chữ dùng `ink`. §5.3 đặt trần
        // 8–10% một viewport, nên không có token nào ở đây dành cho mảng lớn.
        accent: {
          DEFAULT: '#D9F06F',
          soft: '#F5F9DE',
          /** Chữ và icon nằm TRÊN `bg-accent`. */
          ink: '#111114',
        },

        // ── Ngữ nghĩa (§5.4). KHÔNG dùng làm màu trang trí theo module.
        positive: { DEFAULT: '#13A86B', soft: '#E9F9F1' },
        /** Hạn chót, khoản sắp trả, khoảng chuẩn bị còn thiếu. */
        attention: { DEFAULT: '#FF6B57', soft: '#FFF0EB' },
        /** CHỈ cho lỗi và hậu quả không hoàn tác được. Một số tiền không mặc định màu này. */
        critical: { DEFAULT: '#D64545', soft: '#FFF0F0' },
      },
      fontFamily: {
        // design.md §6.1 dùng font hệ thống. Be Vietnam Pro giữ lại vì tiếng
        // Việt có dấu chồng tầng: font hệ thống trên Android dựng dấu ngã trên
        // chữ ơ lệch hẳn sang phải, và đó là thứ đọc mỗi ngày.
        sans: ['BeVietnamPro_400Regular'],
        medium: ['BeVietnamPro_500Medium'],
        semibold: ['BeVietnamPro_600SemiBold'],
      },
      fontSize: {
        // §6.2. `display` lên 36px (bảng cho 36–40) vì nó gánh con số tài
        // chính đầu màn Nhà mình — thứ phải đọc được ở khoảng cách cầm tay.
        // Tracking âm cho hai cỡ lớn nằm ở chỗ gọi (§6.3 chỉ cho phép ở đây).
        display: ['36px', { lineHeight: '37px' }],
        title1: ['26px', { lineHeight: '32px' }],
        title2: ['23px', { lineHeight: '28px' }],
        heading: ['18px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        label: ['14px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '17px' }],
        // §6.2: 10–11px CHỈ cho badge rất ngắn, đủ tương phản. Không dùng cho
        // câu chữ đọc được — sàn của chữ thường là `caption`.
        micro: ['11px', { lineHeight: '14px' }],
      },
      borderRadius: {
        // §8. `control` không có trong bảng của design.md nhưng ô nhập và chip
        // cần một giá trị — dùng chung `icon` 14px để không sinh thêm token.
        control: '14px',
        icon: '14px',
        weekday: '16px',
        status: '20px',
        /** Ô ngày của sự kiện (§8: 16–18px). */
        date: '18px',
        /** Mảng trắng của một section trên Nhà mình (§8, §13.1). */
        section: '24px',
        sheet: '28px',
      },
      spacing: {
        // §18 — thang 4px.
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        12: '48px',
        // Vùng chạm tối thiểu (§19, 04 §10) — mức sàn không thương lượng.
        touch: '44px',
      },
      boxShadow: {
        // §17. Bóng HIẾM và có mục đích (§8): nút chính, mảng section, bottom
        // sheet. Không thêm bóng cho từng DÒNG bên trong một section — §8 cấm
        // chồng bóng section + bóng dòng + nền màu trong cùng một tầng.
        //
        // `section` cố ý gần như không thấy: việc tách section ra khỏi nhau do
        // chênh lệch trắng-trên-gần-trắng đảm nhiệm, bóng chỉ đỡ thêm một chút.
        section: '0 6px 18px rgba(0,0,0,.035)',
        action: '0 8px 22px rgba(17,17,20,.14)',
        frame: '0 24px 80px rgba(21,21,27,.17)',
        sheet: '0 -16px 48px rgba(0,0,0,.18)',
      },
    },
  },
  plugins: [],
};
