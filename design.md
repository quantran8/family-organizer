# Nhà mình — Design System

## 1. Design direction

**Style:** Soft Premium Utility  
**Theme:** White-first, warm neutral, calm, modern, youthful but mature  
**Primary audience:** Gen Z and young Millennials, approximately 24–35 years old  
**Product context:** A shared family space for tasks, events, important expenses, and documents.

The interface should feel like a well-designed family notebook rather than a productivity dashboard, accounting tool, or project-management app.

### Core qualities

- Bright and spacious.
- Warm rather than clinical.
- Premium through typography, spacing, and restraint.
- Friendly without becoming childish or overly cute.
- Easy to scan in a few seconds.
- Supportive rather than controlling.

### Avoid

- Gradients.
- Glassmorphism and backdrop blur.
- Neon colors.
- Dense dashboards and excessive charts.
- Heavy shadows.
- Too many colorful cards on one screen.
- Workplace language such as “owner”, “approval”, “performance”, or “violation”.
- Gender-coded colors for household members.

---

## 2. Visual principles

### 2.1 White-first surfaces

White is the main background. Use a slightly warm off-white only to separate grouped areas, inputs, and page backgrounds.

Do not use gradients. Visual hierarchy should come from:

1. Typography.
2. Spacing.
3. Flat surface colors.
4. Borders.
5. Very subtle shadows.

### 2.2 Calm hierarchy

Each screen should have one clear primary focus. On the Home screen, the hierarchy is:

1. Today’s tasks.
2. Upcoming family event.
3. Items requiring attention.
4. Secondary activity or navigation.

### 2.3 Context over raw data

A card should answer:

- What is happening?
- When is it happening?
- What needs to be prepared?

Do not expose every field in list views. Detailed information belongs on the detail screen.

### 2.4 Shared, not supervised

Use language that communicates coordination between two people rather than monitoring one another.

Preferred labels:

- Nhà mình
- Cả hai
- Cần chuẩn bị
- Sắp đến hạn
- Đã xong
- Cập nhật gần nhất

Avoid:

- Người chịu trách nhiệm
- Chờ phê duyệt
- Vi phạm ngân sách
- Nhiệm vụ thất bại
- Hiệu suất thành viên

---

## 3. Color system

### 3.1 Neutral colors

| Token | Value | Usage |
|---|---|---|
| `surface.base` | `#FFFFFF` | Main app background |
| `surface.page` | `#EEEDE9` | Outer desktop preview background |
| `surface.subtle` | `#F7F7F4` | Grouped controls and muted areas |
| `surface.raised` | `#FFFFFF` | Cards and navigation |
| `text.primary` | `#181817` | Main text |
| `text.secondary` | `#6E6E68` | Metadata and supporting text |
| `text.tertiary` | `#96968F` | Placeholder and inactive navigation |
| `border.subtle` | `#EAEAE5` | Card borders and dividers |
| `border.strong` | `#C9C9C2` | Checkbox and stronger separators |

Use warm neutrals rather than blue-gray neutrals. This keeps the interface closer to a home environment and away from a corporate SaaS appearance.

### 3.2 Brand color — Iris

| Token | Value | Usage |
|---|---|---|
| `brand.50` | `#F5F2FF` | Soft selected backgrounds |
| `brand.100` | `#ECE6FF` | Avatar and decorative tint |
| `brand.500` | `#7457E8` | Primary actions and active navigation |
| `brand.600` | `#6247D3` | Text links and pressed states |

Brand color should occupy approximately 5–8% of a screen. Do not use large purple backgrounds for every section.

### 3.3 Module colors

| Module | Foreground | Soft background |
|---|---|---|
| Tasks | `#5876C7` | `#EDF4FF` |
| Events | `#B35D8F` | `#FFF1F7` |
| Important expenses | `#A8662B` | `#FFF4E8` |
| Documents | `#2B7E72` | `#EDF8F5` |

