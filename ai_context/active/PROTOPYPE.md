# Protopipe (SEO SaaS)

Product prototype on sting branch **`protopipe`** + dedicated Firebase. Platform improvements merge to sting **`main`** per [SESSION_DEV_FLOW.md](./SESSION_DEV_FLOW.md).

**bagend:** Same repo and DO deploy as FieldWave — Protopipe is **`/api/v2/protopipe/*`** + `protopipe` DB only (no bagend product branch).

## Scope

- SEO SaaS — sites, audits, reports (TBD)
- UI: `src/app/features/protopipe/`
- API: bagend `mongoModels/protopipe/`, routes under `/api/v2/protopipe/`
- DB: MongoDB database **`protopipe`** (`MONGO_URI=.../protopipe`)
- Standards: [docs/protopipe/FEATURE_STANDARD.md](../../docs/protopipe/FEATURE_STANDARD.md) — **required read for every agent** (enforced via `.cursor/rules/protopipe-standard.mdc`, [AGENTS.md](../../AGENTS.md))
- Deploy: [docs/protopipe/DEPLOY.md](../../docs/protopipe/DEPLOY.md) — bagend push (DO) + **separate Firebase project** (not `stingbase`)
- **Product focus:** [PRODUCT_TIERS.md](./PRODUCT_TIERS.md) · [PLATFORM_SPINE.md](./PLATFORM_SPINE.md) · [CAPABILITY_ROADMAP.md](./CAPABILITY_ROADMAP.md)

## Session log

Append one line per session (step 7):

| Date | Slice | Platform PRs to main |
|------|-------|----------------------|
| 2026-05-20 | Dashboard: destinationweddingpainter.com site card + keyword strategy table (seed data) | — |
| 2026-05-29 | Pipeline content writer (immersive editor, brief panel, generate/poll run); deployed hive `b6f4ad4` bagend `dbd90a5` sting `71dcf92` | — |
| 2026-06-09 | CP2 GEO discovery (Gemini gap audit, Sharpen AI search); CP3 agent handoff in [CONTENT_INTELLIGENCE_CP3.md](./CONTENT_INTELLIGENCE_CP3.md) | — |
| 2026-06-15 | Goal 1 PoC: 16 trains + Thinker + writer fixes; ArticlePackage handoff in [TRAINS_ARTICLE_PACKAGE_HANDOFF.md](./TRAINS_ARTICLE_PACKAGE_HANDOFF.md) | — |
| 2026-06-15 | Goal 1 PoC: 16 trains + Thinker + writer fixes; [ArticlePackage handoff](./TRAINS_ARTICLE_PACKAGE_HANDOFF.md) for quality wiring | — |
| 2026-06-23 | Merch book scaffold (run archetype, stub thinker, starter products, home nav `books-merch`) | — |
| 2026-06-23 | Merch book fal.ai logos (Ideogram + BiRefNet) + Printful mockup generation on logo select | — |

## Do not merge to sting `main`

- `features/protopipe/**`
- Protopipe routes/nav copy in sting

## bagend (merge to `main` when ready)

- `mongoModels/protopipe/**`, `services/protopipe/**`, `routes/protopipeRoutes.ts`
- Ship with normal bagend DO deploy — route separation, not a second backend
