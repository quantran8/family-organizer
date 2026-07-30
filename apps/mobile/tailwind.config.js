/**
 * Design system — nguồn sự thật là design.md.
 *
 * 04-design-system.md (bảng sơn mài jade/amber/son, nền vỏ trứng, Source Serif +
 * IBM Plex Mono, khối lịch bloc) đã LỖI THỜI cho phần thị giác. Bốn phần còn
 * giữ từ 04: §6 danh sách primitive, §7 bảng từ vựng, §9 không-làm-ở-MVP,
 * §10 mức sàn tiếp cận — đó là ràng buộc sản phẩm, không phải quyết định màu.
 *
 * Ràng buộc màu (design.md §3.2): tím iris chiếm khoảng 5–8% một màn hình.
 * Không dùng nền tím lớn cho mọi section.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Trung tính ẤM — không phải xám-xanh. Giữ giao diện gần không gian
        // trong nhà, tránh vẻ SaaS doanh nghiệp (design.md §3.1).
        ink: '#181817',
        muted: '#6E6E68',
        tertiary: '#96968F',
        subtle: '#F7F7F4',
        page: '#EEEDE9',
        line: '#EAEAE5',
        'line-strong': '#C9C9C2',

        // Brand — Iris (design.md §3.2)
        iris: {
          50: '#F5F2FF',
          100: '#ECE6FF',
          500: '#7457E8',
          600: '#6247D3',
        },

        // Màu module — nhận DIỆN LOẠI nội dung, không hàm ý thành công/thất bại
        // hay mức nghiêm trọng (design.md §3.3).
        task: { DEFAULT: '#5876C7', soft: '#EDF4FF' },
        event: { DEFAULT: '#B35D8F', soft: '#FFF1F7' },
        finance: { DEFAULT: '#A8662B', soft: '#FFF4E8' },
        document: { DEFAULT: '#2B7E72', soft: '#EDF8F5' },

        // Trạng thái (design.md §3.4). Dùng đỏ rất dè — một số tiền hay một
        // giấy tờ KHÔNG mặc định màu đỏ.
        ok: { DEFAULT: '#2D7B6F', soft: '#E4F4F0' },
        warn: { DEFAULT: '#A65F21', soft: '#FFF4E7' },
        danger: { DEFAULT: '#B64C4C', soft: '#FDEEEE' },
        info: { DEFAULT: '#5876C7', soft: '#EDF4FF' },

        // Thẻ sự kiện nổi bật — MỘT màu phẳng, không gradient (design.md §9.3).
        featured: '#211D2E',
      },
      fontFamily: {
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
        control: '14px',
        icon: '15px',
        card: '20px',
        featured: '24px',
        sheet: '28px',
      },
      spacing: {
        // design.md §5 — thang 4px.
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        10: '40px',
        12: '48px',
        // Vùng chạm tối thiểu (design.md §14, 04 §10) — mức sàn không thương lượng.
        touch: '44px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(24,24,23,.03), 0 10px 30px rgba(24,24,23,.04)',
        soft: '0 12px 40px rgba(24,24,23,.07)',
      },
    },
  },
  plugins: [],
};
