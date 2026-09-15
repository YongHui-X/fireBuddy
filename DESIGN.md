---
name: FireBuddy Web
description: A forest-and-lime money workbench for Singapore savers, where the figures lead and the chrome stays quiet.
colors:
  forest-900: "#0F251C"
  forest-800: "#163A2C"
  forest-700: "#1F4D3A"
  forest-600: "#2B6A4F"
  forest-500: "#3A8362"
  forest-100: "#DCEBE0"
  forest-50: "#EEF4EE"
  lime-500: "#CBEA63"
  lime-600: "#B9DC47"
  lime-700: "#5F7D12"
  canvas: "#F2F4EC"
  surface: "#FFFFFF"
  surface-muted: "#E9EDE2"
  ink: "#14231C"
  ink-secondary: "#56655C"
  ink-tertiary: "#6B7A71"
  line: "#DDE2D6"
  line-strong: "#C3CCBD"
  income: "#1E7A45"
  income-soft: "#E4F3E8"
  expense: "#C23A2B"
  expense-soft: "#FBEAE7"
  warning: "#9A6700"
  warning-soft: "#FFF3D4"
  projection: "#35678A"
  ember: "#D9782D"
  canvas-top: "#E9EEE3"
  dark-canvas: "#0C1712"
  dark-canvas-top: "#0F1D16"
  dark-surface: "#132119"
  dark-surface-muted: "#1B2C22"
  dark-ink: "#EDF2EA"
  dark-ink-secondary: "#A9B7AD"
  dark-line: "#26392E"
  dark-rail: "#0F1E17"
  dark-hero: "#1D3B2D"
  dark-accent: "#8FD1A8"
  dark-income: "#6FD193"
  dark-expense: "#F08D7D"
typography:
  page-title:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  greeting:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  hero-figure:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 2.3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  metric:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  card-title:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  overline:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
    textTransform: uppercase
  caption:
    fontFamily: "Schibsted Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  chip: "6px"
  control: "10px"
  tile: "12px"
  card: "16px"
  drawer: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  4xl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.lime-500}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.lime-600}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.expense}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.lg}"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "42px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "22px {spacing.2xl}"
  hero-card:
    backgroundColor: "{colors.forest-800}"
    textColor: "#FFFFFF"
    typography: "{typography.hero-figure}"
    rounded: "{rounded.card}"
    padding: "22px {spacing.2xl}"
  sidebar-nav-item:
    backgroundColor: "transparent"
    textColor: "#A9C3B3"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.md}"
    height: "42px"
  sidebar-nav-item-active:
    backgroundColor: "rgba(203, 234, 99, 0.14)"
    textColor: "{colors.lime-500}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.md}"
    height: "42px"
  segmented-option-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "7px"
    padding: "0 18px"
    height: "34px"
  mobile-add-action:
    backgroundColor: "{colors.lime-500}"
    textColor: "{colors.forest-900}"
    typography: "{typography.overline}"
    rounded: "14px"
    width: "62px"
    height: "58px"
---

# Design System: FireBuddy Web

## Overview

**Creative North Star: "The Forest Ledger"**

FireBuddy is a money workbench for Singapore savers working toward financial independence. A deep forest rail and a forest hero card own the left and the top-left of every signed-in view; the rest of the canvas is a pale green-white ground carrying white paper cards with one soft shadow, with a soft forest tint behind the toolbar and first row that settles into the plain canvas by the second row (dark mode adds a faint forest glow top-left). Lime is spent on exactly one thing at a time: the primary action (Add Transaction, Save, the mobile Add tile) and the sun in the mark. Figures are set in Bricolage Grotesque so the numbers read as the headline of every card; everything around them is Schibsted Grotesk at a working size.

FIRE means financial independence, retire early. The identity refuses the literal flame: the mark is an early sun resting on a horizon line, drawn in lime and white on forest. The Ascent mark (rising steps with a lime landing) is the reserve secondary mark and currently serves as the FIRE Planner navigation icon. Ember, the assistant, keeps a small warm spark in `#D9782D`.

