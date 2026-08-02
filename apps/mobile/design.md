# Nhà mình — Design System

## 1. North star

**Style:** Energetic Premium Utility  
**Foundation:** Apple Human Interface Guidelines  
**Audience:** Gen Z and young Millennials, approximately 24–35  
**Product:** A shared home space for tasks, events, money, and important documents

The product should feel:

- Fast to scan.
- Energetic, not noisy.
- Premium, not decorative.
- Familiar, not generic iOS.
- Supportive, not controlling.

> **HIG governs interaction. Nhà mình governs expression.**

Use Apple platform conventions for hierarchy, navigation, feedback, accessibility, and touch behavior. Use the Nhà mình visual language for color, rhythm, tone, and brand character.

### Avoid

- Gradients.
- Color used without meaning.
- Calm wellness or meditation aesthetics.
- Dense dashboards.
- Excessive cards, borders, or shadows.
- Long explanatory text on overview screens.
- Corporate workflow language.
- Gender-coded member colors.
- Copying stock iOS visuals without product character.

---

## 2. HIG design principles

### 2.1 Purpose

Every screen starts from one user question.

Examples:

- Home: `Hôm nay nhà mình có gì?`
- Money: `Sắp phải chuẩn bị khoản nào?`
- Documents: `Giấy tờ nào sắp hết hạn?`

Anything that does not help answer the screen question should move to a detail view.

### 2.2 Familiarity

Use patterns people already understand:

- Tab bar for top-level navigation.
- Toolbar for actions.
- Bottom sheet for short, temporary choices.
- Circular control for task completion.
- Chevron for drill-down.
- Standard back navigation.

Keep appearance branded, but keep behavior predictable.

### 2.3 Simplicity

Simplicity means focused, not empty.

- Show only what is useful now.
- Put the most important content first.
- Prefer one clear action over several equal actions.
- Remove duplicate labels, descriptions, and badges.
- Reveal detail progressively.

### 2.4 Flexibility

The interface must adapt to:

- `375–430px` mobile widths.
- Safe areas.
- Dynamic text.
- Increased contrast.
- Reduced motion.
- Longer Vietnamese labels.
- Empty, normal, and high-density data states.

### 2.5 Craft

Premium quality comes from:

- Precise spacing.
- Strong type hierarchy.
- Controlled color usage.
- Smooth but restrained feedback.
- Clear wording.
- Consistent alignment.

Do not use visual decoration to compensate for weak hierarchy.

### 2.6 Delight

Delight should be subtle and useful:

- A responsive pressed state.
- A clean task-completion transition.
- A focused weekly date rhythm.
- A distinctive event surface.
- Fast recovery through undo where needed.

No confetti, strong bounce, or decorative animation.

### 2.7 Responsibility

- Explain financial and privacy states clearly.
- Do not imply blame between household members.
- Do not rank or compare people.
- Do not rely on color alone.
- Make destructive actions reversible or confirm them when necessary.

---

## 3. Less text — mandatory product principle

Gen Z users should understand an overview screen in approximately three seconds.

### 3.1 Content limits

| Element | Rule |
|---|---|
| Screen question | One sentence, preferably `4–8` words |
| Section title | `1–3` words |
| Primary button | `1–2` words, maximum `3` |
| Row title | One line |
| Row metadata | One short line |
| Badge | Number or `1–2` words |
| Empty-state title | Maximum `6` words |
| Empty-state body | Maximum `12–16` words |
| Alert | State what happened, then the next action |

These are product constraints, not rigid localization character limits. Preserve meaning first.

### 3.2 Writing rules

- Start buttons with a clear action: `Thêm`, `Lưu`, `Xem`, `Đã trả`.
- Use familiar words.
- Use sentence case.
- Remove words that do not change meaning.
- Avoid clever labels that require interpretation.
- Avoid instructional paragraphs on Home.
- Never repeat the same fact in a title, subtitle, and badge.
- Prefer `25 ngày` over `Còn lại 25 ngày cho đến thời điểm hết hạn`.
- Prefer `2 việc chuẩn bị` over `Có tổng cộng 2 công việc cần được chuẩn bị`.

### 3.3 Progressive disclosure

Overview screens show:

1. What.
2. When.
3. The next action or preparation state.

Detail screens show:

- Notes.
- History.
- Relationships.
- Full amounts.
- Settings.
- Secondary actions.

### 3.4 Home copy pattern

