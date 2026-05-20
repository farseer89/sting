# Session dev flow

**Use at the start and end of every work session** on a product branch (e.g. `protopipe`). Sting `main` stays the platform; product work stays on the product branch; platform wins merge back via small PRs.

See also [PLATFORM_AND_PROTOPYPE.md](./PLATFORM_AND_PROTOPYPE.md) (when added) for layer taxonomy.

## Quick steps (0–7)

| Step | Action |
|------|--------|
| **0 Sync** | Checkout product branch, merge `main`, confirm `MONGO_URI` → `/protopipe`, smoke app |
| **1 Plan** | One-line goal (today’s slice + repos) |
| **2 Build** | contracts → bagend `mongoModels/<product>/` → sting `features/<product>/` |
| **3 Tag commits** | `feat(<product>):` vs `platform:` — never mixed |
| **4 Merge-to-main** | **Required** — decide what returns to core (template below) |
| **5 Platform PRs** | Cherry-pick / PR to `main` only for “Yes” rows |
| **6 Sync** | Push branches; `merge main` → product branch; re-smoke |
| **7 Log** | Short session note in `ai_context/active/PROTOPYPE.md` |

## Commit prefixes

| Prefix | Target |
|--------|--------|
| `feat(protopipe):` | sting `protopipe` branch only |
| `feat(protopipe):` or `feat(bagend):` | bagend **`main`** — Protopipe routes/models (route separation, not a bagend branch) |
| `feat(contracts):` | hive-contracts **`main`** when shipping with bagend |
| `platform:` | sting **`main`** only |

## Merge-to-main prompt (end of session)

Copy, fill in, and decide **Yes / No / N/A** for each row.

```markdown
## Session merge-to-main — YYYY-MM-DD

### Product (sting branch + bagend routes on main)
- Slice: ___
- sting (protopipe branch): features/protopipe/___
- bagend (main, route module): mongoModels/protopipe/___ , /api/v2/protopipe/___
- contracts: ___

### Merge to sting `main`?
| Change | Merge? | Notes |
|--------|--------|-------|
| shared/ui/* | Yes / No / N/A | |
| layout/shell/* | Yes / No / N/A | |
| src/styles/patterns/* (generic fw-*) | Yes / No / N/A | |
| core/auth, guards, interceptor | Yes / No / N/A | |
| app.config / theme / Sheriff / CI | Yes / No / N/A | |
| dev-ui generic blocks | Yes / No / N/A | |
| docs / ai_context improvements | Yes / No / N/A | |

### Merge to bagend `main`?
| Change | Merge? | Notes |
|--------|--------|-------|
| Auth v2 / session / CORS | Yes / No / N/A | |
| Shared middleware/util | Yes / No / N/A | |
| Product routes/models | **No** | |

### Merge to hive-contracts `main`?
| Change | Merge? | Notes |
|--------|--------|-------|
| Shared auth types | Yes / No / N/A | |
| Product* types | **No** | |

### Rule
> Would the **next MVP** (not this product) use this **unchanged**?
> **Yes** → that repo’s `main`. **No** → product branch.

### If any Yes
- [ ] Platform-only PR(s), `npm run build` on `main`
- [ ] Do **not** merge whole product branch into `main`

### If all No
- [ ] No `main` PR today
```

## Agent prompt

At end of session, paste changed files or diff summary and ask:

> Run the Session merge-to-main template for today. Recommend Yes/No for sting `main`, bagend `main`, and hive-contracts `main`.

## MongoDB (bagend)

- Dev: `MONGO_URI=.../protopipe` (not `fieldwave`)
- Models: `mongoModels/protopipe/`
- Collections: `protopipe_*` prefix
