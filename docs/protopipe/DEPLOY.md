# Protopipe deploy (API + hosting)

Separate from **Sting platform** (`stingbase` Firebase + `main` branch).

## Architecture

| Piece | Branch | Hosting / runtime |
|-------|--------|-------------------|
| **bagend API** | `protopipe` (or merge to DO deploy branch) | Digital Ocean — `https://droppin.shop` |
| **Sting UI** | `protopipe` | **Dedicated Firebase project** (not `stingbase`) |
| **hive-contracts** | `protopipe` | npm package; build before sting deploy |
| **MongoDB** | — | Database name `protopipe` on cluster (`getProtopipeDb()`) |

## 1. Backend — bagend (commit + push)

```bash
cd bagend
git checkout -b protopipe   # or stay on branch you use for DO
git push -u origin protopipe
```

Digital Ocean: deploy from the branch you pushed (merge to `main` first if DO only tracks `main`).

**After deploy**, verify (with a valid JWT):

- `GET https://droppin.shop/api/v2/protopipe/bootstrap` → 200 + account/sites
- `GET https://droppin.shop/api/v2/protopipe/sites/:siteId/plan` → plan + keywords

Without token, bootstrap returns **401** (expected).

**Mongo:** No URI change required if the cluster is the same — Protopipe uses `useDb('protopipe')`. Optional env: `PROTOPIPE_DB_NAME=protopipe`.

## 2. Contracts

```bash
cd hive-contracts
git checkout -b protopipe
npm run build
git push -u origin protopipe
```

## 3. Firebase — new project (Protopipe only)

Platform MVP stays on **`stingbase`**. Protopipe uses its **own** project so `main` vs `protopipe` hosting never collides.

```bash
cd sting
git checkout protopipe

# Create project (interactive; pick id e.g. protopipe or sting-protopipe)
STING_FIREBASE_DISPLAY_NAME="Protopipe" ./scripts/setup-firebase.sh protopipe

# Or manual: firebase projects:create protopipe --display-name "Protopipe"
# firebase use protopipe
```

Wire aliases (optional, in local `.firebaserc` — gitignored):

```json
{
  "projects": {
    "default": "stingbase",
    "protopipe": "protopipe"
  }
}
```

Deploy Protopipe hosting:

```bash
firebase use protopipe
STING_MICRO_URL="https://droppin.shop" npm run configure-env
npm run deploy:firebase
```

**URL:** `https://protopipe.web.app` (or your chosen project id).

## 4. bagend CORS

Origins for the new Firebase site are in `bagend/app.ts` (`protopipe.web.app`, `sting-protopipe.web.app`). Redeploy bagend on DO after merge so login works from the new host.

Add a custom domain later via `CORS_ALLOWED_ORIGINS` if needed.

## 5. Login smoke test

1. Open `https://<your-protopipe-project>.web.app/login`
2. Sign in (user with access to bootstrap seed, e.g. first account)
3. **My Plan** loads keywords from API
4. **Keywords** → edit → **Save** → refresh → persists

## Branch strategy summary

| Repo | Platform (`main`) | Protopipe (`protopipe`) |
|------|-------------------|-------------------------|
| sting | `stingbase` Firebase | **new** Firebase project |
| bagend | shared DO host | `protopipe_*` routes + models |
| hive-contracts | shared package | `src/protopipe/*` types |

Do **not** deploy the whole `protopipe` branch to `stingbase` — use the separate Firebase project above.
