---
name: Cobalt Precision POS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747687'
  outline-variant: '#c4c5d8'
  surface-tint: '#1c4bea'
  primary: '#0032b6'
  on-primary: '#ffffff'
  primary-container: '#1447e6'
  on-primary-container: '#c9d0ff'
  inverse-primary: '#b9c3ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#00476f'
  on-tertiary: '#ffffff'
  tertiary-container: '#006092'
  on-tertiary-container: '#aed8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#0035be'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  numeric-total:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.25rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system delivers a high-speed, uncluttered, and dependable operational interface tailored for retail and hospitality point-of-sale terminals. Designed for rapid scanning, tactile certainty, and zero cognitive friction under pressure, the visual language balances high contrast with Scandinavian-grade clarity.

### Personality & Tone
- **Authoritative & Reliable:** Eliminates toy-like affordances and rainbow status alerts in favor of structural clarity, confident typographic weight, and intentional negative space.
- **High-Velocity Operational Clarity:** Optimized for bright cashier counters and varied lighting conditions. High edge definition between interactive items, numeric keypads, and bill summaries prevents checkout errors.
- **Refined Minimalism:** Strips out decorative gradients and non-essential visual noise. Interactions rely on distinct surface contrast, clear borders, and punchy primary blue accents.

## Colors

The palette is engineered around high luminance contrast, replacing disorganized status hues with structured functional blue and slate neutrals.

### Palette Architecture
- **Primary (`#1447E6`):** Vibrant Cobalt Blue. Dedicated exclusively to primary actions, completion states, active order selections, and interactive focal points.
- **Secondary (`#0F172A`):** Deep Slate Ink. Used for primary typography, totals, monetary quantities, key operational buttons, and high-emphasis structure.
- **Tertiary (`#0284C7`):** Electric Cyan/Sky. Used sparingly for non-critical secondary indicators, subtotal accents, and informational chips.
- **Neutrals:**
  - `Canvas Base`: `#FFFFFF` (Pure White) ensures maximum brightness and contrast.
  - `Surface Muted`: `#F8FAFC` (Slate 50) for register tables, ticket panels, and sidebar background separation.
  - `Surface Elevated`: `#F1F5F9` (Slate 100) for unselected item tiles, segmented controls, and keypad buttons.
  - `Borders & Rules`: `#E2E8F0` (Slate 200) for structural grid borders; `#CBD5E1` (Slate 300) for high-contrast input outlines.
  - `Text Muted`: `#64748B` (Slate 500) for metadata, taxes, SKU labels, and inactive icons.
  - `Text Base`: `#0F172A` (Slate 900) for ultra-crisp alphanumeric legibility.

### Semantic Accents (Minimalist)
- **Success (`#059669`):** Reserved for successful payment confirmation and cash drawer reconciliation.
- **Destructive (`#DC2626`):** Reserved for void item, cancel transaction, and refund triggers.
- **Warning (`#D97706`):** Reserved for low paper, offline mode, or pending authorization warnings.

## Typography

The type system standardizes completely on **Plus Jakarta Sans**, utilizing its geometric proportions, wide apertures, and robust numerals to guarantee legibility from an arm’s length.