**Key Characteristics:**

- Fixed 264px forest sidebar with lime active states and a lime Add Transaction button anchored at the bottom.
- Pale green-white canvas (`#F2F4EC`) under white cards with 16px corners, a 1px line, and one soft offset shadow.
- One forest card anchors Home: the net worth hero top-left, with a lime glow, a white display figure, and assets and liabilities beneath. Every other card, FI progress included, is white.
- Lime is the only action color. Forest greens carry structure, emphasis, and links. Semantic income, expense, warning, and projection colors stay separate.
- Bricolage Grotesque for headings and figures, Schibsted Grotesk for body and controls, tabular numerals only where digits align.
- Dark mode is a night version of the same world: deeper canvas, forest surfaces, lime unchanged.

## Colors

### Primary

- **Lime Action** (`{colors.lime-500}`, `#CBEA63`): Primary buttons, the mobile Add tile, the sidebar active tint, the sun in the mark, the send button in Ember. Text on lime is always ink.
- **Lime Hover** (`{colors.lime-600}`, `#B9DC47`): Hover fill for lime actions.
- **Lime Text** (`{colors.lime-700}`, `#5F7D12`): The only lime allowed as text on light surfaces (the recommended action label).
- **Forest Rail** (`{colors.forest-800}`, `#163A2C`): Sidebar, mobile topbar, net worth hero, Ember composer, user chat bubbles, the toast, the floating Ember launcher.
- **Forest Emphasis** (`{colors.forest-700}`, `#1F4D3A`): Links, the active FIRE setup step, mark fill in dark mode.
- **Forest Accent** (`{colors.forest-600}`, `#2B6A4F`): Focus rings, selected chip borders, the historical chart line, icon tints.

### Secondary

- **Income Green** (`{colors.income}`, `#1E7A45`) on **Income Wash** (`{colors.income-soft}`): Positive amounts and Income badges.
- **Expense Red** (`{colors.expense}`, `#C23A2B`) on **Expense Wash** (`{colors.expense-soft}`): Negative amounts, Expense badges, destructive actions, errors.
- **Warning Ochre** (`{colors.warning}`, `#9A6700`) on **Warning Wash**: Limited data, anomalies, draft labels, the sync banner.
- **Projection Blue** (`{colors.projection}`, `#35678A`): Savings bar, projected FIRE paths, the expense trend line, informational notes.
- **Ember Spark** (`{colors.ember}`, `#D9782D`): The assistant's mark and its tinted tile.

### Neutral

- **Canvas** (`{colors.canvas}`, `#F2F4EC`): Page ground in light mode.
- **Surface** (`{colors.surface}`, `#FFFFFF`): Cards, tables, drawers, dialogs, inputs.
- **Muted Surface** (`{colors.surface-muted}`, `#E9EDE2`): Segmented control tracks, table headers, progress tracks, hover rows, quiet callouts.
- **Ink** (`{colors.ink}`, `#14231C`), **Secondary Ink** (`{colors.ink-secondary}`, `#56655C`), **Tertiary Ink** (`{colors.ink-tertiary}`, `#6B7A71`): Text hierarchy. Tertiary is the floor for placeholders.
- **Line** (`{colors.line}`, `#DDE2D6`) and **Strong Line** (`{colors.line-strong}`, `#C3CCBD`): Card edges and dividers versus control borders.

**The One Lime Rule.** Lime marks the primary action or the selected navigation item. It never fills a card, a chart, or a decorative band. The rail's Add Transaction is global; a page's content area then carries at most one lime action of its own, and it never repeats Add Transaction in lime. Secondary forms on the same page submit with secondary buttons.

