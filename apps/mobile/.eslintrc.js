/**
 * Ranh giới phân lớp (01 §2) được LINT ÉP, không dựa vào kỷ luật.
 *
 *   UI (app/, components/) → hooks (data/queries/) → repositories/ → lib/supabase
 *
 * Lý do không phải thẩm mỹ: đây là điều kiện để đổi backend sau này chỉ phải
 * viết lại một thư mục, và để test hook bằng repository giả.
 */
module.exports = {
  extends: ['expo'],
  ignorePatterns: ['/dist/*', '/.expo/*', 'node_modules'],
  rules: {
    // 01 §11: không `any`.
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      // Không có `supabase.from(...)` nào nằm ngoài repositories/.
      files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/design/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@supabase/*', '**/lib/supabase', '**/lib/supabase*'],
                message:
                  'Tầng UI chỉ gọi hook trong src/data/queries. Truy vấn nằm ở src/data/repositories (01 §2).',
              },
              {
                group: ['**/data/repositories/*', '**/data/repositories'],
                message:
                  'Tầng UI không gọi thẳng repository — gọi hook trong src/data/queries (01 §2).',
              },
            ],
          },
        ],
      },
    },
    {
      // i18n: không có chuỗi hiển thị nào viết thẳng trong JSX.
      // Bảng từ vựng 04 §7 phải kiểm được bằng một lần grep trong vi.ts.
      files: ['app/**/*.tsx', 'src/components/**/*.tsx', 'src/design/**/*.tsx'],
      rules: {
        'react/jsx-no-literals': ['warn', { noStrings: false, allowedStrings: [], ignoreProps: true }],
      },
    },
  ],
};