These colors identify content types. They should not imply success, failure, or severity.

### 3.4 Status colors

| Status | Foreground | Background |
|---|---|---|
| Success | `#2D7B6F` | `#E4F4F0` |
| Upcoming deadline | `#A65F21` | `#FFF4E7` |
| Critical | `#B64C4C` | `#FDEEEE` |
| Information | `#5876C7` | `#EDF4FF` |

Use red sparingly. A financial amount or document should not be red by default.

---

## 4. Typography

### Typeface

**Primary:** Be Vietnam Pro  
**Fallback:** `ui-sans-serif`, `system-ui`, sans-serif

Be Vietnam Pro is used because it supports Vietnamese clearly and feels modern without being overly technical.

### Type scale

| Style | Font size | Line height | Weight | Usage |
|---|---:|---:|---:|---|
| Display | 30px | 36px | 600 | Home greeting |
| Title 1 | 26px | 32px | 600 | Page title |
| Title 2 | 23px | 29px | 600 | Featured card title |
| Heading | 16px | 22px | 600 | Section title |
| Body | 15px | 22px | 400–500 | Main content |
| Label | 14px | 18px | 500–600 | Actions and metadata |
| Caption | 12px | 16px | 400–600 | Supporting information |
| Micro | 10–11px | 14px | 500–600 | Date tiles and compact tags |

### Typography rules

- Use sentence case.
- Avoid excessive bold text.
- Use negative letter spacing only for large headings.
- Use tabular numerals for financial values where alignment matters.
- On overview screens, prefer readable shortened amounts such as `25 triệu` over `25.000.000 ₫`.
- Keep metadata concise and secondary in contrast.

---

## 5. Spacing and layout

### Base spacing scale

| Token | Value |
|---|---:|
| `space.1` | 4px |
| `space.2` | 8px |
| `space.3` | 12px |
| `space.4` | 16px |
| `space.5` | 20px |
| `space.6` | 24px |
| `space.7` | 28px |
| `space.8` | 32px |
| `space.10` | 40px |
| `space.12` | 48px |

### Mobile layout

- Primary target width: `375–430px`.
- Horizontal page padding: `20px`.
- Header top padding: `24px`.
- Gap between major sections: `32px`.
- Gap between cards: `12px`.
- Card inner padding: `16–20px`.
- Minimum touch target: `44 × 44px`.
- Bottom safe-area padding must use `env(safe-area-inset-bottom)`.

### Desktop preview

The mobile UI may be centered inside a device-like frame:

- Maximum width: `430px`.
- Outer background: `#EEEDE9`.
- Desktop frame radius: `36px`.
- Avoid adding gradients or decorative glow around the frame.

---

## 6. Shape system

| Component | Radius |
|---|---:|
| Small tag | 999px |
| Avatar | 999px |
| Icon container | 15px |
| Button and input | 14px |
| List card | 20px |
| Featured card | 24px |
| Bottom sheet | 28px top corners |
| Desktop preview frame | 36px |

Rounded corners should feel soft but not toy-like. Avoid using very large pill shapes for every component.

---

## 7. Borders and shadows

### Borders

```css
border: 1px solid #EAEAE5;
```

Borders are the default method for separating white cards from a white background.

### Card shadow

```css
box-shadow:
  0 1px 2px rgba(24, 24, 23, 0.03),
  0 10px 30px rgba(24, 24, 23, 0.04);
```

### Frame shadow

```css
box-shadow: 0 12px 40px rgba(24, 24, 23, 0.07);
```

Rules:

- Do not use glow effects.
- Do not use colored shadows except for a small primary floating action button.
- Avoid stacking shadows on every card.
- Use borders and spacing before adding elevation.

---

## 8. Iconography

### Style

- Outline icons.
- Stroke width: `1.8–2px`.
- Rounded line caps and joins.
- Default sizes: `20px`, `21px`, `23px`, and `24px`.
- Use filled icons only for selected or completed states.

