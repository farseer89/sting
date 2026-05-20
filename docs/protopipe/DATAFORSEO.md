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

Response (`ProtopipeDataForSeoStatusResponse`): `configured`, `connected`, optional `balance`, `timezone`, masked `apiLogin`, or `error`.

Uses DataForSEO `GET /v3/appendix/user_data` (free — no account charge) to verify Basic auth.

## Local ping (bagend only)

```bash
cd bagend
DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... npx ts-node scripts/protopipe-dataforseo-ping.ts
```

## Sting

`ProtopipeApiService.dataForSeoStatus()` — Angular `HttpClient`, same pattern as bootstrap/plan.

## Next (Phase 2)

- Labs live POSTs via `dataForSeoPost` in `services/protopipe/dataforseo/client.ts`
- Persist snapshots in `protopipe_keyword_metrics`
- Optional `protopipe_dataforseo_tasks` cost audit
