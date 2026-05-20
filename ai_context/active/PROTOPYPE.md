# Protopipe (SEO SaaS)

Product prototype on sting branch **`protopipe`**. Platform improvements merge to **`main`** per [SESSION_DEV_FLOW.md](./SESSION_DEV_FLOW.md).

## Scope

- SEO SaaS — sites, audits, reports (TBD)
- UI: `src/app/features/protopipe/`
- API: bagend `mongoModels/protopipe/`, routes under `/api/v2/protopipe/`
- DB: MongoDB database **`protopipe`** (`MONGO_URI=.../protopipe`)
- Standards: [docs/protopipe/FEATURE_STANDARD.md](../../docs/protopipe/FEATURE_STANDARD.md) — **required read for every agent** (enforced via `.cursor/rules/protopipe-standard.mdc`, [AGENTS.md](../../AGENTS.md))
- Deploy: [docs/protopipe/DEPLOY.md](../../docs/protopipe/DEPLOY.md) — bagend push (DO) + **separate Firebase project** (not `stingbase`)

## Session log

Append one line per session (step 7):

| Date | Slice | Platform PRs to main |
|------|-------|----------------------|
| 2026-05-20 | Dashboard: destinationweddingpainter.com site card + keyword strategy table (seed data) | — |

## Do not merge to main

- `features/protopipe/**`
- Protopipe routes/nav copy
- `protopipe_*` collections and product-only contract types
