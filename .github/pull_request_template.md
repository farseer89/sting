## Summary

<!-- What changed and why (1–3 sentences). -->

## Scope

- [ ] **Platform** (merge to `main`) — auth, shell, Sheriff, shared UI, session flow
- [ ] **Protopipe product** — sting `protopipe` branch + Firebase; bagend `protopipe_*` routes on **main** (same DO deploy)

## Protopipe — FEATURE_STANDARD (required if product scope checked)

I read [docs/protopipe/FEATURE_STANDARD.md](docs/protopipe/FEATURE_STANDARD.md) and confirm:

**Frontend (Sting)**

- [ ] No secrets or API keys in Sting
- [ ] No `innerHTML` / `bypassSecurityTrust*` with user keyword/plan text
- [ ] `authGuard` on routes; unsaved guard on edit surfaces
- [ ] Client limits match `protopipe.constants.ts` (server is source of truth)
- [ ] Components use `ProtopipeStrategyService` facade only (not `ProtopipeApiService`)
- [ ] OnPush + signals; `@for` uses `track`
- [ ] Explicit Save / dirty — no keystroke auto-sync to API
- [ ] API paths use `/api/v2/protopipe/*` via `@hive/contracts`

**Backend (bagend, if this PR touches API)**

- [ ] `requireOwner` / JWT scoping on every new handler
- [ ] `siteId` validated; queries scoped by `accountId` (cross-tenant → 404)
- [ ] Input validation + `limits.ts` / transaction on human Save
- [ ] Agent routes enqueue work (no long blocking HTTP) — Phase B+ as applicable

**Agent / automation (if applicable)**

- [ ] Idempotency for `agent-runs` (or documented deferral)
- [ ] External API cost logged; no auto-publish without approval

## Test plan

- [ ] `npm run build` (sting)
- [ ] `npm run build` (bagend / hive-contracts if touched)
- [ ] Manual: login → Protopipe → load plan → edit keywords → Save

## Platform merge-back

If this PR includes platform commits for `main`, list them separately (do not merge whole `protopipe` branch to `main`):

- 
