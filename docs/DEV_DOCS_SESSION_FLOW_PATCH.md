# Dev Docs UI patch — session flow at top level

**Status:** `docs/SESSION_DEV_FLOW.md` and `ai_context/active/*` are landed. Apply this patch in **Agent mode** (plan mode blocks `.ts` / `.html`).

## `dev-docs-catalog.ts`

Add after `STINGER_CHECKLIST`:

```typescript
export const SESSION_FLOW_CHECKLIST = [
  '0 Sync — branch + merge main, MONGO_URI → product DB, smoke',
  '1 Plan — today’s slice (contracts / bagend / sting)',
  '2 Build — contracts → bagend models → features/<product>/',
  '3 Tag commits — feat(<product>): vs platform: (never mixed)',
  '4 Merge-to-main prompt — what goes to sting/bagend/contracts main?',
  '5 Platform PRs — cherry-pick platform: commits only for “Yes”',
  '6 Sync — push branches, merge main → product branch, re-smoke',
  '7 Log — one line in ai_context/active/PROTOPYPE.md',
] as const;

const MERGE_TO_MAIN_TEMPLATE = `## Session merge-to-main — YYYY-MM-DD

### Product (stays on protopipe)
- Slice: ___
- sting: features/protopipe/___
- bagend: mongoModels/protopipe/___
- contracts: ___

### Merge to sting main?
| Change | Merge? |
| shared/ui/* | Yes / No / N/A |
| layout/shell/* | Yes / No / N/A |
| patterns (generic fw-*) | Yes / No / N/A |
| core/auth, guards | Yes / No / N/A |
| theme, Sheriff, CI | Yes / No / N/A |

### Rule
Would the NEXT MVP use this unchanged?
Yes → main. No → protopipe branch.

Agent: Run merge-to-main template; recommend Yes/No per repo.`;
```

Insert as **first** item in `DEV_DOCS_CATALOG`:

```typescript
  {
    id: 'session-dev-flow',
    title: 'Each session',
    category: 'start',
    description:
      'Standard flow every time you work on a product branch (e.g. protopipe): sync, build, merge-back to main.',
    paragraphs: [
      'Follow steps 0–7 at the top of this page before and after coding.',
      'Product code stays on the product branch; reusable shell, shared/ui, auth, and patterns merge to main via platform: commits.',
      'End every session with the merge-to-main prompt — use an agent or copy the template below.',
      'Full doc: docs/SESSION_DEV_FLOW.md and ai_context/active/SESSION_DEV_FLOW.md',
    ],
    steps: [
      { title: '0 Sync', body: 'protopipe + merge main; MONGO_URI → /protopipe; npm start smoke test' },
      { title: '1 Plan', body: 'One line: today’s slice + repos (bagend, contracts, sting)' },
      { title: '2 Build', body: 'contracts → bagend mongoModels/protopipe → features/protopipe' },
      { title: '3 Tag commits', body: 'feat(protopipe): vs platform: — never in one commit' },
      { title: '4 Merge-to-main', body: 'Required checklist: what returns to core app main?' },
      { title: '5 Platform PRs', body: 'Cherry-pick platform: to main only; do not merge whole protopipe branch' },
      { title: '6 Sync', body: 'Push; merge main → protopipe; re-smoke product slice' },
      { title: '7 Log', body: 'Append session line to ai_context/active/PROTOPYPE.md' },
    ],
    code: MERGE_TO_MAIN_TEMPLATE,
    keywords: ['session', 'protopipe', 'merge', 'main', 'platform', 'workflow'],
  },
```

## `dev-docs.component.ts`

```typescript
import {
  DEV_DOCS_CATALOG,
  SESSION_FLOW_CHECKLIST,
  STINGER_CHECKLIST,
  // ...
} from './dev-docs-catalog';

readonly sessionFlowChecklist = SESSION_FLOW_CHECKLIST;
readonly stingerChecklist = STINGER_CHECKLIST;
```

## `dev-docs.component.html`

**Rail** — replace single "Stinger checklist" with:

```html
<li>
  <button ... (click)="scrollToBlock('doc-hero')">Each session</button>
</li>
<li>
  <button ... (click)="scrollToBlock('doc-mvp-setup')">First MVP setup</button>
</li>
```

**Hero** — use `sessionFlowChecklist`, title "Each session", lead about merge-to-main, button scroll to `doc-session-dev-flow`.

**Below hero** — add `doc-mvp-setup` article with `stingerChecklist` (old one-time MVP list).

Ask in chat: **apply DEV_DOCS_SESSION_FLOW_PATCH**
