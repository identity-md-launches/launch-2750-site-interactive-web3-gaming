# Squeek Play design system

## Overview

Squeek Play is a gaming and telemetry companion for Squeekchain spectators, players, and streamers. The visual idea is a warm orange hamster wheel inside a calm sports timing interface: cream surfaces, dark olive ink, fine track markings, and expressive hamster artwork. Live measurements have quiet numeric hierarchy; game actions have stronger contrast.

The canonical implementation is `src/styles.css`; feature-specific Canvas/SVG artwork lives in `src/Wheel.tsx` and `src/icons.tsx`. This document describes the finished source, not proposed variants.

## Colors

All CSS colors use sRGB hex values. Primitive values are mapped to semantic roles in `:root`.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` / `--cream-50` | `#f6f5f1` | Page background |
| `--surface` | `#fffefa` | Forms, calculator panels, wallet sheet |
| `--cream-100` | `#eeede7` | Race controls and neutral selected/hover surfaces |
| `--border` / `--cream-200` | `#dddad0` | Structure, track dividers, field edges |
| `--ink` / `--cream-950` | `#292c25` | Primary text and dark utility buttons |
| `--muted` / `--cream-600` | `#6b6b60` | Captions and secondary text |
| `--accent` / `--orange-500` | `#e94f23` | Wheel art, selected-tab underline, range accent |
| `--action` | `#c9421d` | Filled primary actions with light text |
| `--accent-hover` | `#b33616` | Primary action hover |
| `--accent-text` / `--orange-700` | `#a93619` | Accessible orange text and active navigation |
| `--accent-soft` / `--orange-50` | `#fff1e1` | Power result and feed notices |
| `--orange-100` | `#f8e6d2` | Wheel stage |
| `--green-100` | `#e7eddf` | Player lane |
| `--status` / `--green-700` | `#496044` | Hardware connection/status text |
| `--focus` | `#394c34` | Keyboard focus perimeter |

Status has text as well as color. The bright artwork orange is intentionally distinct from the darker action fill: rendered small button text needed a darker background. The final solid primary pair, `#fffefa` on `#c9421d`, measured **4.86:1**. See validation for measurement coverage.

The HUD defines its own contained variants: dark `#232920` with `#f6f5f1` text and `#c1c8b9` captions; light reuses page tokens. The transparent variant uses white text and black text shadows over an external stream. There is no app-wide dark theme. Hamster art uses tan, yellow, lavender, and green to distinguish lanes; these illustration colors are not action/status tokens.

## Typography

Local WOFF2 files in `src/assets/` supply Space Grotesk 400/600/700 and IBM Plex Mono 400. `font-display: swap` is applied; fallbacks are Arial/sans-serif and monospace. The font licenses are retained locally.

| Token | Size | Role |
| --- | --- | --- |
| `--text-xs` | 12px | Dense telemetry captions, compact mobile controls, metadata |
| `--text-sm` | 14px | Buttons, supporting copy, field labels |
| `--text-base` | 16px | Default text, panel headings, editable/copy fields |
| `--text-lg` | 20px | Panel headings, mobile section titles and counters |
| `--text-xl` | 28px | Section titles, desktop counters, race timer |
| `--text-display` | 40px | Desktop product heading and large wheel/result values |

There are two families and three weights. `.numeric`, `code`, and `kbd` use Plex Mono at 400 with tabular figures; prose stays in Space Grotesk. Normal body line height is 1.5; headings use 1.13/1.25. Long hints use 1.65. Headings use balanced wrapping, descriptions use pretty wrapping, and useful values remain selectable.

The display heading tracks at −0.055em, with smaller mobile heading adjustments. Mobile metric tracking is −0.035em; units use the sans family with natural spacing. Size changes reuse the six tokens. The compact dashboard's metadata is intentionally denser than long-form reading text. No extra fonts, kicker labels, or tracked-capital headings should be introduced.

## Layout

The page shell is at most 1440px including 32px desktop gutters. At 1600px and above it becomes a 1376px content width without internal gutters. Spacing primarily uses 8/16/24/32px, with smaller gaps for compact data and icon groups. Related controls are grouped by space and surface tone; rules identify telemetry columns, track lanes, and section boundaries.

- **Above 1150px:** six telemetry columns; wheel on the left and four-lane race on the right; two calculator columns; HUD controls beside its preview.
- **1150px and below:** compact counters, hidden header tagline and decorative note, tighter two-column layouts.
- **830px and below:** telemetry becomes a three-column/two-row grid. Feature grids stack. The race moves above the wheel so Start race arrives early. Calculator and HUD controls follow the same reading order as their desktop versions.
- **540px and below:** 16px page gutters, shortened tab labels, compact header utilities, 28px product heading. The level selector becomes two rows of five. The wallet dialog becomes a bottom sheet with safe-area padding.
- **359px and below:** smaller counters, wrapped tab text where needed, stacked reward/merge statistics, and fewer secondary lane labels.

