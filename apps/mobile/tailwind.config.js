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
 *   1. **CTA chính màu ĐEN** (`bg-action`), không phải màu brand. Brand không
 *      được cạnh tranh với nút chính.
 *   2. **Tối đa MỘT mảng màu lớn mỗi màn hình.** Không tô nền màu cho mọi
 *      section.
 *   3. **Danh sách dùng khoảng cách và đường kẻ, KHÔNG dùng thẻ lặp lại**
 *      (§8). Đây là luật hay bị vi phạm nhất khi dựng màn mới, vì thẻ trông
 *      "gọn" hơn trong lúc viết và chỉ lộ ra khi có mười dòng thật.
 *
 * ── Cảnh báo khi đọc code cũ ──
 *
 * `subtle` từng là tên của một màu NỀN trong bản config trước. Trong design.md
 * nó là **màu CHỮ** cho điều hướng không hoạt động và dấu `›` (§5.1); nền nhạt
 * giờ tên là `soft`. Đổi nhầm hai cái này cho ra một màn hình chữ gần như vô
 * hình trên nền trắng — và nó vẫn biên dịch bình thường.
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
        canvas: '#F4F4F6',
        surface: '#FFFFFF',
        soft: '#F7F7F9',
        ink: '#101014',
        muted: '#707078',
        /** MÀU CHỮ: điều hướng không hoạt động và dấu `›`. KHÔNG phải nền. */
        subtle: '#A4A4AD',
        line: '#ECECF0',

        // ── Hành động (§5.2) — CTA chính là ĐEN, không phải brand.
        action: {
          DEFAULT: '#111114',
          pressed: '#29292F',
          disabled: '#D8D8DE',
          disabledText: '#8B8B94',
        },

        // ── Brand (§5.3, §17) — chàm điện.
        // Dùng cho nhận diện và ngữ cảnh THỜI GIAN (ngày được chọn, tab đang
        // mở), không phải cho mọi hành động.
        brand: {
          DEFAULT: '#6257F6',
          deep: '#4C43D8',
          soft: '#F0EFFF',
          line: '#DEDBFF',
        },

        // ── Ngữ nghĩa (§5.4). KHÔNG dùng làm màu trang trí theo module.
        positive: { DEFAULT: '#13A86B', soft: '#E9F9F1' },
        /** Hạn chót, khoản sắp trả, khoảng chuẩn bị còn thiếu. */
        attention: { DEFAULT: '#FF643A', soft: '#FFF0EB' },
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
        display: ['30px', { lineHeight: '36px' }],
        title1: ['26px', { lineHeight: '32px' }],
        title2: ['23px', { lineHeight: '29px' }],
        heading: ['16px', { lineHeight: '22px' }],
        body: ['15px', { lineHeight: '22px' }],
        label: ['14px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
        micro: ['11px', { lineHeight: '14px' }],
      },
      borderRadius: {
        // §8. `control` không có trong bảng của design.md nhưng ô nhập và chip
        // cần một giá trị — dùng chung `icon` 14px để không sinh thêm token.
        control: '14px',
        icon: '14px',
        weekday: '16px',
        status: '20px',
        featured: '24px',
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
        // §17. Bóng HIẾM và có mục đích (§8): nút chính, thẻ sự kiện nổi bật,
        // bottom sheet. Không thêm bóng cho mọi dòng hay mọi section.
        action: '0 8px 22px rgba(17,17,20,.16)',
        brand: '0 10px 22px rgba(98,87,246,.22)',
        frame: '0 24px 80px rgba(21,21,27,.17)',
        sheet: '0 -16px 48px rgba(0,0,0,.18)',
      },
    },
  },
  plugins: [],
};
