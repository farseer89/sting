# Protopipe feature standard (Sting + bagend)

Canonical patterns for **human actions** and **future agent actions** in the SEO product. New Protopipe work should match this doc before merge.

**bagend:** One deployed codebase on Digital Ocean. Protopipe is isolated by **`/api/v2/protopipe/*`**, **`mongoModels/protopipe/`**, and the **`protopipe`** Mongo database — not by a separate bagend branch or host. FieldWave uses `/api/tenants/:tenantKey/*` and must not mix with Protopipe handlers.

## How agents are required to read this

| Layer | What it does |
|-------|----------------|
| **Cursor rule** | `.cursor/rules/protopipe-standard.mdc` attaches when `features/protopipe/**` or `docs/protopipe/**` are in scope (Sting); sibling rules in **bagend** and **hive-contracts** for backend/contracts |
| **AGENTS.md** | Repo entry point tells Cursor to open this file first for Protopipe tasks |
| **PROTOPYPE.md** | `ai_context/active/PROTOPYPE.md` links here at top of product scope |
| **Session flow** | Step 2 “Build” assumes FEATURE_STANDARD compliance ([SESSION_DEV_FLOW.md](../SESSION_DEV_FLOW.md)) |
| **PR template** | [.github/pull_request_template.md](../../.github/pull_request_template.md) — Protopipe checklist on every PR |
| **User Cursor rule** | `~/.cursor/rules/protopipe-global.mdc` (`alwaysApply: true`, conditional on Protopipe tasks) |
| **CI** | Tests + Sheriff (`architect:graph`) catch architecture drift — not a substitute for reading this doc |

**No layer is 100% automatic.** If you start a Protopipe task without the rule attached, open this file manually before writing code.

## API surface

| Rule | Detail |
|------|--------|
| Version prefix | All routes under `/api/v2/protopipe/` |
| Contracts | Paths and DTOs in `@hive/contracts` (`ProtopipeEndpoints`, `protopipe/types`, `protopipe/requests`) |
| Contract changes | Breaking DTO changes require hive-contracts update + coordinated bagend/Sting deploy |
| Auth | JWT Bearer via global `authInterceptor`; bagend `requireAuthByDefault` + `getCurrentUserId(req)` |
| No cookie auth on Protopipe | `withCredentials` only on `/api/v2/auth/*` — never on protopipe routes (CSRF surface) |
| Tenancy | Scope by `ownerUserId` → `protopipe_accounts`; never accept `accountId` from client body |
| IDOR | Every `:siteId` query includes `{ accountId: account._id }`; cross-account → **404** (not 403) |
| URLs | Absolute URLs from `MICRO_BASE_URL` + path; encode params; never protocol-relative `//` |
| Errors | Generic `500` message; no stack traces; validation → `400` with short `message` |
| Concurrency (Phase B+) | Human Save may send `expectedSummaryVersion`; stale → **409** + reload UI |
| Agent idempotency (Phase B+) | `POST agent-runs` accepts `Idempotency-Key` — retries must not double-run paid jobs |

## bagend layout

```
mongoModels/protopipe/     # Mongoose schemas (use getProtopipeDb())
services/protopipe/        # Business logic, validation, transactions
routes/protopipeRoutes.ts  # Thin handlers; requireOwner() on every route
```

### Human Save (`PUT .../keywords`)

- Full-list sync in a **Mongo transaction**
- Validate: array max 200, enum intent/priority, phrase length ≤ 200, notes ≤ 2000, no duplicate phrases
- Sanitize text: strip control characters (`sanitizeTextField`)
- Never trust client `accountId` / `ownerUserId`
- Per-route body size limit (stricter than global 50MB) when middleware allows

### Human vs agent writes

| Data | Human | Agent |
|------|-------|-------|
| Keyword list (phrase, intent, priority, notes) | `PUT keywords` full sync | Patch rows; suggest `source: 'agent'` — no silent delete of `source: 'user'` |
| Plan summary | PATCH summary (later) | Update `protopipe_site_plans`; human can overwrite |
| Market metrics | Read-only in UI | Append `protopipe_keyword_metrics` only |
| Published content (Phase D) | Approve → publish | Draft only until human approval |

