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

## Session log

Append one line per session (step 7):

| Date | Slice | Platform PRs to main |
|------|-------|----------------------|
| 2026-05-20 | Dashboard: destinationweddingpainter.com site card + keyword strategy table (seed data) | — |

## Do not merge to sting `main`

- `features/protopipe/**`
- Protopipe routes/nav copy in sting

## bagend (merge to `main` when ready)

- `mongoModels/protopipe/**`, `services/protopipe/**`, `routes/protopipeRoutes.ts`
- Ship with normal bagend DO deploy — route separation, not a second backend
