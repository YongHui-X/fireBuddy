---
name: FireBuddy Web
description: A calm, capable Singapore finance workspace for everyday money tracking and explainable FIRE planning.
colors:
  primary-forest: "#25543D"
  primary-forest-hover: "#1B422F"
  on-primary: "#FFFFFF"
  selected: "#E7EFE8"
  control-border: "#788579"
  ember: "#B6532B"
  dark-action: "#A4CFB0"
  dark-action-hover: "#BBDFC4"
  dark-on-action: "#162C1E"
  dark-selected: "#283D2E"
  dark-ember: "#EFAB87"
  deep-green: "#25543D"
  secondary-green: "#46684F"
  canvas-sage: "#F7F8F5"
  surface-white: "#FFFFFF"
  surface-muted: "#F0F3EE"
  text-primary: "#202820"
  text-muted: "#626B63"
  border-muted: "#D8DFD7"
  income: "#267A3D"
  income-soft: "#EDF7EE"
  danger: "#B42318"
  expense-soft: "#FFF1EF"
  chart-projection: "#386D82"
  chart-target: "#855509"
  dark-canvas: "#101810"
  dark-surface: "#19231B"
  dark-text: "#F2F5EF"
  dark-text-muted: "#B1BCB2"
  dark-border: "#3D4E40"
  dark-deep-green: "#B6D9BF"
typography:
  headline:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline-mobile:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "0.925rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  progress: "2px"
  selected: "6px"
  control: "8px"
  mobile-card: "10px"
  card: "12px"
  round: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  sm-plus: "10px"
  md: "12px"
  md-plus: "14px"
  lg: "16px"
  lg-plus: "18px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  4xl: "32px"
  5xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary-forest}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-forest-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  input-standard:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.md-plus}"
    height: "42px"
  surface-card:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  nav-row-default:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.md-plus}"
    height: "44px"
  nav-row-active:
    backgroundColor: "{colors.income-soft}"
    textColor: "{colors.deep-green}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.md-plus}"
    height: "44px"
  filter-selected:
    backgroundColor: "{colors.income-soft}"
    textColor: "{colors.deep-green}"
    typography: "{typography.label}"
    rounded: "{rounded.selected}"
    padding: "{spacing.sm} {spacing.md-plus}"
  mobile-add-action:
    backgroundColor: "{colors.primary-forest}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    width: "62px"
    height: "58px"
---

# Design System: FireBuddy Web

## Overview

**Creative North Star: "The Calm Financial Workbench"**

FireBuddy is a capable operational workspace for Singapore personal finance and FIRE planning. Its sage canvas lowers visual pressure while white work surfaces, fine grey green borders, and compact controls make dense financial information easy to scan. Forest green is the precise signal for a primary action or selected state, while deep green carries confident emphasis without making the product feel promotional.

The interface is restrained, practical, and quietly warm. It favors ledgers, open sections, clear labels, tabular figures, and visible data provenance over decorative hero treatments. FireBuddy remains the visible identity, while `@myfirequest` stays out of the foreground unless explicitly requested.

**Key Characteristics:**

- Soft sage canvas with white primary work surfaces in light mode.
- Near black text, muted grey green supporting copy, and restrained borders.
- Forest green reserved for primary actions and selected states.
- Compact borderless page toolbars and flat, structured financial ledgers.
- A fixed 248px desktop sidebar that becomes a mobile topbar and four tabs with a labeled central Add action.
- Dark mode built from a deep green black canvas and slightly lighter green surfaces.
- Modest 12px card corners, 8px controls, minimal shadow, and reduced motion support.

## Colors

The palette combines fresh action color with quiet natural neutrals, keeping semantic and chart colors distinct from the product accent.

### Primary

- **Forest Action** (`{colors.primary-forest}`, `#25543D`): Primary buttons, the central mobile Add action, selections, and active controls. Its scarcity preserves meaning.
- **Forest Hover** (`{colors.primary-forest-hover}`, `#1B422F`): The deliberate hover fill for primary actions.
- **Deep Emphasis Green** (`{colors.deep-green}`, `#25543D`): Emphasized text, emphasized links, focus in light mode, and selected navigation content.
- **Working Green** (`{colors.secondary-green}`, `#46684F`): Supporting data visualization and subdued positive emphasis.

### Secondary