```text
Hôm nay nhà mình có gì?

Hôm nay
Chồng đổ rác
Trước 20:00 · Chồng

Cuối tuần
Giỗ ông ngoại
15/8 âm lịch · Nhà vợ

Cần chú ý
Bảo hiểm xe hết hạn sau 25 ngày
```

Do not add descriptions unless they change the next decision.

---

## 4. Visual direction

### 4.1 White-first, energetic premium

White is the main content surface. Energy comes from a small number of saturated accents, not from filling the screen with color.

Recommended visual balance:

- `88–92%` white and neutral surfaces.
- Black for text and primary actions.
- Saturated color stays in markers, dates, active navigation, and compact icon fills.
- Large content areas remain white; use tinted surfaces only inside temporary controls or very small highlights.

### 4.2 Color roles

- **Black:** action and decisive state.
- **Signal blue:** brand, time rhythm, events, selected markers.
- **Clear green:** positive status only.
- **Tangerine:** attention, deadlines, and upcoming payments.
- **Red:** destructive or critical only; rare.

A screen may use indigo, green, and coral, but only one should occupy a large surface.

### 4.3 Not a wellness palette

Avoid:

- Dusty sage as the main brand color.
- Beige-heavy surfaces.
- Muted plum or clay combinations.
- Low-contrast pastel sections.
- Soft colors on every container.

The product should feel active and current, not meditative.

---

## 5. Color system

### 5.1 Neutral tokens

| Token | Value | Usage |
|---|---|---|
| `canvas` | `#F4F4F6` | Desktop preview and outer canvas |
| `surface` | `#FFFFFF` | Main screen background |
| `soft` | `#F7F7F9` | Hover, grouped controls, subtle fill |
| `ink` | `#101014` | Primary text |
| `muted` | `#707078` | Metadata |
| `subtle` | `#A4A4AD` | Inactive navigation and chevrons |
| `line` | `#ECECF0` | Dividers |
| `on-action` | `#FFFFFF` | Text and borders on top of `action` / `ink` backgrounds |
| `on-brand` | `#FFFFFF` | Text and borders on top of `brand` backgrounds |

Use cool-neutral grays with a slight softness. Avoid blue-gray corporate surfaces and beige wellness surfaces.

`on-action` and `on-brand` hold the same value as `surface` but mean the
opposite thing: `surface` is a background, these two are what sits *on* a dark
background. They are named after the background they pair with so that a
mismatched pair is visible while reading the code, and so that recoloring a dark
background carries its foreground along instead of leaving white text behind.

Never use Tailwind's own color classes (`bg-white`, `text-white`, `bg-gray-100`,
…) in app code. A raw color class cannot be traced back to this table, so it
survives every audit of this file — and it keeps rendering plausibly while
slowly disagreeing with the palette around it.

### 5.2 Action tokens

| Token | Value | Usage |
|---|---|---|
| `action` | `#111114` | Primary CTA background |
| `action.pressed` | `#29292F` | Pressed state |
| `action.disabled` | `#D8D8DE` | Disabled background |
| `action.disabledText` | `#8B8B94` | Disabled label |

Primary actions are black. Brand color must not compete with the primary CTA.

### 5.3 Brand tokens — signal blue

| Token | Value | Usage |
|---|---|---|
| `brand` | `#2F63F5` | Brand marker, selected date, active navigation |
| `brand.deep` | `#1F4ED0` | Links and emphasized metadata |
| `brand.soft` | `#F1F5FF` | Compact icon fills and selected controls |
| `brand.line` | `#DEDBFF` | Divider inside brand surface |

Use brand color for identity and time-related context, not for every action.

### 5.4 Semantic tokens

| Meaning | Foreground | Soft background | Usage |
|---|---|---|---|
| Positive | `#13A86B` | `#E9F9F1` | Stable status, completed positive state |
| Attention | `#FF643A` | `#FFF0EB` | Deadline, upcoming payment, preparation gap |
| Critical | `#D64545` | `#FFF0F0` | Error or destructive consequence only |

Do not use semantic colors as decorative module colors.

### 5.5 Color rules

- Use black for primary CTA.
- Use one large tinted surface maximum per viewport.
- Use colored icon containers only for semantic meaning.
- Keep text on white primarily black or neutral gray.
- Do not use color alone to communicate status.
- Do not assign colors to household members by gender.
- Financial amounts are neutral by default.

---

## 6. Typography

### 6.1 Typeface

Use the platform system font stack:

```css
font-family:
  ui-sans-serif,
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  Inter,
  "Segoe UI",
  sans-serif;
```

This keeps Vietnamese legible, supports platform familiarity, and avoids loading a decorative font.

