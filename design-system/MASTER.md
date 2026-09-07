# Linear Design System Specification (MASTER.md)

> Applied Archetype: Linear (Precision Dark)
> Source: `skills/design-systems/design-linear/SKILL.md`

## Overview

Linear's marketing canvas is the deepest dark surface in this collection — `{colors.canvas}` is #010102, essentially pure black with a faint blue tint. On top sits a four-step surface ladder (`{colors.surface-1}` through `{colors.surface-4}`) for cards, panels, and lifted tiles, with hairline borders running from `{colors.hairline}` (#23252a) up through `{colors.hairline-strong}` and `{colors.hairline-tertiary}`. Light gray text (`{colors.ink}` #f7f8f8) carries the body and headlines.

The single chromatic accent is **Linear lavender-blue** `{colors.primary}` (#5e6ad2) — used on the brand mark, focus rings, and the primary CTA button. A lighter hover state (`{colors.primary-hover}` #828fff) and a focus-tinted variant (`{colors.primary-focus}` #5e69d1) extend the same hue. Linear avoids saturated greens, oranges, reds, etc. on the marketing canvas — the only semantic color is `{colors.semantic-success}` (#27a644) for status pills and the rare success indicator.

Display type runs Linear's custom sans (with `SF Pro Display` fallback) at weight 500–700 with negative letter-spacing scaling from -3.0px at 80px down to 0 at body. The body family is Linear's text cut, and a Linear Mono is reserved for code snippets in product screenshots.

The page rhythm is **dense product screenshots** — Linear's marketing leads with high-fidelity captures of the product UI (issue list, project view, dashboard) framed in `{colors.surface-1}` panels with `{rounded.xl}` 16px corners. The chrome is intentionally minimal so the app screenshots can do the heavy lifting.

**Key Characteristics:**
- **Dark-canvas marketing system** — `{colors.canvas}` (#010102) is the deepest dark in this collection.
- **Lavender-blue brand accent** (`{colors.primary}` #5e6ad2) — used scarcely on brand mark, focus, and the primary CTA.
- Four-step surface ladder (canvas → surface-1 → surface-2 → surface-3 → surface-4) carries hierarchy without shadow.
- Display tracking pulls aggressively negative (-3.0px at 80px); body holds at -0.05px.
- Cards use `{rounded.lg}` 12px corners with 1px hairline borders — never pill, rarely 16px.
- **Product UI screenshots** dominate the page. The marketing chrome is a dark frame for the app.
- No second chromatic color. No atmospheric gradients. No spotlight cards.

## Colors

> Source pages: linear.app (home), /intake, /pricing, /contact/sales, /build.

### Brand & Accent
- **Lavender-Blue** ({colors.primary}): The signature Linear accent — primary CTA, brand mark, link emphasis: `#5e6ad2`
- **Lavender Hover** ({colors.primary-hover}): Lighter lavender: `#828fff` — hovered state of the primary CTA.
- **Lavender Focus** ({colors.primary-focus}): Focus-ring tint: `#5e69d1` — focused inputs, focused buttons.
- **Brand Secure** ({colors.brand-secure}): Muted lavender-gray: `#7a7fad` — used in "Linear Security" surfaces.

### Surface
- **Canvas** ({colors.canvas}): Default page background — `#010102`, near-pure black with a faint blue tint.
- **Surface 1** ({colors.surface-1}): One step above canvas — feature cards, pricing cards, product screenshot panels: `#08090a`
- **Surface 2** ({colors.surface-2}): Two steps above — featured pricing card, hovered cards: `#121316`
- **Surface 3** ({colors.surface-3}): Three steps above — line-tertiary backgrounds, sub-nav: `#1c1d22`
- **Surface 4** ({colors.surface-4}): Four steps above — bg-level-3, deepest lifted surface: `#262830`
- **Hairline** ({colors.hairline}): 1px borders on cards and dividers: `#23252a`
- **Hairline Strong** ({colors.hairline-strong}): Stronger 1px borders — input focus rings: `#343842`
- **Hairline Tertiary** ({colors.hairline-tertiary}): Tertiary borders for nested surfaces: `#1a1b1f`
- **Inverse Canvas** ({colors.inverse-canvas}): Pure white — surface of the inverse pill CTA on a small set of section openers: `#ffffff`
- **Inverse Surface 1** ({colors.inverse-surface-1}): One step above inverse canvas: `#f4f5f6`
- **Inverse Surface 2** ({colors.inverse-surface-2}): Two steps above inverse canvas: `#e8eaec`

### Text
- **Ink** ({colors.ink}): All headlines and emphasized body type — light gray `#f7f8f8`.
- **Ink Muted** ({colors.ink-muted}): Secondary type at `#d0d6e0` — meta info on hero panels.
- **Ink Subtle** ({colors.ink-subtle}): Tertiary type at `#8a8f98` — deselected pricing tabs, footer columns.
- **Ink Tertiary** ({colors.ink-tertiary}): Quaternary at `#62666d` — disabled, footnotes.

### Semantic
- **Success Green** ({colors.semantic-success}): Status pills, success indicators: `#27a644`.
- **Warning Amber** ({colors.semantic-warning}): Re-render alerts, state cycles: `#f59e0b`.
- **Error Crimson** ({colors.semantic-error}): Broken dependencies, missing props: `#ef4444`.
- **Overlay** ({colors.semantic-overlay}): Pure black overlay scrim for modals: `rgba(0, 0, 0, 0.8)`.

## Typography

### Font Family
- **Linear Display** — Linear's custom display sans; fallback `Inter, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto`. Carries display-xl through subhead.
- **Linear Text** — Linear's custom text sans; fallback stack `Inter, -apple-system, system-ui`. Carries body sizes, button labels, captions.
- **Linear Mono** — Linear's custom mono; fallback `ui-monospace, SF Mono, JetBrains Mono, Menlo`. Used for code snippets, AST expressions, and node IDs.

### Hierarchy Table

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 80px | 600 | 1.05 | -3.0px | Largest hero headline |
| `{typography.display-lg}` | 56px | 600 | 1.10 | -1.8px | Section opener headlines |
| `{typography.display-md}` | 40px | 600 | 1.15 | -1.0px | Sub-section headlines |
| `{typography.headline}` | 28px | 600 | 1.20 | -0.6px | Panel titles, modal titles |
| `{typography.card-title}` | 22px | 500 | 1.25 | -0.4px | Graph node titles, inspector headings |
| `{typography.subhead}` | 20px | 400 | 1.40 | -0.2px | Lead body, intro paragraphs |
| `{typography.body-lg}` | 18px | 400 | 1.50 | -0.1px | Hero subhead, lead paragraphs |
| `{typography.body}` | 16px | 400 | 1.50 | -0.05px | Default body, ELI5 paragraphs |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | Card body, metadata, explorer tree |
| `{typography.caption}` | 12px | 400 | 1.40 | 0 | Captions, meta, status pill badges |
| `{typography.button}` | 14px | 500 | 1.20 | 0 | All button labels |
| `{typography.eyebrow}` | 13px | 500 | 1.30 | 0.4px | Section eyebrow (slight positive tracking) |
| `{typography.mono}` | 13px | 400 | 1.50 | 0 | Linear Mono for code in inspector |

## Layout & Spacing

### Spacing Scale
- **Base unit**: 4px.
- `xxs`: 4px · `xs`: 8px · `sm`: 12px · `md`: 16px · `lg`: 24px · `xl`: 32px · `xxl`: 48px · `section`: 96px.
- Button padding: 8px vertical · 14px horizontal.
- Form input padding: 8px vertical · 12px horizontal.
- Panel interior padding: 20px–24px.

### Elevation & Depth
- **Level 0 (flat)**: Default canvas background `#010102`.
- **Level 1 (surface-1)**: `#08090a` with 1px border `#23252a`.
- **Level 2 (surface-2)**: `#121316` with 1px border `#343842`.
- **Level 3 (surface-3)**: `#1c1d22` for floating toolbars and dropdowns.
- **Level 4 (focus ring)**: 2px `#5e69d1` outline at 50% opacity.

### Border Radius Scale
- `{rounded.xs}`: 4px (small chips, status pills)
- `{rounded.sm}`: 6px (tags, code blocks)
- `{rounded.md}`: 8px (buttons, inputs)
- `{rounded.lg}`: 12px (canvas node cards, inspector cards)
- `{rounded.xl}`: 16px (studio workspace viewport, modals)
- `{rounded.pill}`: 9999px (pills, badges)

## Brand Anti-Patterns
- NEVER use atmospheric gradients or bright neon cyan/pink backgrounds.
- NEVER use `#000000` pitch black when `#010102` canvas provides the correct subtle blue tint.
- NEVER use emoji as UI icons — use SVG Lucide icons exclusively.
- NEVER pill-round primary action buttons (`rounded-md` 8px is Linear standard).
- NEVER use `text-xs` (12px) for primary card titles or main action buttons.