- **Income Green** (`{colors.income}`, `#267A3D`): Recorded income and positive financial values.
- **Projection Blue** (`{colors.chart-projection}`, `#386D82`): Estimated FIRE paths, visually distinct from historical facts.
- **Target Ochre** (`{colors.chart-target}`, `#855509`): Targets and thresholds in charts.
- **Alert Red** (`{colors.danger}`, `#B42318`): Destructive actions, errors, liabilities, and expenses that require semantic emphasis.

### Neutral

- **Sage Canvas** (`{colors.canvas-sage}`, `#F7F8F5`): The light theme page canvas.
- **Working White** (`{colors.surface-white}`, `#FFFFFF`): Cards, tool controls, sidebars, topbars, drawers, and list containers.
- **Muted Wash** (`{colors.surface-muted}`, `#F0F3EE`): Quiet hover states, progress tracks, and secondary grouped controls.
- **Near Black** (`{colors.text-primary}`, `#202820`): Primary text and financial figures.
- **Grey Green Copy** (`{colors.text-muted}`, `#626B63`): Descriptions, labels, metadata, placeholders, and secondary navigation.
- **Grey Green Border** (`{colors.border-muted}`, `#D8DFD7`): Card edges, dividers, field strokes, and navigation separation.
- **Income Wash** (`{colors.income-soft}`, `#EDF7EE`): Selected controls and income rows where a quiet semantic surface helps.
- **Expense Wash** (`{colors.expense-soft}`, `#FFF1EF`): Expense rows and light negative context.
- **Night Canvas** (`{colors.dark-canvas}`, `#101810`): Dark theme page canvas.
- **Night Surface** (`{colors.dark-surface}`, `#19231B`): Dark theme cards and navigation surfaces.
- **Night Text** (`{colors.dark-text}`, `#F2F5EF`): Primary dark theme text.
- **Night Muted Copy** (`{colors.dark-text-muted}`, `#B1BCB2`): Secondary dark theme text.
- **Night Border** (`{colors.dark-border}`, `#3D4E40`): Dark theme dividers and field strokes.
- **Night Emphasis Green** (`{colors.dark-deep-green}`, `#B6D9BF`): Dark theme active content and chart targets.

**The Action Color Rule.** Forest green marks an action or selection. Do not use it as a decorative background field or a general success color.

**The Semantic Truth Rule.** Income, expense, historical, projected, and target data keep distinct semantic colors and labels. Color never collapses facts and estimates into one visual category.

**The Theme Pairing Rule.** Light mode pairs sage with white. Dark mode pairs the night canvas with the night surface. Preserve the same hierarchy in both themes.

## Typography

**Display Font:** DM Sans with Segoe UI and sans serif fallbacks  
**Body Font:** DM Sans with Segoe UI and sans serif fallbacks

**Character:** DM Sans gives FireBuddy an approachable but numerical voice. Tight heading tracking and tabular figures make financial data feel exact, while weights from 400 through 700 keep hierarchy clear without visual heaviness.

### Hierarchy

- **Headline** (`{typography.headline}`): Route titles and primary workspace headings. Mobile reduces to `{typography.headline-mobile}`.
- **Metric** (`{typography.metric}`): High priority financial values inside summary cards.
- **Title** (`{typography.title}`): Card, form, and section headings.
- **Body** (`{typography.body}`): Main explanatory content and readable conversation text.
- **Body Small** (`{typography.body-small}`): Page descriptions and supporting explanations, usually limited to 65 characters per line through the toolbar measure.
- **Label** (`{typography.label}`): Navigation, controls, compact buttons, and data labels.
- **Caption** (`{typography.caption}`): Timestamps, chart labels, fine print, and secondary metadata.

Financial values use tabular numerals. Headings and important values use 650 or 700, body text uses 400 or 500, and control labels use 550 through 650. Weight 800 and 900 are outside the system.

**The Operational Scale Rule.** Route headings stop at 1.75rem on desktop. FireBuddy does not use oversized marketing type inside the authenticated workspace.

**The Numerical Rhythm Rule.** Keep amounts, rates, dates, and projection values tabular and aligned so comparisons can be made by position as well as wording.

## Layout

Desktop uses a fixed 248px sidebar and a flexible application canvas. Page toolbars and route content share a maximum width of 1540px, center within the available canvas, and use responsive horizontal padding from 18px to 40px. Toolbars are borderless, compact, and aligned to the work below them rather than presented as cards.

