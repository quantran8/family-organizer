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
- Excessive cards, borders, dividers, or shadows.
- Black content surfaces; black is reserved for actions.
- Colored section-header bands.
- Turning each list row into a separate card.
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

| Element           | Rule                                      |
| ----------------- | ----------------------------------------- |
| Screen question   | One sentence, preferably `4–8` words      |
| Section title     | `1–3` words                               |
| Primary button    | `1–2` words, maximum `3`                  |
| Row title         | One line                                  |
| Row metadata      | One short line                            |
| Badge             | Number or `1–2` words                     |
| Empty-state title | Maximum `6` words                         |
| Empty-state body  | Maximum `12–16` words                     |
| Alert             | State what happened, then the next action |

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

250 triệu
Cập nhật 2 tuần trước

Việc cần làm · 2
Đặt lịch đăng kiểm xe
Trước 17:00 · Anh

Sự kiện
Sinh nhật mẹ
Hôm nay · 19:00

Khoản sắp tới
Học phí con · 25 triệu
05/09

Cần chú ý
Bảo hiểm xe · 18 ngày
```

Do not add descriptions unless they change the next decision.

---

## 4. Visual direction

### 4.1 Bright canvas, white section surfaces

The app uses a very light neutral canvas and white section surfaces.

The canvas creates separation. The white sections create scan anchors. Users should be able to identify `Tiền`, `Việc`, `Sự kiện`, and `Cần chú ý` as distinct groups before reading the rows inside them.

Recommended balance:

- `85–92%` white and near-white neutral surfaces.
- App canvas: near-white, slightly darker than the sections.
- Section surfaces: white.
- Black: primary actions only.
- Accent color: compact markers, dates, counts, selected states, and meaningful icon fills.
- Semantic color: status and urgency only.

A section is the visual grouping unit. An item inside a list is not a card.

### 4.2 Section expression

Each major section should have:

- One white surface.
- One short title.
- One optional count, date, or secondary action.
- Flat content rows inside.
- Consistent radius, padding, and elevation.

Section headers remain neutral. Do not use colored header bands or a different decorative color for every module.

### 4.3 Color roles

- **Black:** primary action buttons and decisive controls.
- **Electric lime:** brand accent, counts, dates, selected markers, and compact highlights.
- **Clear green:** positive status only.
- **Tangerine:** deadlines, preparation gaps, and upcoming payments.
- **Red:** destructive or critical states only; rare.

Financial amounts are neutral by default. A large amount is emphasized through scale and placement, not by making it green or red.

### 4.4 Avoid a wellness palette

Avoid:

- Beige-heavy canvases.
- Dusty sage as the main brand color.
- Low-contrast pastel section headers.
- Soft colors on every container.
- Black cards used as content highlights.
- Multiple accent colors competing within one viewport.

The product should feel active and current, not meditative.

---

## 5. Color system

### 5.1 Neutral tokens

| Token       | Value     | Usage                                                |
| ----------- | --------- | ---------------------------------------------------- |
| `canvas`    | `#FAFAF8` | App background behind section surfaces               |
| `surface`   | `#FFFFFF` | Major section surfaces, sheets, navigation           |
| `soft`      | `#F6F6F7` | Compact controls and subtle icon fills               |
| `ink`       | `#111114` | Primary text                                         |
| `muted`     | `#717177` | Metadata                                             |
| `subtle`    | `#A2A2A8` | Inactive navigation and chevrons                     |
| `line`      | `#ECECEE` | Rare structural divider when spacing is insufficient |
| `on-action` | `#FFFFFF` | Content on black action backgrounds                  |

Use neutral grays. The canvas must be visibly distinct from white sections without reading as gray or beige.

Never use Tailwind's raw color classes (`bg-white`, `text-white`, `bg-gray-100`, …) in app code. Use named design tokens so palette changes remain auditable.

### 5.2 Action tokens

| Token                 | Value     | Usage                  |
| --------------------- | --------- | ---------------------- |
| `action`              | `#111114` | Primary CTA background |
| `action.pressed`      | `#29292F` | Pressed state          |
| `action.disabled`     | `#D8D8DE` | Disabled background    |
| `action.disabledText` | `#8B8B94` | Disabled label         |

Black is reserved for actions and decisive controls. Do not use black as a finance, event, or section background.

### 5.3 Accent tokens — electric lime

| Token         | Value     | Usage                                               |
| ------------- | --------- | --------------------------------------------------- |
| `accent`      | `#D9F06F` | Counts, dates, selected markers, compact icon fills |
| `accent.soft` | `#F5F9DE` | Small selected controls and low-emphasis highlights |
| `accent.ink`  | `#111114` | Text and icons on top of `accent`                   |