### 6.2 Type scale

| Style | Size | Line height | Weight | Usage |
|---|---:|---:|---:|---|
| Display | `32–40px` | `1.02` | `700–730` | Home question |
| Section | `21–22px` | `1.25` | `700–720` | Main section titles |
| Feature title | `18px` | `23px` | `700` | Featured event |
| Body | `16px` | `22–23px` | `500–600` | Row title and main content |
| Meta | `13px` | `17–18px` | `400–600` | Date, person, amount |
| Caption | `12px` | `15px` | `600–700` | Compact labels and badges |

Avoid text below `11px`. Use `12px` as the normal minimum.

### 6.3 Typography rules

- Support Dynamic Type in native implementation.
- Keep primary row titles to one line where possible.
- Use negative tracking only for large titles.
- Do not use uppercase for normal headings.
- Uppercase is allowed only for very short identity labels such as `NHÀ MÌNH`.
- Use tabular numerals for aligned financial values.
- Avoid excessive bold; use weight to establish hierarchy, not decorate every label.

---

## 7. Layout and spacing

### 7.1 Mobile frame

- Target width: `375–430px`.
- Horizontal padding: `20px`.
- Minimum touch target: `44 × 44pt`.
- Respect top and bottom safe areas.
- Main content scrolls behind the bottom navigation layer.

### 7.2 Spacing scale

| Token | Value |
|---|---:|
| `space.1` | `4px` |
| `space.2` | `8px` |
| `space.3` | `12px` |
| `space.4` | `16px` |
| `space.5` | `20px` |
| `space.6` | `24px` |
| `space.7` | `28px` |
| `space.8` | `32px` |
| `space.9` | `36px` |
| `space.10` | `40px` |

### 7.3 Hierarchy by spacing

- Header to week rhythm: `8–12px`.
- Week rhythm to status: `20px`.
- Major sections: `32–36px`.
- Section title to content: `8–12px`.
- Row vertical padding: `12px`.
- Row minimum height: `72–82px`.

Use whitespace before adding a container.

### 7.4 Desktop preview

- Canvas: `#F4F4F6`.
- Maximum screen width: `430px`.
- Frame radius: `42px`.
- Frame shadow: `0 24px 80px rgba(21,21,27,.17)`.

The frame is a demo artifact, not part of the native mobile UI.

---

## 8. Shape and elevation

| Component | Radius |
|---|---:|
| Avatar | `999px` |
| Primary action | `999px` |
| Week day | `16px` |
| Icon container | `14–15px` |
| Compact status surface | `20px` |
| Feature event surface | `24px` |
| Bottom sheet | `28px` top corners |
| Desktop preview | `42px` |

### Elevation rules

- Lists use spacing and dividers, not cards.
- Status may use a flat tinted surface without shadow.
- The event date tile may use one small colored shadow.
- Primary CTA may use a subtle black shadow.
- Bottom sheet may use elevation to establish modality.
- Do not add shadows to every row or section.

---

## 9. Iconography

- Outline icons by default.
- Stroke width: `1.9–2.3px`.
- Rounded caps and joins.
- Default icon size: `18–24px`.
- Filled icon for selected navigation or completed state.
- Use familiar symbols for familiar actions.
- Add a text label when an icon alone is ambiguous.
- Every icon-only control needs an accessibility label.

Recommended sources:

- SF Symbols for native iOS.
- Lucide or Phosphor for web prototypes.

---

## 10. Action hierarchy

### 10.1 Primary action

Example: `Thêm`

- Solid black background.
- White icon and label.
- Minimum height: `44px`.
- Short verb label.
- Pill shape is allowed for the single primary toolbar action.

### 10.2 Secondary action

Examples: `Xem tất cả`, `Hủy`

- Text-only or soft-neutral fill.
- Brand color is allowed for contextual links.
- Must not visually compete with the primary action.

### 10.3 Destructive action

Examples: `Xóa`, `Rời nhà`

- Use critical red only at the decision point.
- Confirm when the outcome is difficult to reverse.
- Provide undo where practical.

---

## 11. Navigation

### 11.1 Bottom tab bar

Use exactly four top-level destinations:

1. Nhà mình.
2. Việc.
3. Tiền.
4. Giấy tờ.

The tab bar is navigation only. Do not place the quick-add action as a tab item.

### 11.2 Active state

- Filled or stronger icon.
- Black label and icon.
- Small indigo marker for brand expression.
- No large selected background.

### 11.3 Inactive state

- `subtle` gray.
- Medium or semibold caption.
- Preserve readable contrast.

