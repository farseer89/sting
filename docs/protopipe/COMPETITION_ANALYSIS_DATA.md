# Competition Analysis — Data Dictionary

What the `analyse_competition` pipeline step gathers on each competitor page.

- **Step:** `analyse_competition` (runs right after `infer_type`)
- **Iteration 1 scope:** profiles the **#1 organic SERP result** that is not your own site. Top‑N scanning + consensus playbook come later.
- **Artifact:** `ArticleGenerationCompetitionAnalysis`, with one `ArticleGenerationPageProfile` per scanned page.
- **Schema version:** `featureSchemaVersion = 1` (stamped on every profile for ML readiness).

Every field is one of three **origins**:

| Origin | Meaning | Cost |
| --- | --- | --- |
| `deterministic` | Parsed straight from the page HTML / SERP snapshot (cheerio). | Free |
| `llm` | One Claude pass interpreting the page (`claude-sonnet-4-6`). | ~$0.01–0.02 / page |
| `lens` | Off‑page data slot reserved for a later enrichment lens. | Not loaded yet |

---

## 1. Analysis envelope — `ArticleGenerationCompetitionAnalysis`

Context wrapping the per‑page profiles.

| Field | Type | Description |
| --- | --- | --- |
| `keyword.id` / `keyword.phrase` | string | The target keyword being analysed. |
| `articleType` | enum | Intended type for the article we'll write: `local_service`, `faq`, `pillar`, `comparison`, `howto`, `project_case_study`. |
| `serpGeo.locationCode` / `serpGeo.locationName` | number / string | Geo the SERP was pulled for (from site default, else US fallback). |
| `featureSchemaVersion` | number | Profile schema version (`1`). |
| `analyzedAt` | ISO string | When the scan ran. |
| `scannedCount` | number | Pages profiled this run (`1` today). |
| `pages[]` | PageProfile[] | The profiles — see below. |
| `sources.serp` | enum | Where the SERP came from (`cache` / `stub` / `live`). |
| `sources.pageScan` | enum | Page fetch source (`live` / `stub`). |
| `notes` | string? | Set when nothing was scannable (e.g. no SERP snapshot cached yet). |

---

## 2. Page profile — `ArticleGenerationPageProfile`

The canonical, unified feature vector for **any** page — a competitor today, one of our own published articles tomorrow.

### Identity & fetch provenance — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Page URL from the SERP. |
| `finalUrl` | string? | URL after redirects. |
| `domain` | string | Hostname. |
| `serpPosition` | number\|null | SERP rank — the training label we learn against. |
| `source` | enum | `competitor` / `internal`. |
| `featureSchemaVersion` | number | `1`. |
| `fetchStatus` | enum | `ok` / `blocked` / `error`. A `blocked` fetch is itself a signal (strong bot protection ≈ strong authority). |
| `httpStatus` | number? | HTTP response code. |
| `fetchedAt` | ISO string | Fetch timestamp. |
| `error` | string? | Failure detail when not `ok`. |

### A. Targeting — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `titleTag` / `titleLength` | string / number | `<title>` text and length. |
| `metaDescription` / `metaDescriptionLength` | string / number | Meta (or OG) description and length. |
| `h1` | string? | First H1. |
| `slug` | string? | URL slug. |
| `keywordInTitle` | bool | Target keyword present in the title. |
| `keywordInH1` | bool | …in the H1. |
| `keywordInFirst100Words` | bool | …in the opening 100 words. |
| `keywordInSlug` | bool | …in the URL slug. |

### B. Depth & structure — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `wordCount` | number | Body word count. |
| `headingOutline[]` | {level, text} | Full H1–H3 outline in document order. |
| `h2Count` / `h3Count` | number | Section / subsection counts. |
| `listCount` / `tableCount` | number | `<ul>/<ol>` and `<table>` counts. |
| `hasFaqSection` | bool | FAQ section detected. |
| `hasTableOfContents` | bool | ToC detected. |
| `hasKeyTakeaways` | bool | "Key takeaways" block detected. |

### B2. On‑page keyword & entity coverage — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `keywordCount` | number | Target‑phrase occurrences in body text. |
| `keywordDensity` | number | Occurrences as a **percentage** of total words. |
| `keywordInHeadingsCount` | number | Headings containing the target keyword. |
| `entityCoverage[]` | array | Demand terms checked against the page — see below. |

**`entityCoverage[]` item:**

| Field | Type | Description |
| --- | --- | --- |
| `term` | string | The demand term. |
| `source` | enum | `paa` (People Also Ask), `related` (related search), or `gap`. |
| `present` | bool | Whether the page covers it. |
| `count` | number | Occurrences when present. |

