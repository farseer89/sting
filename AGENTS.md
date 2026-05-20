# Sting — agent instructions

## Protopipe (SEO product)

**Sting:** `protopipe` branch + separate Firebase. **bagend:** one codebase — tasks under `mongoModels/protopipe/`, `services/protopipe/`, or `/api/v2/protopipe` merge to **`main`**, not a bagend product branch.

Any task touching Sting `src/app/features/protopipe/` or `docs/protopipe/`:

1. **Read** [docs/protopipe/FEATURE_STANDARD.md](docs/protopipe/FEATURE_STANDARD.md) first.
2. **Read** [ai_context/active/PROTOPYPE.md](ai_context/active/PROTOPYPE.md) for what must not merge to `main`.
3. Follow [.cursor/rules/protopipe-standard.mdc](.cursor/rules/protopipe-standard.mdc) (auto-attached when those files are in scope).

Session workflow: [docs/SESSION_DEV_FLOW.md](docs/SESSION_DEV_FLOW.md).

**Global Cursor:** User rule `~/.cursor/rules/protopipe-global.mdc` applies across workspaces when tasks mention Protopipe.

**PRs:** Use [.github/pull_request_template.md](.github/pull_request_template.md) and check the FEATURE_STANDARD boxes.

## Platform (`main`)

Auth, shell, guards, Sheriff, and shared UI patterns live on `main`. Product-only code stays on `protopipe`.
