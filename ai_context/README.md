# Sting — AI context

Documentation for AI agents (and humans) working on Sting. Goal: **learn from production mistakes once**, not rediscover them every session.

## Start here

| Doc | Purpose |
|-----|---------|
| **[active/SESSION_DEV_FLOW.md](./active/SESSION_DEV_FLOW.md)** | **Every session** — sync → build → merge-to-main prompt (required at end) |
| [active/PROTOPYPE.md](./active/PROTOPYPE.md) | Protopipe product scope + session log |
| [active/CONTENT_INTELLIGENCE_REMAINS.md](./active/CONTENT_INTELLIGENCE_REMAINS.md) | Content intelligence — shipped vs remaining |
| [active/CONTENT_INTELLIGENCE_CP3.md](./active/CONTENT_INTELLIGENCE_CP3.md) | **CP3 agent handoff** — edit + style learning |
| [active/TRAINS_ARTICLE_PACKAGE_HANDOFF.md](./active/TRAINS_ARTICLE_PACKAGE_HANDOFF.md) | **Trains agent handoff** — wire thinking into writing (ArticlePackage) |
| [active/TRAINS_ARTICLE_PACKAGE_HANDOFF.md](./active/TRAINS_ARTICLE_PACKAGE_HANDOFF.md) | **Trains → ArticlePackage handoff** — wire thinking into outline/draft |
| [active/SECURITY_TODO.md](./active/SECURITY_TODO.md) | **Security roadmap** — shipped vs remaining (checkboxes) |
| [improvements/INDEX.md](./improvements/INDEX.md) | Registry of lessons — **read before auth, CI, or deploy work** |
| [../docs/SESSION_DEV_FLOW.md](../docs/SESSION_DEV_FLOW.md) | Full session checklist + merge template (repo docs) |
| [improvements/TEMPLATE.md](./improvements/TEMPLATE.md) | Copy when adding a new lesson |
| [../docs/SECURITY.md](../docs/SECURITY.md) | Auth v2, tokens, CSP |
| [../docs/LAUNCH_NEW_MVP.md](../docs/LAUNCH_NEW_MVP.md) | Deploy and CORS |

Probe’s full `ai_context` tree lives in [probe/ai_context](https://github.com/farseer89/probe/tree/main/ai_context). Sting keeps a **small, high-signal** set focused on this repo.

## How to maintain

After fixing a non-obvious bug or a bad agent loop:

1. Add an entry under `improvements/` using [TEMPLATE.md](./improvements/TEMPLATE.md).
2. Link it from [improvements/INDEX.md](./improvements/INDEX.md).
3. One sentence in commit or PR: `ai_context: IMP-00N <title>`.

Prefer **concrete wrong/right code** over long prose.