### Future agent actions

| Rule | Detail |
|------|--------|
| Entry | `POST /api/v2/protopipe/sites/:siteId/agent-runs` with `{ type }` |
| Audit | `protopipe_agent_runs` document per job |
| Writes | Agents patch rows in `protopipe_keywords` / metrics collections — **not** full human Save unless specified |
| Secrets | DataForSEO, GSC, LLM keys **bagend env only** — never Sting |
| Cost | Log external API spend (`protopipe_dataforseo_tasks`) |
| HTTP | Enqueue and return `runId`; workers run off-request (no 30s blocking digest) |
| Logging | Prod logs: `runId`, `siteId`, `type`, `cost` — not full prompts or keyword lists |

### Future publish / client-sites (Phase D)

- Agent-generated Markdown is **draft** until human approval
- No raw HTML in blog content; sanitize frontmatter
- Publish only via audited `protopipe_publish_runs` → GitHub/CI — never direct Sting → production

## Sting layout (Angular 21)

```
features/protopipe/
  protopipe-api.service.ts      # HttpClient only; no UI state
  protopipe-strategy.service.ts # Facade: load, dirty, save, domain signals
  protopipe-http.util.ts        # protopipeApiUrl(), parseProtopipeApiError()
  protopipe.constants.ts        # Mirror server limits (UX only)
  protopipe.models.ts           # Re-export @hive/contracts
  guards/                       # Route guards (unsaved changes)
  <area>/                         # Smart components (dashboard, keywords, …)
```

**Injection rule:** Components inject `ProtopipeStrategyService` only — never `ProtopipeApiService` (keeps agent UI and human UI on the same boundary).

### Angular conventions

| Practice | Requirement |
|----------|-------------|
| Standalone | All components `standalone: true` |
| DI | `inject()` in services/components; avoid constructor DI |
| State | `signal` / `computed` / `asReadonly()` in services; components read signals |
| Zoneless-safe | Mutations only through signals — no object mutation expecting Zone to detect changes |
| Change detection | `ChangeDetectionStrategy.OnPush` on feature components |
| Templates | Control flow `@if` / `@for`; avoid `*ngIf` / `*ngFor` in new code |
| Lists | `@for (item of items(); track item.id)` — required for editable tables |
| Presentational children | New shared child components use `input()` / `output()` (not `@Input` / `@Output`) |
| HTTP | Dedicated `*ApiService`; URLs via `protopipeApiUrl()` + encoded params |
| Errors | `parseProtopipeApiError()` — map `HttpErrorResponse` + `ApiErrorBody`; no raw HTTP text to users |
| Auth | No tokens in `localStorage`; rely on `AuthService` + interceptor |
| Persistence | **Explicit Save** — local edits set `dirty`; no auto-save on keystroke |
| Temp IDs | New rows use `temp-${crypto.randomUUID()}` until server assigns Mongo `id` |
| Routing | Feature routes under `authGuard`; unsaved guard on edit surfaces |
| Multi-site | `siteId` from bootstrap only — no hardcoded hostnames or product strings in services |
| Sheriff | Feature imports only `type:ui`, `type:util`, `root` — CI runs `npm run architect:graph` |
| Observables | If used: `takeUntilDestroyed()` — no bare subscriptions in components |

### Forms: ngModel now, Signal Forms later

**Current (Phase A–C):** Template-driven **`ngModel`** on edit surfaces (e.g. Keywords table) is **allowed and standard** until Signal Forms graduate from experimental.

**Why wait:** Angular Signal Forms (`form()`, schema validators) are still stabilizing in v21. Protopipe prioritizes explicit Save, server validation, and facade signals — ngModel + strategy `dirty` is sufficient and well understood.

**Rules while on ngModel:**

- Validation mirrors server limits (`protopipe.constants.ts` + `maxlength` in template)
- All mutations go through `ProtopipeStrategyService` (add/update/remove) — not two-way binding straight to persisted state
- Do **not** add new `FormGroup` / reactive forms modules for Protopipe unless a screen truly needs them

#### Signal Forms migration plan

Migrate edit surfaces when **all** of the following are true:

