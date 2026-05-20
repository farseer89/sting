# Protopipe deploy (API + hosting)

**Sting** uses a product branch + separate Firebase. **bagend** stays **one codebase, one deploy** — products are separated by **routes and Mongo database**, not by bagend branches.

## Architecture

| Piece | Isolation | Hosting / runtime |
|-------|-----------|-------------------|
| **bagend** | Route prefix `/api/v2/protopipe/*` + `mongoModels/protopipe/` + DB `protopipe` | Single Digital Ocean app — `https://droppin.shop` |
| **FieldWave (etc.)** | `/api/tenants/:tenantKey/*` + `fieldwave` DB | Same bagend host |
| **Sting UI** | `protopipe` git branch + **dedicated Firebase** (not `stingbase`) | Firebase Hosting |
| **hive-contracts** | `src/protopipe/*` types | Published / `file:../` with bagend & sting |

```text
droppin.shop (one bagend process)
├── /api/v2/auth/*           → shared users
├── /api/v2/protopipe/*      → Protopipe (ownerUserId, protopipe DB)
├── /api/tenants/:key/*      → FieldWave (tenantKey, fieldwave DB)
└── …
```

## 1. Backend — bagend (merge to `main`, push, DO deploy)

Protopipe backend ships on **`main`** with everything else. No separate bagend product branch required.

```bash
cd bagend
git checkout main
git merge protopipe   # or cherry-pick feat(bagend/protopipe) commits
git push origin main
```

Digital Ocean: deploy **`main`** as you normally do (pm2 / pull / CI).

**After deploy**, verify (with a valid JWT):

- `GET https://droppin.shop/api/v2/protopipe/bootstrap` → 200 + account/sites
- `GET https://droppin.shop/api/v2/protopipe/sites/:siteId/plan` → plan + keywords

Without token, bootstrap returns **401** (expected).

**Mongo:** No URI change required if the cluster is the same — Protopipe uses `useDb('protopipe')`. Optional env: `PROTOPIPE_DB_NAME=protopipe`.

## 2. Contracts

Types can land on **`main`** when bagend does, or stay on `protopipe` until sting catches up:

```bash
cd hive-contracts
npm run build
# merge to main when coordinating a bagend deploy
```

## 3. Firebase — new project (Protopipe only)

Platform MVP stays on **`stingbase`**. Protopipe uses its **own** project so `main` vs `protopipe` hosting never collides.

```bash
cd sting
git checkout protopipe

# Project id `protopipe` is often taken globally; use sting-protopipe:
STING_FIREBASE_DISPLAY_NAME="Protopipe" ./scripts/setup-firebase.sh sting-protopipe
```

Wire aliases (optional, in local `.firebaserc` — gitignored):

```json
{
  "projects": {
    "default": "stingbase",
    "sting-protopipe": "sting-protopipe"
  }
}
```

Deploy Protopipe hosting:

```bash
firebase use sting-protopipe
STING_MICRO_URL="https://droppin.shop" npm run configure-env
npm run deploy:firebase
```

**Live URL:** https://sting-protopipe.web.app

## 4. bagend CORS

Origins for the new Firebase site are in `bagend/app.ts` (`protopipe.web.app`, `sting-protopipe.web.app`). Redeploy bagend on DO after merge so login works from the new host.

Add a custom domain later via `CORS_ALLOWED_ORIGINS` if needed.

## 5. Login smoke test

1. Open `https://<your-protopipe-project>.web.app/login`
2. Sign in (user with access to bootstrap seed, e.g. first account)
3. **My Plan** loads keywords from API
4. **Keywords** → edit → **Save** → refresh → persists

## Branch strategy summary

| Repo | Platform | Protopipe product |
|------|----------|-------------------|
| **sting** | `main` + `stingbase` Firebase | `protopipe` branch + **new** Firebase project |
| **bagend** | `main` + one DO deploy | **same** — `/api/v2/protopipe/*` module only |
| **hive-contracts** | `main` | `src/protopipe/*` (merge with bagend) |

Do **not** deploy sting `protopipe` to **stingbase**. bagend does **not** need a second deploy or branch for Protopipe.
