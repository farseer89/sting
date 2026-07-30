# Product tiers

What we sell and what each tier includes. New work must tag PRs as **basic-surface**, **advanced-surface**, or **roadmap-paused**.

## Basic — AI Visibility + Plan

**Pitch:** See where AI mentions you (or doesn't), get a prioritized content plan to fix it.

| Included | Notes |
|----------|-------|
| Discovery book onboarding | Services, competitors, market, avatars |
| Keyword discovery + confirm | Feeds content plan; complexity hidden after first run |
| **AI Mentions book** | Gemini v1; prompt types split (generic / local / comparison / brand defense) |
| Content calendar | From content plan; editorial titles, rationale, priority |
| Brief export | Copy/export per calendar item (optional v1.1) |

**Excluded:** Writer, article auto-generate, Build book, publish, Prospector.

## Advanced — Write with AI

Everything in Basic, plus:

| Included | Notes |
|----------|-------|
| Writer assistant | Open calendar item → draft in writer |
| Sharpen lite | Answer geo/mention gap context cards |

## Pro — Done for you

Everything in Advanced, plus:

| Included | Notes |
|----------|-------|
| One-click / batch article generation | Existing `article_generation` pipeline |
| Optional human QA tier | Future |

## Upgrade triggers

- Basic → Advanced: "Write this" on a calendar row
- Advanced → Pro: "Generate for me" / batch

## Pricing (TBD)

Stripe `planTier`: `basic` | `advanced` | `pro` on account (Shire billing).