| Gate | Target |
|------|--------|
| Angular | Signal Forms marked **stable** in Angular release notes (not experimental) |
| Sting | Pin Angular version that includes stable Signal Forms; one pilot PR |
| Pilot | Keywords page migrated and shipped without regressions on Save/dirty/unsaved guard |
| Docs | This section updated to “Signal Forms required for new edit UIs” |

**Migration order (when gates pass):**

1. **Keywords** (`protopipe-keywords`) — inline row editors + add row
2. **Plan summary** editor (My Plan) — when human PATCH summary ships
3. **Clusters** editor (Phase C) — build new UI on Signal Forms only (skip ngModel)
4. **Content / agent review** (Phase D) — post drafts, approval forms

**Per-surface checklist:**

- [ ] `form()` model with typed fields from `@hive/contracts`
- [ ] Validators match bagend `limits.ts` (phrase, notes, enums)
- [ ] `dirty` derived from form dirty state or snapshot diff — still explicit Save
- [ ] `protopipeUnsavedGuard` wired to form dirty signal
- [ ] Remove `FormsModule` / `ngModel` from that component’s imports
- [ ] Vitest tests for invalid submit + successful Save

**Until migration:** Do not start new Protopipe edit UIs on Signal Forms experimental APIs.

### Data loading (reads)

| Phase | Pattern |
|-------|---------|
| **Now (Phase A)** | `ProtopipeApiService` + `async`/`firstValueFrom`; facade sets loading/error signals |
| **Target (Phase B+)** | `httpResource()` for GETs (`bootstrap`, `plan`, `agent-runs/latest`) with `reload()` |
| **Writes** | Imperative `saveKeywords()` / `enqueueAgentRun()` — not `httpResource` POST |

When adopting `httpResource`: URL params as signals (`siteId()`), expose `isLoading` / `error` to templates, call `reload()` after Save — do not duplicate fetch logic in components.

### Unsaved changes guard

**Now:** `window.confirm` in `protopipeUnsavedGuard` is acceptable.

**Target:** `CanDeactivateFn` returning `Observable<boolean>` from a shared dialog service (accessible, testable) — migrate when shell has a confirm dialog pattern for routes.

## Testing (Vitest)

| Layer | Minimum |
|-------|---------|
| `protopipe-http.util` | `parseProtopipeApiError` cases (400, 401, 404, body.message) |
| `ProtopipeStrategyService` | load, dirty, save payload omits `temp-*` ids |
| Guards | unsaved blocks when `dirty()` true |
| Components | Save disabled when not dirty; error alert when `error()` set |

Mock HTTP at `HttpClientTestingModule` — do not call real bagend in unit tests.

## Security checklist (PR)

**Frontend**

- [ ] No secrets or API keys in Sting
- [ ] No `innerHTML` / `bypassSecurityTrust*` with user keyword/plan text
- [ ] `authGuard` on routes; unsaved guard on editors
- [ ] Client clamps match `protopipe.constants.ts` (server is source of truth)
- [ ] Components use facade only (not ApiService)
- [ ] No keyword/plan text in `console.log` in production paths

**Backend**

- [ ] `requireOwner` on every handler
- [ ] `siteId` validated as ObjectId
- [ ] Input length and enum validation
- [ ] Transaction for multi-document human Save
- [ ] Agent routes enqueue work; long jobs off HTTP thread (Phase B+)

**Agent PRs (additional)**

- [ ] Idempotency key documented and enforced
- [ ] External API cost logged
- [ ] No auto-publish without approval gate

## Definition of Done (new endpoint)

1. `@hive/contracts` types + `ProtopipeEndpoints` path
2. bagend route + service + validation
3. `ProtopipeApiService` method
4. Facade method(s) + signals for UI state
5. OnPush UI or headless-only agent path
6. Tests per table above
7. This checklist section satisfied

## Related docs

- [SEO_ARTICLE_TEMPLATE.md](./SEO_ARTICLE_TEMPLATE.md) — structured article fields, validation rules (FAQ block deferred)
- [SECURITY.md](../SECURITY.md) — Sting threat model
- [PROTOPYPE.md](../../ai_context/active/PROTOPYPE.md) — product context
- bagend `.cursor/rules/security/` — global API security
