# Platform spine

Shared architecture every tier and future capability plugs into. **Do not break these contracts** when shipping Basic.

## Source of truth

| Data | Location | Consumers |
|------|----------|-----------|
| Onboarding profile | `shire_site_plans.onboardingProfile` | Discovery, mention prompts, writer context |
| Confirmed avatars | Site plan `confirmedAvatars` | Content plan, article generation |
| Calendar items | Content plan run output → compat API | Strategy view, writer, future Build book |
| Context cards | Context cards book | Sharpen, `assembleBusinessContext` |

## Calendar item as work unit

Every gap or action should link to or create a calendar row with stable metadata:

- `suggestedKeyword`, `articleType`, `clusterName`
- `contentPlanItemKey` (stable row key for future Build book pages)

## Thinker runs

New capabilities = new `ThinkerKind` + Shire pipeline + compat API (not one-off bagend agents).

| Thinker | Role |
|---------|------|
| `keyword_discovery` | Keyword + avatar candidates |
| `content_plan` | Calendar + strategy intel |
| `mention_tracking` | AI visibility capture + parse |
| `article_generation` | Full article (Advanced/Pro) |

Poll protocol: [shire/docs/RUNNER_STANDARD.md](../../shire/docs/RUNNER_STANDARD.md).

## Content intelligence

GEO gaps, mention blockers, and discovery questions → **context cards** (`geoSignal` where relevant). One remediation UI (Sharpen), not parallel Q&A systems.

## Entitlements

- `planTier` on account gates writer/generate/publish routes
- Paused roadmap features hidden via nav flags, not deleted

## Repos

- **Shire:** thinkers, books, compat APIs (primary for new work)
- **Sting:** `features/protopipe/` UI
- **bagend:** legacy `/api/v2/protopipe/*`; do not add new product features here