### Usage Standards
- **Tabular Figures:** All prices, quantity indicators, barcode strings, and totals must render using tabular/monospaced digits (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during rapid calculations.
- **Totals & Checkout Values:** `numeric-total` is dedicated to primary order balances, change calculations, and invoice bottom-lines.
- **Labels & Micro-Data:** `label-sm` utilizes an uppercase transformation with positive letter tracking (+0.05em) for SKU tags, cashier initials, and device status badges.

## Layout & Spacing

A dual-pane layout standardizes the operational POS environment: an expansive, catalog-driven left pane and a fixed-width, transactional right receipt rail.

### Screen Partitioning & Adaptivity
- **Desktop / Tablet Landscape (>= 1024px):**
  - **Catalog/Product Zone:** Fluid flex grid (3 to 5 columns of touch cards) conforming to `gutter-desktop` (20px).
  - **Cart & Tender Rail:** Fixed 380px to 420px width pinned to the right edge. Maintains uninterrupted access to cart actions, item lines, discount inputs, and the "Charge" button.
- **Tablet Portrait (768px - 1023px):**
  - Order rail collapses into a persistent bottom sheet showing total amount and line count, expandable via touch swipe. Catalog grid reduces to 3 columns.
- **Handheld Mobile (< 768px):**
  - Single column with full-width product lists, toggled between "Order View" and "Register View" via persistent bottom navigation tabs.

### Touch Target Standard
- Minimum clickable/tappable surface is strictly **44px × 44px**, with the primary payment button exceeding **56px** height to minimize mis-taps during rush hours.

## Elevation & Depth

Visual hierarchy relies on structural border contrasts and low-opacity slate ambient shadows, preserving high readability under direct overhead retail lighting.

### Elevation Levels
- **Level 0 (Flat Baseline):** `#FFFFFF` and `#F8FAFC` base layers, separated by `1px solid #E2E8F0`. Shadow: `none`.
- **Level 1 (Card & Catalog Tiles):** Applied to product tiles and tender options. 
  - Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
  - Border: `1px solid #E2E8F0`.
- **Level 2 (Active Selections & Modals):** Applied to active product modifiers, dropdown panels, and keypad cards.
  - Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
  - Border: `1px solid #CBD5E1`.
- **Level 3 (Checkout Overlays & Cash Tender Drawers):** Applied to payment summary drawers and customer-facing popups.
  - Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes

The roundedness level is strictly set to **2** (0.5rem / 8px baseline radius), delivering a clean, modern aesthetic that feels neither overly industrial nor playfully exaggerated.

### Corner Radii Guidelines
- **Base (0.5rem / 8px):** Applied to standard catalog tiles, numeric keypad keys, text input elements, search bars, and table rows.
- **Large (1rem / 16px):** Applied to primary checkout drawers, bill summary containers, and payment method selector groups.
- **Pill / Circular (9999px):** Strictly reserved for numerical item counts (quantity badges), status indicator dots, and quick-filter category pills.

## Components

### Buttons
- **Primary Action (Tender/Pay):** Background `#1447E6`, text `#FFFFFF`, border `none`, font `label-lg`, height `56px`, radius `8px`. Active state shifts to `#0F36B0`.
- **Secondary Action (Park, Hold, Print):** Background `#FFFFFF`, text `#0F172A`, border `1px solid #CBD5E1`, hover background `#F8FAFC`.
- **Destructive Action (Void/Cancel):** Background `#FEF2F2`, text `#DC2626`, border `1px solid #FEE2E2`. Hover shifts to `#FEE2E2`.

### Catalog Item Cards
- Surface `#FFFFFF`, border `1px solid #E2E8F0`, corner radius `8px`, padding `12px`.
- Title rendered in `headline-sm` (`#0F172A`), price in `headline-md` (`#1447E6`), stock indicator in `label-sm` (`#64748B`).
- Selected card state: Border `2px solid #1447E6` with a subtle `#EFF6FF` tint fill.

### Input Fields & Numeric Keypads
- **Search & Barcode Input:** Height `48px`, background `#FFFFFF`, border `1.5px solid #CBD5E1`, text `#0F172A`, placeholder `#64748B`. Focus state transitions border to `#1447E6` with `0 0 0 3px rgba(20, 71, 230, 0.15)`.
- **Numpad Buttons:** Height `60px`, background `#F8FAFC`, border `1px solid #E2E8F0`, typography `headline-md` (`#0F172A`), active click feedback `#E2E8F0`.

### Cart Receipt List & Line Items
- Clean table rows with alternating zebra striping using `#FFFFFF` and `#F8FAFC`.
- Item description left-aligned with modifier badges; right-aligned tabular price and trash/void icon button.
- Active highlighted row features a solid left indicator stripe in `#1447E6` (4px width).

### Filter Chips
- Height `36px`, padding `0 16px`, background `#F1F5F9`, text `#0F172A`, border `1px solid transparent`.
- Active State: Background `#1447E6`, text `#FFFFFF`, font-weight `600`.