Accent is a signal, not a module background. It should normally occupy less than `8–10%` of a viewport.

### 5.4 Semantic tokens

| Meaning   | Foreground | Soft background | Usage                                       |
| --------- | ---------- | --------------- | ------------------------------------------- |
| Positive  | `#13A86B`  | `#E9F9F1`       | Stable status and completed positive state  |
| Attention | `#FF6B57`  | `#FFF0EB`       | Deadline, upcoming payment, preparation gap |
| Critical  | `#D64545`  | `#FFF0F0`       | Error or destructive consequence only       |

Do not use semantic colors as decorative module colors.

### 5.5 Color rules

- Use black for primary CTA.
- Keep section surfaces white.
- Keep section headers neutral.
- Use accent in compact areas only.
- Use colored icon containers only when color communicates identity, state, or time.
- Do not rely on color alone to communicate status.
- Do not assign colors to household members by gender.
- Financial amounts are neutral by default.

---

## 6. Typography

### 6.1 Typeface

Use `Be Vietnam Pro` for the branded interface, followed by platform fallbacks:

```css
font-family:
  "Be Vietnam Pro",
  ui-sans-serif,
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  Inter,
  "Segoe UI",
  sans-serif;
```

This keeps Vietnamese legible while avoiding the appearance of an unmodified stock iOS interface.

### 6.2 Type scale

| Style         |      Size | Line height |    Weight | Usage                                    |
| ------------- | --------: | ----------: | --------: | ---------------------------------------- |
| Display       | `36–40px` |      `1.02` | `650–700` | Home question or primary financial value |
| Section       | `22–24px` |      `1.22` | `650–700` | Main section titles                      |
| Feature title | `18–19px` |   `23–25px` | `600–700` | Featured event and payment title         |
| Body          | `15–16px` |   `22–23px` | `500–600` | Row title and main content               |
| Meta          | `12–13px` |   `17–18px` | `400–600` | Date, person, amount                     |
| Badge         | `10–12px` |   `14–16px` | `600–700` | Count, deadline, compact state           |

Use `12px` as the normal minimum. `10–11px` is allowed only for very short badges with sufficient contrast.

### 6.3 Typography rules

- Support Dynamic Type in native implementation.
- Keep primary row titles to one line where possible.
- Use negative tracking only for large titles and large numbers.
- Section titles use sentence case and `1–3` words.
- Do not add an eyebrow label when the title already provides the same meaning.
- Use tabular numerals for financial values and aligned dates.
- Avoid excessive bold; reserve the strongest weight for section anchors and key values.

---

## 7. Layout and spacing

### 7.1 Mobile frame and scrolling

- Target width: `375–430px`.
- Outer horizontal padding: `16px` for section surfaces.
- Internal section padding: `20px`.
- Minimum touch target: `44 × 44pt`.
- Respect top and bottom safe areas.
- Mobile uses natural document scrolling.
- Persistent bottom navigation is fixed above the safe area.
- Nested scrolling is allowed only inside the desktop demo frame.

### 7.2 Spacing scale

| Token      |  Value |
| ---------- | -----: |
| `space.1`  |  `4px` |
| `space.2`  |  `8px` |
| `space.3`  | `12px` |
| `space.4`  | `16px` |
| `space.5`  | `20px` |
| `space.6`  | `24px` |
| `space.7`  | `28px` |
| `space.8`  | `32px` |
| `space.9`  | `36px` |
| `space.10` | `40px` |

### 7.3 Section rhythm

- Header to first section: `24–28px`.
- Between major section surfaces: `16–20px`.
- Section header to content: `16–20px`.
- Between flat rows: `20–24px`.
- Row minimum height: `68–76px`.
- Content bottom padding must clear persistent navigation.

The section surface provides grouping. Do not add a background to each row.

### 7.4 Section header

A section header contains:

- One title.
- One optional count or date badge.
- One optional text action.

Do not add a colored header background. Do not repeat the module name in an eyebrow label.

### 7.5 Desktop preview

- Outer canvas: `#F4F4F6`.
- Maximum screen width: `430px`.
- Frame radius: `42px`.
- Frame shadow: `0 24px 80px rgba(21,21,27,.17)`.

The frame is a demo artifact, not part of the native mobile UI.

---

## 8. Shape and elevation

| Component       |               Radius |
| --------------- | -------------------: |
| Avatar          |              `999px` |
| Primary action  |              `999px` |
| Section surface |               `24px` |
| Icon container  | `14–16px` or `999px` |
| Compact badge   |              `999px` |
| Event date tile |            `16–18px` |
| Bottom sheet    |   `28px` top corners |
| Desktop preview |               `42px` |

