# Improvement registry

Lessons from real Sting incidents. Agents: **scan this list** when touching the listed areas.

| ID | Date | Area | Title | Severity |
|----|------|------|-------|----------|
| [IMP-001](./IMP-001-app-initializer-factory.md) | 2026-05-19 | Angular bootstrap | APP_INITIALIZER `useFactory` must return a function | **Critical** — blank app |

## Quick rules (from registry)

- **APP_INITIALIZER + `useFactory`:** factory returns `() => Promise`, not `Promise` directly.
- **Private `hive-contracts` on CI:** needs `GH_PAT` on `farseer89/sting`; `GITHUB_TOKEN` cannot clone cross-repo private deps.
- **CSP on Firebase:** report-only still logs violations; align `font-src` / `style-src` with `index.html` before enforcing.
- **Prod vs CI:** green `npm run build` + `deploy:firebase` can succeed while GitHub CI is red — treat separately.

## Add next entry

Copy [TEMPLATE.md](./TEMPLATE.md) → `IMP-00N-short-slug.md`, fill in, add a row above.
