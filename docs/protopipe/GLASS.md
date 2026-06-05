# Glass design language

**Glass** is the UI design language used in the Protopipe void lab (`/protopipe/lab/void`). It is a dense, instrument-panel aesthetic: frosted surfaces, hairline borders, small type, teal accent, and calm motion. The codebase still uses the historical prefix `void` for CSS classes and custom properties — treat **Glass** as the product name and **`void-*`** as the implementation namespace.

**Live reference:** `http://localhost:4200/protopipe/lab/void` (dev-guarded route).

---

## Design intent

Glass should feel like **professional software floating in space**, not a marketing site.

- **Quiet chrome, loud data** — navigation and frames stay subtle; metrics, timelines, and content carry visual weight.
- **Precision over decoration** — 0.5px borders, tabular numbers, uppercase micro-labels, tight spacing.
- **Material honesty** — panels read as thin glass or paper on a backdrop, not flat Material cards.
- **Teal as signal** — ocean teal marks live state, selection, and primary actions; never as large fill blocks.
- **Motion with purpose** — panels fade in; graphs draw in; orbit views rotate. Respect `prefers-reduced-motion`.

Two shipped variants share the same tokens:

| Variant | Trigger | Backdrop | Typical use |
|---------|---------|----------|-------------|
| **Atmospheric** | default `.void` (dark theme mixin) | Ocean / dawn / alpine / twilight gradients | HUD-style lab, glass blur on panels |
| **Void white shell** | `.void--shell` + `data-bg="white"` | Soft gray gradient + snow rail | **futureproof.** product mock — primary direction |

When in doubt for new Protopipe UI mockups, prefer **void white shell**.

---

## Source files (read before extending)

| File | Role |
|------|------|
| `src/app/features/protopipe/lab/void-dashboard/void-theme.scss` | Dark + white token mixins (`void-theme-dark`, `void-theme-white`) |
| `src/app/features/protopipe/lab/void-dashboard/void-dashboard.component.scss` | Shell layout, `.glass` panels, top nav, rail, animations |
| `src/app/features/protopipe/lab/void-dashboard/void-lab-global.scss` | Route-scoped scrollbars + `html.void-lab` body backgrounds |
| `src/app/features/protopipe/lab/void-dashboard/void-premiere-scheduler.component.*` | Calendar monitors, timeline, chips, post-it board |
| `src/app/features/protopipe/lab/void-dashboard/void-content-spoke.component.*` | Hub graph + 3D neural map |
| `src/app/features/protopipe/lab/void-dashboard/void-content-writer.component.*` | Writer, auto-grow fields, fan insert menu |

Global import: `void-lab-global.scss` is pulled from `src/styles.scss` when the lab route mounts.

---

## Color system

### Accent (ocean)

Defined on `:host` in the dashboard shell:

```scss
--void-ocean: #0a9396;           // primary accent (maps to --p-primary-color when set)
--void-ocean-rgb: 10, 147, 150;
--void-ocean-muted: rgba(..., 0.55–0.68);
--void-ocean-line: rgba(..., 0.22–0.34);  // borders, focus rings
--void-ocean-fill: rgba(..., 0.08–0.10); // pill backgrounds
```

Brand wordmark uses **futureproof.** with a teal period dot (`void-topnav__brand-dot`).

### Semantic status colors (content pipeline)

Use consistently across timelines, calendars, stickies, and post-its:

| Status | Color | Usage |
|--------|-------|--------|
| **draft** | `#df9a3c` / amber | In progress, not scheduled |
| **scheduled** | `#5c8fb0` / steel blue | Queued publish date |
| **published** / live | `#2a9d8f` / green-teal | Live on site |
| **ranking** | `--void-ocean` | Keyword already ranking |
| **gap** | `#b44a2a` / coral | Missing coverage |
| **research** | `#8a8f98` | Exploratory |

Cluster / pillar colors in graphs may extend the palette (`#ee9b00`, `#5c6bc0`, `#c45c26`, etc.) but pipeline status colors stay stable.

### Ink hierarchy (white shell)

From `void-theme-white`:

| Token | Role |
|-------|------|
| `--void-ink-strong` | Headings, values, brand |
| `--void-ink-body` | Primary readable text |
| `--void-ink-secondary` | Supporting copy |
| `--void-ink-muted` | Placeholders, hints |
| `--void-ink-label` | Table headers, section labels (often uppercase) |

Never use pure `#000` — shell rail ink is `#0a0a0a` with muted variants at ~42–62% opacity.

---

## Surfaces

### Glass panel (`.glass`)

The canonical content container:

```scss
background: var(--void-glass-bg);      // ~rgba(0,0,0,0.028) on white
border: 0.5px solid var(--void-glass-border);
border-radius: 8px;
backdrop-filter: blur(6px) saturate(110%);  // atmospheric mode only
padding: 0.45rem 0.55rem;
```

Modifiers:

- **`.glass--full`** — flex child filling main stage; wraps feature components (`app-void-premiere-scheduler`, etc.).
- **`.glass--premiere`** — transparent chrome for embedded tools (scheduler owns its own internal borders).

### Tile (nested cells)

Inside monitors, calendars, and stats:

```scss
background: var(--void-tile-bg);
border: 0.5px solid var(--void-tile-border);
border-radius: 4px–6px;
```

### Snow rail (shell sidenav)

```scss
background: #fff;
border-right: 0.5px solid rgba(0, 0, 0, 0.09);
font-family: 'Inter', var(--app-font-family), system-ui, sans-serif;
```

Active nav row: light teal wash + left accent bar. No site title block in rail header — nav groups start immediately under the shell top bar.

---

## Typography