### Elevation rules

- Major sections may use one shared subtle shadow: `0 6px 18px rgba(0,0,0,.035)`.
- The white-on-near-white surface contrast should do most of the separation work.
- Rows inside a section never receive their own shadow.
- Rows do not receive individual rounded backgrounds.
- Use dividers only for unusually dense lists; prefer spacing first.
- Primary CTA may use a restrained black shadow.
- Bottom sheet uses elevation to establish modality.
- Do not stack section shadow, row shadow, and colored background in the same hierarchy.

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
- Neutral text or accent is allowed for contextual links.
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
- Small accent marker for brand expression.
- No large selected background.

### 11.3 Inactive state

- `subtle` gray.
- Medium or semibold caption.
- Preserve readable contrast.

### 11.4 Material layer

A light translucent navigation material is allowed only for persistent navigation or modal layers.

```css
background: rgba(255, 255, 255, 0.9);
backdrop-filter: saturate(170%) blur(22px);
```

Do not use blur on cards, rows, or content surfaces.

---

## 12. Home screen structure

```text
Header
├── Household identity
├── Current date
├── One central question
└── Black Add action

Finance section
├── Total asset value
├── Freshness
├── Upcoming preparation total
└── Estimated remaining value

Task section
├── Title + count
└── Flat task rows

Event section
├── Current event
└── Nearest upcoming event

Upcoming payment section
├── Due date
├── Amount
└── One black detail action

Notice section
└── Flat semantic rows

Bottom navigation
└── Four top-level destinations
```

### Home hierarchy

1. Finance readiness.
2. Tasks due now.
3. Current and nearest event.
4. Nearest upcoming payment.
5. Items requiring attention.
6. Navigation.

### Home rules

- Sections are the scan anchors.
- Use a near-white canvas and white section surfaces.
- Section headers remain neutral; no colored header bands.
- No separate `Ưu tiên hôm nay` summary that duplicates section content.
- No charts or progress dashboard.
- No paragraph copy.
- Empty groups disappear.
- Keep the first viewport useful without requiring interpretation.
- Every row answers `what` and `when`.
- Black appears on actions, not content surfaces.
- List items remain flat inside their section.

---

## 13. Core components

### 13.1 Section surface

Purpose: make the Home screen scannable by module without turning every row into a card.

- Background: `surface`.
- Parent canvas: `canvas`.
- Radius: `24px`.
- Internal padding: `20px`.
- Optional subtle section shadow.
- Neutral header with one short title.
- Optional count, due date, or text action.
- No colored header band.
- No nested card for each row.

### 13.2 Finance summary

- Total asset value is the largest element in the section.
- Freshness appears directly below the value.
- `Cập nhật` is a black primary action.
- Secondary metrics sit in a simple two-column layout.
- Accent may mark one metric or freshness state.
- Financial amounts remain neutral.
- Do not use a black finance background.

### 13.3 Task row

Structure:

1. Completion control.
2. One-line task name.
3. One metadata line.
4. Optional overflow action.

Rules:

- Minimum row height: `68–76px`.
- Checkbox: `24px`.
- Row has no individual background, border, radius, or shadow.
- Separate rows with `20–24px` spacing; use a divider only in dense mode.
- Completion uses `accent` fill with an `accent.ink` check.
- Completed text may use line-through and reduced contrast.
- No extra status chips.

### 13.4 Event block

- Event stays inside the white section surface.
- Date is the main scan anchor.
- Date tile or date marker may use `accent`.
- Title: one line.
- Time and location: one metadata line.
- Preparation summary: one short line.
- Upcoming event is a flat row below the featured event.
- Do not add illustrations, gradients, or nested cards.

### 13.5 Upcoming payment

- Show one nearest payment on Home.
- Due date may use an accent or attention badge.
- Amount is large but neutral.
- One black `Xem` or `Chi tiết` action.
- Additional payments move to the Money detail view.

### 13.6 Notice row

- Flat row inside the Notice section.
- Semantic icon container.
- One-line title.
- One supporting line.
- Chevron for drill-down.
- Tangerine for deadlines and preparation gaps.
- Red only for critical consequences.
- No individual row card.

### 13.7 Quick-add sheet

- Open from the black `Thêm` toolbar action.
- Top radius: `28px`.
- Dimmed backdrop.
- One title and one short instruction line maximum.
- Each option has icon, title, and one short metadata line.
- `Hủy` remains visible.
- Return focus to the trigger after closing.

---

## 14. Motion and feedback

