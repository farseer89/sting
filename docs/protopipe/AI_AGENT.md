# Protopipe AI agent (Phase A)

Canonical reference for the SEO writing agent. See [FEATURE_STANDARD.md](./FEATURE_STANDARD.md) for API, security, and Angular patterns.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Platform core** | `protopipe_global_knowledge` — rules + playbooks (admin only) |
| **Site knowledge** | `protopipe_site_knowledge` — per-site chunks (admin, agent, user ingest) |
| **Content Helper** | `protopipe_user_content_helper` — voice, examples, references (user) |
| **Agent runs** | `protopipe_agent_runs` — async jobs, audit trail |

LLM: **Claude** via `ANTHROPIC_API_KEY` in bagend only. Fallback keyword templates when key is missing.

## Modes

- **Guided (default):** User triggers idea refresh; human edits and publishes.
- **Autopilot (later):** Scheduled runs — not enabled in Phase A.

## bagend routes

**Owner** (`requireOwner`, site-scoped):

- `GET /api/v2/protopipe/sites/:siteId/article-ideas`
- `POST /api/v2/protopipe/sites/:siteId/agent-runs`
- `GET /api/v2/protopipe/sites/:siteId/agent-runs/:runId`
- `GET|PUT /api/v2/protopipe/sites/:siteId/content-helper`
- `POST /api/v2/protopipe/sites/:siteId/content-helper/ingest`

**Admin** (`PROTOPIPE_PLATFORM_ADMIN_USER_IDS` allowlist):

- `GET|PATCH /api/v2/protopipe/admin/global-knowledge`
- `GET /api/v2/protopipe/admin/sites`
- `GET|PATCH /api/v2/protopipe/admin/sites/:siteId/knowledge`
- `GET /api/v2/protopipe/admin/media-studio/config`
- `POST /api/v2/protopipe/admin/media-studio/generate`

## Sting surfaces

| Route | Component | Facade |
|-------|-----------|--------|
| `/protopipe/settings` | Content Helper | `ProtopipeAgentService` |
| `/protopipe/admin/agent` | Agent Control | `ProtopipeAdminAgentService` |
| `/protopipe/admin/media-studio` | Media Studio | `ProtopipeMediaStudioService` |
| Writing tools (editor) | Article ideas | `ProtopipeAgentService` + `ProtopipeContentService` |

Components do **not** call `ProtopipeApiService` directly.

## Environment (bagend)

```env
ANTHROPIC_API_KEY=sk-ant-…
PROTOPIPE_CLAUDE_MODEL=claude-sonnet-4-20250514
PROTOPIPE_PLATFORM_ADMIN_USER_IDS=<mongo-user-id>,<another-id>
```

## Retrieval (Phase A vs C)

- **Phase A:** Structured load — global rules, site chunks by type/recency, token budget in `SiteContextBuilder`.
- **Phase C:** MongoDB Atlas Vector Search on `protopipe_site_knowledge` when chunk volume grows.

## Related

- [SEO_ARTICLE_TEMPLATE.md](./SEO_ARTICLE_TEMPLATE.md)
- [FEATURE_STANDARD.md](./FEATURE_STANDARD.md)
