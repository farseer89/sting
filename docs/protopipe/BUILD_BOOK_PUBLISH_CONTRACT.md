# Build Book publish contract

Source of truth for wiring Build Book blocks and templates to client-sites provision. Read this before adding or editing a selectable block, baseline assembly, or `astroComponent` path.

## One-line rule

**If Build Book can edit it, the published Astro component must render those same flat props — or publish is not done.**

## Publish fidelity tiers

| Tier | Scope | Guarantee |
|------|--------|-----------|
| **A — Brand baseline** | `baseline-*` folds via `*PublishedHome` | Dedicated Astro + brand CSS; pixel-intent parity |
| **B — Theme library** | `universal-*` / theme aliases via `LandingSectionBody` | Content + named `variant` must match the catalog label |
| **C — Experimental** | Not selectable for publish until promoted to B | Do not ship lying layout labels |

Tier B blocks must emit `variant` from [`adaptPublishProps`](../../src/app/features/protopipe/build-book/build-book-publish-compiler.util.ts). Theme components prefer `props.variant`, then fall back to `componentId`.

## Valid publish targets

Every user-selectable catalog block must have **one** of:

1. `astroComponent` pointing at a **prop-aware** Astro file (accepts `Astro.props` for the catalog’s `editableFields` / `defaultProps`), or
2. `componentId` present in client-sites [`LANDING_COMPONENT_MAP`](../../../client-sites/packages/theme/src/landing/componentMap.js) (and in Sting’s publish-gate allowlist).

## Invalid publish targets

- Lab shells that only import `*-content.ts` / hardcoded demo copy
- Full-page mockup shells (e.g. `WriSite.astro`) used as a section
- Bare names or demo-only paths (`FaqAccordion`, `consult-demo/projects-intro`) that provision cannot resolve
- Gate-only `componentId`s with no map entry (renders `<!-- unknown component -->`)
- Catalog labels that promise a layout (`cards`, `masonry`, `split`, `two-col`) without a matching theme `variant`

Hardcoded content modules may remain as **fallbacks** when props are omitted — never as the only source of truth.

## Brand baselines (Sparky / WRI / Veil / HIL)

When the brand needs its own CSS shell and header/footer:

1. Prop-ify fold/hero components (flat props + content fallbacks).
2. Add `*PublishedHome.astro` that switches on `componentId` and passes section props.
3. Register `sourceTemplateId` in `BASELINE_TEMPLATE_INDEX_BUILDERS` in [`provision-from-template.mjs`](../../../client-sites/scripts/provision-from-template.mjs).
4. Ensure `TEMPLATE_COMPONENT_DIRS` copies the brand folder.
5. Unknown / universal `componentId`s in the switch `default` must render via `LandingSectionBody` (never an empty gap).

Reference: WRI — `WriPublishedHome.astro` + `buildWriBaselineIndexAstro`.

## Generic / Wilco provision

Non-baseline `sourceTemplateId`s must generate `index.astro` as a **sections loop through `LandingSectionBody`** (same as brand fallback). Do not statically tag theme components with props only — that drops `componentId` / `variant`.

## Universal / SaaS / theme slots

Prefer mapping to existing theme landing components and an explicit `variant`. Add a new theme Astro file only when aliasing would lose a layout the editor promises. Keep the publish gate allowlist in sync with `LANDING_COMPONENT_MAP`.

Compiler adapters must remap editor shapes to theme props (e.g. `gallery` → `images` + `caption`, logos `image`/`name` → `src`/`alt`, before-after `subhead` → `lede`). Section intros and case studies use dedicated `SectionIntro` / `CaseStudy` theme components — do not alias them to `PageIntro`, `ContentSplit`, `ConsultServiceSplit`, or `SaasCustomerMetrics`.

## Checklist before merge

1. Catalog entry has `astroComponent` or allowlisted `componentId`.
2. Target Astro accepts the flat props Build Book edits (or a compiler adapter remaps them).
3. Aliased families: `variant` emitted and honored in theme markup/CSS.
4. Brand baseline: PublishedHome + index builder updated if needed; generic path uses `LandingSectionBody`.
5. Local smoke: provision → `astro build` succeeds.
6. Live (or preview) HTML shows an **edited** string from Build Book **and** the expected layout class for at least one variant pair (e.g. `stats-bar--cards`, `faq-two-col`).

## CI

- `build-book-publish-contract.spec.ts` — every assembly + universal catalog block is publish-resolvable.
- `build-book-publish-compiler.util.spec.ts` — `adaptPublishProps` emits expected `variant` and critical remaps.

Do not disable these to land a block.