### Recommended source

- Lucide Icons.
- Phosphor Icons.
- SF Symbols for native iOS implementation.

### Main icons

- Home.
- Calendar.
- Check circle.
- Document.
- Wallet or card.
- Bell.
- User.
- Plus.
- Chevron right.

Do not use highly detailed illustrations as functional icons.

---

## 9. Core components

### 9.1 Section header

Structure:

```text
[Section title] [Optional count or action]
```

Example:

```text
Hôm nay                         1/3 xong
```

Rules:

- Title uses Heading style.
- Secondary action uses 14px medium text.
- Optional count may use a soft brand pill.

### 9.2 Task list card

A task row contains:

1. Completion control.
2. Task name.
3. Time or context metadata.
4. Person avatar or paired avatars.

Recommended dimensions:

- Row padding: `16px`.
- Checkbox: `24px`.
- Avatar: `32px`.
- Divider between rows.

Completed state:

- Filled iris checkbox.
- Check icon in white.
- Main text may use line-through.
- Content opacity around 55%.

Do not add multiple workflow statuses.

### 9.3 Featured event card

Use one flat dark color instead of a gradient.

Current recommended background:

```css
background: #211D2E;
```

The card may contain:

- Family-side tag such as `Bên ngoại`.
- Event title.
- Solar or lunar date.
- Date tile.
- Number of preparation items.
- Expected amount.
- Departure or start time.

The internal white CTA row creates contrast without using a gradient.

### 9.4 Attention row

Use for documents, financial items, and deadlines.

Structure:

1. Colored icon container.
2. Main label.
3. Supporting deadline or context.
4. Amount or status badge.

Keep rows compact. Not every attention item needs a full card.

### 9.5 Avatar

- Standard sizes: `32px` and `40px`.
- Use initials when photos are unavailable.
- Use independent neutral accent colors.
- Do not assign pink to one gender and blue to another.
- Paired avatars overlap by approximately `6–8px`.

### 9.6 Status badge

- Height: approximately `28px`.
- Horizontal padding: `10px`.
- Text: `11–12px`, semibold.
- Fully rounded.
- Use a flat soft background.

### 9.7 Floating add button

- Size: `56 × 56px`.
- Background: `#7457E8`.
- Icon: white plus, approximately `25px`.
- Positioned slightly above the bottom navigation.
- A subtle brand-colored shadow is allowed.

The button represents “Thêm vào nhà mình”, not a generic enterprise create action.

---

## 10. Navigation

Recommended bottom navigation:

1. Nhà mình.
2. Lịch.
3. Add button.
4. Giấy tờ.
5. Tài khoản.

### Active state

- Icon and label use `brand.600`.
- Label weight: semibold.
- Do not add a large colored tab background.

### Inactive state

- Icon and label use `text.tertiary`.
- Label weight: medium.

### Navigation container

- White background.
- Top border using `border.subtle`.
- No blur and no translucent glass effect.

---

## 11. Home screen structure

```text
Header
├── Household avatars
├── Notification button
├── Current date
└── Greeting and central question

Today
├── Section title and completion count
└── Task list card

Upcoming
├── Section title and calendar action
└── Featured family event card

Attention
├── Section title and item count
├── Document deadline row
└── Important expense row

Bottom navigation
└── Central add button
```

### Home-screen content order

1. What needs to be done today.
2. What event is coming next.
3. What requires preparation or attention.
4. How to navigate or add new information.

The screen should remain understandable without charts.

---

## 12. Content style

### Tone

- Warm.
- Direct.
- Brief.
- Nonjudgmental.
- Equal between household members.

### Good examples

- `Nhà mình có gì hôm nay?`
- `3 việc cần chuẩn bị`
- `Hết hạn sau 25 ngày`
- `Cần chuẩn bị trước 05/09`
- `Đã xong lúc 08:12`
- `Cả hai`
- `Xem lịch`

