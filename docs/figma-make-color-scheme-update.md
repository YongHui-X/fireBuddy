# Figma Make Color Scheme Update

## Source Reference
Use this image as the color direction reference:

- [SS.png](C:/Users/User/All%20my%20projects/fireBuddy/fireBuddy/docs/Exampleimages/SS.png:1)

This reference has a stronger financial-app color direction than the earlier warm beige palette.

## Decision
From this point forward, FireBuddy should use a green-led palette based on the screenshot reference above.

This change is for **color scheme only**.

Do **not** change:
- layout
- spacing
- typography hierarchy
- navigation structure
- component structure
- copy
- information architecture
- interaction patterns

## Target Palette
Use this palette as the working source of truth for visual updates:

- Primary green: `#3C8A61`
- Deep green: `#25543D`
- Secondary green: `#67B47C`
- Soft mint: `#DCEBDD`
- App background: `#F5F8F4`
- Card background: `#FFFFFF`
- Muted surface: `#EEF5EF`
- Primary text: `#1F3D2E`
- Secondary text: `#6B8577`
- Border: `#D7E3D8`
- Lime accent, use sparingly: `#CBEA63`
- Chart support gold, use only where needed in analytics visuals: `#E5B24A`
- Success: `#2E9B57`
- Destructive: `#D64545`

## Color Usage Rules
### Primary green
Use for:
- primary buttons
- selected tab/icon states
- key balance cards
- active chips
- important highlights

Do not use it on every large surface at once.

### Deep green
Use for:
- headings
- strong labels
- high-contrast text on light backgrounds
- icons that need emphasis

### Secondary green
Use for:
- secondary highlights
- less dominant cards
- progress states
- subtle supporting UI elements

### Soft mint and muted surfaces
Use for:
- secondary panels
- chart backgrounds
- inactive selected areas
- low-emphasis cards

### White card background
Use white or near-white for:
- primary content cards
- form surfaces
- transaction rows
- modal content areas

This keeps the app readable and prevents green overload.

### Lime accent
Use very sparingly for:
- decorative glow shapes
- occasional illustration accents
- tiny emphasis details

Do not use lime for main buttons, body text, or large areas.

### Gold
Use only if a chart or category visualization needs a second contrasting tone.

Do not introduce gold as a brand color.

## Figma Make Instructions
Use the following instruction in Figma Make when updating the existing screens.

## Ready-To-Paste Prompt
```text
Update the existing FireBuddy screens by changing the color scheme only.

Do not change layout, spacing, typography hierarchy, component structure, copy, navigation, or interaction patterns.
Do not redesign the app.
Do not move elements around.
Keep all current screens and UI structure intact.

Use a financial-app palette inspired by a clean green mobile finance reference:

- Primary green: #3C8A61
- Deep green: #25543D
- Secondary green: #67B47C
- Soft mint: #DCEBDD
- App background: #F5F8F4
- Card background: #FFFFFF
- Muted surface: #EEF5EF
- Primary text: #1F3D2E
- Secondary text: #6B8577
- Border: #D7E3D8
- Lime accent: #CBEA63
- Optional chart gold: #E5B24A
- Success: #2E9B57
- Destructive: #D64545

Apply the palette with these rules:

- Use white or near-white for most content cards and form surfaces
- Use the primary green for key CTA buttons, active states, and important summary cards
- Use deep green for headings and strong text
- Use secondary green and soft mint for supporting cards, chips, and low-emphasis highlights
- Use subtle green-tinted borders instead of dark heavy borders
- Keep the overall look calm, polished, and finance-oriented
- Avoid orange, beige, or warm brown tones
- Avoid dark mode
- Avoid gradients inside the core app UI
- If decorative background shapes are present, they may use soft green and lime accents very subtly

Preserve readability and hierarchy.
The result should feel like a modern personal finance app with green as the brand anchor and white cards for clarity.
```

## Screen-Level Guidance
### Add Expense
- Keep the form surfaces white
- Use primary green for the main submit button
- Use deep green for section titles
- Use muted green surfaces only for secondary help panels or summaries

### Dashboard
- Total balance card can use primary green
- Supporting cards should stay white
- Chart colors should stay mostly green, with gold only if a second category tone is needed

### Transactions
- Keep the list highly readable
- White rows with subtle borders
- Use green only for active filters, selected tabs, and positive states

### Categories
- Use green for category highlights and selection states
- Keep management cards white and uncluttered

### Profile
- Header area can use primary green
- Content cards should remain white

## Constraints
If Figma Make proposes broader visual changes, reject them.

This task is complete only if:
- the palette changes
- the UI keeps the same structure
- the screens look cleaner and more finance-oriented
- no new layout ideas are introduced