`min-width: 0`, flexible text wrapping, and bounded canvases prevent horizontal scrolling. No primary action floats over the page. At 390 × 844 the product heading, section navigation, live race track, and complete Start race button are visible. Rendered reflow was checked at 320, 390, 768, and 1440px; native browser zoom was not separately verified.

## Elevation & depth

The page is predominantly flat. `.surface` uses a single structural border and tonal background; panels do not combine border and shadow. The wheel's dot pattern and track markings are contextual artwork, not extra card layers. The wallet dialog is the one elevated surface: a soft shadow over a dimmed, blurred native backdrop. There is no sticky header or fixed footer covering content.

## Shapes

`--radius` is 16px for large scenes/panels; `--radius-sm` is 8px for controls and smaller grouping surfaces. Compact panels use 12px; the wallet uses 20px, with only its top corners rounded on mobile. Marks and hardware pause controls are circular. Track geometry remains rectangular with a softened player lane. Native checkboxes and ranges retain platform affordances.

## Components

| Component/pattern | Source | Behavior and reuse |
| --- | --- | --- |
| `.button`, `.primary`, `.icon-button`, `.text-button` | `src/styles.css` | Neutral actions, one emphasized primary action, and utility actions. Explicit hover, disabled, active, and 2px offset focus states. Main buttons are at least 44px tall. |
| `LiveBar`, `Metric` | `src/App.tsx` | Six labeled measurements, progress semantics, freshness/retry notices. The shared `wheelState` helper in `src/model.ts` maps API `ACTIVE` to SPINNING, retains IDLE, and names counter faults. Unknown values display an em-dash data marker; stale readings are identified. |
| Hash tab navigation | `src/App.tsx` | Selected underline and accessible tab state; Left/Right/Home/End keyboard support. Section state is local to its mounted panel. The skip link moves focus to main while preserving the selected hash tab. |
| `Derby`, `Wheel` | `src/Derby.tsx`, `src/Wheel.tsx` | Four labeled lanes and physical-RPM Canvas. Starting a race focuses the track so Space sprints. Numeric data supplies a non-motion alternative. Pause/reset/replay, stale-feed, and counter-fault states are explicit. |
| Power calculator | `src/SqueekFi.tsx`, `src/model.ts` | Native labeled ranges, linked outputs, live total weight, pool share, funded-stream estimate, reference/error states. |
| Merge tree | `src/SqueekFi.tsx` | Pressed target-tier buttons, two inputs and one output, cooldown/boost details, next-level action, disabled maximum tier. |
| `HudDisplay`, `Hud`, `Overlay` | `src/Hud.tsx` | Shared actual preview/export renderer. Theme/compact/block props; generated hash URL; clipboard success and manual-copy recovery. Overlay has no app chrome. |
| `Wallet` | `src/wallet.tsx` | Native modal dialog with focus containment, Escape/backdrop/close, focus restoration, named providers and wallet marks. Pending, rejection, connection, disconnect, and wrong-network states. |
| `Icon`, `Hamster` | `src/icons.tsx` | One current-color outline icon set; local decorative hamster SVG variants. Decorative SVGs are hidden from assistive technology. |

Interactive transitions name their properties and last 150ms. Button press scale is 0.96. Decorative racing motion is enabled only without a reduced-motion preference. The hardware animation has a pause control; reduced motion also freezes the wheel representation. Live data polling continues without a playback buffer.

## Do's and don'ts

- Start with the existing shell, heading, and section/grid patterns. Reuse typography and role colors before adding a new token.
- Keep numeric units adjacent to values and instructions beside the action. Say when a value is estimated, stale, simulated, or unavailable.
- Keep wallet configuration in its single module and show provider names rather than a generic “Injected” label.
- Do not invent live telemetry, future rewards, global multiplayer state, or wallet balances.
- Use a border for structure or a shadow for elevation; avoid layering ornamental cards inside panels.
- Preserve the native input, tab, and dialog keyboard behavior. New motion needs a reduced-motion path and a static cue.
- To add another feature view, compose existing `.section-intro`, `.surface`, grid, and button patterns; use a hash tab, labeled native controls, and the current six-step type scale. Recheck phone reflow and update validation evidence.

Implementation reference: final source and production export checked on 2026-10-30.