### Avoid

- `Bạn đã thất bại hoàn thành nhiệm vụ.`
- `Người chịu trách nhiệm chưa xử lý.`
- `Khoản chi vi phạm ngân sách.`
- `Yêu cầu đối phương phê duyệt.`
- `Hiệu suất tuần này giảm.`

---

## 13. Motion guidance

The current demo is static, but future implementation should use restrained motion.

| Interaction | Duration |
|---|---:|
| Tap feedback | 100–150ms |
| State transition | 180–240ms |
| Page transition | 240–300ms |
| Bottom sheet | 280–340ms |

Rules:

- No strong bounce animation.
- No confetti for completing routine tasks.
- Do not animate every card on page load.
- Use motion to clarify state and spatial relationship.

---

## 14. Accessibility

- Maintain at least WCAG AA contrast for body text.
- Minimum touch target is `44 × 44px`.
- Do not rely on color alone to indicate status.
- Use labels for icon-only controls.
- Support dynamic text where possible.
- Ensure completed tasks remain readable despite reduced opacity.
- Avoid text smaller than `11px` except nonessential micro labels.
- Respect reduced-motion settings in production.

---

## 15. Tailwind configuration

```js
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Be Vietnam Pro', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        ink: '#181817',
        muted: '#6E6E68',
        subtle: '#F7F7F4',
        line: '#EAEAE5',
        iris: {
          50: '#F5F2FF',
          100: '#ECE6FF',
          500: '#7457E8',
          600: '#6247D3',
        },
      },
      boxShadow: {
        soft: '0 12px 40px rgba(24,24,23,.07)',
        card: '0 1px 2px rgba(24,24,23,.03), 0 10px 30px rgba(24,24,23,.04)',
      },
    },
  },
};
```

---

## 16. CSS tokens

```css
:root {
  /* Surfaces */
  --surface-base: #ffffff;
  --surface-page: #eeede9;
  --surface-subtle: #f7f7f4;
  --surface-raised: #ffffff;

  /* Text */
  --text-primary: #181817;
  --text-secondary: #6e6e68;
  --text-tertiary: #96968f;

  /* Brand */
  --brand-50: #f5f2ff;
  --brand-100: #ece6ff;
  --brand-500: #7457e8;
  --brand-600: #6247d3;

  /* Semantic */
  --color-task: #5876c7;
  --color-event: #b35d8f;
  --color-finance: #a8662b;
  --color-document: #2b7e72;
  --color-danger: #b64c4c;

  /* Borders */
  --border-subtle: #eaeae5;
  --border-strong: #c9c9c2;

  /* Radius */
  --radius-control: 14px;
  --radius-icon: 15px;
  --radius-card: 20px;
  --radius-featured: 24px;
  --radius-sheet: 28px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

---

## 17. Design review checklist

Before approving a screen, verify:

- [ ] The main background is white or warm off-white.
- [ ] No gradients are used.
- [ ] No glassmorphism or backdrop blur is used.
- [ ] There is one clear primary focus.
- [ ] The screen can be scanned in a few seconds.
- [ ] Brand purple is used selectively.
- [ ] Module colors are soft and contextual.
- [ ] Text is warm and nonjudgmental.
- [ ] The UI does not resemble project-management software.
- [ ] Cards rely primarily on spacing and borders, not heavy shadows.
- [ ] Important dates, amounts, and actions have clear hierarchy.
- [ ] Touch targets are at least 44px.
- [ ] Status is not communicated by color alone.
- [ ] Household members are represented equally.

---

## 18. Current demo reference

The current static Home screen demo is implemented in:

```text
home-screen-demo.html
```

It uses:

- Tailwind CSS via CDN.
- Be Vietnam Pro from Google Fonts.
- A mobile-first width of `430px`.
- Flat colors only.
- No gradients.
- No functional JavaScript interactions.