### 11.4 Material layer

A light translucent navigation material is allowed only for persistent navigation or modal layers.

```css
background: rgba(255, 255, 255, 0.90);
backdrop-filter: saturate(170%) blur(22px);
```

Do not use blur on cards, rows, or content surfaces.

---

## 12. Home screen structure

```text
Header
├── Household identity
├── Black Add action
├── Current solar + lunar date
└── One central question

Week rhythm
└── Seven compact day controls

Status
└── One compact semantic surface

Today
├── Section title + count
└── Flat task rows

Weekend
└── One featured indigo event surface

Attention
└── Flat semantic rows

Bottom navigation
└── Four top-level destinations
```

### Home hierarchy

1. Current day and week rhythm.
2. Status requiring no interpretation.
3. Tasks due today.
4. Nearest family event.
5. Items requiring attention.
6. Navigation.

### Home rules

- No charts.
- No progress dashboard.
- No paragraph copy.
- No more than one prominent colored card.
- Empty groups disappear.
- Keep the first viewport useful without scrolling.
- Every row must answer `what` and `when`.

---

## 13. Core components

### 13.1 Week rhythm

Purpose: create energy and make time visible without opening a calendar.

- Seven compact day controls.
- Active day uses black fill.
- Indigo or coral dot indicates meaningful activity.
- Dots supplement labels; they never carry the full meaning alone.
- Horizontal scrolling is allowed on narrow screens.

### 13.2 Compact status

Purpose: communicate financial readiness in one glance.

- One semantic icon.
- One short title.
- One supporting line maximum.
- Freshness shown as compact time text.
- Positive uses green.
- Attention uses coral.
- Critical uses red only when necessary.

### 13.3 Task row

Structure:

1. Completion control.
2. One-line task name.
3. One metadata line.
4. Small semantic marker when needed.

Rules:

- Minimum row height: `76px`.
- Checkbox: `24px`.
- Divider starts after the checkbox column.
- Completion changes checkbox to black.
- Completed text may use line-through and reduced contrast.
- No extra status chips.

### 13.4 Featured event

This is the only prominent color surface on Home.

- Background: `brand.soft`.
- Date tile: `brand`.
- Title: one line.
- Lunar date and family side: one line.
- Preparation summary: one line.
- One clear drill-down action.

Do not add illustrations, gradients, or multiple nested cards.

### 13.5 Attention row

- Flat row, not a full card.
- Semantic icon container.
- One-line title.
- One supporting line.
- Chevron for drill-down.
- Coral for deadlines and preparation gaps.
- Indigo may identify an event-related financial item.

### 13.6 Quick-add sheet

- Open from the black `Thêm` toolbar action.
- Top radius: `28px`.
- Dimmed backdrop.
- One title and one short instruction line maximum.
- Each option has icon, title, and one short metadata line.
- `Hủy` remains visible.
- Return focus to the trigger after closing.

---

## 14. Motion and feedback

| Interaction | Duration |
|---|---:|
| Press feedback | `120–160ms` |
| State change | `180–240ms` |
| Page transition | `240–300ms` |
| Bottom sheet | `300–340ms` |

Recommended pressed state:

```css
transform: scale(0.975);
opacity: 0.72;
```

Rules:

- Motion explains state or location.
- No strong bounce.
- No animated decoration on page load.
- No confetti for routine completion.
- Respect `prefers-reduced-motion`.

---

## 15. Accessibility

- Minimum touch target: `44 × 44pt`.
- Keep sufficient spacing between adjacent controls.
- Support Dynamic Type in native implementation.
- Normal body text should remain readable at increased sizes.
- Meet WCAG AA contrast.
- Do not rely on color alone.
- Preserve text meaning when icons are hidden.
- Provide accessible names for icon-only controls.
- Support increased contrast.
- Keep completed tasks readable.
- Respect reduced motion.
- Maintain logical focus order in sheets and forms.

---

## 16. Tone and language

### Voice

- Direct.
- Brief.
- Warm.
- Equal between household members.
- Action-oriented.
- Nonjudgmental.

### Preferred

- `Hôm nay nhà mình có gì?`
- `2 việc`
- `Thêm`
- `Xem tất cả`
- `2 việc chuẩn bị`
- `Hết hạn sau 25 ngày`
- `Cả hai`
- `Đã xong`

### Avoid

