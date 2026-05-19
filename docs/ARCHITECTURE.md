# Sting architecture

## Layers (Sheriff)

| Tag | Folder | May import |
|-----|--------|------------|
| `type:util` | `src/app/core/` | npm packages only |
| `type:shell` | `src/app/layout/` | `core` |
| `type:feature` | `src/app/features/*` | `core`, `shared/ui` |
| `type:ui` | `src/app/shared/ui/` | `core` |

Features must not import other features. Use lazy routes instead.

Run `npm run lint` to enforce boundaries. Config: `sheriff.config.ts`.

## Hive contracts

API shapes live in `@hive/contracts` ([hive-contracts](../hive-contracts)). Sting auth uses `SignInResponse` and `StoredUserSession`.

## Templates

Copy `src/app/features/_templates/dashboard-kpi/` when you need a KPI dashboard instead of alpha-home.
