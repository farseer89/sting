# Site Design System standard

Build Book, Content Writer infographics, and (future) client-sites publish share one **site-scoped design context** resolved in Sting. Materialization turns pattern variants into site-relevant block props — not raw template-ingest defaults.

## Module layout

```text
features/protopipe/site-design/
  site-design.types.ts           # SiteDesignContext, tokens, media library
  site-design-context.util.ts    # resolveSiteDesignContext()
  site-media.util.ts             # collectSiteMediaLibrary(), pickMediaForSlot()
  site-theme.util.ts             # resolveSiteThemeTokens(), CSS vars, infographic palette
  materialize-block-props.util.ts
  site-design-placeholder.util.ts
  site-design-brand.util.ts      # Brand Book palette merge (phase 4)
  site-design-publish.util.ts    # exportSiteThemeForPublish() (phase 6)
  public.ts
```

## SiteDesignContext

Resolved once per site/session (cached via Build Book service computed consumers):

| Field | Purpose |
| ----- | ------- |
| `theme` | Semantic color, typography, layout, shape tokens |
| `media` | Unified library: page in-use → site-wide in-use → uploaded → generated → template stock |
| `voice` | Example copy (CTA labels, eyebrow) for placeholders |
| `identity` | Logo-adjacent assets (site URL, phone) |
| `baselineRenderer` | Page renderer shell (`sparky-site`, `wri-site`, …) |

Inputs: selected template, Media Studio assets, all build-book pages, optional Brand Book palette, optional persisted `siteTheme.colorOverride` on the build book.

## Media priority

When assigning image slots during materialization:

1. Current page in-use URLs (already on blocks)
2. Site-wide in-use URLs (other pages)
3. Media Studio uploads
4. Media Studio generated assets
5. Template stock (from selected template assembly)
6. Themed SVG placeholder (`themedPlaceholderImageUrl`)

**Never steal media** — slot picking uses a `usedUrls` set so the same URL is not assigned to adjacent slots in one materialize pass.

## materializeBlockProps(blockId, ctx)

Single function for:

- Pending-add ghost preview (`buildPendingGhostState`)
- Commit insert (`addPageBlock`)
- Hero/fold layout option previews (`resolveOptionPreviewTarget`)

Responsibilities:

1. Clone variant structural defaults from the block catalog
2. Strip template stock URLs before reassignment
3. Normalize `baselineRenderer` / `labBrand` to the **selected site template**, not the variant source brand
4. Assign media slots via `pickMediaForSlot` + pattern contracts
5. Apply example copy from `ctx.voice` (does not overwrite operator copy on hero layout swap — use `preserveCopy`)

Ghost and commit must call the same entry point (`materializeBlockPropsForInsert`) with the same context for parity.

## CSS tokens (canvas)

`siteThemeTokensToCssVars()` exposes `--bb-accent`, `--bb-surface`, `--bb-background`, etc. on:

- Build page canvas host (`[themeCssVars]`)
- Layout option preview cards (`designContext` input)

Baseline brand CSS files should fall back to `var(--bb-accent, …)` incrementally (Sparky baseline migrated first).

## Consumers

| Consumer | Integration |
| -------- | ----------- |
| Homepage / landing page editor | `resolveSiteDesignContext(pageId, pageKind)` |
| Pattern catalog thumbs | `themedPatternThumbStyle(ctx.theme)` on pattern panel |
| Content Writer infographics | `[siteTheme]` on `InfographicCompositionPreviewComponent` via Build Book context |
| Publish (phase 6) | `exportSiteThemeForPublish(ctx)` → client-sites Astro theme export |

## Persistence (phase 4)

Shire `build-book` document optional field:

```ts
siteTheme?: { colorOverride?: Partial<SiteThemeColorTokens> }
```

Brand Book `infographStyle.palette` merges upstream when present. SEO Strategy / Media Studio feed the media library; Build Book reads, does not duplicate.

## Pattern library (phase 6)

`patternsGroupedFromPatternRegistry()` lists patterns from the pattern catalog with all registered variants when catalog filter is **All patterns**. Template `compatibleTemplateIds` remains an optional filter for **This template** mode only.

## Verification

```bash
npm run validate:build-book
```

Includes `site-design.spec.ts` (media priority, materialize parity, brand palette merge).

### Manual checklist

- Homepage pending-add ghost shows site hero photo, not template stock
- Landing page: same flow with landing-scoped in-use images preferred
- Empty library: palette-themed SVG placeholder
- Commit insert matches ghost media assignments
- Hero layout swap preserves operator copy
- Content Writer infographic preview uses site accent when composition palette is absent
