/**
 * Ranh giới phân lớp (01 §2) được LINT ÉP, không dựa vào kỷ luật.
 *
 *   UI (screens/, components/) → hooks (queries/) → repository/ → lib/supabase
 *
 * Lý do không phải thẩm mỹ: đây là điều kiện để đổi backend sau này chỉ phải
 * viết lại một thư mục, và để test hook bằng repository giả.
 *
 * ── Vì sao danh sách `files` dưới đây trông dài ──
 *
 * Từ khi màn hình chuyển về `src/features/<feat>/screens/`, tầng UI KHÔNG còn
 * gói gọn trong `app/` nữa. Nếu để nguyên danh sách cũ (`app/**` + `src/design/**`)
 * thì mọi screen vừa chuyển đi sẽ **rơi ra ngoài cả hai luật** — vẫn biên dịch,
 * vẫn chạy, nhưng hàng rào chặn `supabase` và hàng rào chặn chuỗi tiếng Việt
 * trong JSX im lặng ngừng hoạt động. Đó là kiểu hỏng tệ nhất: không có lỗi nào
 * để nhìn thấy, và nó chỉ lộ ra nhiều tháng sau dưới dạng một câu tiếng Việt
 * nằm lạc trong một file component.
 *
 * Thư mục `repository/` của mỗi feature CỐ Ý không nằm trong danh sách — đó
 * chính là chỗ DUY NHẤT được phép chạm `supabase`.
 *
 * ── Một ràng buộc KHÔNG ép được ở đây ──
 *
 * "File trong `app/` chỉ được là bảng định tuyến" là quy ước tài liệu
 * (`01-architecture.md §2`), không phải luật lint: không có rule sẵn nào diễn
 * đạt được nó mà không kéo thêm `eslint-plugin-boundaries`. Cách rà nhanh:
 *
 *   find app -name '*.tsx' ! -name '_layout.tsx' | xargs wc -l | sort -rn | head
 *
 * File route nào dài hơn ~10 dòng là một screen đang lẫn vào bảng định tuyến.
 */

/** Tầng UI: mọi chỗ được render, bất kể nằm ở cây thư mục nào. */
const UI_LAYER = [
  'app/**/*.{ts,tsx}',
  'src/design/**/*.{ts,tsx}',
  'src/features/*/screens/**/*.{ts,tsx}',
  'src/features/*/components/**/*.{ts,tsx}',
];

/** Chỉ file có JSX mới cần luật chuỗi hiển thị. */
const UI_LAYER_TSX = [
  'app/**/*.tsx',
  'src/design/**/*.tsx',
  'src/features/*/screens/**/*.tsx',
  'src/features/*/components/**/*.tsx',
];

module.exports = {
  extends: ['expo'],
  ignorePatterns: ['/dist/*', '/.expo/*', 'node_modules'],
  rules: {
    // 01 §11: không `any`.
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      // Không có `supabase.from(...)` nào nằm ngoài repository/.
      files: UI_LAYER,
      rules: {
        // Bản `@typescript-eslint/*`, KHÔNG phải luật ESLint gốc: chỉ bản này
        // hiểu `allowTypeImports`, và luật gốc sẽ báo config sai nếu gặp nó.
        // Phải tắt luật gốc, nếu không hai luật cùng chạy và `import type` bị
        // luật gốc chặn lại đúng thứ bản TS vừa cho phép.
        'no-restricted-imports': 'off',
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@supabase/*', '**/lib/supabase', '**/lib/supabase*'],
                message:
                  'Tầng UI chỉ gọi hook trong features/<feat>/queries. Truy vấn nằm ở features/<feat>/repository (01 §2).',
              },
              {
                // Đường dẫn thật là `features/<feat>/repository/`. Luật cũ trỏ
                // `data/repositories/` — một thư mục chưa bao giờ tồn tại, nên
                // nó chưa từng chặn được gì. Đổi lại xong là nó bắt ngay hai
                // chỗ đã lọt từ G3.
                group: ['**/features/*/repository', '**/features/*/repository/*'],
                // `allowTypeImports`: `import type { PaymentWindow }` bị xoá
                // lúc biên dịch nên không tạo phụ thuộc runtime nào. Ranh giới
                // cần chặn là *gọi* repository từ UI, không phải việc UI biết
                // tên một union type. Chặn cả type thì chỗ gọi buộc phải khai
                // lại type đó — hai định nghĩa cho một thứ, và chúng sẽ lệch nhau.
                allowTypeImports: true,
                message:
                  'Tầng UI không gọi thẳng repository — gọi hook trong features/<feat>/queries (01 §2).',
              },
            ],
          },
        ],
      },
    },
    {
      // i18n: không có chuỗi hiển thị nào viết thẳng trong JSX.
      // Bảng từ vựng 04 §7 phải kiểm được bằng một lần grep trong vi.ts.
      files: UI_LAYER_TSX,
      rules: {
        'react/jsx-no-literals': ['warn', { noStrings: false, allowedStrings: [], ignoreProps: true }],
      },
    },
  ],
};
