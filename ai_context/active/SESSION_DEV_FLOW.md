# Session dev flow — agents read this first

**Every Sting work session** on a product branch (e.g. `protopipe`) follows the same steps. Human-facing copy: [docs/SESSION_DEV_FLOW.md](../../docs/SESSION_DEV_FLOW.md). In-app: **Dev Docs** hero + “Each session” entry (`/dev/docs`).

## Before coding

1. Product branch is up to date with `main` (sting, bagend, contracts as needed).
2. `MONGO_URI` database is the **product DB** (e.g. `protopipe`), not `fieldwave`.
3. One-line plan: today’s slice + which repos.

## While coding

- **Product:** `features/<product>/`, `mongoModels/<product>/`, product contract types → stay on product branch.
- **Platform:** `core/`, `layout/`, `shared/ui/`, generic patterns → commit as `platform:` for merge to `main`.
- **Never** one commit mixing `feat(<product>)` and `platform:`.

## End of session (required)

Run the **merge-to-main prompt** in [docs/SESSION_DEV_FLOW.md](../../docs/SESSION_DEV_FLOW.md).

**Decision rule:** Would the **next MVP** use this **unchanged**? Yes → PR to that repo’s `main`. No → stay on product branch.

Do **not** merge the whole product branch into sting `main`.

## Agent end-of-session prompt

```
Run the Session merge-to-main template for today.
List each platform candidate; recommend Yes/No for sting main, bagend main, hive-contracts main.
```

## Related

| Doc | Purpose |
|-----|---------|
| [PROTOPYPE.md](./PROTOPYPE.md) | Product scope + session log (on `protopipe` branch) |
| [improvements/INDEX.md](../improvements/INDEX.md) | Lessons before auth/CI/deploy |
| [SECURITY_TODO.md](./SECURITY_TODO.md) | Security roadmap |