- `Bạn cần phải thực hiện các công việc sau đây.`
- `Người chịu trách nhiệm chưa xử lý.`
- `Khoản chi vi phạm ngân sách.`
- `Hiệu suất thành viên giảm.`
- `Nhấn vào đây để xem thêm thông tin.`
- `Hãy cùng bắt đầu ngay nào!`

---

## 17. Tailwind configuration

```js
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        canvas: '#F4F4F6',
        surface: '#FFFFFF',
        ink: '#101014',
        muted: '#707078',
        subtle: '#A4A4AD',
        line: '#ECECF0',
        soft: '#F7F7F9',
        'on-action': '#FFFFFF',
        'on-brand': '#FFFFFF',
        action: '#111114',
        brand: {
          DEFAULT: '#6257F6',
          deep: '#4C43D8',
          soft: '#F0EFFF',
          line: '#DEDBFF',
        },
        positive: {
          DEFAULT: '#13A86B',
          soft: '#E9F9F1',
        },
        attention: {
          DEFAULT: '#FF643A',
          soft: '#FFF0EB',
        },
        critical: {
          DEFAULT: '#D64545',
          soft: '#FFF0F0',
        },
      },
      boxShadow: {
        action: '0 8px 22px rgba(17,17,20,.16)',
        brand: '0 10px 22px rgba(98,87,246,.22)',
        frame: '0 24px 80px rgba(21,21,27,.17)',
        sheet: '0 -16px 48px rgba(0,0,0,.18)',
      },
    },
  },
};
```

---

## 18. CSS tokens

```css
:root {
  /* Surfaces */
  --canvas: #f4f4f6;
  --surface: #ffffff;
  --soft: #f7f7f9;

  /* Text and structure */
  --ink: #101014;
  --muted: #707078;
  --subtle: #a4a4ad;
  --line: #ececf0;
  --on-action: #ffffff;
  --on-brand: #ffffff;

  /* Primary action */
  --action: #111114;
  --action-pressed: #29292f;
  --action-disabled: #d8d8de;
  --action-disabled-text: #8b8b94;

  /* Brand */
  --brand: #2f63f5;
  --brand-deep: #1f4ed0;
  --brand-soft: #f1f5ff;
  --brand-line: #dedbff;

  /* Semantic */
  --positive: #13a86b;
  --positive-soft: #e9f9f1;
  --attention: #ff643a;
  --attention-soft: #fff0eb;
  --critical: #d64545;
  --critical-soft: #fff0f0;

  /* Radius */
  --radius-week-day: 16px;
  --radius-icon: 14px;
  --radius-status: 20px;
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
  --space-9: 36px;
  --space-10: 40px;
}
```

---

## 19. Review checklist

### HIG foundation

- [ ] The screen has one clear purpose.
- [ ] Familiar controls behave as expected.
- [ ] The tab bar contains navigation only.
- [ ] Primary actions are easy to find.
- [ ] Touch targets are at least `44 × 44pt`.
- [ ] Feedback is immediate and restrained.
- [ ] Accessibility states are supported.

### Less text

- [ ] The screen is understandable in about three seconds.
- [ ] Each row communicates one idea.
- [ ] Row titles fit on one line where possible.
- [ ] Metadata is limited to one short line.
- [ ] Buttons use short, action-oriented labels.
- [ ] No fact is repeated across title, subtitle, and badge.
- [ ] Detail is progressively disclosed.
- [ ] Home contains no explanatory paragraph.

### Visual system

- [ ] White remains the main surface.
- [ ] Primary CTA is black.
- [ ] No gradient is used.
- [ ] Only one prominent colored surface appears in the viewport.
- [ ] Indigo, green, and coral have distinct roles.
- [ ] The palette feels energetic, not wellness-oriented.
- [ ] Lists rely on spacing and dividers, not repeated cards.
- [ ] Shadows are rare and purposeful.
- [ ] The result feels branded without looking like stock iOS.

### Product behavior

- [ ] Language is shared and nonjudgmental.
- [ ] Household members are treated equally.
- [ ] Financial data is not summarized by person.
- [ ] Status is not communicated by color alone.
- [ ] Empty groups disappear from Home.

---

## 20. Current demo reference

The reference implementation is:

```text
home-premium-tailwind.html
```

It currently demonstrates:

- HIG-based navigation and interaction behavior.
- System typography with custom brand hierarchy.
- White-first energetic premium styling.
- Black primary actions.
- Electric indigo, fresh green, and coral semantic accents.
- Four-item navigation.
- Toolbar quick-add action.
- Week rhythm control.
- One featured event surface.
- Bottom sheet behavior.
- Safe-area, increased-contrast, and reduced-motion support.