| Interaction     |    Duration |
| --------------- | ----------: |
| Press feedback  | `120–160ms` |
| State change    | `180–240ms` |
| Page transition | `240–300ms` |
| Bottom sheet    | `300–340ms` |

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
          "Be Vietnam Pro",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        canvas: "#FAFAF8",
        surface: "#FFFFFF",
        soft: "#F6F6F7",
        ink: "#111114",
        muted: "#717177",
        subtle: "#A2A2A8",
        line: "#ECECEE",
        "on-action": "#FFFFFF",
        action: {
          DEFAULT: "#111114",
          pressed: "#29292F",
          disabled: "#D8D8DE",
          "disabled-text": "#8B8B94",
        },
        accent: {
          DEFAULT: "#D9F06F",
          soft: "#F5F9DE",
          ink: "#111114",
        },
        positive: {
          DEFAULT: "#13A86B",
          soft: "#E9F9F1",
        },
        attention: {
          DEFAULT: "#FF6B57",
          soft: "#FFF0EB",
        },
        critical: {
          DEFAULT: "#D64545",
          soft: "#FFF0F0",
        },
      },
      boxShadow: {
        section: "0 6px 18px rgba(0,0,0,.035)",
        action: "0 8px 22px rgba(17,17,20,.14)",
        frame: "0 24px 80px rgba(21,21,27,.17)",
        sheet: "0 -16px 48px rgba(0,0,0,.18)",
      },
      borderRadius: {
        section: "24px",
        sheet: "28px",
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
  --canvas: #fafaf8;
  --surface: #ffffff;
  --soft: #f6f6f7;

  /* Text and structure */
  --ink: #111114;
  --muted: #717177;
  --subtle: #a2a2a8;
  --line: #ececee;
  --on-action: #ffffff;

  /* Primary action */
  --action: #111114;
  --action-pressed: #29292f;
  --action-disabled: #d8d8de;
  --action-disabled-text: #8b8b94;

  /* Accent */
  --accent: #d9f06f;
  --accent-soft: #f5f9de;
  --accent-ink: #111114;

  /* Semantic */
  --positive: #13a86b;
  --positive-soft: #e9f9f1;
  --attention: #ff6b57;
  --attention-soft: #fff0eb;
  --critical: #d64545;
  --critical-soft: #fff0f0;

  /* Radius */
  --radius-section: 24px;
  --radius-icon: 14px;
  --radius-date: 18px;
  --radius-sheet: 28px;

  /* Shadow */
  --shadow-section: 0 6px 18px rgba(0, 0, 0, 0.035);
  --shadow-action: 0 8px 22px rgba(17, 17, 20, 0.14);
  --shadow-sheet: 0 -16px 48px rgba(0, 0, 0, 0.18);

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
- [ ] Mobile uses natural document scrolling.
- [ ] Feedback is immediate and restrained.
- [ ] Accessibility states are supported.

### Less text

- [ ] The screen is understandable in about three seconds.
- [ ] Each section title uses `1–3` words.
- [ ] No redundant eyebrow repeats the section title.
- [ ] Each row communicates one idea.
- [ ] Row titles fit on one line where possible.
- [ ] Metadata is limited to one short line.
- [ ] Buttons use short, action-oriented labels.
- [ ] No fact is repeated across title, subtitle, and badge.
- [ ] Home contains no explanatory paragraph.

### Visual system

- [ ] Canvas is near-white and brighter than the desktop preview canvas.
- [ ] Major sections are white and visibly separate from the canvas.
- [ ] Section headers remain neutral with no colored band.
- [ ] Primary CTA is black.
- [ ] Black is not used as a content-section background.
- [ ] Accent occupies compact, meaningful areas only.
- [ ] No gradient is used.
- [ ] List rows remain flat inside the section surface.
- [ ] Rows do not receive individual backgrounds, radii, or shadows.
- [ ] Dividers are rare; spacing is the default separator.
- [ ] Section shadows are subtle and consistent.
- [ ] The result feels branded without looking like stock iOS.

### Product behavior

- [ ] Language is shared and nonjudgmental.
- [ ] Household members are treated equally.
- [ ] Financial data is not summarized by person.
- [ ] Status is not communicated by color alone.
- [ ] Empty groups disappear from Home.

---

## 20. Current demo reference

The current visual reference is:

```text
home-screen-light-canvas-clean-sections.html
```

It demonstrates:

- HIG-based interaction and accessibility behavior.
- A bright near-white app canvas.
- White section surfaces as scan anchors.
- Clean neutral section headers.
- Flat rows inside each section.
- Black primary actions only.
- Electric lime used as a compact accent.
- Tangerine used for attention states.
- Natural mobile document scrolling.
- Bottom-sheet behavior.
- Safe-area and reduced-motion support.