> Built from the cached SERP snapshot's PAA questions + related searches (capped at 12 terms). Gives a "demand coverage X / N" matrix per page.

### C. E‑E‑A‑T & freshness — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `authorName` | string? | Detected byline. |
| `hasAuthorBio` | bool | Author bio block present. |
| `publishedDate` / `modifiedDate` | string? | Dates from metadata/schema. |
| `externalCitationCount` | number | Outbound citations. |
| `notableCitationDomains[]` | string[] | Domains the page cites. |
| `schemaTypes[]` | string[] | JSON‑LD / schema.org types found (e.g. `FAQPage`, `Article`). |

### D. Media — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `imageCount` | number | Images on page. |
| `imagesWithAltCount` | number | Images with alt text. |
| `videoCount` | number | Embedded videos. |

### E. Linking — `deterministic`

| Field | Type | Description |
| --- | --- | --- |
| `internalLinkCount` | number | Same‑domain links. |
| `externalLinkCount` | number | Off‑domain links. |

### F. Interpretation — `llm`

| Field | Type | Description |
| --- | --- | --- |
| `detectedFormat` | string | Page archetype: `guide` / `listicle` / `comparison` / `how_to` / `service` / `faq` / `review` / `other`. |
| `featuredSnippetReadiness` | string | One line on snippet fit. |
| `rankingRationale` | string | 2–4 sentences on **why it ranks** where it does. |
| `recommendedAngle` | string | One‑line **wedge** to beat this page. |
| `dominantIntent` | string | Primary search intent the page serves. |
| `intentGaps[]` | string[] | Sub‑intents the page leaves unmet. |
| `contentAngles[]` | string[] | Distinct angles/sections the page leans on. |
| `uniqueCoverage[]` | string[] | Things this page covers that rivals likely won't. |
| `eeatSignals[]` | string[] | Concrete experience/expertise/authority/trust signals. |
| `weaknesses[]` | string[] | Gaps / weak spots we could beat. |
| `topicsCovered[]` | {topic, treatment} | Inventory of topics addressed; `treatment` = `in_depth` or `mention`. |
| `topicGaps[]` | {topic, whyItMatters} | Topics searchers want that the page **misses** — our openings. |
| `articleIdeas[]` | array | Spin‑off ideas for the content plan — see below. |
| `openObservations[]` | string[] | Free‑text insights no fixed metric captured. |
| `surprises[]` | string[] | Things that defied expectations given the rank (hypothesis seeds). |

**`articleIdeas[]` item** (shape mirrors the Keyword model so an idea can later be promoted into the content queue):

| Field | Type | Description |
| --- | --- | --- |
| `workingTitle` | string | Proposed article title. |
| `suggestedKeyword` | string | Keyword to target. |
| `intent` | enum | `informational` / `commercial` / `transactional`. |
| `articleType` | enum | `local_service` / `faq` / `pillar` / `comparison` / `howto` / `project_case_study`. |
| `priority` | enum | `high` / `medium` / `low`. |
| `relationToTarget` | enum | `subtopic` / `gap` / `comparison` / `deeper_dive`. |
| `rationale` | string | Why it strengthens topical authority around the target keyword. |

> Currently **display‑only** on the scan card — another input source for the monthly attack plan. Promote‑to‑queue is a deferred follow‑up.

### G. Off‑page authority — `lens` (not loaded yet)

| Field | Type | Description |
| --- | --- | --- |
| `authority.state` | enum | `loaded` / `not_loaded` (currently `not_loaded`). |
| `authority.source` | string? | Where the data will come from. |
| `authority.domainRating` | number? | Reserved (e.g. Ahrefs DR). |
| `authority.referringDomains` | number? | Reserved. |
| `authority.estimatedMonthlyTraffic` | number? | Reserved. |

### Provenance / cost

| Field | Type | Description |
| --- | --- | --- |
| `llmModel` | string? | Model used for the interpretation pass. |
| `costUsd` | number? | Estimated cost of the LLM pass for this page. |

---

## Notes & roadmap

- **Unified vector:** the same `PageProfile` schema describes competitors and our own articles, so once we record performance on what we publish we can train against `serpPosition` directly.
- **Schema evolution:** bump `featureSchemaVersion` when fields are added/changed so historical scans stay interpretable.
- **Next iterations:** top‑N scan with consensus → `RankingPlaybook`; load the authority lens; promote `articleIdeas` into the content queue.