Primary screen content uses a practical 16px to 20px internal rhythm and 14px to 16px gaps between peer cards. Dense financial records appear in full width ledgers with one outer border and row dividers. Dashboard data uses a three metric summary followed by balanced chart and ledger regions. Ember uses a flexible conversation canvas and a 300px searchable history rail from 1180px; below that width, history becomes a right drawer.

At widths below 1024px, the sidebar gives way to a 56px topbar and a safe area aware bottom navigation. The bottom navigation keeps Home, Transactions, Categories, and Profile as the four stable tabs, with a labeled central Add action. Below 768px, toolbars stack their actions, filters become one column, cards use 10px corners where space is tight, drawers become bottom sheets, and Ember hides its supporting side columns.

The spacing scale is compact by design. Controls start around 38px to 42px high, navigation rows are 44px high, cards typically use 16px to 20px padding, and page gutters reduce to 14px on small screens.

**The One Container Rule.** A ledger has one outer surface and internal dividers. Do not wrap each row in another card.

**The Responsive Navigation Rule.** Desktop ownership lives in the sidebar. Mobile ownership lives in the topbar and five action bottom pattern. Do not squeeze the desktop rail into tablet or phone layouts.

## Elevation & Depth

FireBuddy is flat by default. Surface contrast and one pixel borders establish structure, while shadows are reserved for transient overlays such as the add transaction drawer, the mobile More menu, and toasts. Resting cards, summary metrics, chart regions, authentication panels, and navigation rows do not use decorative elevation.

### Shadow Vocabulary

- **Overlay Large** (`0 8px 24px rgba(22, 51, 0, 0.08)` in light mode; `0 8px 24px rgba(0, 0, 0, 0.20)` in dark mode): Drawers and temporary menus.
- **Overlay Medium** (`0 3px 8px rgba(22, 51, 0, 0.07)` in light mode; `0 3px 8px rgba(0, 0, 0, 0.18)` in dark mode): Toasts and compact transient feedback.

**The Flat by Default Rule.** A persistent surface earns separation through tone, border, spacing, and typography. Shadow is not a substitute for hierarchy.

**The Transient Lift Rule.** Use shadow only when a surface temporarily sits above the workspace or must preserve clear stacking context.

## Shapes

The form language is gently squared rather than pill shaped. Cards and major panels use 12px corners, standard controls use 8px corners, and selected segments use 6px corners inside their 8px container. Mobile cards may tighten to 10px. Progress bars use a restrained 2px corner. Fully round geometry is limited to avatars, chart marks, and the central mobile Add action.

Borders are fine, consistent, and usually one pixel. Rows inside ledgers remain square and borderless on their own, with only a bottom divider. Desktop right side drawers use 12px corners on the exposed left edge. On mobile, the same drawer becomes a bottom sheet with 12px top corners.

**The Quiet Corner Rule.** Use 12px for surfaces and 8px for controls. Do not round ordinary cards or buttons into pills.

**The Ledger Edge Rule.** The container owns the corner radius. Rows inside it stay flat so scanning is uninterrupted.

## Components

### Buttons

- **Shape:** Compact rectangular controls with gently curved corners (`{rounded.control}`) and a minimum height of 40px.
- **Primary:** Forest Action background, white text, a subtle matching forest border, and 16px horizontal padding.
- **Hover and Focus:** Hover moves to Forest Hover with a darker border. Keyboard focus uses a 3px Deep Emphasis Green ring in light mode and Forest Action in dark mode, offset by 2px.
- **Secondary:** Working White with a Grey Green Border and primary text. Hover strengthens the border and moves to Muted Wash.
- **Icon:** Quiet 38px square controls are borderless at rest, then gain a border and muted background on hover.
- **Pressed and Disabled:** Pressed controls move down by 1px. Disabled controls remain recognizable at 55 percent opacity and use a not allowed cursor.

### Chips

- **Style:** Filter groups use a white 8px container with 3px inset padding. Individual choices use 6px corners and ordinary label case.
- **State:** Selected choices use Income Wash and Deep Emphasis Green. Avoid standalone decorative pills.

### Cards / Containers

