# Trains of Thought → ArticlePackage (Agent Handoff)

**Status:** Infra shipped; quality wiring **not started**  
**Last updated:** 2026-06-15  
**Prerequisite:** Goal 1 PoC (16 trains + Thinker steps + writer UX fixes)  
**Approved plan:** `.cursor/plans/cognitive_articlepackage_wiring_e6e0f3d0.plan.md`  
**Design spec:** `bagend/services/protopipe/thoughttrain.md` (`ArticlePackage` model)  
**Sibling docs:** [PROTOPYPE.md](./PROTOPYPE.md)

---

## Agent mission

**Make generated articles reflect Trains of Thought thinking.**

Today: 16 cognitive phases run, synthesis merges 4 fields into the brief, then **`generateOutline` + `draftSections` ignore train outputs** → generic SERP copy, duplicate H2s, no quality gain for extra cost/time.

**Target:** Synthesis produces a full **`CognitiveArticlePackage`** (thesis, opening line, section outline with purpose/keyPoints, avoidAngles). When pack is active, **skip `generateOutline` LLM** and draft from that package. Review checks thesis alignment.

**User decision (locked):** **Cognitive-owned outline** — not hybrid, not inject-only.

---

## Read first (required)

1. `sting/docs/protopipe/FEATURE_STANDARD.md`
2. `bagend/services/protopipe/thoughttrain.md` — `ArticlePackage`, phase graph
3. `.cursor/plans/cognitive_articlepackage_wiring_e6e0f3d0.plan.md`
4. This file end-to-end

**Repos:** bagend (`main`), hive-contracts, sting (`protopipe` branch → Firebase `sting-protopipe`)

**Do not:** Nest/Crow rewrite, new lab scaffolding, Pexels in Train 7 (images stay fal via `generate_images`).

---

## What shipped (Goal 1 PoC — done)

| Area | What | Commit / deploy |
|------|------|-----------------|
| **bagend** | 16 phases in `trains_of_thought/v1` manifest | `fa346d3` on main |
| **bagend** | Brief-only PATCH fix (`updateContentPost`) | `e258105` on main |
| **bagend** | Partial `cognitiveRun` persist during Think (live polls) | `f5dd845` — verify pushed/deployed |
| **sting** | Thinker explodes trains into step rail | `f4df182`+ on protopipe |
| **sting** | Multi-site writer fix (`findPost$`, `editingSiteId`) | `14f2aed` deployed |
| **sting** | Think progress + elapsed timer in writer | `0f2ad16` deployed |
| **sting** | Generate persists `cognitivePackId` on brief before run | `14f2aed` |

**Thinker URL:** `/protopipe/lab/thinker/run/:siteId/:runId` (operator-only)  
**Writer path:** Strategy → Write article, or `/protopipe/content/:postId`  
**Pack id:** `trains_of_thought/v1`

---

## What failed (user-validated)

PoC run produced article like *"Live Painting at Weddings…"* with:

- Generic wedding-gift SERP voice (not DWP-specific positioning)
- **Duplicate H2** (*"What No Photograph Can Give You…"* twice) — intro vs `assembleArticleTemplate` using `sections[0]` as intro while outline H2 repeats
- **~5–15 min Think** + 16 LLM calls with **no prose improvement**
- Root cause: trains → `mergeCognitiveSynthesisIntoBrief` only; outline/draft pipeline unchanged

**Default for production writing until ArticlePackage ships:** cognitive pack **`none`**.

---

## Current architecture (broken link)

```
16 trains → synthesis (4 fields) → mergeCognitiveSynthesisIntoBrief
  → generateOutline (independent LLM) → draftSections → assemble → review
```

Train JSON (`t3_harden`, `t5_novelty_gate`, `t2_unanswered_q`, …) is **not passed** to outline or draft.

Key files:

- `bagend/services/protopipe/cognitive/packManifests.ts`
- `bagend/services/protopipe/cognitive/runCognitivePass.ts`
- `bagend/services/protopipe/cognitive/mergeCognitiveSynthesis.ts`
- `bagend/services/protopipe/article/orchestrator.ts` — `cognitive_pass`, `outline`, `draft`
- `bagend/services/protopipe/article/steps/generateOutline.ts`
- `bagend/services/protopipe/article/steps/draftSections.ts`
- `bagend/services/protopipe/article/steps/assembleArticleTemplate.ts`
- `sting/src/app/features/protopipe/lab/thinker/article-run-to-thought.ts`

---

## Target architecture (implement next)

```
16 trains → synthesis (ArticlePackage) → cognitivePackageToOutline
  → draftSections(cognitiveRun) → assemble (H1/H2 dedupe) → review (thesisAlignment)
```

When `cognitiveRun.synthesis.articlePackage` exists and complete: **do not call** `generateOutline` LLM (−1 call vs today).

---

## Implementation checklist

| ID | Task | Status |
|----|------|--------|
| `contracts-article-package` | Add `CognitiveArticlePackage` to hive-contracts | pending |
| `synthesis-prompt` | SYNTHESIS outputs full package from `priorPhases` | pending |
| `outline-from-package` | `cognitivePackageToOutline` + orchestrator branch | pending |
| `draft-cognitive-context` | Pass package into draft prompts; fix assemble dedupe | pending |
| `review-thesis-gate` | `thesisAlignment` + `differentiation` in review | pending |
| `tests-e2e` | Unit tests + A/B same post pack vs `none` | pending |

**Deploy order:** hive-contracts → bagend (DO/PM2) → sting (Thinker display optional).

---

## Test fixtures

| Item | ID | Notes |
|------|-----|-------|
| DWP site | `6a0e258336bd915fc48ebf6c` | Operator account |
| PoC post | `6a1aa2927c7e8a1ef498b701` | "live wedding painter", draft + brief |
| User primary site (other account) | `6a0f9fd5ff943ee2938ff9e7` | Multi-site — use `findPost$` / `editingSiteId` |

**Fast test path:** Writer → Trains of Thought → Save → Write article → Open in Thinker  
**Control:** Same post, pack `none`, compare outline H2s and voice.

**Success criteria:**

- Outline H2s come from synthesis package (not independent outline LLM)
- Opening uses `openingLine` / thesis thread
- No duplicate H1/H2
- Prose avoids commodity angles in `avoidAngles`
- Review thesis alignment passes (once gate exists)

---

## Known UX / ops notes

- Think step is **long by design** (16 sequential Claude calls); progress UI shows `Think · X/16 phases · elapsed` after sting `0f2ad16` + bagend `f5dd845`.
- `article-poc` lab at `/protopipe/lab/article-poc` — optional; user prefers writer directly.
- Bagend production: `https://droppin.shop`
- Sting protopipe: `https://sting-protopipe.web.app`

---

## Out of scope

- Collapsing 16 trains to fewer phases (after quality proven)
- SERP/embeddings/Pexels inside cognitive pass
- Nest/Crow backend rewrite
- CP3 edit/style learning — separate track