| Context | Size | Weight | Notes |
|---------|------|--------|-------|
| Base / body | `11px` | 400 | `:host` on dashboard |
| Section labels | `8–9px` | 400–600 | `letter-spacing: 0.06–0.08em`, **uppercase** |
| Metric values | `14–16px` | 500–600 | `font-variant-numeric: tabular-nums` |
| Brand | `15px` | 600 | `letter-spacing: -0.02em`, lowercase **futureproof.** |
| Top tabs | `10px` | 500–600 | Folder-tab style in shell |
| Calendar stickies | `7px` | 400 | Single-line ellipsis |
| Post-it body | `10px` | 500 | Slightly larger for scanability |

**Font stack:** Inter for shell chrome; feature components inherit `'Inter', var(--app-font-family), system-ui`.

---

## Layout patterns

### Shell frame

```
┌─ void-topnav (brand | folder tabs | clock/live) ─────────────┐
├─ void-rail ─┬─ void__main ───────────────────────────────────┤
│  nav tree   │  glass panel (feature view)                    │
│             │  hud-nav (window tabs + AI bar)                │
└─────────────┴────────────────────────────────────────────────┘
```

- Top tabs align with **main content column**, not over the rail — brand gets `min-width` matching rail width in shell mode.
- Tab gap is **tight** (`0` between folder tabs); avoid spreading tabs across full width.
- Right cluster (clock, Live badge) uses `margin-left: auto`.

### Monitors (scheduler)

Side-by-side **Content Monitor A / B** above the timeline:

- **Monitor A** — month grid calendar; article **stickies** on publish days (colored by status).
- **Monitor B** — **post-it note board** for keywords (tape strip, slight rotation, left accent border, status pill).

### Chips and toggles

Pill controls (`premiere__chip`, `spoke__viewbtn`, row mode chips):

- Inactive: `--void-tile-bg` + hairline border
- Active: white fill + `--void-ocean-line` border + slightly heavier weight
- Gap between chips: `0.12–0.25rem`, not large button spacing

---

## Motion

| Animation | Where | Behavior |
|-----------|-------|----------|
| `panelIn` | `.void__panel-stack` | 0.5s fade + 4px rise + blur clear |
| Spoke draw-in | Radial graph | Wedges fade → branches stroke-dash → nodes pop (staggered) |
| Neural fade | 3D map | Scale 0.94 → 1 on enter |
| Orbit | Neural map | Slow auto-rotate; drag to orbit; cube sun self-solves |
| Hover | Post-its, nodes | Small translate/scale; never bounce the whole layout |

Always gate decorative motion with `@media (prefers-reduced-motion: reduce)`.

---

## Borders and radius

- **Default border:** `0.5px solid` — never `1px` unless emphasizing active state.
- **Radius scale:** `4px` tiles → `6px` monitors → `8px` glass panels → `12px` outer frame → `999px` pills.
- **Left accent:** `border-left: 2px solid` on nodes, post-its, and list markers (color = status or cluster).

---

## Backgrounds (atmospheric mode)

Selectable via fixed picker (`data-bg` on `.void`):

- `white` — void white shell (product mock)
- `ocean`, `dawn`, `alpine`, `twilight`, `atmosphere` — full-viewport CSS gradients on `.void__backdrop`, with `--void-veil` overlay

Do not add photographic textures; depth comes from gradient + blur + hairlines.

---

## Agent checklist (new Glass UI)

1. **Use tokens** — `var(--void-*)` only; no hardcoded grays unless status semantic colors from the table above.
2. **Stay dense** — prefer 8–11px labels; avoid Bootstrap-sized padding.
3. **Hairlines** — `0.5px` borders; subtle hover shifts border to `--void-ocean-line`.
4. **Numbers** — `font-variant-numeric: tabular-nums` on metrics, dates, volumes, positions.
5. **Status** — reuse draft / scheduled / published / gap / ranking colors; don't invent new status hues.
6. **Components** — wrap feature views in `.glass.glass--full`; use BEM under feature prefix (`premiere__`, `spoke__`, `writer__`).
7. **Shell consistency** — if adding top-level nav, use folder-tab pattern; keep **futureproof.** branding.
8. **No PrimeNG chrome** in lab mockups — Glass is custom SCSS, not p-card skins.
9. **Mock data** — colocate in `*.mock.ts` next to the component; DWP (`destinationweddingpainter.com`) is the reference account.
10. **Route** — lab views live under `void-dashboard/`; register window id in `void-dashboard.mock.ts` + nav in `void-nav.mock.ts`.

---

## Anti-patterns

- Heavy drop shadows on every element (Glass uses light shadows only on elevated notes/cards).
- Large rounded corners (16px+) on data panels.
- Centered hero typography inside tool views.
- Bright saturated fills for large areas — teal is for accents and active states.
- Replacing hairlines with box-shadow-only separation.
- Generic gray `#666` text instead of ink tokens.

---

## Naming note for agents

| Say | Code |
|-----|------|
| Glass / glass design | `void-*` CSS vars, `.glass`, `/protopipe/lab/void` |
| Void white shell | `.void--shell`, `data-bg="white"` |
| Glass panel | `.glass`, `.glass--full` |

When documenting or discussing with users, prefer **Glass**. When searching the repo, also search **`void-dashboard`**, **`void-theme`**, and **`glass`**.

---

## Related docs

- [FEATURE_STANDARD.md](./FEATURE_STANDARD.md) — Protopipe product/API patterns (orthogonal to visual design)
- [UI_PATTERNS.md](../UI_PATTERNS.md) — FieldWave global patterns (equipment list, dashboard card) — **not** Glass; do not mix without explicit intent
