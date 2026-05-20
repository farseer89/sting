# DataForSEO integration

External market data is **server-side only**. Sting calls bagend v2 routes; bagend calls [DataForSEO API v3](https://docs.dataforseo.com/v3/).

## bagend env (Digital Ocean / local)

```bash
DATAFORSEO_LOGIN=your_api_login
DATAFORSEO_PASSWORD=your_api_password
```

Credentials from https://app.dataforseo.com/api-access

## v2 API (Sting → bagend)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v2/protopipe/integrations/dataforseo/status` | JWT Bearer |
| POST | `/api/v2/protopipe/sites/:siteId/market/enrich` | JWT Bearer |
| GET | `/api/v2/protopipe/sites/:siteId/keywords/:keywordId/metrics/history?limit=24` | JWT Bearer |

**Status** — `ProtopipeDataForSeoStatusResponse`: `configured`, `connected`, optional `balance`, `timezone`, masked `apiLogin`, or `error`. Uses `GET /v3/appendix/user_data` (free).

**Enrich** — sync refresh for all plan keywords on a site. Two DataForSEO live POSTs per run (batched, not N+1):

1. `keywords_data/google_ads/search_volume/live` — volume, KD, CPC per phrase
2. `dataforseo_labs/google/ranked_keywords/live` — organic rank by hostname

Appends rows to `protopipe_keyword_metrics` (`source: dataforseo`). Plan `GET` merges latest + previous snapshot per keyword into `keyword.market` (rank, deltas, volume).

**History** — time series for one keyword (newest first, default 24 points).

## Local ping (bagend only)

```bash
cd bagend
DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... npx ts-node scripts/protopipe-dataforseo-ping.ts
```

## Sting

- `ProtopipeApiService.dataForSeoStatus()` — dashboard integration test
- `ProtopipeApiService.enrichMarket(siteId)` — Keywords page **Refresh market data**
- `ProtopipeApiService.getKeywordMetricHistory(siteId, keywordId)` — per-keyword history dialog

Keywords table columns: Rank, Δ, Volume, KD, CPC (from `keyword.market` on plan load).

## Mongo (bagend)

| Collection | Purpose |
|------------|---------|
| `protopipe_keyword_metrics` | Append-only snapshots per refresh |
| `protopipe_dataforseo_tasks` | Optional task/cost audit (written on enrich) |

## Not yet

- Scheduled/async refresh (`agent-runs`)
- Keyword discovery (`keywords_for_site`) UI