- **Corner Style:** Standard 12px corners, tightening to 10px on small screens.
- **Background:** Working White in light mode and Night Surface in dark mode.
- **Shadow Strategy:** None at rest. Refer to Elevation & Depth for overlays.
- **Border:** One pixel Grey Green Border, with the theme equivalent in dark mode.
- **Internal Padding:** Usually 20px on desktop and 16px on mobile.

Summary cards may rise by only 1px on hover while strengthening their border. This is interaction feedback, not ambient elevation.

### Inputs / Fields

- **Style:** White or Night Surface fill, one pixel border, 8px corners, and compact 42px to 48px height depending on form context.
- **Focus:** The border becomes Deep Emphasis Green and receives a soft 3px forest derived ring. A global 3px accessible focus outline remains available for keyboard navigation.
- **Error / Disabled:** Errors use Alert Red with a soft negative context. Disabled fields lower opacity without changing their fundamental structure.

### Navigation

The desktop sidebar is 248px wide with a white or Night Surface background and a single right divider. Navigation rows are 44px high, use 8px corners, and carry muted text at rest. Hover uses Muted Wash. Active rows use Income Wash with Deep Emphasis Green text. FireBuddy and `SG FIRE Tracker` anchor the rail without competing with task content.

Mobile uses a compact topbar and fixed bottom navigation. The four stable destinations sit around a circular forest Add action with a visible `Add` label. Secondary destinations live in the More menu, which is a temporary bordered surface with modest overlay shadow.

### Page Toolbar

The Page Toolbar is the shared route heading and action pattern. It has no enclosing border or fill, uses the page canvas directly, and aligns title, optional description, metadata, back control, and actions to the content grid. Desktop toolbars are at least 104px high. Mobile toolbars stack their action region beneath the heading.

### Financial Ledger

Transactions, accounts, wealth positions, settings, history, and category breakdowns use one bordered container with full width rows. Rows are separated by a single divider and keep amounts aligned at the trailing edge. Income and expenses rely on explicit signs, labels, and restrained semantic color. Historical facts, projections, and targets remain visually distinct in charts and supporting copy.

### Add Transaction Sheet

The transaction editor is a right side drawer on desktop and a bottom sheet on mobile. Its header and form remain white or Night Surface with one divider, 8px fields, 12px exposed panel corners, and primary actions anchored to the form flow. Expense category suggestions remain an explicit secondary action and never look like automatic save behavior.

### Ember Conversation

Ember is a reading workspace with restrained chat cues. User messages use compact right aligned forest bubbles, while assistant answers use one generous white or Night Surface reading panel with citations inside the same surface. A subtle sage grid gives the conversation canvas structure, the deep green composer remains grounded at the bottom, and searchable history uses flat rows in the right rail or responsive drawer. Essential educational boundaries stay in the empty state and composer note rather than a separate guide panel.

## Do's and Don'ts

### Do:

- **Do** use Forest Action for primary actions, selected filters, and active mobile Add affordance.
- **Do** keep white work surfaces on the sage canvas and use fine borders as the main structural cue.
- **Do** use 12px card corners, 8px control corners, and compact 16px to 20px card padding.
- **Do** keep route toolbars borderless and aligned to the content grid.
- **Do** use flat ledgers with full width rows, clear dividers, aligned amounts, and tabular numerals.
- **Do** preserve explicit labels for income, expense, historical facts, projections, targets, unavailable states, and demo data.
- **Do** provide 3px visible focus treatment and respect reduced motion preferences.
- **Do** keep FireBuddy visible while leaving `@myfirequest` in the background unless explicitly requested.

### Don't:

- **Don't** use decorative gradients, background circles, glass effects, or ornamental hero bands.
- **Don't** turn ordinary buttons, cards, filters, or navigation into excessive pills.
- **Don't** add heavy ambient shadows or nested cards to create hierarchy.
- **Don't** use weights 800 or 900, oversized workspace headings, or marketing scale typography.
- **Don't** use brand color as a decorative wash or as a replacement for semantic success, income, or projection colors.
- **Don't** add decorative eyebrows, notification bells, glossy device framing, or watermark treatments.
- **Don't** collapse mobile navigation into a floating pill or omit the visible Add label.
- **Don't** present Ember as decorative chat bubbles or blur educational guidance with authoritative personal calculations.

Ember uses a simple ember symbol in `#B6532B` (light) and `#EFAB87` (dark). FireBuddy retains its original flame and growth mark. The warm forest palette is retained without the proposed layout, typography, or interaction changes.