**The Forest Owns Regions Rule.** Forest is committed at page scale: the rail, the hero, the composer. It is not sprinkled as icon backgrounds or borders on white cards; those use forest tints and semantic colors.

**The Semantic Truth Rule.** Income, expense, warning, projected, and target data keep their own colors and labels in both themes. Category colors belong to the user and appear at low alpha behind their icons.

## Typography

**Display Font:** Bricolage Grotesque (optical size axis, weights 500 to 700)  
**Body Font:** Schibsted Grotesk (weights 400 to 700)

**Character:** Bricolage brings a slightly editorial, warm grotesk voice to headings and figures without turning a workbench into a magazine. Schibsted Grotesk is clean at 15px and comfortable in tables and forms.

### Hierarchy

- **Greeting** (`{typography.greeting}`): The Home greeting only.
- **Page Title** (`{typography.page-title}`): Every route toolbar. Mobile reduces to 1.4rem.
- **Hero Figure** (`{typography.hero-figure}`): Net worth in the forest hero.
- **Metric** (`{typography.metric}`): Money Pulse values, filtered totals, FIRE headline figures.
- **Card Title** (`{typography.card-title}`): Card and dialog headings, with an optional one-line subtitle in secondary ink beneath (never a kicker above).
- **Body** and **Body Small**: Explanations, descriptions, table cells.
- **Label**: Field labels, buttons, navigation.
- **Overline** (`{typography.overline}`): Table headers, filter labels, hero labels, small status words. Always secondary ink or hero muted ink.
- **Caption**: Timestamps, metadata, helper text.

**The Tabular Rule.** Tabular numerals apply only to amounts, tables, metrics, and dates. Schibsted Grotesk widens punctuation under `tnum`, so prose never carries it.

**The No-Kicker Rule.** Headings speak for themselves. Context goes in a subtitle below the heading, in secondary ink.

## Layout

Desktop (1024px and up) uses a fixed 264px forest sidebar and a fluid canvas with a 1400px content maximum and a `clamp(18px, 3vw, 40px)` gutter. The page toolbar sits directly on the canvas with the title left and actions right; theme and notification controls trail the actions behind a hairline.

Home is a 12-column grid at 1280px and up: the net worth hero spans 4, Money Pulse 5, category budgets 3; category budgets and the spending breakdown share row two evenly; the recent transactions ledger spans 7 beside FI progress at 5 beneath. Between 760px and 1279px the paired cards flow in two columns and the ledger and FI progress stack full width. Transactions stacks a compact period bar, search with a custom date range, a two-cell totals strip, a four-select filter row, and the ledger table. Planning pages (Wealth, FIRE Planner, FIRE setup, Spending Plan) place cards and forms directly under the toolbar; the page owns the gutter.

Below 1024px the sidebar becomes a forest topbar with the brand, theme, notifications, and a More menu, plus a fixed white bottom bar with Home, Transactions, Categories, Profile, and a lime Add tile in the centre. Below 768px toolbar actions stack under the title, the ledger table becomes stacked rows, drawers become bottom sheets, and cards tighten to 18px padding.

**The Page Owns the Gutter Rule.** Content wrappers and planning pages apply the gutter once. Cards never add horizontal margin of their own.

**The Launcher Clearance Rule.** Every page reserves 96px at the bottom on desktop so the floating Ember launcher never covers the last row.

## Elevation & Depth

Cards carry one soft shadow (`0 1px 2px rgba(20,35,28,.05), 0 8px 24px -12px rgba(20,35,28,.18)`) plus a 1px line, enough to lift paper from the canvas without a halo. Transient surfaces (drawers, dialogs, menus, the toast, the floating panel) use the large shadow (`0 18px 48px -16px rgba(15,37,28,.38), 0 2px 6px rgba(15,37,28,.08)`) over a forest-tinted, blurred backdrop. Dark mode deepens both shadows.

**The One Shadow Rule.** A resting surface uses the card shadow or none. Nested cards are never lifted.

## Shapes

Cards and dialogs use 16px corners, controls and inputs 10px, icon tiles 12px, chips 6px, badges and filter pills fully round. The mark tile is 13/48 of its size. The mobile Add tile is a 14px rounded square, not a circle, so it reads as a button rather than a badge.

## Components

### Buttons

- **Primary:** Lime fill, ink text, 40px, 10px corners, 16px side padding. Hover moves to lime hover. Used once per view.
- **Secondary:** White fill, strong line border, ink text. Hover strengthens the border and tints the fill.
- **Danger:** White fill with a red-tinted border and red text; confirmation buttons inside delete banners fill red.
- **Text:** Forest link color, underline on hover. Used for View More, Manage, View all.
- **Icon:** 38px quiet squares that gain a border and muted fill on hover.
- **Sidebar Add / Mobile Add:** Lime fill, forest ink, a soft lime glow.

### Fields

42px inputs with strong-line borders and 10px corners; focus turns the border forest and adds a 3px forest ring at 18 percent. Selects use a custom chevron. Search fields carry an inline icon at 13px. The amount field in the add drawer is a 62px well with the currency prefix and a Bricolage figure.

### Segmented Controls

An inline pill track in muted surface with 4px padding; the selected option is a white tab with a 1px shadow. They size to content and never stretch full width.

### Cards

White, 16px corners, 22px by 24px padding, a title row with the heading and an optional text action, an optional subtitle. One forest card anchors Home: the net worth hero, with a lime radial glow in its corner and assets and liabilities under a hairline. Inside a forest card the text action is white with a translucent underline and the secondary button is a translucent white outline.

### Ledgers and Tables

The transactions table lives in one bordered container. Header cells are overline text on muted surface; rows are 12px by 14px cells with a hover fill; amounts are right-aligned Bricolage figures; the actions column holds one quiet ellipsis. Below 768px each row becomes a stacked card with the description first and the amount top-right. The Home ledger inside the Recent transactions card follows the same header and right-aligned amounts but takes no border or shadow of its own, and its header folds away below 760px.

### Chips and Badges

Income and Expense badges are small pills on their semantic washes. Tags are 6px muted chips. The demo-data label and Limited data status are pills in muted or warning wash.

### Dialogs and Drawers

Centered sheets are 520px, with a header divider and a 24px body. The add transaction editor is a 500px right drawer on desktop and a bottom sheet on phones. Menus are 184px popovers with 8px items.

### Navigation

Desktop rail items are 42px rows with muted ink; the active row has a lime-tinted fill and lime text. Ask Ember sits in its own section with an AI indicator. Mobile uses a 60px forest topbar and a 64px bottom bar.

### Ember

Assistant answers are white reading panels with sources beneath a divider; user messages are forest bubbles on the right. The composer is a forest field with a lime send button. History is a 300px rail at 1180px and up, a right drawer below.

## Do's and Don'ts

### Do:

- **Do** keep forest for regions (rail, hero, composer) and lime for the single primary action.
- **Do** set figures in Bricolage Grotesque with tabular numerals and keep prose in Schibsted Grotesk without them.
- **Do** put context in a subtitle under a heading, in secondary ink.
- **Do** use one bordered container for ledgers with full-width rows.
- **Do** keep the demo-data label, Limited data status, and semantic badges visible.
- **Do** give every control a hover, focus, and disabled state from the token set.

### Don't:

- **Don't** add a second lime button to a view or use lime as a fill for cards or charts.
- **Don't** draw flames. The sun-on-horizon mark is the identity; the Ascent mark is the reserve.
- **Don't** use kickers or eyebrows above headings, decorative gradients, glass, or hard offset shadows.
- **Don't** stretch segmented controls or save buttons to full width on desktop.
- **Don't** apply tabular numerals to body copy.
- **Don't** show theme and notification controls in both the topbar and the toolbar on small screens.
